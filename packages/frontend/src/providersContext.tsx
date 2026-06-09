import React from "react";
import { fetchProviders, type ProviderDescriptor } from "./api";

type ProvidersContextValue = {
  providers: ProviderDescriptor[];
  byId: ReadonlyMap<string, ProviderDescriptor>;
  loading: boolean;
  error: string | null;
  providerIds: string[];
};

const ProvidersContext = React.createContext<ProvidersContextValue | null>(
  null
);

export function ProvidersProvider({ children }: { children: React.ReactNode }) {
  const [providers, setProviders] = React.useState<ProviderDescriptor[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchProviders()
      .then((list) => {
        if (!cancelled) {
          setProviders(list);
          setError(null);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = React.useMemo(
    () => new Map(providers.map((p) => [p.id, p])),
    [providers]
  );
  const providerIds = React.useMemo(
    () => providers.map((p) => p.id),
    [providers]
  );

  const value = React.useMemo(
    () => ({
      providers,
      byId,
      loading,
      error,
      providerIds,
    }),
    [providers, byId, loading, error, providerIds]
  );

  return (
    <ProvidersContext.Provider value={value}>{children}</ProvidersContext.Provider>
  );
}

export function useProviders(): ProvidersContextValue {
  const ctx = React.useContext(ProvidersContext);
  if (!ctx) {
    throw new Error("useProviders must be used within ProvidersProvider");
  }
  return ctx;
}

export function useProvider(id: string): ProviderDescriptor | undefined {
  const { byId } = useProviders();
  return byId.get(id);
}
