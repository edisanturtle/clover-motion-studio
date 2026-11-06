'use client';

import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Globe,
  Database,
  Lock,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';
import ModalDialog from '../common/ModalDialog';

export default function TransferConsentModal({
  open,
  onClose,
  manifest,
  onAuthorize,
  onDeny,
}) {
  if (!manifest) return null;

  const isQuarantined = manifest.clearedForRelease === false;

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      ariaLabel="Data Transfer Authorization"
      maxWidth="max-w-md"
    >
      <div className="flex flex-col bg-[#141414] text-neutral-100 select-none overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isQuarantined ? 'bg-red-500/20 text-red-400' : 'bg-[#159947]/20 text-[#4ade80]'}`}>
              {isQuarantined ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                Data Transfer Authorization
              </h2>
              <p className="text-[11px] text-neutral-400">
                Explicit permission required before network transmission
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 text-xs">
          {isQuarantined ? (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Service Quarantined & Blocked</span>
              </div>
              <p className="text-[11px] leading-relaxed text-red-300">
                {manifest.quarantineReason || 'This service has not passed licensing or security verification and is strictly excluded from release.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-neutral-300 leading-relaxed text-[11px]">
                Clover Motion is an offline-first creative studio. No project data or media leaves your browser without your explicit authorization.
              </p>

              {/* Destination Details */}
              <div className="p-3 rounded-xl bg-[#1c1c1c] border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-400" /> Destination
                  </span>
                  <span className="font-mono text-white font-semibold truncate max-w-[180px]">
                    {manifest.destinationUrl}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#4ade80]" /> Provider
                  </span>
                  <span className="text-white font-medium">{manifest.providerName}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" /> Data Scope
                  </span>
                  <span className="text-neutral-200 font-mono text-[10px]">
                    {(manifest.dataCategories || []).join(', ') || 'Metadata only'}
                  </span>
                </div>
              </div>

              {/* Security Badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#181818] border border-neutral-800 text-[11px] text-neutral-400">
                <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                <span>Audited License & Permission-Scoped Payload</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-neutral-800 bg-[#121212] flex items-center justify-between">
          <button
            type="button"
            onClick={onDeny}
            className="px-4 py-2 rounded-xl bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white transition-colors"
          >
            Deny & Keep Local
          </button>

          {!isQuarantined && (
            <button
              type="button"
              onClick={onAuthorize}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/40 text-white text-xs font-bold transition-colors shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Authorize Transfer</span>
            </button>
          )}
        </div>
      </div>
    </ModalDialog>
  );
}
