import React from "react";
import { SessionPrimaryActions } from "./SessionPrimaryActions";
import { ViewConversationButton } from "./ViewConversationButton";
import type { PrimaryAction, SessionSource } from "./types";

type Props = {
  sessionId: string;
  workspacePath: string;
  sessionName?: string | null;
  source: SessionSource;
  resumeCommand: string;
  primaryActions: PrimaryAction[];
  initialLineNumber?: number;
};

/** Row actions for a session (view, resume, etc.). */
export function SessionActionsCell({
  sessionId,
  workspacePath,
  sessionName,
  source,
  resumeCommand,
  primaryActions,
  initialLineNumber,
}: Props) {
  return (
    <div className="table-actions-cell">
      <ViewConversationButton
        sessionId={sessionId}
        sessionName={sessionName}
        source={source}
        initialLineNumber={initialLineNumber}
      />
      <SessionPrimaryActions
        source={source}
        resumeCommand={resumeCommand}
        primaryActions={primaryActions}
      />
    </div>
  );
}
