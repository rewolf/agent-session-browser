import inquirer from "inquirer";
import type { Session, NavTreeNode } from "@asb/core";
import {
  filterSessions,
  formatResumeCommand,
  loadBrowserData,
  sessionsUnderPath,
  type ProviderRegistry,
} from "@asb/core";
import {
  cycleSourceFilter,
  sessionFilterForSource,
  sourceFilterLabel,
  type SourceFilterArg,
} from "./source-filter.js";

function formatSession(s: Session): string {
  const tag = `[${s.source}]`;
  const name = s.name ?? "(no name)";
  return `${tag} ${s.sessionId.slice(0, 8)}…  ${name}  [${s.workspaceLeaf}]`;
}

function visibleSessions(
  allSessions: Session[],
  sourceFilter: SourceFilterArg,
  registry: ProviderRegistry
): Session[] {
  const f = sessionFilterForSource(sourceFilter);
  if (!f.source) {
    return allSessions;
  }
  return filterSessions(allSessions, f, registry);
}

async function pickFromTree(
  node: NavTreeNode,
  allSessions: Session[],
  sourceFilter: SourceFilterArg,
  registry: ProviderRegistry
): Promise<void> {
  const scoped = visibleSessions(allSessions, sourceFilter, registry);
  const here = sessionsUnderPath(scoped, node.pathPrefix);
  const childChoices = node.children.map((c) => ({
    name: `${c.label}/`,
    value: { type: "child" as const, node: c },
  }));
  const sessionChoices = here.map((s) => ({
    name: formatSession(s),
    value: { type: "session" as const, session: s },
  }));

  const choices = [
    {
      name: `🔀 Source filter: ${sourceFilterLabel(sourceFilter)} (toggle)`,
      value: { type: "toggleSource" as const },
    },
    new inquirer.Separator(),
    ...childChoices,
    new inquirer.Separator("— sessions at this level —"),
    ...sessionChoices,
    { name: "⬆ Up (exit at root)", value: { type: "up" as const } },
  ];

  const { pick } = await inquirer.prompt<{
    pick:
      | { type: "up" }
      | { type: "toggleSource" }
      | { type: "child"; node: NavTreeNode }
      | { type: "session"; session: Session };
  }>([
    {
      type: "list",
      name: "pick",
      message: `Location: ${node.label || node.pathPrefix || "(root)"} · source: ${sourceFilterLabel(sourceFilter)}`,
      pageSize: 20,
      choices,
    },
  ]);

  if (pick.type === "toggleSource") {
    const providerIds = registry.ids();
    await pickFromTree(
      node,
      allSessions,
      cycleSourceFilter(sourceFilter, providerIds),
      registry
    );
    return;
  }
  if (pick.type === "up") {
    return;
  }
  if (pick.type === "child" && pick.node) {
    await pickFromTree(pick.node, allSessions, sourceFilter, registry);
    return;
  }
  if (pick.type === "session" && pick.session) {
    const s = pick.session;
    const cmd = formatResumeCommand(s, registry);
    console.log("\nResume:\n", cmd, "\n");
    const { again } = await inquirer.prompt<{ again: boolean }>([
      {
        type: "confirm",
        name: "again",
        default: true,
        message: "Continue browsing?",
      },
    ]);
    if (again) {
      await pickFromTree(node, allSessions, sourceFilter, registry);
    }
  }
}

export async function runInteractive(
  initialSource: SourceFilterArg,
  registry: ProviderRegistry
): Promise<void> {
  const { sessions, navTree } = await loadBrowserData(registry);
  if (!navTree) {
    console.error("No workspaces found.");
    process.exitCode = 1;
    return;
  }
  console.log(
    `Loaded ${sessions.length} session(s). Navigate folders and sessions.\n`
  );
  await pickFromTree(navTree, sessions, initialSource, registry);
}
