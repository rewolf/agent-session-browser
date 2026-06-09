import { commandPrimaryAction } from "./primary-actions.js";
import type { ProviderRegistry } from "./provider.js";
import type { Session } from "./types.js";

/** Shell-safe single-token quoting for paths and ids when needed. */
export function shellQuoteToken(p: string): string {
  if (!/[^\w@%+=:,./-]/g.test(p)) {
    return p;
  }
  return `'${p.replace(/'/g, `'\\''`)}'`;
}

/** Resume shell command for a session (command-bearing primary action or legacy tail). */
export function formatResumeCommand(
  session: Session,
  registry: ProviderRegistry
): string {
  const provider = registry.get(session.source);
  if (!provider) {
    throw new Error(`Unknown session source: ${session.source}`);
  }
  const action = commandPrimaryAction(provider, session);
  if (action?.command) {
    return action.command;
  }
  const dir = shellQuoteToken(session.workspacePath);
  const tail = provider.formatResumeCommandTail(session);
  return `cd ${dir} && ${tail}`;
}
