/** Provider id from the session registry (e.g. cursor, claude, amp). */
export type SessionSource = string;

export interface MetadataKeyDescriptor {
  /** Stable key, e.g. "gitBranch". Used in API query params. */
  key: string;
  /** Human-readable label, e.g. "Git branch". */
  label: string;
  /** Optional hint for the UI: free-text, enum, boolean, etc. */
  kind?: "text" | "enum" | "boolean";
  /** When `kind === "enum"`, the allowed values. */
  enumValues?: string[];
}

export type Session = {
  sessionId: string;
  name?: string;
  /** Primary root (first folder) for display / `cd` in --resume */
  workspacePath: string;
  workspaceLeaf: string;
  /** All folder roots for this Cursor workspace (multi-root); same composer DB row */
  workspaceRoots: string[];
  createdAt: number;
  updatedAt: number;
  source: SessionSource;
  /** Provider-defined extra fields. Generic code does not inspect specific keys. */
  metadata?: Record<string, string>;
};

export type SessionFilter = {
  /** When set, only sessions from this source are returned. */
  source?: SessionSource;
  /** Substring match on name (case-insensitive) or sessionId */
  nameOrId?: string;
  workspacePath?: string;
  /** Sessions under this directory (inclusive): workspacePath === prefix or starts with prefix + "/" */
  workspacePrefix?: string;
  createdBefore?: number;
  createdAfter?: number;
  updatedBefore?: number;
  updatedAfter?: number;
  /** Each entry requires `session.metadata?.[key] === value`. AND across keys. */
  metadataFilter?: Record<string, string>;
};

export type NavTreeNode = {
  /** Display label (may be collapsed path segments, e.g. "Code/Tools/fambox") */
  label: string;
  /** Path this node represents (prefix for children) */
  pathPrefix: string;
  children: NavTreeNode[];
  /** Workspace root paths that are exactly at this node (file or dir) */
  workspaceRootsHere: string[];
};
