import { ClaudeSessionProvider } from "./claude-provider.js";
import { CursorSessionProvider, resolveCursorProjectsDir } from "./cursor-provider.js";
import { resolveClaudeProjectsDir, resolveCursorUserDir } from "./paths.js";
import type { DefaultProviderRegistryOptions } from "./provider.js";
import { ProviderRegistry, type SessionProvider } from "./provider.js";

/** Built-in Cursor + Claude providers (configurable dirs for tests / overrides). */
export function createDefaultProviders(
  options?: DefaultProviderRegistryOptions
): SessionProvider[] {
  return [
    new CursorSessionProvider(
      options?.cursorUserDir ?? resolveCursorUserDir(),
      options?.cursorProjectsDir ?? resolveCursorProjectsDir()
    ),
    new ClaudeSessionProvider(
      options?.claudeProjectsDir ?? resolveClaudeProjectsDir()
    ),
  ];
}

/** Factory for built-in provider registry. */
export function defaultProviderRegistry(
  options?: DefaultProviderRegistryOptions
): ProviderRegistry {
  return new ProviderRegistry(createDefaultProviders(options));
}
