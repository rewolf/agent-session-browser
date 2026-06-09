/** @vitest-environment node */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import {
  ProviderRegistry,
  type HealthStatus,
  type ScanResult,
  type SessionProvider,
} from "@asb/core";

class FailingFakeProvider implements SessionProvider {
  readonly id = "fake-fail";
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

import { createServer } from "./server.js";

function getJson(
  path: string,
  registry: ProviderRegistry
): Promise<{ status: number; body: Record<string, unknown> }> {
  const app = createServer(registry);
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      fetch(`http://127.0.0.1:${port}${path}`)
        .then(async (res) => {
          const body = (await res.json()) as Record<string, unknown>;
          resolve({ status: res.status, body });
          server.close();
        })
        .catch((e) => {
          server.close();
          reject(e);
        });
    });
  });
}

describe("GET /api/sessions unavailable", () => {
  it("surfaces failing fake under unavailable and providers health", async () => {
    const registry = new ProviderRegistry([new FailingFakeProvider()]);
    const sessionsRes = await getJson("/api/sessions", registry);
    expect(sessionsRes.status).toBe(200);
    const unavailable = sessionsRes.body.unavailable as Array<{
      providerId: string;
      message: string;
    }>;
    expect(unavailable).toHaveLength(1);
    expect(unavailable[0]!.providerId).toBe("fake-fail");
    expect(unavailable[0]!.message).toBe("not signed in");

    const providersRes = await getJson("/api/providers", registry);
    expect(Array.isArray(providersRes.body)).toBe(true);
    const rows = providersRes.body as unknown as Array<{
      id: string;
      healthStatus: { ok: boolean; reason?: string };
    }>;
    expect(rows[0]!.healthStatus.ok).toBe(false);
    if (!rows[0]!.healthStatus.ok) {
      expect(rows[0]!.healthStatus.reason).toBe("auth");
    }
  });
});
