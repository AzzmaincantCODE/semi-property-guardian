import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { QueryKey, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { GlobalRefreshOverlay } from "@/components/system/GlobalRefreshOverlay";

type GlobalRealtimeSyncContextValue = {
  isRefreshing: boolean;
  manualRefresh: () => Promise<void>;
};

const GlobalRealtimeSyncContext = createContext<GlobalRealtimeSyncContextValue>({
  isRefreshing: false,
  manualRefresh: async () => undefined,
});

const REFRESH_TARGETS: QueryKey[] = [
  ["annex-property-cards"],
  ["available-inventory-for-cards"],
  ["annex-custodian-slips"],
  ["available-inventory-for-slips"],
  ["inventory-items"],
  ["inventory-summary"],
  ["dashboard-metrics"],
  ["custodian-summary"],
  ["custodian-summaries"],
  ["custodian-item-history"],
  ["custodian-current-items"],
  ["transfers"],
];

const WATCHED_TABLES = [
  "inventory_items",
  "property_cards",
  "property_card_entries",
  "custodian_slips",
  "custodian_slip_items",
  "property_transfers",
];

export const GlobalRealtimeSyncProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  const finishRefresh = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
    hideTimer.current = setTimeout(() => {
      setRefreshCounter((prev) => Math.max(prev - 1, 0));
    }, 400);
  }, []);

  const refreshAllQueries = useCallback(async () => {
    setRefreshCounter((prev) => prev + 1);
    try {
      await Promise.all(
        REFRESH_TARGETS.map((queryKey) =>
          queryClient.invalidateQueries({
            queryKey,
          })
        )
      );

      await Promise.all(
        REFRESH_TARGETS.map((queryKey) =>
          queryClient.refetchQueries({
            queryKey,
            type: "active",
          })
        )
      );
    } finally {
      finishRefresh();
    }
  }, [finishRefresh, queryClient]);

  useEffect(() => {
    const channel = supabase.channel("realtime:global-sync");

    WATCHED_TABLES.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        console.log(`[GlobalRealtimeSync] Change detected on ${table}, refreshing UI…`);
        refreshAllQueries();
      });
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshAllQueries]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      isRefreshing: refreshCounter > 0,
      manualRefresh: refreshAllQueries,
    }),
    [refreshCounter, refreshAllQueries]
  );

  return (
    <GlobalRealtimeSyncContext.Provider value={contextValue}>
      {children}
      <GlobalRefreshOverlay active={contextValue.isRefreshing} />
    </GlobalRealtimeSyncContext.Provider>
  );
};

export const useGlobalRealtimeSync = () => useContext(GlobalRealtimeSyncContext);

