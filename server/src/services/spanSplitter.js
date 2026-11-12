import { maskSecrets } from './secretMasker.js';
import { parseNotes } from './parsers/notesParser.js';
import { parseTaskCsv } from './parsers/taskCsvParser.js';
import { parseChatJson } from './parsers/chatJsonParser.js';
import { parseRepoExport } from './parsers/repoExportParser.js';

/**
 * Splits raw source text into atomic spans with stable IDs and masked secrets.
 * Stable ID format: S{sourceNumber}.L{spanIndex}
 */
export function splitIntoSpans({ rawText, type, sourceNumber = 1, acl = 'team' }) {
  if (!rawText || !rawText.trim()) {
    throw new Error('Source text cannot be empty.');
  }

  // 1. Mask secrets before anything is stored or processed
  const { maskedText, count, maskedTypes } = maskSecrets(rawText);

  // 2. Select parser based on source type
  let rawSpans;
  switch (type) {
    case 'notes':
      rawSpans = parseNotes(maskedText, sourceNumber);
      break;
    case 'tasks_csv':
      rawSpans = parseTaskCsv(maskedText, sourceNumber);
      break;
    case 'chat_json':
      rawSpans = parseChatJson(maskedText, sourceNumber);
      break;
    case 'repo_export':
      rawSpans = parseRepoExport(maskedText, sourceNumber);
      break;
    default:
      rawSpans = parseNotes(maskedText, sourceNumber);
  }

  // 3. Attach ACL and ensure stableId uniformity
  const spans = rawSpans.map((s, idx) => ({
    ...s,
    index: idx + 1,
    stableId: `S${sourceNumber}.L${idx + 1}`,
    acl: acl, // inherited from source
  }));

  return {
    spans,
    maskedText,
    secretMaskStats: {
      count,
      maskedTypes,
    },
  };
}
