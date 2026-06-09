import type { FilterDateMode } from "./filterDateMode";

export type SessionFilterSnapshot = {
  workspaceFilter: string;
  textQ: string;
  dateField: FilterDateMode;
  rangeFrom: string;
  rangeTo: string;
};

export function normalizeSessionFilterSnapshot(
  snapshot: SessionFilterSnapshot
): SessionFilterSnapshot {
  return {
    workspaceFilter: snapshot.workspaceFilter.trim(),
    textQ: snapshot.textQ.trim(),
    dateField: snapshot.dateField,
    rangeFrom: snapshot.rangeFrom.trim(),
    rangeTo: snapshot.rangeTo.trim(),
  };
}

export function sessionFiltersDirty(
  current: SessionFilterSnapshot,
  applied: SessionFilterSnapshot | null
): boolean {
  if (applied === null) {
    return false;
  }
  const a = normalizeSessionFilterSnapshot(applied);
  const c = normalizeSessionFilterSnapshot(current);
  return (
    a.workspaceFilter !== c.workspaceFilter ||
    a.textQ !== c.textQ ||
    a.dateField !== c.dateField ||
    a.rangeFrom !== c.rangeFrom ||
    a.rangeTo !== c.rangeTo
  );
}
