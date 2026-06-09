import React from "react";
import type { MetadataKeyDescriptor } from "./api";
import {
  filterDateModeAriaLabel,
  formatFilterDateModeLabel,
  type FilterDateMode,
} from "./filterDateMode";
import { MetadataFilterChips } from "./MetadataFilterChips";

type Props = {
  workspaces: string[];
  workspaceFilter: string;
  onWorkspaceFilterChange: (value: string) => void;
  textQ: string;
  onTextQChange: (value: string) => void;
  dateField: FilterDateMode;
  onDateFieldToggle: () => void;
  rangeFrom: string;
  onRangeFromChange: (value: string) => void;
  rangeTo: string;
  onRangeToChange: (value: string) => void;
  metadataKeys: MetadataKeyDescriptor[];
  metadataFilter: Record<string, string>;
  onMetadataFilterChange: (next: Record<string, string>) => void;
  starredOnly: boolean;
  onStarredOnlyChange: (enabled: boolean) => void;
  loading: boolean;
  refreshDisabled: boolean;
  onRefresh: () => void;
};

/** Form submit for filter panels: same guard as the primary action button's `disabled`. */
export function submitFilterPanel(
  e: React.FormEvent,
  actionDisabled: boolean,
  onAction: () => void
) {
  e.preventDefault();
  if (!actionDisabled) {
    onAction();
  }
}

export function FilterInputWithClear({
  id,
  label,
  value,
  onChange,
  placeholder,
  list,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  list?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <label className="field session-filter-bar__field" htmlFor={id}>
      <span>{label}</span>
      <span className="session-filter-bar__input-wrap">
        <input
          ref={inputRef}
          id={id}
          className="cyber-input session-filter-bar__input"
          list={list}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        {value ? (
          <button
            type="button"
            className="session-filter-bar__clear"
            aria-label="Clear"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
          >
            ✕
          </button>
        ) : null}
      </span>
    </label>
  );
}

export function SessionFilterBar({
  workspaces,
  workspaceFilter,
  onWorkspaceFilterChange,
  textQ,
  onTextQChange,
  dateField,
  onDateFieldToggle,
  rangeFrom,
  onRangeFromChange,
  rangeTo,
  onRangeToChange,
  metadataKeys,
  metadataFilter,
  onMetadataFilterChange,
  starredOnly,
  onStarredOnlyChange,
  loading,
  refreshDisabled,
  onRefresh,
}: Props) {
  const refreshActionDisabled = refreshDisabled || loading;

  return (
    <section className="filters cyber-panel session-filter-bar">
      <form
        className="session-filter-bar__form"
        onSubmit={(e) =>
          submitFilterPanel(e, refreshActionDisabled, onRefresh)
        }
      >
      <div className="session-filter-bar__content">
        <div className="session-filter-bar__date-row">
          <div className="session-filter-bar__date-header field">
            <span className="session-filter-bar__date-label">
              Date range for{" "}
              <button
                type="button"
                className="session-filter-bar__date-mode"
                aria-label={filterDateModeAriaLabel(dateField)}
                onClick={onDateFieldToggle}
              >
                {formatFilterDateModeLabel(dateField)}
              </button>
            </span>
          </div>
          <label className="field session-filter-bar__field">
            <span>From</span>
            <input
              className="cyber-input"
              type="datetime-local"
              value={rangeFrom}
              onChange={(e) => onRangeFromChange(e.target.value)}
            />
          </label>
          <span className="session-filter-bar__date-separator" aria-hidden="true">
            →
          </span>
          <label className="field session-filter-bar__field">
            <span>To</span>
            <input
              className="cyber-input"
              type="datetime-local"
              value={rangeTo}
              onChange={(e) => onRangeToChange(e.target.value)}
            />
          </label>
        </div>
        <div className="session-filter-bar__text-row">
          <FilterInputWithClear
            id="session-filter-workspace"
            label="Workspace"
            value={workspaceFilter}
            onChange={onWorkspaceFilterChange}
            placeholder="filter by path prefix"
            list="workspace-list"
          />
          <datalist id="workspace-list">
            {workspaces.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
          <FilterInputWithClear
            id="session-filter-text-q"
            label="Name / ID"
            value={textQ}
            onChange={onTextQChange}
            placeholder="substring match"
          />
          <label className="field session-filter-bar__field session-filter-bar__starred">
            <span>Starred only</span>
            <input
              id="session-filter-starred-only"
              type="checkbox"
              checked={starredOnly}
              onChange={(e) => onStarredOnlyChange(e.target.checked)}
            />
          </label>
          <MetadataFilterChips
            metadataKeys={metadataKeys}
            values={metadataFilter}
            onChange={onMetadataFilterChange}
          />
        </div>
      </div>
      <button
        type="submit"
        className={[
          "session-filter-bar__refresh",
          loading ? "session-filter-bar__refresh--loading" : undefined,
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={refreshActionDisabled}
        aria-label="Refresh session list with current filters"
      >
        Refresh
      </button>
      </form>
    </section>
  );
}
