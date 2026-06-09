import React from "react";
import { ConversationModal } from "./ConversationModal";
import type { SessionSource } from "./types";

type Props = {
  sessionId: string;
  sessionName?: string | null;
  source: SessionSource;
  initialLineNumber?: number;
};

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
      />
    </svg>
  );
}

export function ViewConversationButton({
  sessionId,
  sessionName,
  source,
  initialLineNumber,
}: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        className="copy-btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="View conversation"
        title="View conversation"
      >
        <EyeIcon />
      </button>
      {open && (
        <ConversationModal
          sessionId={sessionId}
          sessionName={sessionName}
          source={source}
          initialLineNumber={initialLineNumber}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
