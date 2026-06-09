import path from "node:path";
import type { ProviderRegistry, WorkspaceGrouping } from "./provider.js";
import type { NavTreeNode, Session } from "./types.js";

type BuildNode = {
  segment: string;
  fullPath: string;
  children: Map<string, BuildNode>;
  workspaceRootsHere: string[];
};

export function longestCommonPathPrefix(paths: string[]): string {
  if (paths.length === 0) {
    return path.sep === "\\" ? path.parse(process.cwd()).root : "/";
  }
  const norm = paths.map((p) => path.normalize(p));
  const parts = norm.map((p) => toParts(p));
  const a = parts[0]!;
  let len = a.length;
  for (let i = 1; i < parts.length; i++) {
    const b = parts[i]!;
    let j = 0;
    while (j < len && j < b.length && a[j] === b[j]) j++;
    len = j;
  }
  if (len === 0) {
    return path.parse(norm[0]!).root;
  }
  return path.join(path.parse(norm[0]!).root, ...a.slice(0, len));
}

function toParts(absPath: string): string[] {
  const n = path.normalize(absPath);
  const root = path.parse(n).root;
  const rest = n.slice(root.length);
  if (!rest) return [];
  return rest.split(path.sep).filter(Boolean);
}

function insertPath(root: BuildNode, lcp: string, workspacePath: string): void {
  const norm = path.normalize(workspacePath);
  const lcpNorm = path.normalize(lcp);
  if (norm === lcpNorm) {
    if (!root.workspaceRootsHere.includes(norm)) {
      root.workspaceRootsHere.push(norm);
    }
    return;
  }
  let rel: string;
  if (norm.startsWith(lcpNorm + path.sep)) {
    rel = norm.slice(lcpNorm.length + 1);
  } else {
    rel = path.relative(lcpNorm, norm);
  }
  const segs = rel.split(path.sep).filter(Boolean);
  if (segs.length === 0) {
    if (!root.workspaceRootsHere.includes(norm)) {
      root.workspaceRootsHere.push(norm);
    }
    return;
  }
  let node = root;
  for (const seg of segs) {
    let child = node.children.get(seg);
    const nextFull = path.join(node.fullPath, seg);
    if (!child) {
      child = {
        segment: seg,
        fullPath: path.normalize(nextFull),
        children: new Map(),
        workspaceRootsHere: [],
      };
      node.children.set(seg, child);
    }
    node = child;
  }
  if (!node.workspaceRootsHere.includes(norm)) {
    node.workspaceRootsHere.push(norm);
  }
}

function buildToNav(node: BuildNode, isRoot: boolean): NavTreeNode {
  const childList = [...node.children.values()]
    .map((c) => buildToNav(c, false))
    .sort((a, b) => a.label.localeCompare(b.label));
  const label = isRoot
    ? node.fullPath || "/"
    : node.segment;
  return {
    label,
    pathPrefix: node.fullPath,
    children: childList,
    workspaceRootsHere: [...node.workspaceRootsHere],
  };
}

/** Collapse single-child chains without workspace at the parent. */
export function collapseNavTree(node: NavTreeNode): NavTreeNode {
  const children = node.children.map(collapseNavTree);
  if (children.length === 1 && node.workspaceRootsHere.length === 0) {
    const c = children[0]!;
    const label = node.label ? `${node.label}/${c.label}` : c.label;
    return {
      label,
      pathPrefix: c.pathPrefix,
      workspaceRootsHere: c.workspaceRootsHere,
      children: c.children,
    };
  }
  return { ...node, children };
}

export function buildNavTree(workspacePaths: string[]): NavTreeNode | null {
  const unique = [
    ...new Set(workspacePaths.map((p) => path.normalize(p))),
  ].filter(Boolean);
  if (unique.length === 0) return null;

  const lcp = longestCommonPathPrefix(unique);
  const root: BuildNode = {
    segment: "",
    fullPath: lcp,
    children: new Map(),
    workspaceRootsHere: [],
  };

  for (const w of unique) {
    insertPath(root, lcp, w);
  }

  let nav = buildToNav(root, true);
  nav = collapseNavTree(nav);

  if (
    nav.children.length === 1 &&
    nav.workspaceRootsHere.length === 0
  ) {
    return nav.children[0]!;
  }
  return nav;
}

