import os from "node:os";

/** Login name of the user running this process (for transcript UI labels). */
export function resolveSystemUsername(): string {
  try {
    const name = os.userInfo().username?.trim();
    if (name) {
      return name;
    }
  } catch {
    /* fall through */
  }
  const fromEnv =
    process.env.USER?.trim() ||
    process.env.LOGNAME?.trim() ||
    process.env.USERNAME?.trim();
  return fromEnv || "user";
}
