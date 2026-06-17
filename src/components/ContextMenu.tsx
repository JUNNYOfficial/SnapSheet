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
  const itemBase = 'block w-full px-4 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100';

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        className="absolute z-50 min-w-[140px] rounded border border-neutral-300 bg-white py-1 shadow-lg"
        style={{ left: x, top: y, fontFamily: 'SimSun, 宋体, SimHei, 黑体, sans-serif' }}
      >
        <button onClick={() => { onCopy(); onClose(); }} className={itemBase}>复制</button>
        <button onClick={() => { onPaste(); onClose(); }} className={itemBase}>粘贴</button>
        <div className="my-1 h-px bg-neutral-200" />
        <button onClick={() => { onClear(); onClose(); }} className={itemBase}>清除</button>
        <button onClick={() => { onClearFormat(); onClose(); }} className={itemBase}>清除格式</button>
        <div className="my-1 h-px bg-neutral-200" />
        <button onClick={() => { onInsertRow(); onClose(); }} className={itemBase}>插入行</button>
        <button onClick={() => { onDeleteRow(); onClose(); }} className={itemBase}>删除行</button>
        <button onClick={() => { onInsertCol(); onClose(); }} className={itemBase}>插入列</button>
        <button onClick={() => { onDeleteCol(); onClose(); }} className={itemBase}>删除列</button>
      </div>
    </>
  );
}
