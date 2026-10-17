import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  light?: boolean;
  className?: string;
}

export default function BrandLogo({
  size = 'md',
  showSubtitle = true,
  light = false,
  className = '',
}: BrandLogoProps) {
  const iconDimensions = {
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
  }[size];

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* ── Typographic Monogram Emblem ── */}
      <div
        className={`${iconDimensions} flex-shrink-0 rounded-xl flex items-center justify-center font-mono font-black tracking-tighter border transition-transform duration-200 hover:scale-105`}
        style={{
          background: light ? '#000000' : '#0f172a',
          borderColor: light ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.15)',
          color: '#ffffff',
          boxShadow: light ? '0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <span className="flex items-center">
          <span className="font-black text-white">T</span>
          <span className="text-zinc-400 font-light ml-[0.5px]">G</span>
          <span className="w-1 h-1 rounded-full bg-white ml-[1px] mb-1 inline-block" />
        </span>
      </div>

      {/* ── Typographic Wordmark ── */}
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline">
          <span
            className={`font-black tracking-[-0.04em] ${titleSizes}`}
            style={{
              color: light ? '#ffffff' : '#000000',
            }}
          >
            TIME
          </span>
          <span
            className={`font-light tracking-[-0.02em] ${titleSizes} ml-[1px]`}
            style={{
              color: light ? '#a1a1aa' : '#52525b',
            }}
          >
            GRID
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full ml-1 mb-0.5 inline-block"
            style={{
              background: light ? '#ffffff' : '#000000',
            }}
          />
        </div>

        {showSubtitle && (
          <span
            className="text-[9px] font-mono uppercase tracking-[0.22em] mt-1.5 font-medium"
            style={{
              color: light ? '#71717a' : '#71717a',
            }}
          >
            Academic Platform
          </span>
        )}
      </div>
    </div>
  );
}
