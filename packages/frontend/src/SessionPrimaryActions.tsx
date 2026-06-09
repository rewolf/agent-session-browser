import React from "react";
import { AgentResumeButton } from "./AgentResumeButton";
import { isSafeHttpUrl } from "./safeHttpUrl";
import type { PrimaryAction, SessionSource } from "./types";

type Props = {
  source: SessionSource;
  resumeCommand: string;
  primaryActions: PrimaryAction[];
};

export function SessionPrimaryActions({
  source,
  resumeCommand,
  primaryActions,
}: Props) {
  const actions =
    primaryActions.length > 0
      ? primaryActions
      : [{ id: "resume", label: "Resume", command: resumeCommand }];

  return (
    <>
      {actions.map((action) => {
        if (action.command) {
          return (
            <AgentResumeButton
              key={action.id}
              resumeCommand={action.command}
              source={source}
              label={action.label}
            />
          );
        }
        if (action.url) {
          if (!isSafeHttpUrl(action.url)) {
            return null;
          }
          return (
            <a
              key={action.id}
              className="session-action-link"
              href={action.url}
              target="_blank"
              rel="noreferrer noopener"
              title={action.label}
            >
              {action.label}
            </a>
          );
        }
        return null;
      })}
    </>
  );
}
