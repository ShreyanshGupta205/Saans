import React from 'react';

interface SkipLinkProps {
  readonly label?: string;
}

export function SkipLink({ label = 'Skip to main content' }: SkipLinkProps) {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-emerald-700 focus:text-white focus:font-semibold focus:rounded-md focus:shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-400"
    >
      {label}
    </a>
  );
}
