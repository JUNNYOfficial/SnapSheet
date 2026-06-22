/**
 * @file components/ContextMenu.tsx
 * @description 右键上下文菜单组件。
 *              提供复制、粘贴、清除、清除格式、插入/删除行列等快捷操作。
 */

import { Copy, ClipboardPaste, Eraser, Paintbrush, Plus, Minus } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onClear: () => void;
  onClearFormat: () => void;
  onInsertRow: () => void;
  onDeleteRow: () => void;
  onInsertCol: () => void;
  onDeleteCol: () => void;
}

export default function ContextMenu({
  x,
  y,
  onClose,
  onCopy,
  onPaste,
  onClear,
  onClearFormat,
  onInsertRow,
  onDeleteRow,
  onInsertCol,
  onDeleteCol,
}: ContextMenuProps) {
  const itemBase = 'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm';

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        className="absolute z-50 min-w-[150px] rounded-md border py-1 shadow-lg"
        style={{ left: x, top: y, borderColor: 'var(--ss-border)', background: 'var(--ss-panel-bg)' }}
      >
        <button onClick={() => { onCopy(); onClose(); }} className={itemBase} style={{ color: 'var(--ss-text-secondary)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-hover-bg)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
          <Copy size={14} /> 复制
        </button>
        <button onClick={() => { onPaste(); onClose(); }} className={itemBase} style={{ color: 'var(--ss-text-secondary)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-hover-bg)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
          <ClipboardPaste size={14} /> 粘贴
        </button>
        <div className="my-1 h-px" style={{ background: 'var(--ss-border-light)' }} />
        <button onClick={() => { onClear(); onClose(); }} className={itemBase} style={{ color: 'var(--ss-text-secondary)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-hover-bg)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
          <Eraser size={14} /> 清除
        </button>
        <button onClick={() => { onClearFormat(); onClose(); }} className={itemBase} style={{ color: 'var(--ss-text-secondary)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-hover-bg)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
          <Paintbrush size={14} /> 清除格式
        </button>
        <div className="my-1 h-px" style={{ background: 'var(--ss-border-light)' }} />
        <button onClick={() => { onInsertRow(); onClose(); }} className={itemBase} style={{ color: 'var(--ss-text-secondary)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-hover-bg)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
          <Plus size={14} /> 插入行
        </button>
        <button onClick={() => { onDeleteRow(); onClose(); }} className={itemBase} style={{ color: 'var(--ss-text-secondary)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-hover-bg)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
          <Minus size={14} /> 删除行
        </button>
        <button onClick={() => { onInsertCol(); onClose(); }} className={itemBase} style={{ color: 'var(--ss-text-secondary)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-hover-bg)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
          <Plus size={14} /> 插入列
        </button>
        <button onClick={() => { onDeleteCol(); onClose(); }} className={itemBase} style={{ color: 'var(--ss-text-secondary)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-hover-bg)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
          <Minus size={14} /> 删除列
        </button>
      </div>
    </>
  );
}
