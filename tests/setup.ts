/**
 * @file setup.ts
 * @description Vitest test setup file with DOM extensions and global mocks.
 */

import '@testing-library/jest-dom';

// Mock Web Speech API SpeechSynthesis if missing in jsdom
if (typeof window !== 'undefined' && !window.speechSynthesis) {
  Object.defineProperty(window, 'speechSynthesis', {
    value: {
      speak: () => {},
      cancel: () => {},
      pause: () => {},
      resume: () => {},
      getVoices: () => [],
    },
    writable: true,
  });
}
