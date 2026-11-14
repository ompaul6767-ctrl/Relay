import { describe, it, expect } from 'vitest';
import { parseNotes } from '../src/services/parsers/notesParser.js';
import { parseTaskCsv } from '../src/services/parsers/taskCsvParser.js';
import { parseChatJson } from '../src/services/parsers/chatJsonParser.js';
import { parseRepoExport } from '../src/services/parsers/repoExportParser.js';
import { maskSecrets } from '../src/services/secretMasker.js';
import { splitIntoSpans } from '../src/services/spanSplitter.js';

describe('Source Parsers & Span ID Stability', () => {
  it('should parse markdown notes and assign stable sequential IDs', () => {
    const raw = `# Sprint Notes\nAuthor: Maya\nDate: 2026-09-01T10:00:00Z\n- DECISION: Use Next.js for SEO\n- RISK: Wifi unstable`;
    const spans = parseNotes(raw, 1);

    expect(spans.length).toBeGreaterThan(0);
    expect(spans[0].stableId).toBe('S1.L1');
    expect(spans[1].stableId).toBe('S1.L2');
    expect(spans[0].author).toBe('Maya');
  });

  it('should parse task CSV with empty owner without breaking', () => {
    const csv = `id,task,owner,status,due\nTASK-1,Payment Gateway,Aarav,done,2026-10-15\nTASK-2,Notification Service,,todo,2026-11-01`;
    const spans = parseTaskCsv(csv, 2);

    expect(spans.length).toBe(2);
    expect(spans[0].stableId).toBe('S2.L1');
    expect(spans[0].metadata.owner).toBe('Aarav');
    expect(spans[1].metadata.owner).toBe('');
    expect(spans[1].text).toContain('(No owner assigned)');
  });

  it('should parse chat JSON array of messages', () => {
    const json = JSON.stringify([
      { ts: '2026-10-12T14:30:00Z', author: 'Maya', text: 'Priya will take over' },
    ]);
    const spans = parseChatJson(json, 3);

    expect(spans.length).toBe(1);
    expect(spans[0].stableId).toBe('S3.L1');
    expect(spans[0].author).toBe('Maya');
  });

  it('should reject empty or malformed files with readable error', () => {
    expect(() => parseNotes('', 1)).toThrow('Notes file is empty');
    expect(() => parseTaskCsv('invalid csv without headers\nrow 2 data', 1)).toThrow('Task CSV missing required header');
    expect(() => parseChatJson('{ not: "an array" }', 1)).toThrow();
  });
});

describe('Secret Masker', () => {
  it('should mask Google API keys, passwords, and emails', () => {
    const raw = 'Config: AIzaSyD3x9k123456789012345678901234 and password="super_secret_pass" email is admin@campus.edu';
    const result = maskSecrets(raw);

    expect(result.count).toBeGreaterThanOrEqual(2);
    expect(result.maskedText).not.toContain('AIzaSyD3x9k123456789012345678901234');
    expect(result.maskedText).toContain('[API_KEY_MASKED]');
    expect(result.maskedText).not.toContain('super_secret_pass');
    expect(result.maskedText).toContain('[SECRET_MASKED]');
  });
});
