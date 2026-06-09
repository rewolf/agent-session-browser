import type { MetadataKeyDescriptor } from "./api";
import { writeMetadataFilterToUrl } from "./metadataFilter";

type Props = {
  metadataKeys: MetadataKeyDescriptor[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
};

export function MetadataFilterChips({
  metadataKeys,
  values,
  onChange,
}: Props) {
  if (metadataKeys.length === 0) {
    return null;
  }

  const setKey = (key: string, value: string) => {
    const next = { ...values };
    if (value.trim()) {
      next[key] = value.trim();
    } else {
      delete next[key];
    }
    onChange(next);
    writeMetadataFilterToUrl(next);
  };

  return (
    <>
      {metadataKeys.map((desc) => (
        <label key={desc.key} className="field">
          <span>{desc.label}</span>
          {desc.kind === "boolean" ? (
            <select
              className="cyber-input"
              value={values[desc.key] ?? ""}
              onChange={(e) => setKey(desc.key, e.target.value)}
            >
              <option value="">any</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : desc.kind === "enum" && desc.enumValues?.length ? (
            <select
              className="cyber-input"
              value={values[desc.key] ?? ""}
              onChange={(e) => setKey(desc.key, e.target.value)}
            >
              <option value="">any</option>
              {desc.enumValues.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="cyber-input"
              value={values[desc.key] ?? ""}
              onChange={(e) => setKey(desc.key, e.target.value)}
              placeholder={desc.label}
            />
          )}
        </label>
      ))}
    </>
  );
}
