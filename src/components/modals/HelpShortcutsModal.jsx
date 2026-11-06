'use client';

import React from 'react';
import { X, Keyboard, Command, Sparkles, HelpCircle } from 'lucide-react';
import ModalDialog from '../common/ModalDialog';

export default function HelpShortcutsModal({ open, onClose }) {
  const shortcutGroups = [
    {
      title: 'Playback & Preview',
      items: [
        ['Play / Pause Timeline', 'SPACE'],
        ['Shuffle Swiss Color Palette', '⇧ + SPACE'],
        ['Fullscreen Projector Preview', 'F'],
        ['Toggle Alignment Grid & Rulers', 'G'],
      ],
    },
    {
      title: 'Workspace Navigation',
      items: [
        ['Switch to Design Workspace', '1'],
        ['Switch to Animate Workspace', '2'],
        ['Switch to Video Workspace', '3'],
        ['Switch to Audio DSP Workspace', '4'],
      ],
    },
    {
      title: 'Editing & Canvas Controls',
      items: [
        ['Undo Last Action', '⌘Z / Ctrl+Z'],
        ['Redo Action', '⇧⌘Z / Ctrl+Y'],
        ['Save Project Locally', '⌘S / Ctrl+S'],
        ['Zoom In / Zoom Out', '+ / −'],
        ['Reset Zoom (Fit to Screen)', '0'],
        ['Nudge Selected Layer (1px / 10px)', 'Arrow Keys (±Shift)'],
        ['Delete Selected Object', 'Delete / Backspace'],
        ['Close Active Modal / Dialog', 'ESC'],
      ],
    },
  ];

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      ariaLabel="Help & Keyboard Shortcuts"
      maxWidth="max-w-xl"
    >
      <div className="bg-[#141414] border border-neutral-800 rounded-2xl w-full p-6 space-y-5 text-xs shadow-2xl select-none">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#159947]/20 border border-[#22c55e]/40 flex items-center justify-center text-[#4ade80]">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Studio Help &amp; Keyboard Shortcuts
              </h3>
              <p className="text-[11px] text-neutral-400">
                Speed up your kinetic motion graphics and Swiss typography workflows
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help modal"
            className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold">
                {group.title}
              </span>
              <div className="space-y-1.5">
                {group.items.map(([label, key]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#1c1c1c] border border-neutral-800/80 hover:border-neutral-700 transition-colors"
                  >
                    <span className="text-neutral-300 font-medium">{label}</span>
                    <kbd className="px-2 py-0.5 bg-[#262626] border border-neutral-700/80 rounded font-mono text-[11px] text-white font-semibold shadow-inner">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded font-mono text-white">H</kbd> or <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded font-mono text-white">?</kbd> anytime to open this guide</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
