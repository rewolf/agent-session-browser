import React from "react";
import { createPortal } from "react-dom";
import { fetchSessionConversation } from "./api";
import { CopyButton } from "./CopyButton";
import { formatLocaleDateTime } from "./format";
import {
  collectConversationFindMatches,
  groupFindMatchesByLine,
  wrapFindIndex,
  type ConversationFindMatch,
} from "./conversationFind";
import {
  HighlightText,
  spansAfterCopyPrefix,
  spansWithinCopyPrefix,
  thinkingHighlightSpans,
} from "./HighlightText";
import { blockCopyText, messageCopyText } from "./messageContent";
import { MessageMarkdown } from "./MessageMarkdown";
import { SourceBadge } from "./SourceBadge";
import {
  blocksForDisplay,
  buildConversationDialogItems,
  findMessageByLineNumber,
  resolveMinimumFiltersForMessage,
  sidechainParentUuidForLine,
  type MessageOrder,
} from "./conversationDialogFilters";
import { indexSidechainThreads } from "./sidechainThreads";
import type {
  SessionSource,
  TranscriptContentBlock,
  TranscriptConversation,
  TranscriptConversationMessage,
} from "./types";

type Props = {
  sessionId: string;
  sessionName?: string | null;
  source: SessionSource;
  onClose: () => void;
  initialLineNumber?: number;
};

