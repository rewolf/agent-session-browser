import React from "react";
import { CopyButton } from "./CopyButton";

type Props = {
  sessionId: string;
};

export function SessionIdCell({ sessionId }: Props) {
  return (
    <span className="copyable-cell session-id-cell">
      <span className="copyable-cell__value">
        <code className="session-id">{sessionId}</code>
      </span>
      <CopyButton text={sessionId} label="session ID" />
    </span>
  );
}
