/**
 * @file components/ConfirmDialog.tsx
 * @description 保存确认对话框。
 *              在删除/清空等破坏性操作前提示用户保存未保存的更改，
 *              提供“保存”“不保存”“取消”三个选项。
 */

import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  saveText?: string;
  discardText?: string;
  cancelText?: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = '保存更改',
  message = '当前表格内容已修改，是否保存更改？',
  saveText = '保存',
  discardText = '不保存',
  cancelText = '取消',
  onSave,
  onDiscard,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onSave, onCancel]);

  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onCancel}
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-sm rounded-xl border p-5 shadow-2xl outline-none"
        style={{ borderColor: 'var(--ss-border)', background: 'var(--ss-panel-bg)' }}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="mb-4 flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'var(--ss-warning-bg, rgba(245,158,11,0.15))' }}
          >
            <AlertTriangle size={20} style={{ color: 'var(--ss-warning, #f59e0b)' }} />
          </div>
          <div>
            <h3
              id="confirm-dialog-title"
              className="text-base font-semibold"
              style={{ color: 'var(--ss-text-primary)' }}
            >
              {title}
            </h3>
            <p
              id="confirm-dialog-message"
              className="mt-1 text-sm leading-relaxed"
              style={{ color: 'var(--ss-text-secondary)' }}
            >
              {message}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--ss-hover-bg)]"
            style={{ borderColor: 'var(--ss-border-strong)', color: 'var(--ss-text-secondary)' }}
          >
            {cancelText}
          </button>
          <button
            onClick={onDiscard}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: 'var(--ss-error-bg)', color: 'var(--ss-error)' }}
          >
            {discardText}
          </button>
          <button
            onClick={onSave}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: 'var(--ss-text-primary)', color: 'var(--ss-bg)' }}
          >
            {saveText}
          </button>
        </div>
      </div>
    </div>
  );
}
