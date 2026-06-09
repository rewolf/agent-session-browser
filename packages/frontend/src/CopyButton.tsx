import React from "react";

type Props = {
  text: string;
  /** Accessible name when idle, e.g. "session ID". */
  label: string;
};

const COPIED_MS = 1400;

export async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
      />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"
      />
    </svg>
  );
}

export function CopyButton({ text, label }: Props) {
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!text) return;
    const ok = await writeClipboard(text);
    if (!ok) return;
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <button
      type="button"
      className={`copy-btn${copied ? " copy-btn--copied" : ""}`}
      onClick={(e) => void handleClick(e)}
      aria-label={copied ? "Copied" : `Copy ${label}`}
      title={copied ? "Copied" : `Copy ${label}`}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

type CopyableCellProps = {
  text: string;
  label: string;
  children: React.ReactNode;
  className?: string;
};

export function CopyableCell({
  text,
  label,
  children,
  className,
}: CopyableCellProps) {
  return (
    <span className={["copyable-cell", className].filter(Boolean).join(" ")}>
      <span className="copyable-cell__value">{children}</span>
      <CopyButton text={text} label={label} />
    </span>
  );
}
