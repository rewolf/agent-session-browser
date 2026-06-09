/** Y-M-D date and 24h time (sv-SE ordering). */
const YMD_HM_24 = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
} as const;

const localeDateTime = new Intl.DateTimeFormat("sv-SE", YMD_HM_24);

const localeDateTimeTitle = new Intl.DateTimeFormat("sv-SE", {
  ...YMD_HM_24,
  second: "2-digit",
});

/** Locale-aware display for session created/updated timestamps (epoch ms). */
export function formatLocaleDateTime(ms: number): string {
  if (!ms) return "—";
  return localeDateTime.format(new Date(ms));
}

/** Longer locale string for hover titles on date cells. */
export function formatLocaleDateTimeTitle(ms: number): string {
  if (!ms) return "";
  return localeDateTimeTitle.format(new Date(ms));
}