export function ConversationModal({
  sessionId,
  sessionName,
  source,
  onClose,
  initialLineNumber,
}: Props) {
  const [conversation, setConversation] =
    React.useState<TranscriptConversation | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showToolUsages, setShowToolUsages] = React.useState(false);
  const [showRedacted, setShowRedacted] = React.useState(false);
  const [messageOrder, setMessageOrder] =
    React.useState<MessageOrder>("chronological");
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const conversationDialogRef = React.useRef<HTMLDivElement>(null);
  const [lineFiltersReady, setLineFiltersReady] = React.useState(
    initialLineNumber == null
  );
  const [scrollToLineDone, setScrollToLineDone] = React.useState(false);
  const [sidechainParentToOpen, setSidechainParentToOpen] = React.useState<
    string | undefined
  >(undefined);
  const [findQuery, setFindQuery] = React.useState("");
  const [activeFindIndex, setActiveFindIndex] = React.useState(0);
  const findInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchSessionConversation(sessionId, source)
      .then((c) => {
        if (!cancelled) {
          setConversation(c);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, source]);

  React.useEffect(() => {
    setLineFiltersReady(initialLineNumber == null);
    setScrollToLineDone(false);
    setSidechainParentToOpen(undefined);
    setShowToolUsages(false);
    setShowRedacted(false);
    setFindQuery("");
    setActiveFindIndex(0);
  }, [sessionId, source, initialLineNumber]);

  React.useEffect(() => {
    if (
      loading ||
      !conversation ||
      initialLineNumber == null ||
      lineFiltersReady
    ) {
      return;
    }
    const target = findMessageByLineNumber(
      conversation.messages,
      initialLineNumber
    );
    if (!target) {
      setLineFiltersReady(true);
      return;
    }
    const parentUuid = sidechainParentUuidForLine(
      conversation.messages,
      initialLineNumber
    );
    if (parentUuid) {
      setSidechainParentToOpen(parentUuid);
    }
    const needed = resolveMinimumFiltersForMessage(target);
    if (!showToolUsages && needed.showToolUsages) {
      setShowToolUsages(true);
    }
    if (!showRedacted && needed.showRedacted) {
      setShowRedacted(true);
    }
    setLineFiltersReady(true);
  }, [
    loading,
    conversation,
    initialLineNumber,
    lineFiltersReady,
    showToolUsages,
    showRedacted,
  ]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") {
        return;
      }
      const findFocused =
        findInputRef.current != null &&
        document.activeElement === findInputRef.current;
      if (findQuery.trim() || findFocused) {
        e.preventDefault();
        e.stopPropagation();
        if (findFocused) {
          findInputRef.current?.blur();
        }
        setFindQuery("");
        setActiveFindIndex(0);
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, findQuery]);

  React.useEffect(() => {
    dialogRef.current?.focus();
  }, [loading, error, conversation]);

  const title =
    sessionName?.trim() ||
    conversation?.sessionName?.trim() ||
    sessionId;

  const threadIndex = React.useMemo(() => {
    if (!conversation) {
      return null;
    }
    return indexSidechainThreads(conversation.messages);
  }, [conversation]);

  const dialogItems = React.useMemo(() => {
    if (!conversation || !threadIndex) {
      return [];
    }
    return buildConversationDialogItems(
      threadIndex.topLevel,
      showToolUsages,
      showRedacted,
      messageOrder
    );
  }, [conversation, threadIndex, showToolUsages, showRedacted, messageOrder]);

  const findMatches = React.useMemo(() => {
    if (!threadIndex || !findQuery.trim()) {
      return [];
    }
    return collectConversationFindMatches(
      dialogItems,
      threadIndex,
      showToolUsages,
      showRedacted,
      findQuery
    );
  }, [
    dialogItems,
    threadIndex,
    showToolUsages,
    showRedacted,
    findQuery,
  ]);

  const findMatchesByLine = React.useMemo(
    () => groupFindMatchesByLine(findMatches),
    [findMatches]
  );

  const activeMatch =
    findMatches.length > 0
      ? findMatches[wrapFindIndex(activeFindIndex, findMatches.length)]
      : undefined;
  const activeGlobalIndex = activeMatch?.globalIndex ?? null;

  React.useEffect(() => {
    setActiveFindIndex(0);
  }, [findQuery, showToolUsages, showRedacted, messageOrder, sessionId, source]);

  React.useEffect(() => {
    if (!findQuery.trim() || findMatches.length === 0 || !activeMatch) {
      return;
    }
    if (activeMatch.parentUuid) {
      setSidechainParentToOpen(activeMatch.parentUuid);
    }
    let cancelled = false;
    let attempts = 0;
    const tryScroll = () => {
      if (cancelled) {
        return;
      }
      const el = document.querySelector<HTMLElement>(
        `[data-find-match-index="${activeMatch.globalIndex}"]`
      );
      if (!el && activeMatch.parentUuid && attempts < 120) {
        attempts += 1;
        requestAnimationFrame(tryScroll);
        return;
      }
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    requestAnimationFrame(tryScroll);
    return () => {
      cancelled = true;
    };
  }, [
    activeFindIndex,
    findMatches,
    findQuery,
    activeMatch?.globalIndex,
    activeMatch?.parentUuid,
  ]);

  React.useEffect(() => {
    if (
      loading ||
      error ||
      !conversation ||
      initialLineNumber == null ||
      !lineFiltersReady ||
      scrollToLineDone ||
      dialogItems.length === 0
    ) {
      return;
    }
    const root = conversationDialogRef.current;
    if (!root) {
      return;
    }

    const awaitingSidechainChild = Boolean(
      sidechainParentUuidForLine(conversation.messages, initialLineNumber)
    );
    const maxAttempts = awaitingSidechainChild ? 120 : 0;
    let attempts = 0;
    let cancelled = false;
    let highlightTimer: number | undefined;

    const tryScrollToLine = () => {
      if (cancelled) {
        return;
      }
      const turn = root.querySelector<HTMLElement>(
        `[data-line-number="${initialLineNumber}"]`
      );
      if (!turn) {
        if (awaitingSidechainChild && attempts < maxAttempts) {
          attempts += 1;
          requestAnimationFrame(tryScrollToLine);
          return;
        }
        setScrollToLineDone(true);
        return;
      }
      turn.scrollIntoView({ block: "center", behavior: "smooth" });
      turn.classList.add("conversation-turn--highlight");
      highlightTimer = window.setTimeout(() => {
        turn.classList.remove("conversation-turn--highlight");
      }, 2500);
      setScrollToLineDone(true);
    };

    tryScrollToLine();

    return () => {
      cancelled = true;
      if (highlightTimer != null) {
        window.clearTimeout(highlightTimer);
      }
    };
  }, [
    loading,
    error,
    conversation,
    initialLineNumber,
    lineFiltersReady,
    scrollToLineDone,
    dialogItems,
    sidechainParentToOpen,
  ]);

  return createPortal(
    <div
      className="conversation-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="conversation-modal cyber-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conversation-modal-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="conversation-modal__header">
          <div className="conversation-modal__title-wrap">
            <h2 id="conversation-modal-title">{title}</h2>
            <p className="conversation-modal__meta">
              <SourceBadge source={conversation?.source ?? source} />
              {" · "}
              <code className="session-id">{sessionId}</code>
              {conversation?.workspacePath && (
                <>
                  {" · "}
                  <span title={conversation.workspacePath}>
                    {conversation.workspaceLeaf}
                  </span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            className="conversation-modal__close"
            onClick={onClose}
            aria-label="Close conversation"
          >
            ×
          </button>
        </header>
        {!loading && !error && conversation && conversation.messages.length > 0 && (
          <div className="conversation-modal__toolbar">
            <fieldset className="conversation-modal__order">
              <legend className="conversation-modal__order-legend">
                Message order
              </legend>
              <label className="conversation-modal__order-option">
                <input
                  type="radio"
                  name="conversation-message-order"
                  checked={messageOrder === "chronological"}
                  onChange={() => setMessageOrder("chronological")}
                />
                Oldest first
              </label>
              <label className="conversation-modal__order-option">
                <input
                  type="radio"
                  name="conversation-message-order"
                  checked={messageOrder === "reverse"}
                  onChange={() => setMessageOrder("reverse")}
                />
                Newest first
              </label>
            </fieldset>
            <label className="conversation-modal__toggle">
              <input
                type="checkbox"
                checked={showToolUsages}
                onChange={(e) => setShowToolUsages(e.target.checked)}
              />
              Show tool usages
            </label>
            <label className="conversation-modal__toggle">
              <input
                type="checkbox"
                checked={showRedacted}
                onChange={(e) => setShowRedacted(e.target.checked)}
              />
              Show redacted
            </label>
            <ConversationFindBar
              findQuery={findQuery}
              onFindQueryChange={setFindQuery}
              findInputRef={findInputRef}
              matchCount={findMatches.length}
              activePosition={
                findQuery.trim() && findMatches.length > 0
                  ? wrapFindIndex(activeFindIndex, findMatches.length) + 1
                  : 0
              }
              onNext={() =>
                setActiveFindIndex((i) =>
                  wrapFindIndex(i + 1, findMatches.length)
                )
              }
              onPrevious={() =>
                setActiveFindIndex((i) =>
                  wrapFindIndex(i - 1, findMatches.length)
                )
              }
            />
          </div>
        )}
        <div className="conversation-dialog" ref={conversationDialogRef}>
          {loading && (
            <div className="conversation-dialog__status">Loading…</div>
          )}
          {error && (
            <div className="conversation-dialog__status conversation-dialog__status--error">
              {error}
            </div>
          )}
          {!loading && !error && conversation && (
            <>
              {conversation.messages.length === 0 ? (
                <div className="conversation-dialog__status muted">
                  This transcript has no messages.
                </div>
              ) : dialogItems.length === 0 ? (
                <div className="conversation-dialog__status muted">
                  No messages to show with current filters. Try enabling
                  &ldquo;Show tool usages&rdquo; or &ldquo;Show redacted&rdquo;.
                </div>
              ) : (
                dialogItems.map((item, i) =>
                  item.kind === "redacted-gap" ? (
                    <RedactedMessagesBubble
                      key={`redacted-gap-${i}-${item.count}`}
                      count={item.count}
                    />
                  ) : (
                    <ConversationTurn
                      key={item.message.lineNumber}
                      message={item.message}
                      systemUsername={
                        conversation.systemUsername || "user"
                      }
                      sidechainChildren={
                        item.message.uuid
                          ? threadIndex?.childrenByParentUuid.get(
                              item.message.uuid
                            )
                          : undefined
                      }
                      showToolUsages={showToolUsages}
                      showRedacted={showRedacted}
                      defaultSidechainOpen={
                        item.message.uuid != null &&
                        item.message.uuid === sidechainParentToOpen
                      }
                      findQuery={findQuery}
                      findMatchesByLine={findMatchesByLine}
                      activeGlobalIndex={activeGlobalIndex}
                    />
                  )
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ConversationFindBar({
  findQuery,
  onFindQueryChange,
  findInputRef,
  matchCount,
  activePosition,
  onNext,
  onPrevious,
}: {
  findQuery: string;
  onFindQueryChange: (value: string) => void;
  findInputRef: React.RefObject<HTMLInputElement | null>;
  matchCount: number;
  activePosition: number;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const hasQuery = findQuery.trim().length > 0;
  const navDisabled = !hasQuery || matchCount === 0;
  const counterLabel = !hasQuery
    ? "Find in conversation"
    : matchCount === 0
      ? "0 of 0 matches"
      : `${activePosition} of ${matchCount}`;

  return (
    <div className="conversation-modal__find">
      <label className="conversation-modal__find-field">
        <span className="visually-hidden">Find in conversation</span>
        <span className="conversation-modal__find-input-wrap">
          <input
            ref={findInputRef}
            type="search"
            className="cyber-input conversation-modal__find-input"
            value={findQuery}
            onChange={(e) => onFindQueryChange(e.target.value)}
            placeholder="Find in conversation…"
            aria-label="Find in conversation"
          />
          {findQuery ? (
            <button
              type="button"
              className="conversation-modal__find-clear"
              aria-label="Clear find"
              onClick={() => onFindQueryChange("")}
            >
              ✕
            </button>
          ) : null}
        </span>
      </label>
      <span
        className="conversation-modal__find-count"
        aria-live="polite"
        aria-atomic="true"
      >
        {counterLabel}
      </span>
      <button
        type="button"
        className="cyber-btn conversation-modal__find-nav"
        onClick={onPrevious}
        disabled={navDisabled}
        aria-label="Previous match"
      >
        Previous
      </button>
      <button
        type="button"
        className="cyber-btn conversation-modal__find-nav"
        onClick={onNext}
        disabled={navDisabled}
        aria-label="Next match"
      >
        Next
      </button>
    </div>
  );
}

const REDACTED_GAP_TOOLTIP =
  "Some Cursor transcripts include turns whose entire body is only \"[REDACTED]\". " +
  "They are collapsed here to cut down noise. Enable \"Show redacted\" in the toolbar to view them.";

function RedactedMessagesBubble({ count }: { count: number }) {
  const label =
    count === 1
      ? "1 redacted message hidden"
      : `${count} redacted messages hidden`;
  return (
    <div
      className="conversation-redacted-gap"
      role="status"
      title={REDACTED_GAP_TOOLTIP}
      aria-label={`${label}. ${REDACTED_GAP_TOOLTIP}`}
    >
      {label}
    </div>
  );
}

function formatRoleLabel(role: string, systemUsername: string): string {
  if (role === "user") {
    return systemUsername;
  }
  return role;
}

type MessageViewMode = "rich" | "raw";

function ConversationTurn({
  message,
  systemUsername,
  sidechainChildren,
  showToolUsages,
  showRedacted,
  defaultSidechainOpen = false,
  findQuery = "",
  findMatchesByLine,
  activeGlobalIndex = null,
}: {
  message: TranscriptConversationMessage;
  systemUsername: string;
  sidechainChildren?: TranscriptConversationMessage[];
  showToolUsages: boolean;
  showRedacted: boolean;
  defaultSidechainOpen?: boolean;
  findQuery?: string;
  findMatchesByLine?: Map<number, Map<number, ConversationFindMatch[]>>;
  activeGlobalIndex?: number | null;
}) {
  const [viewMode, setViewMode] = React.useState<MessageViewMode>("rich");
  const [sidechainOpen, setSidechainOpen] = React.useState(defaultSidechainOpen);

  React.useEffect(() => {
    if (defaultSidechainOpen) {
      setSidechainOpen(true);
    }
  }, [defaultSidechainOpen]);
  const copyText = React.useMemo(
    () => messageCopyText(message.blocks),
    [message.blocks]
  );
  const childCount = sidechainChildren?.length ?? 0;
  const lineFindBlocks = findMatchesByLine?.get(message.lineNumber);
  const highlighting = findQuery.trim().length > 0;

  const role = message.role ?? "unknown";
  const roleClass =
    role === "user"
      ? "conversation-turn--user"
      : role === "assistant"
        ? "conversation-turn--assistant"
        : role === "system"
          ? "conversation-turn--system"
          : "conversation-turn--other";

  return (
    <article
      className={`conversation-turn ${roleClass}`}
      data-line-number={message.lineNumber}
    >
      <div
        className="conversation-turn__toolbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="conversation-view-toggle"
          role="group"
          aria-label="Message view mode"
        >
          <button
            type="button"
            className={viewMode === "raw" ? "active" : undefined}
            aria-pressed={viewMode === "raw"}
            onClick={() => setViewMode("raw")}
          >
            Raw
          </button>
          <button
            type="button"
            className={viewMode === "rich" ? "active" : undefined}
            aria-pressed={viewMode === "rich"}
            onClick={() => setViewMode("rich")}
          >
            Rich
          </button>
        </div>
        <CopyButton text={copyText} label="message" />
      </div>
      <header className="conversation-turn__head">
        <span className="conversation-turn__role">
          {formatRoleLabel(role, systemUsername)}
        </span>
        {message.messageAt != null && message.messageAt > 0 && (
          <time
            className="conversation-turn__time"
            dateTime={new Date(message.messageAt).toISOString()}
          >
            {formatLocaleDateTime(message.messageAt)}
          </time>
        )}
        {message.isSidechain && (
          <span
            className="conversation-turn__sidechain-badge"
            title="Subagent (sidechain) turn"
          >
            Subagent
          </span>
        )}
        <span className="conversation-turn__line muted">#{message.lineNumber}</span>
      </header>
      <div className="conversation-turn__body">
        {message.blocks.map((block, i) => (
          <ContentBlock
            key={i}
            block={block}
            viewMode={viewMode}
            findSpans={
              highlighting ? lineFindBlocks?.get(i) : undefined
            }
            activeGlobalIndex={activeGlobalIndex}
          />
        ))}
      </div>
      {childCount > 0 && (
        <div className="conversation-sidechain">
          <button
            type="button"
            className="conversation-sidechain__toggle cyber-btn"
            aria-expanded={sidechainOpen}
            onClick={() => setSidechainOpen((v) => !v)}
          >
            {sidechainOpen ? "Hide" : "Show"} subagent thread ({childCount})
          </button>
          {sidechainOpen && (
            <div className="conversation-sidechain__thread">
              {sidechainChildren!.map((child) => {
                const blocks = blocksForDisplay(
                  child.blocks,
                  showToolUsages,
                  showRedacted
                );
                if (blocks.length === 0) {
                  return null;
                }
                return (
                  <ConversationTurn
                    key={child.lineNumber}
                    message={{ ...child, blocks }}
                    systemUsername={systemUsername}
                    showToolUsages={showToolUsages}
                    showRedacted={showRedacted}
                    findQuery={findQuery}
                    findMatchesByLine={findMatchesByLine}
                    activeGlobalIndex={activeGlobalIndex}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function ContentBlock({
  block,
  viewMode,
  findSpans,
  activeGlobalIndex = null,
}: {
  block: TranscriptContentBlock;
  viewMode: MessageViewMode;
  findSpans?: ConversationFindMatch[];
  activeGlobalIndex?: number | null;
}) {
  const spans = findSpans ?? [];
  const spanPick = spans.map((s) => ({
    start: s.start,
    end: s.end,
    globalIndex: s.globalIndex,
  }));

  if (block.type === "text") {
    const body =
      spanPick.length > 0 ? (
        <HighlightText
          text={block.text}
          spans={spanPick}
          activeGlobalIndex={activeGlobalIndex}
        />
      ) : (
        block.text
      );
    if (viewMode === "raw") {
      return (
        <pre className="conversation-block conversation-block--text">{body}</pre>
      );
    }
    return (
      <div className="conversation-block conversation-block--markdown">
        {spanPick.length > 0 ? (
          <div className="conversation-markdown">{body}</div>
        ) : (
          <MessageMarkdown text={block.text} />
        )}
      </div>
    );
  }
  if (block.type === "thinking") {
    const { bodySpans, summaryActive } = thinkingHighlightSpans(
      spanPick,
      activeGlobalIndex
    );
    const thinkingDetailsOpen =
      summaryActive ||
      (activeGlobalIndex != null &&
        bodySpans.some((s) => s.globalIndex === activeGlobalIndex));
    const thinkingBody =
      bodySpans.length > 0 ? (
        <HighlightText
          text={block.thinking}
          spans={bodySpans}
          activeGlobalIndex={activeGlobalIndex}
        />
      ) : (
        block.thinking
      );
    if (viewMode === "raw") {
      return (
        <pre className="conversation-block conversation-block--thinking">
          {thinkingBody}
        </pre>
      );
    }
    return (
      <details
        className="conversation-block conversation-block--thinking"
        open={thinkingDetailsOpen || undefined}
      >
        <summary
          className={
            summaryActive ? "conversation-find__summary--active" : undefined
          }
        >
          Thinking…
        </summary>
        <div className="conversation-block--thinking-body">
          {bodySpans.length > 0 ? (
            <div className="conversation-markdown">{thinkingBody}</div>
          ) : (
            <MessageMarkdown text={block.thinking} />
          )}
        </div>
      </details>
    );
  }
  if (block.type === "tool_use") {
    const labelText = `Tool: ${block.name}`;
    const copyPrefix = `${labelText}\n`;
    const labelSpans = spansWithinCopyPrefix(copyPrefix, spanPick).filter(
      (s) => s.start < labelText.length
    );
    const detailSpans = spansAfterCopyPrefix(copyPrefix, spanPick);
    return (
      <div className="conversation-block conversation-block--tool">
        <div className="conversation-block__label">
          {labelSpans.length > 0 ? (
            <HighlightText
              text={labelText}
              spans={labelSpans}
              activeGlobalIndex={activeGlobalIndex}
            />
          ) : (
            labelText
          )}
        </div>
        <pre>
          {detailSpans.length > 0 ? (
            <HighlightText
              text={block.detail}
              spans={detailSpans}
              activeGlobalIndex={activeGlobalIndex}
            />
          ) : (
            block.detail
          )}
        </pre>
      </div>
    );
  }
  if (block.type === "tool_result") {
    const labelText = "Tool result";
    const copyPrefix = `${labelText}\n`;
    const labelSpans = spansWithinCopyPrefix(copyPrefix, spanPick).filter(
      (s) => s.start < labelText.length
    );
    const detailSpans = spansAfterCopyPrefix(copyPrefix, spanPick);
    return (
      <div className="conversation-block conversation-block--tool-result">
        <div className="conversation-block__label">
          {labelSpans.length > 0 ? (
            <HighlightText
              text={labelText}
              spans={labelSpans}
              activeGlobalIndex={activeGlobalIndex}
            />
          ) : (
            labelText
          )}
        </div>
        <pre>
          {detailSpans.length > 0 ? (
            <HighlightText
              text={block.detail}
              spans={detailSpans}
              activeGlobalIndex={activeGlobalIndex}
            />
          ) : (
            block.detail
          )}
        </pre>
      </div>
    );
  }
  const labelText = block.label;
  const copyPrefix = `${labelText}\n`;
  const labelSpans = spansWithinCopyPrefix(copyPrefix, spanPick).filter(
    (s) => s.start < labelText.length
  );
  const detailSpans = spansAfterCopyPrefix(copyPrefix, spanPick);
  return (
    <div className="conversation-block conversation-block--other">
      <div className="conversation-block__label">
        {labelSpans.length > 0 ? (
          <HighlightText
            text={labelText}
            spans={labelSpans}
            activeGlobalIndex={activeGlobalIndex}
          />
        ) : (
          labelText
        )}
      </div>
      <pre>
        {detailSpans.length > 0 ? (
          <HighlightText
            text={block.detail}
            spans={detailSpans}
            activeGlobalIndex={activeGlobalIndex}
          />
        ) : (
          block.detail
        )}
      </pre>
    </div>
  );
}
