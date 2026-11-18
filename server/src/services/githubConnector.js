import { env } from '../config/environment.js';
import { Source } from '../models/Source.js';
import { Span } from '../models/Span.js';
import { Claim } from '../models/Claim.js';
import { logAudit } from '../models/Audit.js';
import { splitIntoSpans } from './spanSplitter.js';
import { runReconstructionPipeline } from './verification/engine.js';

// SSRF Protection: Strict GitHub repository URL regex per Section 6 specification
const GITHUB_REPO_REGEX = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;

/**
 * Normalizes and strictly validates user-supplied repository inputs.
 * Accepts "owner/repo" or "https://github.com/owner/repo".
 * Rejects non-GitHub domains, IP addresses, credentials, query parameters, and fragments.
 */
export function normalizeAndValidateGithubUrl(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    return { isValid: false, error: 'Repository URL or path is required.' };
  }

  let cleaned = rawInput.trim();

  // Strip trailing slashes and .git suffix
  cleaned = cleaned.replace(/\.git$/i, '').replace(/\/+$/, '');

  // If provided as owner/repo, prepend full GitHub URL
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    if (cleaned.startsWith('github.com/')) {
      cleaned = `https://${cleaned}`;
    } else {
      cleaned = `https://github.com/${cleaned}`;
    }
  }

  // Enforce https
  if (cleaned.startsWith('http://')) {
    cleaned = cleaned.replace(/^http:\/\//, 'https://');
  }

  const match = cleaned.match(GITHUB_REPO_REGEX);
  if (!match) {
    return {
      isValid: false,
      error: 'Invalid GitHub repository URL. Must match format https://github.com/owner/repo with alphanumeric characters, dots, underscores, or hyphens.',
    };
  }

  const [, owner, repo] = match;
  return {
    isValid: true,
    normalizedUrl: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
  };
}

/**
 * Fetches commits and issues from GitHub REST API in read-only mode with timeout and rate limit handling.
 */
export async function fetchGithubRepoData(owner, repo, options = {}) {
  const timeoutMs = options.timeoutMs || 10000;
  const githubToken = options.githubToken || env.GITHUB_TOKEN;

  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Relay-Handover-Platform/1.0 (Hackathon-Round3)',
  };

  if (githubToken && githubToken.trim()) {
    headers.Authorization = `Bearer ${githubToken.trim()}`;
  }

  // Fetch commits (latest 100)
  const commitsUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`;
  // Fetch issues (latest 50, all states)
  const issuesUrl = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=50`;

  const fetchWithTimeout = async (url) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timer);

      if (res.status === 404) {
        throw new Error(`Repository "${owner}/${repo}" was not found or is private. Relay requires public repositories.`);
      }

      if (res.status === 403 || res.status === 429) {
        const remaining = res.headers.get('x-ratelimit-remaining');
        throw new Error(
          `GitHub rate limit reached (remaining: ${remaining || 0}). Try again later or configure GITHUB_TOKEN on the server.`
        );
      }

      if (!res.ok) {
        throw new Error(`GitHub API request failed with status ${res.status}: ${res.statusText}`);
      }

      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`GitHub API request timed out after ${timeoutMs}ms.`);
      }
      throw err;
    }
  };

  const [rawCommits, rawIssues] = await Promise.all([
    fetchWithTimeout(commitsUrl),
    fetchWithTimeout(issuesUrl),
  ]);

  // Exclude pull requests from issues (GitHub API includes PRs in issues list)
  const filteredIssues = Array.isArray(rawIssues)
    ? rawIssues.filter((item) => !item.pull_request)
    : [];

  return {
    commits: Array.isArray(rawCommits) ? rawCommits : [],
    issues: filteredIssues,
  };
}

/**
 * Transforms GitHub commits and issues into standard repo_export markdown text.
 * Commits: sha date author: message
 * Issues: #n [state] title: first 300 characters of body
 */
