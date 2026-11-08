import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

export function Sheet({
  open, onClose, title, children, maxHeight = '86%',
}: {
  open: boolean; onClose: () => void; title?: string;
  children: ReactNode; maxHeight?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" style={{ maxHeight }} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" />
        {title && (
          <div className="sheet-head">
            <h3 className="h-section">{title}</h3>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="close" size={18} />
            </button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
