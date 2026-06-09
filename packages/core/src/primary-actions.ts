import type { PrimaryAction, SessionProvider } from "./provider.js";
import type { Session } from "./types.js";
import { shellQuoteToken } from "./resume-command.js";

/** Default resume action id used when wrapping legacy resume tails. */
export const DEFAULT_RESUME_ACTION_ID = "resume";

/** Resolve primary actions for a session (provider hook or resume-tail default). */
export function resolvePrimaryActions(
  provider: SessionProvider,
  session: Session
): PrimaryAction[] {
  if (provider.primaryActions) {
    return provider.primaryActions(session);
  }
  const dir = shellQuoteToken(session.workspacePath);
  const tail = provider.formatResumeCommandTail(session);
  return [
    {
      id: DEFAULT_RESUME_ACTION_ID,
      label: "Resume",
      command: `cd ${dir} && ${tail}`,
    },
  ];
}

/** First action that includes a shell command (for CLI --exec). */
export function commandPrimaryAction(
  provider: SessionProvider,
  session: Session
): PrimaryAction | undefined {
  return resolvePrimaryActions(provider, session).find((a) => a.command?.trim());
}
