/**
 * @file guard.ts
 * @description Output safety guard for LLM responses.
 * Detects and blocks malicious outputs:
 * 1. Raw URLs / phishing attempts
 * 2. Unsanitized HTML tags / XSS injections
 * 3. Text instructing the model to ignore instructions or leaking system prompts
 */

const SUSPICIOUS_PATTERNS = [
  /ignore (all )?(previous|prior) instructions/i,
  /system prompt/i,
  /you are a large language model/i,
  /jailbreak/i,
  /bypass safety/i,
  /<script[\s\S]*?>/i,
  /<iframe[\s\S]*?>/i,
  /javascript:/i,
  /on\w+\s*=/i,
];

/**
 * Validates that an LLM response text contains no URLs, HTML tags, or instruction leak patterns.
 *
 * @param text The string to validate
 * @returns true if safe; false if hostile content detected
 */
export function validateLLMOutputSafety(text: string): boolean {
  if (!text || text.trim() === '') {
    return false;
  }

  // Reject URLs (no links in raw LLM text)
  if (/https?:\/\/[^\s]+/i.test(text)) {
    return false;
  }

  // Reject HTML tags
  if (/<[a-zA-Z/][\s\S]*?>/.test(text)) {
    return false;
  }

  // Check against prompt leak / instruction hijack corpus
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      return false;
    }
  }

  return true;
}