function workspacePathsForGrouping(
  sessions: Session[],
  grouping: WorkspaceGrouping
): string[] {
  if (grouping === "none") {
    return [
      ...new Set(sessions.map((s) => path.normalize(s.workspacePath)).filter(Boolean)),
    ];
  }
  if (grouping === "external-id") {
    return [
      ...new Set(
        sessions.map(
          (s) => s.metadata?.workspaceKey?.trim() || path.normalize(s.workspacePath)
        )
      ),
    ].filter(Boolean);
  }
  return [
    ...new Set(
      sessions.flatMap((s) =>
        s.workspaceRoots.length > 0 ? s.workspaceRoots : [s.workspacePath]
      ).map((p) => path.normalize(p))
    ),
  ].filter(Boolean);
}

/** Flat nav: one child per distinct workspace path (no path hierarchy). */
export function buildFlatNavTree(sessions: Session[]): NavTreeNode | null {
  const paths = workspacePathsForGrouping(sessions, "none");
  if (paths.length === 0) return null;
  return {
    label: "All",
    pathPrefix: "",
    workspaceRootsHere: [],
    children: paths
      .sort((a, b) => a.localeCompare(b))
      .map((p) => ({
        label: path.basename(p) || p,
        pathPrefix: p,
        children: [],
        workspaceRootsHere: [p],
      })),
  };
}

/** Group by opaque `metadata.workspaceKey` (fallback: workspace path). */
export function buildExternalIdNavTree(sessions: Session[]): NavTreeNode | null {
  if (sessions.length === 0) return null;
  const byKey = new Map<string, string[]>();
  for (const s of sessions) {
    const key = s.metadata?.workspaceKey?.trim() || s.workspacePath;
    const roots = byKey.get(key) ?? [];
    const wp = path.normalize(s.workspacePath);
    if (!roots.includes(wp)) {
      roots.push(wp);
    }
    byKey.set(key, roots);
  }
  const children = [...byKey.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, roots]) => ({
      label: key,
      pathPrefix: key,
      children: [],
      workspaceRootsHere: [...roots].sort((a, b) => a.localeCompare(b)),
    }));
  return {
    label: "Workspaces",
    pathPrefix: "",
    workspaceRootsHere: [],
    children,
  };
}

/** Build nav tree for sessions using the given grouping mode. */
export function buildGroupedNavTree(
  sessions: Session[],
  grouping: WorkspaceGrouping
): NavTreeNode | null {
  if (sessions.length === 0) return null;
  if (grouping === "none") {
    return buildFlatNavTree(sessions);
  }
  if (grouping === "external-id") {
    return buildExternalIdNavTree(sessions);
  }
  const paths = workspacePathsForGrouping(sessions, "fs-path");
  return buildNavTree(paths);
}

function mergeNavTrees(trees: NavTreeNode[]): NavTreeNode | null {
  if (trees.length === 0) return null;
  if (trees.length === 1) return trees[0]!;
  return {
    label: "Sources",
    pathPrefix: "",
    workspaceRootsHere: [],
    children: trees,
  };
}

/** Nav tree across providers, respecting each provider's workspace grouping. */
export function buildNavTreeForSessions(
  sessions: Session[],
  registry: ProviderRegistry
): NavTreeNode | null {
  if (sessions.length === 0) return null;
  const bySource = new Map<string, Session[]>();
  for (const s of sessions) {
    const list = bySource.get(s.source) ?? [];
    list.push(s);
    bySource.set(s.source, list);
  }
  const trees: NavTreeNode[] = [];
  for (const [source, subset] of bySource) {
    const grouping =
      registry.get(source)?.workspaceGrouping ?? ("fs-path" as WorkspaceGrouping);
    const tree = buildGroupedNavTree(subset, grouping);
    if (tree) {
      trees.push(tree);
    }
  }
  return mergeNavTrees(trees);
}
