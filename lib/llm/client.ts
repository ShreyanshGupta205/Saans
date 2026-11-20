/**
 * @file client.ts
 * @description Google Gen AI client wrapper using the official @google/genai SDK.
 * Server-side only; never exposed to browser.
 */

import { GoogleGenAI } from '@google/genai';
import { env } from '../env';

let genAIClient: GoogleGenAI | null = null;

/**
 * Returns a singleton instance of GoogleGenAI or null if no API key is provided.
 */
export function getGenAIClient(): GoogleGenAI | null {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
    throw new Error('Security violation: GoogleGenAI client cannot be initialized in client-side runtime.');
  }

  if (genAIClient) {
    return genAIClient;
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    return null;
  }

  genAIClient = new GoogleGenAI({ apiKey });
  return genAIClient;
}

/**
 * Gets the configured model name from environment variables (never hardcoded).
 */
export function getGeminiModelName(): string {
  return env.GEMINI_MODEL || 'gemini-2.0-flash';
}

/**
 * Resets client singleton (for testing)
 */
export function resetGenAIClientForTesting(): void {
  genAIClient = null;
}
