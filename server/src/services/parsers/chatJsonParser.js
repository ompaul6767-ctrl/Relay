/**
 * Parser for chat export JSON files ([{ts, author, text}]).
 */

export function parseChatJson(rawText, sourceNumber = 1) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('Chat JSON file is empty.');
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch (err) {
    throw new Error(`Malformed JSON in chat export: ${err.message}`);
  }

  if (!Array.isArray(data)) {
    throw new Error('Chat JSON must be an array of message objects: [{ts, author, text}].');
  }

  const spans = [];

  data.forEach((msg, idx) => {
    if (!msg || typeof msg !== 'object') return;
    const author = msg.author || msg.user || 'Unknown';
    const text = msg.text || msg.message || msg.content || '';
    if (!text.trim()) return;

    let timestamp = null;
    if (msg.ts || msg.timestamp || msg.date) {
      const parsed = new Date(msg.ts || msg.timestamp || msg.date);
      if (!isNaN(parsed.getTime())) timestamp = parsed;
    }

    const spanText = `[${author}]: ${text}`;

    spans.push({
      index: idx + 1,
      stableId: `S${sourceNumber}.L${idx + 1}`,
      text: spanText,
      author,
      timestamp,
      metadata: {
        rawMessageText: text,
      },
    });
  });

  if (spans.length === 0) {
    throw new Error('No valid message spans could be extracted from chat JSON.');
  }

  return spans;
}
