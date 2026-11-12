/**
 * Parser for Markdown and plain text meeting notes.
 * Extracts author, date headers, and partitions into atomic spans.
 */

export function parseNotes(rawText, sourceNumber = 1) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('Notes file is empty or contains only whitespace.');
  }

  const lines = rawText.split(/\r?\n/);
  let globalAuthor = 'Meeting Lead';
  let globalTimestamp = null;

  // Extract metadata headers if present
  for (const line of lines.slice(0, 15)) {
    const trimmed = line.trim();
    const authorMatch = trimmed.match(/^(?:Author|Recorded By|Host)\s*:\s*(.+)$/i);
    if (authorMatch) {
      globalAuthor = authorMatch[1].trim();
    }
    const dateMatch = trimmed.match(/^(?:Date|Timestamp|Time)\s*:\s*(.+)$/i);
    if (dateMatch) {
      const parsedDate = new Date(dateMatch[1].trim());
      if (!isNaN(parsedDate.getTime())) {
        globalTimestamp = parsedDate;
      }
    }
  }

  const spans = [];
  let spanIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip empty lines or pure markdown dividers
    if (!line || line === '---' || line === '***') {
      continue;
    }

    // Determine if line has a specific author prefix (e.g., "- Maya: ...")
    let spanAuthor = globalAuthor;
    let spanText = line;
    const authorPrefixMatch = line.match(/^[-*]\s*([A-Za-z\s]+?)\s*:\s*(.+)$/);
    if (authorPrefixMatch && authorPrefixMatch[1].length < 30) {
      spanAuthor = authorPrefixMatch[1].trim();
      spanText = authorPrefixMatch[2].trim();
    }

    spans.push({
      index: spanIndex,
      stableId: `S${sourceNumber}.L${spanIndex}`,
      text: line, // keep exact original line text for whitespace-normalised quote matching
      author: spanAuthor,
      timestamp: globalTimestamp,
      metadata: { lineNumber: i + 1 },
    });

    spanIndex++;
  }

  if (spans.length === 0) {
    throw new Error('No valid content spans could be extracted from notes.');
  }

  return spans;
}
