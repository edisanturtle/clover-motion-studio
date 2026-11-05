'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Native HTML <dialog> wrapper using showModal() and closedby="any"
 * with coordinate-based light-dismiss fallback for browsers without closedBy support.
 */
export function ModalDialog({
  open,
  onClose,
  ariaLabelledBy,
  ariaLabel,
  className = '',
  children,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      if (onClose) onClose();
    };

    dialog.addEventListener('close', handleClose);

    // Fallback for browsers without native <dialog closedby="any"> support
    let removeFallbackListeners = null;
    if (
      typeof HTMLDialogElement !== 'undefined' &&
      !('closedBy' in HTMLDialogElement.prototype)
    ) {
      let pressedOutside = false;
      const isOutside = (e) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      const onPointerDown = (e) => {
        if (e.target !== dialog) {
          pressedOutside = false;
          return;
        }
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e) => {
        if (e.target === dialog && pressedOutside && isOutside(e)) {
          dialog.close();
        }
        pressedOutside = false;
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      removeFallbackListeners = () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      if (removeFallbackListeners) removeFallbackListeners();
    };
  }, [onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      {...{ closedby: 'any' }}
      aria-labelledby={ariaLabelledBy}
      aria-label={!ariaLabelledBy ? ariaLabel : undefined}
      className={`m-auto bg-transparent p-0 text-[#f5f5f5] border-0 outline-none max-w-none max-h-none overflow-visible ${className}`}
    >
      {children}
    </dialog>
  );
}

export default ModalDialog;
