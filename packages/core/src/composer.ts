export type RawComposerHead = {
  type?: string;
  composerId?: string;
  name?: string;
  createdAt?: number;
  lastUpdatedAt?: number;
};

export function parseComposerSessions(
  jsonStr: string | null
): RawComposerHead[] {
  if (!jsonStr) return [];
  let data: unknown;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    return [];
  }
  if (!data || typeof data !== "object") return [];
  const all = (data as { allComposers?: unknown }).allComposers;
  if (!Array.isArray(all)) return [];
  const out: RawComposerHead[] = [];
  for (const c of all) {
    if (!c || typeof c !== "object") continue;
    const o = c as RawComposerHead;
    if (o.type === "head" && typeof o.composerId === "string") {
      out.push(o);
    }
  }
  return out;
}
