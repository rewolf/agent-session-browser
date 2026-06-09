import type { ApiSession } from "./types";
import {
  getSessionAlias,
  isSessionBookmarked,
  type SessionAnnotationsMap,
} from "./sessionAnnotations";

export function sessionMatchesTextQ(
  session: ApiSession,
  q: string,
  annotations: SessionAnnotationsMap
): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  if (session.sessionId.toLowerCase().includes(needle)) {
    return true;
  }
  if (session.name?.toLowerCase().includes(needle)) {
    return true;
  }
  const alias = getSessionAlias(annotations, session.source, session.sessionId);
  if (alias?.toLowerCase().includes(needle)) {
    return true;
  }
  return false;
}

export function filterSessionsByTextQ(
  sessions: ApiSession[],
  q: string,
  annotations: SessionAnnotationsMap
): ApiSession[] {
  const trimmed = q.trim();
  if (!trimmed) {
    return sessions;
  }
  return sessions.filter((s) => sessionMatchesTextQ(s, trimmed, annotations));
}

export function filterSessionsStarredOnly(
  sessions: ApiSession[],
  starredOnly: boolean,
  annotations: SessionAnnotationsMap
): ApiSession[] {
  if (!starredOnly) {
    return sessions;
  }
  return sessions.filter((s) =>
    isSessionBookmarked(annotations, s.source, s.sessionId)
  );
}
