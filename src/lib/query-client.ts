import { QueryClient } from "@tanstack/react-query";

/**
 * networkMode "offlineFirst": reads resolve from the cache while offline,
 * and mutations queue + retry when connectivity returns. This is the
 * pragmatic offline-first layer (full conflict resolution is a later phase).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
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
