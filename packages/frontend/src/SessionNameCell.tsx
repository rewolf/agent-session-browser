import React from "react";

type Props = {
  name: string | null | undefined;
  alias: string | undefined;
  onAliasChange: (alias: string | undefined) => void;
};

export function SessionNameCell({ name, alias, onAliasChange }: Props) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cancelingRef = React.useRef(false);

  const original = name?.trim() ?? "";
  const hasOriginal = original.length > 0;
  const hasAlias = alias !== undefined && alias.length > 0;

  const startEdit = () => {
    setDraft(alias ?? "");
    setEditing(true);
  };

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    if (cancelingRef.current) {
      cancelingRef.current = false;
      return;
    }
    const trimmed = draft.trim();
    onAliasChange(trimmed.length > 0 ? trimmed : undefined);
    setEditing(false);
  };

  const cancel = () => {
    cancelingRef.current = true;
    setDraft(alias ?? "");
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="session-name-cell session-name-cell--editing">
        <input
          ref={inputRef}
          className="cyber-input session-name-cell__input"
          value={draft}
          aria-label="Session alias"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
        />
      </span>
    );
  }

  let label: React.ReactNode;
  if (hasAlias && hasOriginal) {
    label = (
      <>
        {alias} ({original})
      </>
    );
  } else if (hasAlias) {
    label = alias;
  } else if (hasOriginal) {
    label = original;
  } else {
    label = <span className="muted">(no name)</span>;
  }

  return (
    <span className="session-name-cell">
      <span className="session-name-cell__label">{label}</span>
      <button
        type="button"
        className="copy-btn session-name-cell__edit"
        aria-label="Edit alias"
        title="Edit alias"
        onClick={(e) => {
          e.stopPropagation();
          startEdit();
        }}
      >
        <PencilIcon />
      </button>
    </span>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      />
    </svg>
  );
}
