'use client';

import React from 'react';
import Link from 'next/link';
import { Wind, Globe, Settings, Volume2, VolumeX, BookOpen, Info } from 'lucide-react';
import { SupportedLanguage } from '@/i18n';

interface HeaderProps {
  readonly language: SupportedLanguage;
  readonly onToggleLanguage: () => void;
  readonly onOpenProfile: () => void;
  readonly isReadingAloud: boolean;
  readonly onToggleReadAloud: () => void;
  readonly isDegraded?: boolean;
}

export function Header({
  language,
  onToggleLanguage,
  onOpenProfile,
  isReadingAloud,
  onToggleReadAloud,
  isDegraded = false,
}: HeaderProps) {
  const isHi = language === 'hi';

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sticky top-0 z-40 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50"
            aria-hidden="true"
          >
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-zinc-100">
                {isHi ? 'साँस' : 'Saans'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 font-medium">
                {isHi ? 'स्वच्छ वायु' : 'Clean Air'}
              </span>
              {isDegraded && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 border border-amber-700/50 font-medium"
                  title="Running on deterministic rules"
                >
                  {isHi ? 'नियम मोड' : 'Rule Mode'}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              {isHi
                ? 'स्मॉग के मौसम में समझदारी से सांस लें'
                : 'Breathe smarter through smog season'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sources Link */}
          <Link
            href="/sources"
            className="p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] min-w-[44px] flex items-center justify-center gap-1"
            title="Scientific citations & impact sources"
            aria-label="View data sources and scientific citations"
          >
            <BookOpen className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span className="hidden lg:inline">{isHi ? 'स्रोत' : 'Sources'}</span>
          </Link>

          {/* About Link */}
          <Link
            href="/about"
            className="p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] min-w-[44px] flex items-center justify-center gap-1"
            title="About Saans and Health Advisory"
            aria-label="About Saans and Health Advisory"
          >
            <Info className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span className="hidden lg:inline">{isHi ? 'परिचय' : 'About'}</span>
          </Link>

          {/* Read Aloud Button */}
          <button
            onClick={onToggleReadAloud}
            className={`p-2 sm:px-3 sm:py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] min-w-[44px] justify-center ${
              isReadingAloud
                ? 'bg-emerald-600 text-white animate-pulse'
                : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-700/60'
            }`}
            title={isReadingAloud ? 'Stop audio' : 'Read dashboard aloud'}
            aria-label={isReadingAloud ? 'Stop read aloud' : 'Read aloud with screen voice'}
          >
            {isReadingAloud ? (
              <VolumeX className="w-4 h-4 text-white" aria-hidden="true" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            )}
            <span className="hidden md:inline">
              {isReadingAloud
                ? isHi ? 'रोकें' : 'Stop'
                : isHi ? 'सुनें' : 'Read Aloud'}
            </span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLanguage}
            className="p-2 sm:px-3 sm:py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 flex items-center gap-1.5 min-h-[44px] min-w-[44px] justify-center"
            aria-label={`Switch language to ${isHi ? 'English' : 'हिंदी'}`}
          >
            <Globe className="w-4 h-4 text-zinc-400" aria-hidden="true" />
            <span>{isHi ? 'EN' : 'हिंदी'}</span>
          </button>

          {/* Household Profile Button */}
          <button
            onClick={onOpenProfile}
            className="p-2 sm:px-3 sm:py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 flex items-center gap-1.5 shadow-sm min-h-[44px] min-w-[44px] justify-center"
            aria-label="Edit household profile"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">
              {isHi ? 'प्रोफाइल' : 'Profile'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
