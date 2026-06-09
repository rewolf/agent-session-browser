/** @vitest-environment node */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { defaultProviderRegistry } from "@asb/core";
import { createServer } from "./server.js";

function getJson(
  path: string
): Promise<{ status: number; body: unknown }> {
  const app = createServer(defaultProviderRegistry());
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      fetch(`http://127.0.0.1:${port}${path}`)
        .then(async (res) => {
          const body = await res.json();
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

describe("GET /api/providers", () => {
  it("returns descriptors for every default provider", async () => {
    const { status, body } = await getJson("/api/providers");
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    const rows = body as Array<{
      id: string;
      displayName: string;
      metadataKeys: unknown[];
      workspaceGrouping: string;
      healthStatus: { ok: boolean };
    }>;
    const ids = rows.map((r) => r.id).sort();
    expect(ids).toEqual(["claude", "cursor"]);

    const cursor = rows.find((r) => r.id === "cursor");
    const claude = rows.find((r) => r.id === "claude");
    expect(cursor?.displayName).toBe("Cursor");
    expect(cursor?.metadataKeys).toEqual([]);
    expect(claude?.displayName).toBe("Claude Code");
    const claudeMetadata = (claude?.metadataKeys ?? []) as Array<{ key: string }>;
    expect(claudeMetadata.length).toBeGreaterThan(0);
    expect(claudeMetadata.some((d) => d.key === "gitBranch")).toBe(true);
    expect(cursor?.workspaceGrouping).toBe("fs-path");
    expect(cursor?.healthStatus.ok).toBe(true);
    expect(claude?.workspaceGrouping).toBe("fs-path");
    expect(claude?.healthStatus.ok).toBe(true);
  });
});
