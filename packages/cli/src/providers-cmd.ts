import {
  providersToDescriptors,
  type ProviderRegistry,
} from "@asb/core";

function healthLabel(
  status: { ok: true } | { ok: false; reason: string; message: string }
): string {
  if (status.ok) {
    return "ok";
  }
  return `${status.reason}: ${status.message}`;
}

/** Print provider descriptors (health + workspace grouping). */
export async function runProvidersCommand(
  registry: ProviderRegistry,
  json: boolean
): Promise<void> {
  const rows = await providersToDescriptors(registry.all());
  if (json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  console.log("id\tdisplayName\thealth\tworkspace-grouping");
  for (const r of rows) {
    console.log(
      [
        r.id,
        r.displayName,
        healthLabel(r.healthStatus),
        r.workspaceGrouping,
      ].join("\t")
    );
  }
}
