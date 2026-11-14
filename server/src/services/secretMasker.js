/**
 * Mask obvious secrets at ingestion:
 * API keys, passwords, emails, phone numbers, credit cards.
 * Replaces them with placeholders before anything is stored or sent to AI.
 */

const SECRET_PATTERNS = [
  // Google API Key (AIza...)
  {
    regex: /\bAIza[0-9A-Za-z-_]{30,45}\b/g,
    placeholder: '[API_KEY_MASKED]',
    type: 'google_api_key',
  },
  // OpenAI API Key (sk-...)
  {
    regex: /\bsk-[a-zA-Z0-9_-]{20,}\b/g,
    placeholder: '[API_KEY_MASKED]',
    type: 'openai_api_key',
  },
  // GitHub Personal Access Token (ghp_...)
  {
    regex: /\bghp_[a-zA-Z0-9]{36}\b/g,
    placeholder: '[API_KEY_MASKED]',
    type: 'github_token',
  },
  // AWS Access Key ID
  {
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    placeholder: '[AWS_KEY_MASKED]',
    type: 'aws_key',
  },
  // Explicit password or secret assignments
  {
    regex: /(password|passwd|api_key|secret_key|private_key|token)\s*[:=]\s*["']?([A-Za-z0-9!@#$%^&*()_+=\-`~[\]{}|\\;:',.<>?/]{6,})["']?/gi,
    replacement: (match, p1) => `${p1}: "[SECRET_MASKED]"`,
    type: 'credential_assignment',
  },
  // Credit card numbers (13 to 19 digits with dashes or spaces)
  {
    regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    placeholder: '[CREDIT_CARD_MASKED]',
    type: 'credit_card',
  },
  // Phone numbers (with strict word boundary)
  {
    regex: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    placeholder: '[PHONE_MASKED]',
    type: 'phone_number',
  },
  // Email addresses (preserve domain for campus context if helpful, or replace)
  {
    regex: /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g,
    replacement: (match) => {
      const parts = match.split('@');
      const user = parts[0];
      const domain = parts[1];
      return `${user.charAt(0)}***@${domain}`;
    },
    type: 'email',
  },
];

export function maskSecrets(text) {
  if (typeof text !== 'string' || !text) {
    return { maskedText: '', count: 0, maskedTypes: [] };
  }

  let maskedText = text;
  let count = 0;
  const maskedTypes = [];

  for (const pattern of SECRET_PATTERNS) {
    const before = maskedText;
    if (pattern.replacement) {
      maskedText = maskedText.replace(pattern.regex, (...args) => {
        count++;
        maskedTypes.push(pattern.type);
        return pattern.replacement(...args);
      });
    } else if (pattern.placeholder) {
      maskedText = maskedText.replace(pattern.regex, () => {
        count++;
        maskedTypes.push(pattern.type);
        return pattern.placeholder;
      });
    }
  }

  return {
    maskedText,
    count,
    maskedTypes: Array.from(new Set(maskedTypes)),
  };
}
