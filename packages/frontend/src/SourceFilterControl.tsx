import type { SourceFilter } from "./sourceFilter";
import { sourceFilterLabel } from "./sourceFilter";
import { useProviders } from "./providersContext";

type Props = {
  value: SourceFilter;
  onChange: (next: SourceFilter) => void;
  sessionCountBySource?: ReadonlyMap<string, number | null>;
  unavailableBySource?: ReadonlyMap<string, { message: string; remediation?: string }>;
};

export function SourceFilterControl({
  value,
  onChange,
  sessionCountBySource,
  unavailableBySource,
}: Props) {
  const { providers, byId, loading, error } = useProviders();
  const options: SourceFilter[] = ["all", ...providers.map((p) => p.id)];

  if (loading) {
    return (
      <div className="source-filter" aria-busy="true">
        <span className="source-filter__loading">Loading providers…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="source-filter" role="alert">
        <span className="source-filter__error">{error}</span>
      </div>
    );
  }

  return (
    <div
      className="source-filter"
      role="group"
      aria-label="Session source filter"
    >
      <div className="source-filter__segments">
        {options.map((opt) => {
          const desc = opt === "all" ? undefined : byId.get(opt);
          const unavailable = opt !== "all" ? unavailableBySource?.get(opt) : undefined;
          const count =
            opt === "all"
              ? undefined
              : unavailable
                ? null
                : sessionCountBySource?.get(opt);
          const healthClass =
            desc?.healthStatus && !desc.healthStatus.ok
              ? "source-filter__btn--unhealthy"
              : undefined;
          const tooltip =
            unavailable?.remediation ?? unavailable?.message ?? undefined;
          return (
            <button
              key={opt}
              type="button"
              className={[
                "source-filter__btn",
                value === opt ? "source-filter__btn--active" : undefined,
                healthClass,
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={value === opt}
              title={tooltip}
              onClick={() => onChange(opt)}
              style={
                desc?.badgeColor
                  ? ({ "--provider-accent": desc.badgeColor } as React.CSSProperties)
                  : undefined
              }
            >
              {sourceFilterLabel(opt, byId)}
              {count !== undefined ? (
                <span className="source-filter__count">
                  {count === null ? "—" : count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
