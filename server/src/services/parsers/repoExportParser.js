/**
 * Parser for repository exports (commit log lines plus issues as markdown or JSON).
 */

export function parseRepoExport(rawText, sourceNumber = 1) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('Repository export file is empty.');
  }

  // Check if it's pure JSON
  const trimmed = rawText.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(rawText);
      return parseRepoJson(parsed, sourceNumber);
    } catch (e) {
      // Continue to markdown parser if JSON fails
    }
  }

  return parseRepoMarkdown(rawText, sourceNumber);
}

function parseRepoMarkdown(markdownText, sourceNumber) {
  const lines = markdownText.split(/\r?\n/);
  const spans = [];
  let spanIndex = 1;

  let currentBlock = null;
  let blockType = 'general';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect commit header: commit 7f2a1b94 - 2026-09-05T12:00:00Z - Aarav <aarav@campus.edu>
    const commitMatch = line.match(/^commit\s+([a-f0-9]+)\s*-\s*([0-9T:\-Z.]+)\s*-\s*([^<]+)(?:<([^>]+)>)?/i);
    if (commitMatch) {
      const hash = commitMatch[1];
      const dateStr = commitMatch[2];
      const author = commitMatch[3].trim();
      const email = commitMatch[4] ? commitMatch[4].trim() : '';

      // The next non-empty line is usually the commit message
      let commitMsg = '';
      if (i + 1 < lines.length && lines[i + 1].trim()) {
        commitMsg = lines[i + 1].trim();
        i++; // skip next line
      }

      // Detect module from commit message: e.g. feat(services/ticket-scanner): ...
      let moduleName = '';
      const moduleMatch = commitMsg.match(/^[a-z]+(?:\(([^)]+)\))?\s*:\s*(.+)/i);
      if (moduleMatch && moduleMatch[1]) {
        moduleName = moduleMatch[1].trim();
      }

      const fullText = `${line}\n  ${commitMsg}`;
      spans.push({
        index: spanIndex,
        stableId: `S${sourceNumber}.L${spanIndex}`,
        text: fullText,
        author,
        timestamp: new Date(dateStr),
        metadata: {
          type: 'commit',
          hash,
          author,
          email,
          commitMsg,
          moduleName,
        },
      });
      spanIndex++;
      continue;
    }

    // Detect Issue header: ### Issue #42: Flaky redis cache...
    const issueMatch = line.match(/^###?\s*(?:Issue\s*#?([0-9]+))\s*:\s*(.+)/i);
    if (issueMatch) {
      const issueNumber = issueMatch[1];
      const issueTitle = issueMatch[2].trim();

      // Collect issue properties
      let issueAuthor = 'GitHub Contributor';
      let issueLabels = [];
      let issueDesc = '';
      let issueState = 'open';

      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith('commit ') && !lines[j].trim().startsWith('###')) {
        const subLine = lines[j].trim();
        if (subLine.startsWith('- State:')) {
          issueState = subLine.replace('- State:', '').trim();
        } else if (subLine.startsWith('- Author:')) {
          issueAuthor = subLine.replace('- Author:', '').trim();
        } else if (subLine.startsWith('- Labels:')) {
          issueLabels = subLine.replace('- Labels:', '').split(',').map((l) => l.trim());
        } else if (subLine.startsWith('- Description:')) {
          issueDesc = subLine.replace('- Description:', '').trim();
        }
        j++;
      }
      i = j - 1;

      const issueText = `Issue #${issueNumber}: ${issueTitle}${issueDesc ? ` - ${issueDesc}` : ''} (Labels: ${issueLabels.join(', ') || 'none'})`;
      spans.push({
        index: spanIndex,
        stableId: `S${sourceNumber}.L${spanIndex}`,
        text: issueText,
        author: issueAuthor,
        timestamp: null,
        metadata: {
          type: 'issue',
          issueNumber,
          issueTitle,
          issueState,
          labels: issueLabels,
          description: issueDesc,
        },
      });
      spanIndex++;
      continue;
    }

    // General line in repo export
    spans.push({
      index: spanIndex,
      stableId: `S${sourceNumber}.L${spanIndex}`,
      text: line,
      author: 'Repo Export',
      timestamp: null,
      metadata: { type: 'general' },
    });
    spanIndex++;
  }

  if (spans.length === 0) {
    throw new Error('No valid commits or issues could be parsed from repo export.');
  }

  return spans;
}

function parseRepoJson(data, sourceNumber) {
  const spans = [];
  let spanIndex = 1;

  if (Array.isArray(data)) {
    data.forEach((item) => {
      const text = item.text || item.message || JSON.stringify(item);
      spans.push({
        index: spanIndex,
        stableId: `S${sourceNumber}.L${spanIndex}`,
        text,
        author: item.author || 'Repo Contributor',
        timestamp: item.date ? new Date(item.date) : null,
        metadata: item,
      });
      spanIndex++;
    });
  }

  return spans;
}
