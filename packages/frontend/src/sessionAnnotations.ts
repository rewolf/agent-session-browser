export const SESSION_ANNOTATIONS_STORAGE_KEY = "asb.sessionAnnotations";

export type SessionAnnotation = {
  bookmarked?: boolean;
  alias?: string;
};

export type SessionAnnotationsMap = Record<string, SessionAnnotation>;

export function sessionAnnotationKey(source: string, sessionId: string): string {
  return `${source}:${sessionId}`;
}

export function readSessionAnnotations(): SessionAnnotationsMap {
  try {
    const raw = localStorage.getItem(SESSION_ANNOTATIONS_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const out: SessionAnnotationsMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        continue;
      }
      const entry: SessionAnnotation = {};
      if (typeof value.bookmarked === "boolean") {
        entry.bookmarked = value.bookmarked;
      }
      if (typeof value.alias === "string") {
        entry.alias = value.alias;
      }
      if (entry.bookmarked !== undefined || entry.alias !== undefined) {
        out[key] = entry;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function writeSessionAnnotations(map: SessionAnnotationsMap): void {
  try {
    localStorage.setItem(SESSION_ANNOTATIONS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function getSessionAnnotation(
  map: SessionAnnotationsMap,
  source: string,
  sessionId: string
): SessionAnnotation | undefined {
  return map[sessionAnnotationKey(source, sessionId)];
}

export function isSessionBookmarked(
  map: SessionAnnotationsMap,
  source: string,
  sessionId: string
): boolean {
  return getSessionAnnotation(map, source, sessionId)?.bookmarked === true;
}

export function getSessionAlias(
  map: SessionAnnotationsMap,
  source: string,
  sessionId: string
): string | undefined {
  const alias = getSessionAnnotation(map, source, sessionId)?.alias;
  if (alias === undefined) {
    return undefined;
  }
  const trimmed = alias.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function setSessionBookmarked(
  map: SessionAnnotationsMap,
  source: string,
  sessionId: string,
  bookmarked: boolean
): SessionAnnotationsMap {
  const key = sessionAnnotationKey(source, sessionId);
  const next = { ...map };
  const existing = { ...next[key] };

  if (bookmarked) {
    existing.bookmarked = true;
    next[key] = existing;
  } else {
    delete existing.bookmarked;
    if (existing.alias === undefined) {
      delete next[key];
    } else {
      next[key] = existing;
    }
  }

  return next;
}

export function setSessionAlias(
  map: SessionAnnotationsMap,
  source: string,
  sessionId: string,
  alias: string | undefined
): SessionAnnotationsMap {
  const key = sessionAnnotationKey(source, sessionId);
  const next = { ...map };
  const existing = { ...next[key] };
  const trimmed = alias?.trim() ?? "";

  if (trimmed.length > 0) {
    existing.alias = trimmed;
    next[key] = existing;
  } else {
    delete existing.alias;
    if (existing.bookmarked !== true) {
      delete next[key];
    } else {
      next[key] = existing;
    }
  }

  return next;
}
