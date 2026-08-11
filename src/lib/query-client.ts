import { QueryClient, onlineManager } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

/**
 * networkMode "offlineFirst": reads resolve from the cache while offline,
 * and mutations queue + retry when connectivity returns. This is the
 * pragmatic offline-first layer (full conflict resolution is a later phase).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      // gcTime must be >= the persister maxAge (24h) or the on-disk cache
      // would be discarded as garbage before it's ever reloaded.
      gcTime: 1000 * 60 * 60 * 24,
      retry: 2,
      networkMode: "offlineFirst",
      refetchOnReconnect: true,
    },
    mutations: {
      networkMode: "offlineFirst",
      retry: 2,
    },
  },
});

// TanStack Query can't observe network state on its own on React Native; wire
// it to NetInfo so refetchOnReconnect and offlineFirst paused mutations work.
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => setOnline(!!state.isConnected));
});

// Persist the query cache to disk so the app is truly usable offline across
// restarts (not just within a single session).
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "daymark.query-cache",
  throttleTime: 1000,
});

/** Bump when the cached data shape changes incompatibly. */
export const QUERY_CACHE_BUSTER = "daymark-v1";
