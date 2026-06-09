#!/usr/bin/env node
import { Command } from "commander";
import {
  commandPrimaryAction,
  defaultProviderRegistry,
  findSessionById,
  formatResumeCommand,
  loadAllSessions,
  uniqueWorkspacePaths,
} from "@asb/core";
import { runInteractive } from "./interactive.js";
import { runListSessions } from "./list-sessions.js";
import { runProvidersCommand } from "./providers-cmd.js";
import { parseSourceOption, type SourceFilterArg } from "./source-filter.js";
import {
  formatSourceCliDescription,
  formatSourceCliPlaceholder,
} from "./source-help.js";
const registry = defaultProviderRegistry();
const sourceIds = registry.ids();

const program = new Command();
program
  .name("asb")
  .description("Browse Cursor Composer sessions from local workspace storage")
  .option("-i, --interactive", "Interactive folder / session browser")
  .option("--json", "JSON output (list-sessions, providers, list)")
  .option("--list-workspaces", "Print workspace root paths")
  .option(
    "--list-sessions [workspace]",
    "List sessions; optional workspace path (default: cwd subtree)"
  )
  .option(
    `--source ${formatSourceCliPlaceholder(sourceIds)}`,
    formatSourceCliDescription(sourceIds),
    "all"
  )
  .option("--session-name <text>", "Filter: name or session id contains text")
  .option("--created-before <date>", "Filter: createdAt < date (ISO or epoch ms)")
  .option("--created-after <date>", "Filter: createdAt > date")
  .option("--updated-before <date>", "Filter: updatedAt < date")
  .option("--updated-after <date>", "Filter: updatedAt > date")
  .option(
    "--metadata <key=value>",
    "Filter: require session.metadata[key] === value (repeatable)",
    (value: string, prev: string[]) => [...prev, value],
    [] as string[]
  )
  .option(
    "--resume <sessionId>",
    "Print resume command: cd <workspace> && agent/claude --resume …"
  )
  .option(
    "--exec",
    "With --resume, print the command-bearing primary action only"
  )
  .action(async (opts, cmd) => {
    let sourceFilter: SourceFilterArg;
    try {
      sourceFilter = parseSourceOption(String(opts.source ?? "all"), registry);
    } catch (e) {
      console.error((e as Error).message);
      process.exitCode = 1;
      return;
    }

    if (opts.interactive) {
      await runInteractive(sourceFilter, registry);
      return;
    }

    const { sessions } = await loadAllSessions(registry);

    if (opts.resume) {
      const s = findSessionById(sessions, opts.resume);
      if (!s) {
        console.error(`Session not found: ${opts.resume}`);
        process.exitCode = 1;
        return;
      }
      const provider = registry.get(s.source);
      if (opts.exec && provider) {
        const action = commandPrimaryAction(provider, s);
        if (!action?.command) {
          console.error(
            `No command-bearing primary action for session ${opts.resume}`
          );
          process.exitCode = 1;
          return;
        }
        console.log(action.command);
        return;
      }
      console.log(formatResumeCommand(s, registry));
      return;
    }

    if (opts.listWorkspaces) {
      for (const w of uniqueWorkspacePaths(sessions)) {
        console.log(w);
      }
      return;
    }

    const listArg = opts.listSessions;
    if (listArg !== undefined) {
      try {
        const code = await runListSessions(registry, {
          workspaceArg: listArg,
          sourceFilter,
          sessionName: opts.sessionName,
          createdBefore: opts.createdBefore,
          createdAfter: opts.createdAfter,
          updatedBefore: opts.updatedBefore,
          updatedAfter: opts.updatedAfter,
          metadata: opts.metadata as string[] | undefined,
          json: Boolean(opts.json || process.env.ASB_JSON),
        });
        if (code !== 0) {
          process.exitCode = code;
        }
      } catch (e) {
        console.error((e as Error).message);
        process.exitCode = 1;
      }
      return;
    }

    if (
      opts.sessionName ||
      opts.createdBefore ||
      opts.createdAfter ||
      opts.updatedBefore ||
      opts.updatedAfter ||
      (opts.metadata as string[] | undefined)?.length ||
      sourceFilter !== "all"
    ) {
      console.error(
        "Date/name/source filters require --list-sessions (optionally with a workspace path)."
      );
      process.exitCode = 1;
      return;
    }

    cmd.help();
  });

program
  .command("providers")
  .description("List registered session providers (health and grouping)")
  .option("--json", "JSON output")
  .action(async (opts) => {
    await runProvidersCommand(registry, Boolean(opts.json));
  });

program
  .command("list")
  .description("List sessions (alias for --list-sessions)")
  .option(
    `[workspace]`,
    "Optional workspace path (default: cwd subtree when omitted)"
  )
  .option(
    `--source ${formatSourceCliPlaceholder(sourceIds)}`,
    formatSourceCliDescription(sourceIds),
    "all"
  )
  .option("--session-name <text>", "Filter: name or session id contains text")
  .option("--json", "JSON output")
  .action(async (workspace, opts) => {
    let sourceFilter: SourceFilterArg;
    try {
      sourceFilter = parseSourceOption(String(opts.source ?? "all"), registry);
    } catch (e) {
      console.error((e as Error).message);
      process.exitCode = 1;
      return;
    }
    try {
      const code = await runListSessions(registry, {
        workspaceArg: workspace === undefined ? true : workspace,
        sourceFilter,
        sessionName: opts.sessionName,
        json: Boolean(opts.json || process.env.ASB_JSON),
      });
      if (code !== 0) {
        process.exitCode = code;
      }
    } catch (e) {
      console.error((e as Error).message);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch((e) => {
  console.error(e);
  process.exit(1);
});
