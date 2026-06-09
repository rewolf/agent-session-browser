export type {
  Session,
  SessionFilter,
  NavTreeNode,
  SessionSource,
  MetadataKeyDescriptor,
} from "./types.js";
export {
  parseMetadataFilterFromQuery,
  parseMetadataFilterFromCliPairs,
} from "./metadata-filter.js";
export { resolveSystemUsername } from "./system.js";
export {
  defaultClaudeProjectsDir,
  resolveClaudeProjectsDir,
  fileUriToPath,
  readWorkspaceJsonRoots,
} from "./paths.js";
export type { WorkspaceRoot } from "./paths.js";
export { parseComposerSessions } from "./composer.js";
export {
  uniqueWorkspacePaths,
  filterSessions,
  findSessionById,
  dedupeSessionsByNewestUpdated,
} from "./session-filters.js";
export { formatResumeCommand, shellQuoteToken } from "./resume-command.js";
export {
  formatAcceptedSourceList,
  parseSourceFilter,
  parseSourceQueryParam,
  sessionFilterForSource,
  type SourceFilterArg,
} from "./source-filter.js";
export {
  defaultCursorProjectsDir,
  resolveCursorProjectsDir,
  slugToWorkspacePath,
  scanCursorTranscriptSessions,
  mergeCursorDbAndTranscriptSessions,
} from "./cursor-provider.js";
export {
  hashedPathToWorkspacePath,
  scanClaudeSessions,
} from "./claude-provider.js";
export { hashedDirToWorkspacePath } from "./hashed-dir-path.js";
export {
  deriveSessionTitleFromJsonl,
  deriveSessionTitleFromJsonlAsync,
} from "./session-title.js";
export type {
  TranscriptConversation,
  TranscriptConversationMessage,
  TranscriptContentBlock,
} from "./transcript-conversation.js";
export {
  loadSessionConversation,
  loadSessionConversationBySource,
  parseJsonlConversationLine,
  stripUserQueryTags,
} from "./transcript-conversation.js";
export type { SidechainThreadIndex } from "./sidechain-threads.js";
export { indexSidechainThreads } from "./sidechain-threads.js";
export type {
  TranscriptLineHit,
  SearchTranscriptLinesOptions,
  TranscriptJsonlRef,
} from "./transcript-search.js";
export {
  searchTranscriptLines,
  extractJsonlLineRole,
  extractJsonlLineMessageTime,
  parseJsonlLine,
  hitSortKey,
  compareTranscriptHitsNewestFirst,
  listAllTranscriptJsonlFiles,
  coerceTimestampMs,
} from "./transcript-search.js";
export type { ParsedJsonlLine } from "./transcript-search.js";
export {
  buildNavTree,
  buildFlatNavTree,
  buildExternalIdNavTree,
  buildGroupedNavTree,
  buildNavTreeForSessions,
  collapseNavTree,
  longestCommonPathPrefix,
} from "./nav-tree.js";
export type {
  SessionProvider,
  TranscriptFileRef,
  DefaultProviderRegistryOptions,
  ScanResult,
  ScanUnavailable,
  HealthStatus,
  WorkspaceGrouping,
  PrimaryAction,
  UnavailableReason,
} from "./provider.js";
export { ProviderRegistry } from "./provider.js";
export { withScanCache } from "./scan-cache.js";
export {
  resolvePrimaryActions,
  commandPrimaryAction,
  DEFAULT_RESUME_ACTION_ID,
} from "./primary-actions.js";
export type {
  BrowserData,
  LoadSessionsResult,
  ProviderUnavailable,
} from "./session-load.js";
export {
  loadAllSessions,
  loadBrowserData,
  browserDataFromSessions,
  resolveProviderHealth,
} from "./session-load.js";
export {
  createDefaultProviders,
  defaultProviderRegistry,
} from "./provider-defaults.js";
export type { ProviderDescriptor } from "./provider-descriptor.js";
export {
  providerToDescriptor,
  providersToDescriptors,
} from "./provider-descriptor.js";
export { CursorSessionProvider } from "./cursor-provider.js";
export { ClaudeSessionProvider } from "./claude-provider.js";

import path from "node:path";
import type { Session, SessionFilter } from "./types.js";
import { filterSessions } from "./session-filters.js";
import type { ProviderRegistry } from "./provider.js";

/** Filter sessions for API handlers; `registry` is required for source validation. */
export function filterSessionsForApi(
  sessions: Session[],
  f: SessionFilter,
  registry: ProviderRegistry
): Session[] {
  return filterSessions(sessions, f, registry);
}

/** Sessions whose workspace path is under the given prefix directory (inclusive). */
export function sessionsUnderPath(
  sessions: Session[],
  pathPrefix: string
): Session[] {
  const p = path.normalize(pathPrefix);
  return sessions.filter((s) =>
    s.workspaceRoots.some(
      (r) => r === p || r.startsWith(p + path.sep)
    )
  );
}
