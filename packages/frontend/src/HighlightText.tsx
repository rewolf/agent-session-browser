import React from "react";
import type { ConversationFindMatch } from "./conversationFind";

type Span = Pick<ConversationFindMatch, "start" | "end" | "globalIndex">;

export function HighlightText({
  text,
  spans,
  activeGlobalIndex,
}: {
  text: string;
  spans: Span[];
  activeGlobalIndex: number | null;
}) {
  if (spans.length === 0) {
    return <>{text}</>;
  }

  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const span of sorted) {
    if (span.start > cursor) {
      parts.push(text.slice(cursor, span.start));
    }
    const isActive =
      activeGlobalIndex != null && span.globalIndex === activeGlobalIndex;
    parts.push(
      <mark
        key={span.globalIndex}
        className={
          isActive
            ? "conversation-find__mark conversation-find__mark--active"
            : "conversation-find__mark"
        }
        data-find-match-index={span.globalIndex}
      >
        {text.slice(span.start, span.end)}
      </mark>
    );
    cursor = span.end;
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return <>{parts}</>;
}

const THINKING_COPY_PREFIX = "Thinking\n";

/** Map match offsets in thinking `blockCopyText` to visible body/summary. */
export function thinkingHighlightSpans(
  spans: Span[],
  activeGlobalIndex: number | null
): { bodySpans: Span[]; summaryActive: boolean } {
  const prefixLen = THINKING_COPY_PREFIX.length;
  const bodySpans: Span[] = [];
  let summaryActive = false;

  for (const span of spans) {
    if (span.end <= prefixLen) {
      if (activeGlobalIndex != null && span.globalIndex === activeGlobalIndex) {
        summaryActive = true;
      }
      continue;
    }
    bodySpans.push({
      globalIndex: span.globalIndex,
      start: Math.max(0, span.start - prefixLen),
      end: span.end - prefixLen,
    });
  }

  return { bodySpans, summaryActive };
}

/** Drop or shift spans past a `blockCopyText` prefix (e.g. tool labels). */
export function spansAfterCopyPrefix(
  prefix: string,
  spans: Span[]
): Span[] {
  const prefixLen = prefix.length;
  return spans
    .filter((span) => span.end > prefixLen)
    .map((span) => ({
      globalIndex: span.globalIndex,
      start: Math.max(0, span.start - prefixLen),
      end: span.end - prefixLen,
    }));
}

export function spansWithinCopyPrefix(
  prefix: string,
  spans: Span[]
): Span[] {
  const prefixLen = prefix.length;
  return spans
    .filter((span) => span.start < prefixLen)
    .map((span) => ({
      globalIndex: span.globalIndex,
      start: span.start,
      end: Math.min(span.end, prefixLen),
    }));
}
