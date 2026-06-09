export const METADATA_COLUMN_STORAGE_KEY = "asb.columns.metadata";

export type MetadataColumnPreference = "show" | "hide";

export function readMetadataColumnPreference(): MetadataColumnPreference {
  try {
    const value = localStorage.getItem(METADATA_COLUMN_STORAGE_KEY);
    if (value === "show" || value === "hide") {
      return value;
    }
  } catch {
    /* private mode / disabled storage */
  }
  return "hide";
}

export function writeMetadataColumnPreference(
  preference: MetadataColumnPreference
): void {
  try {
    localStorage.setItem(METADATA_COLUMN_STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
}

export function isMetadataColumnVisible(
  preference: MetadataColumnPreference = readMetadataColumnPreference()
): boolean {
  return preference === "show";
}
