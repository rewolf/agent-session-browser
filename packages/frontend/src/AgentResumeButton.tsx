import React from "react";
import { CheckIcon, CopyIcon, writeClipboard } from "./CopyButton";
import { useProvider } from "./providersContext";
import type { SessionSource } from "./types";

type Props = {
  resumeCommand: string;
  source: SessionSource;
  label?: string;
};

const CLOSE_AFTER_COPY_MS = 1000;

/** Popover display: single-line resume with `\\\n` before the CLI invocation. */
function formatDisplayResumeCommand(command: string): string {
  return command.replace(" && ", " && \\\n");
}

function resumeLabels(source: SessionSource, providerName?: string) {
  const name = providerName ?? source;
  return {
    tooltip: `${name} resume command`,
    ariaLabel: `Show ${name} resume command`,
  };
}

export function AgentResumeButton({
  resumeCommand,
  source,
  label: actionLabel,
}: Props) {
  const provider = useProvider(source);
  const display =
    actionLabel ?? provider?.resumeCommandName ?? provider?.displayName;
  const { tooltip, ariaLabel } = resumeLabels(source, display);

  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const anchorRef = React.useRef<HTMLSpanElement>(null);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const command = React.useMemo(
    () => formatDisplayResumeCommand(resumeCommand),
    [resumeCommand]
  );

  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      const el = anchorRef.current;
      if (el && !el.contains(e.target as Node)) {
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

  const copyCommand = async () => {
    const ok = await writeClipboard(command);
    if (!ok) return;
    setCopied(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, CLOSE_AFTER_COPY_MS);
  };

  const toggleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCopied(false);
    setOpen((v) => !v);
  };

  return (
    <span className="agent-resume-anchor" ref={anchorRef}>
      <button
        type="button"
        className="copy-btn agent-resume-btn"
        onClick={toggleOpen}
        aria-label={ariaLabel}
        aria-expanded={open}
        title={tooltip}
      >
        <ExternalLinkIcon />
      </button>
      {open && (
        <div
          className="agent-resume-popover"
          role="dialog"
          aria-label={ariaLabel}
        >
          <div className="agent-resume-popover__toolbar">
            <span
              className={`agent-resume-popover__copy-icon${copied ? " agent-resume-popover__copy-icon--copied" : ""}`}
              aria-hidden="true"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </span>
          </div>
          <pre
            className="agent-resume-popover__code"
            onClick={() => void copyCommand()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void copyCommand();
              }
            }}
            role="button"
            tabIndex={0}
            title="Click to copy command"
          >
            {command}
          </pre>
        </div>
      )}
    </span>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3zM5 5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7H5V5z"
      />
    </svg>
  );
}
