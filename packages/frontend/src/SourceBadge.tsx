import type { CSSProperties } from "react";
import { useProvider } from "./providersContext";

type Props = {
  source: string;
};

function badgeStyle(badgeColor?: string): CSSProperties | undefined {
  if (!badgeColor) {
    return undefined;
  }
  return {
    color: badgeColor,
    borderColor: badgeColor,
    backgroundColor: `${badgeColor}33`,
  };
}

export function SourceBadge({ source }: Props) {
  const provider = useProvider(source);
  const label = provider?.displayName ?? source;
  return (
    <span
      className="source-badge"
      style={badgeStyle(provider?.badgeColor)}
      title={`Session source: ${label}`}
    >
      {label}
    </span>
  );
}
