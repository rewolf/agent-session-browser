import React from "react";
import {
  readSessionAnnotations,
  setSessionAlias,
  setSessionBookmarked,
  writeSessionAnnotations,
  type SessionAnnotationsMap,
} from "./sessionAnnotations";

export function useSessionAnnotations(): [
  SessionAnnotationsMap,
  {
    toggleBookmark: (source: string, sessionId: string) => void;
    setAlias: (
      source: string,
      sessionId: string,
      alias: string | undefined
    ) => void;
  },
] {
  const [annotations, setAnnotations] = React.useState<SessionAnnotationsMap>(
    () => readSessionAnnotations()
  );

  const toggleBookmark = React.useCallback(
    (source: string, sessionId: string) => {
      setAnnotations((prev) => {
        const bookmarked =
          prev[`${source}:${sessionId}`]?.bookmarked === true;
        const next = setSessionBookmarked(prev, source, sessionId, !bookmarked);
        writeSessionAnnotations(next);
        return next;
      });
    },
    []
  );

  const setAlias = React.useCallback(
    (source: string, sessionId: string, alias: string | undefined) => {
      setAnnotations((prev) => {
        const next = setSessionAlias(prev, source, sessionId, alias);
        writeSessionAnnotations(next);
        return next;
      });
    },
    []
  );

  return [annotations, { toggleBookmark, setAlias }];
}
