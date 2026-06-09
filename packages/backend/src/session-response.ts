import {
  deriveSessionTitleFromJsonl,
  formatResumeCommand,
  resolvePrimaryActions,
  type ProviderRegistry,
  type Session,
} from "@asb/core";

/** Ensures every session row emitted by the API carries an explicit provider source. */
export function requireSessionSource(session: Session): Session["source"] {
  if (!session.source) {
    throw new Error(
      `Session ${session.sessionId} has no source. This is a bug in the scanning code.`
    );
  }
  return session.source;
}

function deriveSessionExcerpt(
  session: Session,
  registry: ProviderRegistry
): string | null {
  const source = requireSessionSource(session);
  const provider = registry.get(source);
  if (!provider) {
    return null;
  }
  const ref = provider.findTranscriptFile(session.sessionId);
  if (!ref) {
    return null;
  }
  const excerpt = deriveSessionTitleFromJsonl(ref.jsonlPath);
  return excerpt ?? null;
}

export function serializeSession(r: Session, registry: ProviderRegistry) {
  const source = requireSessionSource(r);
  const provider = registry.get(source);
  return {
    sessionId: r.sessionId,
    name: r.name ?? null,
    workspacePath: r.workspacePath,
    workspaceLeaf: r.workspaceLeaf,
    workspaceRoots: r.workspaceRoots,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    createdAtIso: new Date(r.createdAt).toISOString(),
    updatedAtIso: new Date(r.updatedAt).toISOString(),
    source,
    resumeCommand: formatResumeCommand(r, registry),
    primaryActions: provider ? resolvePrimaryActions(provider, r) : [],
    metadata:
      r.metadata && Object.keys(r.metadata).length > 0 ? r.metadata : null,
    excerpt: deriveSessionExcerpt(r, registry),
  };
}
