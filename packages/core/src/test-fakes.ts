import type { Session, SessionSource } from "./types.js";
import type { HealthStatus, ScanResult, SessionProvider } from "./provider.js";

function baseSession(source: SessionSource, extra?: Partial<Session>): Session {
  return {
    sessionId: "11111111-1111-4111-8111-111111111111",
    workspacePath: "/ws/a",
    workspaceLeaf: "a",
    workspaceRoots: ["/ws/a"],
    createdAt: 1,
    updatedAt: 2,
    source,
    ...extra,
  };
}

export const FAKE_FLAT_ID = "fake-flat" as SessionSource;
export const FAKE_EXT_ID = "fake-ext" as SessionSource;

export class FlatFakeProvider implements SessionProvider {
  readonly id = FAKE_FLAT_ID;
  readonly displayName = "Flat Fake";
  readonly workspaceGrouping = "none" as const;

  async scanSessions() {
    return {
      sessions: [
        baseSession(FAKE_FLAT_ID, {
          sessionId: "22222222-2222-4222-8222-222222222222",
          workspacePath: "/flat/one",
          workspaceLeaf: "one",
          workspaceRoots: ["/flat/one"],
        }),
        baseSession(FAKE_FLAT_ID, {
          sessionId: "33333333-3333-4333-8333-333333333333",
          workspacePath: "/flat/two",
          workspaceLeaf: "two",
          workspaceRoots: ["/flat/two"],
        }),
      ],
    };
  }

  findTranscriptFile() {
    return null;
  }
  listTranscriptFiles() {
    return [];
  }
  async loadConversation() {
    return null;
  }
  formatResumeCommandTail(s: Session) {
    return `flat resume ${s.sessionId}`;
  }
  metadataKeys() {
    return [];
  }
}

export class ExternalIdFakeProvider implements SessionProvider {
  readonly id = FAKE_EXT_ID;
  readonly displayName = "External Id Fake";
  readonly workspaceGrouping = "external-id" as const;

  async scanSessions() {
    return {
      sessions: [
        baseSession(FAKE_EXT_ID, {
          metadata: { workspaceKey: "team-alpha" },
          workspacePath: "/remote/a",
        }),
        baseSession(FAKE_EXT_ID, {
          sessionId: "44444444-4444-4444-8444-444444444444",
          metadata: { workspaceKey: "team-beta" },
          workspacePath: "/remote/b",
        }),
      ],
    };
  }

  findTranscriptFile() {
    return null;
  }
  listTranscriptFiles() {
    return [];
  }
  async loadConversation() {
    return null;
  }
  formatResumeCommandTail(s: Session) {
    return `ext resume ${s.sessionId}`;
  }
  metadataKeys() {
    return [];
  }
}

export const FAKE_FAIL_ID = "fake-fail" as SessionSource;

/** Provider that always reports unavailable (for API/CLI tests). */
export class FailingFakeProvider implements SessionProvider {
  readonly id = FAKE_FAIL_ID;
  readonly displayName = "Failing Fake";
  readonly workspaceGrouping = "none" as const;

  async scanSessions(): Promise<ScanResult> {
    return {
      sessions: [],
      unavailable: {
        reason: "auth",
        message: "not signed in",
        remediation: "run login",
      },
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      ok: false,
      reason: "auth",
      message: "not signed in",
      remediation: "run login",
    };
  }

  findTranscriptFile() {
    return null;
  }
  listTranscriptFiles() {
    return [];
  }
  async loadConversation() {
    return null;
  }
  formatResumeCommandTail() {
    return "";
  }
  metadataKeys() {
    return [];
  }
}
