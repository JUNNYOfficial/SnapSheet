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
  const itemBase = 'block w-full px-4 py-1.5 text-left text-sm';

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        className="absolute z-50 min-w-[140px] rounded border py-1 shadow-lg"
        style={{ left: x, top: y, borderColor: 'var(--ss-panel-border)', background: 'var(--ss-panel-bg)' }}
      >
        <button onClick={() => { onCopy(); onClose(); }} className={itemBase} style={{ color: 'var(--ss-toolbar-text)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-toolbar-hover)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>复制</button>
        <button onClick={() => { onPaste(); onClose(); }} className={itemBase} style={{ color: 'var(--ss-toolbar-text)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-toolbar-hover)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>粘贴</button>
        <div className="my-1 h-px" style={{ background: 'var(--ss-toolbar-border)' }} />
        <button onClick={() => { onClear(); onClose(); }} className={itemBase} style={{ color: 'var(--ss-toolbar-text)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-toolbar-hover)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>清除</button>
        <button onClick={() => { onClearFormat(); onClose(); }} className={itemBase} style={{ color: 'var(--ss-toolbar-text)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-toolbar-hover)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>清除格式</button>
        <div className="my-1 h-px" style={{ background: 'var(--ss-toolbar-border)' }} />
        <button onClick={() => { onInsertRow(); onClose(); }} className={itemBase} style={{ color: 'var(--ss-toolbar-text)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-toolbar-hover)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>插入行</button>
        <button onClick={() => { onDeleteRow(); onClose(); }} className={itemBase} style={{ color: 'var(--ss-toolbar-text)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-toolbar-hover)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>删除行</button>
        <button onClick={() => { onInsertCol(); onClose(); }} className={itemBase} style={{ color: 'var(--ss-toolbar-text)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-toolbar-hover)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>插入列</button>
        <button onClick={() => { onDeleteCol(); onClose(); }} className={itemBase} style={{ color: 'var(--ss-toolbar-text)' }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ss-toolbar-hover)'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>删除列</button>
      </div>
    </>
  );
}
