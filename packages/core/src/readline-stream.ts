import type { ReadStream } from "node:fs";
import type { Interface } from "node:readline";
import { finished } from "node:stream/promises";

/** Ensure readline and its backing file stream are fully closed (Windows-safe). */
export async function closeReadlineStream(
  rl: Interface,
  input: ReadStream
): Promise<void> {
  rl.close();
  if (!input.destroyed) {
    input.destroy();
  }
  await finished(input).catch(() => {});
}
