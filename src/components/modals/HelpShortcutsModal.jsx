'use client';

import React from 'react';
import { X } from 'lucide-react';
import ModalDialog from '@/components/common/ModalDialog';

export default function HelpShortcutsModal({ open, onClose }) {
  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      ariaLabelledBy="help-shortcuts-modal-title"
      className="w-[calc(100vw-2rem)] max-w-md"
    >
      <div className="bg-[#141414] border border-neutral-800 rounded-2xl w-full p-5 space-y-4 text-xs shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 id="help-shortcuts-modal-title" className="font-bold text-base text-white">
            Help &amp; Keyboard Shortcuts
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help modal"
            className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {[
            ['Play / Pause demo', 'SPACE'],
            ['Fullscreen preview', 'F'],
            ['Undo / Redo', '⌘Z / ⇧⌘Z'],
            ['Zoom in / out / Fit', '+ / − / 0'],
            ['Nudge selected layer', 'Arrow Keys (+Shift)'],
            ['Close modal / preview', 'ESC'],
          ].map(([label, key]) => (
            <div
              key={label}
              className="flex items-center justify-between p-2 rounded-lg bg-[#1c1c1c]"
            >
              <span className="text-neutral-300">{label}</span>
              <kbd className="px-2 py-0.5 bg-neutral-800 rounded font-mono text-white">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </ModalDialog>
  );
}
