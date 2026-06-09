import type { ProviderRegistry, TranscriptFileRef } from "./provider.js";

export type TranscriptJsonlRef = TranscriptFileRef;

/** Cursor agent-transcripts and Claude top-level JSONL files. */
export function listAllTranscriptJsonlFiles(
  registry: ProviderRegistry
): TranscriptJsonlRef[] {
  return registry.all().flatMap((p) => p.listTranscriptFiles());
}
