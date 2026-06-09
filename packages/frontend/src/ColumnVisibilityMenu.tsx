import React from "react";

type Props = {
  metadataVisible: boolean;
  onMetadataVisibleChange: (visible: boolean) => void;
};

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ColumnVisibilityMenu({
  metadataVisible,
  onMetadataVisibleChange,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLSpanElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const onPointer = (e: MouseEvent) => {
      const anchor = anchorRef.current;
      if (anchor && !anchor.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
  }, [open]);

  const toggleOpen = () => setOpen((v) => !v);

  return (
    <span className="column-visibility-anchor" ref={anchorRef}>
      <button
        type="button"
        className="copy-btn column-visibility-btn"
        onClick={toggleOpen}
        aria-label="Column visibility"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <ColumnsIcon />
      </button>
      {open && (
        <div
          ref={panelRef}
          className="column-visibility-popover cyber-glow-border"
          role="dialog"
          aria-label="Column visibility"
        >
          <label className="column-visibility-row">
            <input
              type="checkbox"
              checked={metadataVisible}
              onChange={(e) => onMetadataVisibleChange(e.target.checked)}
            />
            Metadata
          </label>
        </div>
      )}
    </span>
  );
}

function ColumnsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M3 5h4v14H3V5zm7 0h4v14h-4V5zm7 0h4v14h-4V5z"
      />
    </svg>
  );
}
