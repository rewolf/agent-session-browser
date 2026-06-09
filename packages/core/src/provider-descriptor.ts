import type { MetadataKeyDescriptor } from "./types.js";
import type {
  HealthStatus,
  SessionProvider,
  WorkspaceGrouping,
} from "./provider.js";
import { resolveProviderHealth } from "./session-load.js";

/** API / UI descriptor for a registered session provider. */
export type ProviderDescriptor = {
  id: string;
  displayName: string;
  badgeColor?: string;
  metadataKeys: MetadataKeyDescriptor[];
  resumeCommandName?: string;
  workspaceGrouping: WorkspaceGrouping;
  healthStatus: HealthStatus;
};

export async function providerToDescriptor(
  provider: SessionProvider
): Promise<ProviderDescriptor> {
  return {
    id: provider.id,
    displayName: provider.displayName,
    badgeColor: provider.badgeColor,
    metadataKeys: provider.metadataKeys(),
    resumeCommandName: provider.resumeCommandName,
    workspaceGrouping: provider.workspaceGrouping,
    healthStatus: await resolveProviderHealth(provider),
  };
}

export async function providersToDescriptors(
  providers: SessionProvider[]
): Promise<ProviderDescriptor[]> {
  return Promise.all(providers.map(providerToDescriptor));
}
