import type { ProviderUnavailable } from "./types";
import { useProvider } from "./providersContext";

type Props = {
  items: ProviderUnavailable[];
};

export function UnavailableBanner({ items }: Props) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="unavailable-banner" role="alert">
      {items.map((u) => (
        <UnavailableLine key={u.providerId} item={u} />
      ))}
    </div>
  );
}

function UnavailableLine({ item }: { item: ProviderUnavailable }) {
  const provider = useProvider(item.providerId);
  const name = provider?.displayName ?? item.providerId;
  return (
    <p className="unavailable-banner__line">
      <strong>{name}</strong>: {item.message}
      {item.remediation ? (
        <span className="unavailable-banner__remediation">
          {" "}
          — {item.remediation}
        </span>
      ) : null}
    </p>
  );
}
