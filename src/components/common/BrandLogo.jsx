'use client';

import React from 'react';

export function BrandLogo({ onClick, size = 'sm', asButton }) {
  const isInteractive = asButton !== undefined ? asButton : Boolean(onClick);
  const sizeClasses =
    size === 'lg'
      ? 'px-3.5 py-1.5 rounded-lg h-9 gap-2'
      : 'px-3 py-1.5 rounded-lg h-8 gap-1.5';

  const content = (
    <span className="inline-flex items-center justify-center gap-1.5">
      {/* Distinctive 4-Leaf Clover Emblem */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        focusable="false"
        aria-hidden="true"
        className={size === 'lg' ? 'h-4 w-4 shrink-0' : 'h-3.5 w-3.5 shrink-0'}
      >
        <path
          d="M12 11.2C10.1 8.8 7.5 6.8 7.5 4.4C7.5 2.7 8.9 1.5 10.5 1.5C11.3 1.5 11.8 1.9 12 2.5C12.2 1.9 12.7 1.5 13.5 1.5C15.1 1.5 16.5 2.7 16.5 4.4C16.5 6.8 13.9 8.8 12 11.2Z"
          fill="currentColor"
        />
        <path
          d="M12 12.8C13.9 15.2 16.5 17.2 16.5 19.6C16.5 21.3 15.1 22.5 13.5 22.5C12.7 22.5 12.2 22.1 12 21.5C11.8 22.1 11.3 22.5 10.5 22.5C8.9 22.5 7.5 21.3 7.5 19.6C7.5 17.2 10.1 15.2 12 12.8Z"
          fill="currentColor"
        />
        <path
          d="M11.2 12C8.8 13.9 6.8 16.5 4.4 16.5C2.7 16.5 1.5 15.1 1.5 13.5C1.5 12.7 1.9 12.2 2.5 12C1.9 11.8 1.5 11.3 1.5 10.5C1.5 8.9 2.7 7.5 4.4 7.5C6.8 7.5 8.8 10.1 11.2 12Z"
          fill="currentColor"
        />
        <path
          d="M12.8 12C15.2 10.1 17.2 7.5 19.6 7.5C21.3 7.5 22.5 8.9 22.5 10.5C22.5 11.3 22.1 11.8 21.5 12C22.1 12.2 22.5 12.7 22.5 13.5C22.5 15.1 21.3 16.5 19.6 16.5C17.2 16.5 15.2 13.9 12.8 12Z"
          fill="currentColor"
        />
      </svg>

      {/* Brand Wordmark */}
      <span
        className={`font-extrabold tracking-tight leading-none text-white ${
          size === 'lg' ? 'text-[15px]' : 'text-[13px]'
        }`}
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        clover<span className="text-[#bbf7d0]">.</span>motion
      </span>
    </span>
  );

  if (!isInteractive) {
    return (
      <span
        className={`bg-[#159947] border border-[#22c55e]/35 text-white inline-flex items-center justify-center shrink-0 shadow-[0_2px_12px_rgba(21,153,71,0.3)] ${sizeClasses}`}
      >
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title="Open Clover Motion Template Library"
      className={`bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/35 text-white inline-flex items-center justify-center shrink-0 transition shadow-[0_2px_12px_rgba(21,153,71,0.3)] ${sizeClasses}`}
    >
      {content}
    </button>
  );
}

export default BrandLogo;
