import type {
  Session,
  MetadataKeyDescriptor,
  SessionSource,
} from "./types.js";
import type { TranscriptConversation } from "./transcript-conversation.js";

/** Reference to a single on-disk JSONL transcript discovered by a provider. */
export type TranscriptFileRef = {
  sessionId: string;
  jsonlPath: string;
  workspacePath: string;
  workspaceLeaf: string;
  /** Provider that produced this ref. Used by generic code to route reads back. */
  source: SessionSource;
};

export type DefaultProviderRegistryOptions = {
  cursorUserDir?: string;
  cursorProjectsDir?: string;
  claudeProjectsDir?: string;
};

export type UnavailableReason = "auth" | "network" | "not-installed" | "other";

export type ScanUnavailable = {
  reason: UnavailableReason;
  message: string;
  remediation?: string;
};

export type ScanResult = {
  sessions: Session[];
  unavailable?: ScanUnavailable;
};

export type HealthStatus =
  | { ok: true }
  | {
      ok: false;
      reason: UnavailableReason;
      message: string;
      remediation?: string;
    };

export type WorkspaceGrouping = "fs-path" | "external-id" | "none";

export type PrimaryAction = {
  id: string;
  label: string;
  command?: string;
  url?: string;
};

export interface SessionProvider {
  /** Stable provider identifier from the registry. */
  readonly id: SessionSource;
  /** Human-readable label for UI / CLI output. */
  readonly displayName: string;
  /** Optional CSS colour for source badges in the UI. */
  readonly badgeColor?: string;
  /** Optional CLI binary name shown in resume hints (e.g. agent, claude, amp). */
  readonly resumeCommandName?: string;
  /** How the nav tree groups this provider's sessions. */
  readonly workspaceGrouping: WorkspaceGrouping;

  /** Discover all sessions this provider knows about. */
  scanSessions(): Promise<ScanResult>;

  /** Optional lightweight usability check independent of a full scan. */
  healthCheck?(): Promise<HealthStatus>;

  /** Per-session actions (resume shell, open URL, …). */
  primaryActions?(session: Session): PrimaryAction[];

  /** Locate the on-disk transcript file for a session, if it exists. */
  findTranscriptFile(sessionId: string): TranscriptFileRef | null;

  /** Enumerate every transcript file for cross-source search. */
  listTranscriptFiles(): TranscriptFileRef[];

  /** Read a session's transcript into the normalised `TranscriptConversation` shape. */
  loadConversation(
    sessionId: string,
    file?: TranscriptFileRef | null
  ): Promise<TranscriptConversation | null>;

  /** Source-specific resume CLI shell snippet (without the `cd` prefix). */
  formatResumeCommandTail(session: Session): string;

  /** Metadata keys this provider may emit, with display info. */
  metadataKeys(): MetadataKeyDescriptor[];
}

export class ProviderRegistry {
  private readonly byId: Map<SessionSource, SessionProvider>;

  constructor(providers: SessionProvider[]) {
    this.byId = new Map(providers.map((p) => [p.id, p]));
  }

  all(): SessionProvider[] {
    return [...this.byId.values()];
  }

  get(id: SessionSource): SessionProvider | undefined {
    return this.byId.get(id);
  }

  ids(): SessionSource[] {
    return [...this.byId.keys()];
  }
}
