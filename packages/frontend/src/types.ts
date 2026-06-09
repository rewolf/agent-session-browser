export type SessionSource = string;

export type PrimaryAction = {
  id: string;
  label: string;
  command?: string;
  url?: string;
};

export type ProviderUnavailable = {
  providerId: string;
  reason: string;
  message: string;
  remediation?: string;
};

export type ApiSession = {
  sessionId: string;
  source: SessionSource;
  resumeCommand: string;
  primaryActions: PrimaryAction[];
  name: string | null;
  workspacePath: string;
  workspaceLeaf: string;
  workspaceRoots: string[];
  createdAt: number;
  updatedAt: number;
  createdAtIso: string;
  updatedAtIso: string;
  metadata?: Record<string, string> | null;
  excerpt?: string | null;
};

export type NavTreeNode = {
  label: string;
  pathPrefix: string;
  children: NavTreeNode[];
  workspaceRootsHere: string[];
};

export type TranscriptSearchHit = {
  sessionId: string;
  source: SessionSource;
  resumeCommand: string;
  sessionName: string | null;
  workspacePath: string;
  workspaceLeaf: string;
  lineNumber: number;
  preview: string;
  transcriptPath: string;
  /** Top-level JSON `role` when present; null if the line is not a JSON object with `role`. */
  role: string | null;
  /** Epoch ms used for ordering (message time, else session updated). */
  sortAt: number;
  sortAtIso: string | null;
  /** Whether `sortAt` came from the JSONL line or the session row. */
  timeSource: "message" | "session";
};

export type TranscriptTextBlock = {
  type: "text";
  text: string;
};

export type TranscriptToolUseBlock = {
  type: "tool_use";
  name: string;
  detail: string;
};

export type TranscriptToolResultBlock = {
  type: "tool_result";
  detail: string;
};

export type TranscriptThinkingBlock = {
  type: "thinking";
  thinking: string;
};

export type TranscriptOtherBlock = {
  type: "other";
  label: string;
  detail: string;
};

export type TranscriptContentBlock =
  | TranscriptTextBlock
  | TranscriptThinkingBlock
  | TranscriptToolUseBlock
  | TranscriptToolResultBlock
  | TranscriptOtherBlock;

export type TranscriptConversationMessage = {
  lineNumber: number;
  role: string | null;
  messageAt: number | null;
  blocks: TranscriptContentBlock[];
  uuid?: string;
  parentUuid?: string;
  isSidechain?: boolean;
};

export type TranscriptConversation = {
  sessionId: string;
  source?: SessionSource;
  sessionName?: string | null;
  /** OS login name for labelling user turns in the dialog. */
  systemUsername: string;
  jsonlPath: string;
  workspacePath: string;
  workspaceLeaf: string;
  messages: TranscriptConversationMessage[];
};
