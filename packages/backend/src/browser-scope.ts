import {
  buildNavTreeForSessions,
  filterSessions,
  uniqueWorkspacePaths,
  type BrowserData,
  type ProviderRegistry,
} from "@asb/core";
import {
  sessionFilterForSource,
  type SourceFilterArg,
} from "./source-query.js";

export function scopeBrowserData(
  data: BrowserData,
  source: SourceFilterArg,
  registry: ProviderRegistry
): BrowserData {
  const sessions =
    source === "all"
      ? data.sessions
      : filterSessions(
          data.sessions,
          sessionFilterForSource(source),
          registry
        );
  const workspaces = uniqueWorkspacePaths(sessions);
  return {
    ...data,
    sessions,
    workspaces,
    navTree: buildNavTreeForSessions(sessions, registry),
  };
}