export function formatGithubDataToRepoExport({ owner, repo, commits, issues }) {
  const lines = [
    `# Repository Export: ${owner}/${repo}`,
    '',
    '## Git Commit Log',
  ];

  for (const c of commits) {
    const sha = (c.sha || '').slice(0, 8);
    const date = c.commit?.author?.date || c.commit?.committer?.date || new Date().toISOString();
    const author = c.commit?.author?.name || c.author?.login || 'GitHub Contributor';
    const email = c.commit?.author?.email ? `<${c.commit.author.email}>` : '';
    const message = (c.commit?.message || '').split('\n')[0].trim();

    // Standard header matching repoExportParser
    lines.push(`commit ${sha} - ${date} - ${author}${email ? ` ${email}` : ''}`);
    lines.push(`    ${message}`);
    lines.push('');
  }

  lines.push('## Open Repository Issues');
  for (const iss of issues) {
    const num = iss.number;
    const state = iss.state || 'open';
    const title = iss.title || 'Untitled issue';
    const author = iss.user?.login || 'contributor';
    const labels = (iss.labels || []).map((l) => (typeof l === 'string' ? l : l.name)).filter(Boolean);
    const bodySnippet = (iss.body || '').replace(/\r?\n/g, ' ').trim().slice(0, 300);

    lines.push(`### Issue #${num}: ${title}`);
    lines.push(`- State: ${state}`);
    lines.push(`- Author: ${author}`);
    lines.push(`- Labels: ${labels.length > 0 ? labels.join(', ') : 'none'}`);
    if (bodySnippet) {
      lines.push(`- Description: ${bodySnippet}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Executes idempotent GitHub repository import for a case.
 * Replaces any existing source for this repository to ensure idempotency.
 */
export async function importGithubRepository({
  caseId,
  repoInput,
  acl = 'team',
  consentConfirmed = false,
  user = { name: 'Lead', role: 'lead' },
  options = {},
}) {
  if (!consentConfirmed) {
    throw new Error('Consent is required: "This is a public repository and I am authorised to use it".');
  }

  const { isValid, normalizedUrl, owner, repo, error } = normalizeAndValidateGithubUrl(repoInput);
  if (!isValid) {
    const err = new Error(error);
    err.status = 400;
    throw err;
  }

  // 1. Fetch data from GitHub API
  const { commits, issues } = await fetchGithubRepoData(owner, repo, options);

  // 2. Format into repo_export text
  const rawText = formatGithubDataToRepoExport({ owner, repo, commits, issues });
  const sourceName = `github.com/${owner}/${repo}`;

  // 3. Idempotent replacement: check if repository source already exists
  const existingSource = await Source.findOne({
    caseId,
    type: 'repo_export',
    name: sourceName,
  });

  if (existingSource) {
    // Delete previous spans and clean up claims referencing those spans
    const oldSpans = await Span.find({ caseId, sourceId: existingSource._id }).select('stableId').lean();
    const oldStableIds = oldSpans.map((s) => s.stableId);

    if (oldStableIds.length > 0) {
      await Claim.deleteMany({
        caseId,
        'spanRefs.spanId': { $in: oldStableIds },
        reviewDecision: { $ne: 'approved' }, // keep lead-approved claims safe
      });
      await Span.deleteMany({ caseId, sourceId: existingSource._id });
    }
    await Source.deleteOne({ _id: existingSource._id });
  }

  // 4. Split into spans with secret masking
  const existingCount = await Source.countDocuments({ caseId });
  const sourceNumber = existingCount + 1;

  const splitResult = splitIntoSpans({
    rawText,
    type: 'repo_export',
    sourceNumber,
    acl,
  });

  // 5. Create Source Document
  const sourceDoc = await Source.create({
    caseId,
    name: sourceName,
    type: 'repo_export',
    acl,
    consentConfirmed: true,
    rawText: splitResult.maskedText,
    uploadedBy: user.name || 'Lead',
    metadata: {
      repoUrl: normalizedUrl,
      owner,
      repo,
      commitsCount: commits.length,
      issuesCount: issues.length,
      secretsMaskedCount: splitResult.secretMaskStats.count,
    },
  });

  // 6. Insert Spans
  const spansToInsert = splitResult.spans.map((s) => ({
    ...s,
    caseId,
    sourceId: sourceDoc._id,
    sourceName,
    acl,
  }));

  const insertedSpans = await Span.insertMany(spansToInsert);

  // 7. Audit log
  await logAudit({
    caseId,
    actor: user.name || 'Lead',
    role: user.role || 'lead',
    action: 'github_import',
    targetId: String(sourceDoc._id),
    metadata: {
      repoUrl: normalizedUrl,
      commitsCount: commits.length,
      issuesCount: issues.length,
      spansCount: insertedSpans.length,
      acl,
    },
  });

  // 8. Re-run reconstruction pipeline to extract claims, detect conflicts, gaps, key-person risks, and staleness
  let reconstruction = null;
  try {
    reconstruction = await runReconstructionPipeline(caseId);
  } catch (reconstructErr) {
    console.warn('[GitHubConnector] Reconstruction after import had a non-fatal warning:', reconstructErr.message);
  }

  return {
    success: true,
    source: sourceDoc,
    spansCount: insertedSpans.length,
    commitsCount: commits.length,
    issuesCount: issues.length,
    secretsMaskedCount: splitResult.secretMaskStats.count,
    reconstruction,
  };
}
