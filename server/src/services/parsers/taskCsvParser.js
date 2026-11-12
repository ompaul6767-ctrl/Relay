/**
 * Parser for task board CSV files (id,task,owner,status,due).
 */

export function parseTaskCsv(rawText, sourceNumber = 1) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('Task CSV file is empty.');
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error('Task CSV requires a header row and at least one data row.');
  }

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const requiredHeaders = ['id', 'task'];
  for (const req of requiredHeaders) {
    if (!headers.includes(req)) {
      throw new Error(`Task CSV missing required header column '${req}'. Found: ${headers.join(', ')}`);
    }
  }

  const idIdx = headers.indexOf('id');
  const taskIdx = headers.indexOf('task');
  const ownerIdx = headers.indexOf('owner');
  const statusIdx = headers.indexOf('status');
  const dueIdx = headers.indexOf('due');

  const spans = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    // Split taking into account simple commas (and basic quoted strings)
    const cols = row.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 2) continue;

    const taskId = cols[idIdx] || `TASK-${i}`;
    const taskName = cols[taskIdx] || '';
    const owner = ownerIdx !== -1 ? cols[ownerIdx] : '';
    const status = statusIdx !== -1 ? cols[statusIdx] : 'todo';
    const due = dueIdx !== -1 ? cols[dueIdx] : '';

    let parsedDate = null;
    if (due) {
      const d = new Date(due);
      if (!isNaN(d.getTime())) parsedDate = d;
    }

    const spanText = `${taskId}: ${taskName}${owner ? ` (Owner: ${owner})` : ' (No owner assigned)'}${status ? ` [Status: ${status}]` : ''}${due ? ` [Due: ${due}]` : ''}`;

    spans.push({
      index: i,
      stableId: `S${sourceNumber}.L${i}`,
      text: spanText,
      author: owner || 'Unassigned',
      timestamp: parsedDate,
      metadata: {
        taskId,
        taskName,
        owner,
        status,
        due,
        rawCsvRow: row,
      },
    });
  }

  if (spans.length === 0) {
    throw new Error('No valid task rows could be parsed from CSV.');
  }

  return spans;
}
