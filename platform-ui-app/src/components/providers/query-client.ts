import { MutationCache, Query, QueryCache } from '@tanstack/query-core';
import {
  defaultShouldDehydrateQuery,
  isServer,
  QueryClient,
} from '@tanstack/react-query';

import { ApiError } from '@/components/lib/api-client';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Network mode: 'online' - queries only execute when network is available
        // 'always' would execute even when offline, 'offlineFirst' would prefer cached data
        networkMode: 'online',

        // retryOnMount: true - retry failed queries when component mounts
        // Useful for queries that failed due to network issues
        retryOnMount: true,

        // Helps keep data fresh when user returns to the tab
        refetchOnWindowFocus: false,

        // refetchOnReconnect: true - refetch when network reconnects
        // Ensures data is fresh after network interruption
        refetchOnReconnect: true,

        // staleTime: 5 minutes - how long data is considered fresh
        // Queries won't refetch until this time passes
        // staleTime: 5 * 60 * 1000,

        // gcTime: 10 minutes - how long inactive data stays in cache
        // Previously called 'cacheTime' in v4
        gcTime: 10 * 60 * 1000,

        // placeholderData: returns previous data while loading
        // Provides better UX by showing old data during refetches
        placeholderData: (previousData: unknown) => previousData,

        // retry: function that determines if failed queries should retry
        // Returns false to stop retrying, true to continue, or number of retries
        retry: (failureCount: number, error: Error) => {
          const apiError = error as ApiError;
          // Don't retry auth errors - they require user action
          if (apiError?.status === 401) {
            return false;
          }

          // Don't retry client errors (4xx) - these are usually user/request issues
          if (
            apiError?.status &&
            apiError.status >= 400 &&
            apiError.status < 500
          ) {
            return false;
          }

          // Retry up to 3 times for server errors (5xx) and network issues
          return failureCount < 3;
        },

        // retryDelay: function that determines delay between retries
        // Exponential backoff: 1s, 2s, 4s, 8s... capped at 30s
        retryDelay: (attemptIndex: number) =>
          Math.min(1000 * 2 ** attemptIndex, 30000),
      },

      mutations: {
        // networkMode: 'online' - mutations only execute when network is available
        // Prevents mutations from failing immediately when offline
        networkMode: 'online',

        // retry: function that determines if failed mutations should retry
        // Mutations typically retry less than queries since they modify data
        retry: (failureCount: number, error: Error) => {
          const apiError = error as ApiError;
          // Don't retry auth errors - they require user action
          if (apiError?.status === 401) {
            return false;
          }

          // Don't retry client errors (4xx) - these are usually user/request issues
          if (
            apiError?.status &&
            apiError.status >= 400 &&
            apiError.status < 500
          ) {
            return false;
          }

          // Only retry once for mutations - avoid duplicate operations
          return failureCount < 1;
        },
      },

      dehydrate: {
        // shouldDehydrateQuery: determines which queries to include in SSR hydration
        // Includes both successful queries and pending queries for better hydration
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
    },

    // queryCache: global cache for all queries with error handling
    queryCache: new QueryCache({
      // onError: called whenever any query fails
      onError: (
        error: Error,
        query: Query<unknown, unknown, unknown, readonly unknown[]>
      ) => {
        // Log query errors in production for debugging
        if (process.env.NODE_ENV === 'production') {
          // Don't log user cancellations (like component unmounts)
          if (error.name !== 'CancelledError') {
            console.error(`Query error: ${query.queryHash}`, error);
          }
        }
      },
    }),

    // mutationCache: global cache for all mutations with error handling
    mutationCache: new MutationCache({
      // onError: called whenever any mutation fails
      onError: (error: Error) => {
        // Log mutation errors in production for debugging
        if (process.env.NODE_ENV === 'production') {
          // Don't log user cancellations
          if (error.name !== 'CancelledError') {
            console.error(`Mutation error:`, error);
          }
        }
      },
    }),
  });
}

// Singleton pattern for browser query client
let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    // Server: always create a new query client for SSR
    // This ensures each request gets a clean cache
    return makeQueryClient();
  } else {
    // Browser: reuse the same query client instance
    // Prevents creating multiple clients during React hydration
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

// resetQueryClient: clears the browser query cache
// Useful for user logout, testing, or cache invalidation
export function resetQueryClient() {
  if (!isServer && browserQueryClient) {
    browserQueryClient.clear();
  }
}
