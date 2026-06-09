import type { ReactNode } from "react";
import { useProvider } from "./providersContext";
import type { SessionSource } from "./types";

type Props = {
  source: SessionSource;
  metadata: Record<string, string> | null | undefined;
};

export function MetadataBadges({ source, metadata }: Props) {
  const provider = useProvider(source);
  if (!metadata || Object.keys(metadata).length === 0) {
    return <span className="muted">—</span>;
  }
  const items: ReactNode[] = [];
  for (const descriptor of provider?.metadataKeys ?? []) {
    const value = metadata[descriptor.key];
    const kind = descriptor.kind ?? "text";
    if (kind === "boolean") {
      if (value !== "true") {
        continue;
      }
      items.push(
        <span
          key={descriptor.key}
          className="metadata-badge"
          title={descriptor.label}
        >
          {descriptor.label}
        </span>
      );
      continue;
    }
    if (!value) {
      continue;
    }
    const title = `${descriptor.label}: ${value}`;
    items.push(
      <span key={descriptor.key} className="metadata-badge" title={title}>
        {value}
      </span>
    );
  }
  if (items.length === 0) {
    return <span className="muted">—</span>;
  }
  return <span className="metadata-badges">{items}</span>;
}
