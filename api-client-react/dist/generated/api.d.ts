import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { BulkJobListResponse, BulkJobResponse, BulkSearchRequest, ErrorResponse, GetSearchHistoryParams, HealthStatus, HistoryResponse, ListBulkJobsParams, SearchHistoryItem, SearchRequest, SearchResponse, StatsResponse, SuccessResponse } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * Returns server health status
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * Performs multi-layer search across free sources to find employees at a company with a given job title
 * @summary Search for employees
 */
export declare const getSearchEmployeesUrl: () => string;
export declare const searchEmployees: (searchRequest: SearchRequest, options?: RequestInit) => Promise<SearchResponse>;
export declare const getSearchEmployeesMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof searchEmployees>>, TError, {
        data: BodyType<SearchRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof searchEmployees>>, TError, {
    data: BodyType<SearchRequest>;
}, TContext>;
export type SearchEmployeesMutationResult = NonNullable<Awaited<ReturnType<typeof searchEmployees>>>;
export type SearchEmployeesMutationBody = BodyType<SearchRequest>;
export type SearchEmployeesMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Search for employees
 */
export declare const useSearchEmployees: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof searchEmployees>>, TError, {
        data: BodyType<SearchRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof searchEmployees>>, TError, {
    data: BodyType<SearchRequest>;
}, TContext>;
/**
 * Returns the last N search queries
 * @summary Get search history
 */
export declare const getGetSearchHistoryUrl: (params?: GetSearchHistoryParams) => string;
export declare const getSearchHistory: (params?: GetSearchHistoryParams, options?: RequestInit) => Promise<HistoryResponse>;
export declare const getGetSearchHistoryQueryKey: (params?: GetSearchHistoryParams) => readonly ["/api/history", ...GetSearchHistoryParams[]];
export declare const getGetSearchHistoryQueryOptions: <TData = Awaited<ReturnType<typeof getSearchHistory>>, TError = ErrorType<unknown>>(params?: GetSearchHistoryParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSearchHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSearchHistory>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSearchHistoryQueryResult = NonNullable<Awaited<ReturnType<typeof getSearchHistory>>>;
export type GetSearchHistoryQueryError = ErrorType<unknown>;
/**
 * @summary Get search history
 */
export declare function useGetSearchHistory<TData = Awaited<ReturnType<typeof getSearchHistory>>, TError = ErrorType<unknown>>(params?: GetSearchHistoryParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSearchHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get a specific search result by ID
 */
export declare const getGetSearchByIdUrl: (id: number) => string;
export declare const getSearchById: (id: number, options?: RequestInit) => Promise<SearchHistoryItem>;
export declare const getGetSearchByIdQueryKey: (id: number) => readonly [`/api/history/${number}`];
export declare const getGetSearchByIdQueryOptions: <TData = Awaited<ReturnType<typeof getSearchById>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSearchById>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSearchById>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSearchByIdQueryResult = NonNullable<Awaited<ReturnType<typeof getSearchById>>>;
export type GetSearchByIdQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get a specific search result by ID
 */
export declare function useGetSearchById<TData = Awaited<ReturnType<typeof getSearchById>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSearchById>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Delete a search from history
 */
export declare const getDeleteSearchUrl: (id: number) => string;
export declare const deleteSearch: (id: number, options?: RequestInit) => Promise<SuccessResponse>;
export declare const getDeleteSearchMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSearch>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteSearch>>, TError, {
    id: number;
}, TContext>;
export type DeleteSearchMutationResult = NonNullable<Awaited<ReturnType<typeof deleteSearch>>>;
export type DeleteSearchMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Delete a search from history
 */
export declare const useDeleteSearch: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSearch>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteSearch>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Clear all search history
 */
export declare const getClearHistoryUrl: () => string;
export declare const clearHistory: (options?: RequestInit) => Promise<SuccessResponse>;
export declare const getClearHistoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof clearHistory>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof clearHistory>>, TError, void, TContext>;
export type ClearHistoryMutationResult = NonNullable<Awaited<ReturnType<typeof clearHistory>>>;
export type ClearHistoryMutationError = ErrorType<unknown>;
/**
 * @summary Clear all search history
 */
export declare const useClearHistory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof clearHistory>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof clearHistory>>, TError, void, TContext>;
/**
 * @summary Export search results as CSV
 */
export declare const getExportSearchResultsUrl: (id: number) => string;
export declare const exportSearchResults: (id: number, options?: RequestInit) => Promise<string>;
export declare const getExportSearchResultsQueryKey: (id: number) => readonly [`/api/export/${number}`];
export declare const getExportSearchResultsQueryOptions: <TData = Awaited<ReturnType<typeof exportSearchResults>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof exportSearchResults>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof exportSearchResults>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ExportSearchResultsQueryResult = NonNullable<Awaited<ReturnType<typeof exportSearchResults>>>;
export type ExportSearchResultsQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Export search results as CSV
 */
export declare function useExportSearchResults<TData = Awaited<ReturnType<typeof exportSearchResults>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof exportSearchResults>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get search statistics and source breakdown
 */
export declare const getGetStatsUrl: () => string;
export declare const getStats: (options?: RequestInit) => Promise<StatsResponse>;
export declare const getGetStatsQueryKey: () => readonly ["/api/stats"];
export declare const getGetStatsQueryOptions: <TData = Awaited<ReturnType<typeof getStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getStats>>>;
export type GetStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get search statistics and source breakdown
 */
export declare function useGetStats<TData = Awaited<ReturnType<typeof getStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * Accepts multiple company+role pairs and runs searches sequentially. Returns a job ID for polling.
 * @summary Start a bulk search job
 */
export declare const getStartBulkSearchUrl: () => string;
export declare const startBulkSearch: (bulkSearchRequest: BulkSearchRequest, options?: RequestInit) => Promise<BulkJobResponse>;
export declare const getStartBulkSearchMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof startBulkSearch>>, TError, {
        data: BodyType<BulkSearchRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof startBulkSearch>>, TError, {
    data: BodyType<BulkSearchRequest>;
}, TContext>;
export type StartBulkSearchMutationResult = NonNullable<Awaited<ReturnType<typeof startBulkSearch>>>;
export type StartBulkSearchMutationBody = BodyType<BulkSearchRequest>;
export type StartBulkSearchMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Start a bulk search job
 */
export declare const useStartBulkSearch: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof startBulkSearch>>, TError, {
        data: BodyType<BulkSearchRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof startBulkSearch>>, TError, {
    data: BodyType<BulkSearchRequest>;
}, TContext>;
/**
 * @summary List past bulk search jobs
 */
export declare const getListBulkJobsUrl: (params?: ListBulkJobsParams) => string;
export declare const listBulkJobs: (params?: ListBulkJobsParams, options?: RequestInit) => Promise<BulkJobListResponse>;
export declare const getListBulkJobsQueryKey: (params?: ListBulkJobsParams) => readonly ["/api/bulk", ...ListBulkJobsParams[]];
export declare const getListBulkJobsQueryOptions: <TData = Awaited<ReturnType<typeof listBulkJobs>>, TError = ErrorType<unknown>>(params?: ListBulkJobsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBulkJobs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBulkJobs>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBulkJobsQueryResult = NonNullable<Awaited<ReturnType<typeof listBulkJobs>>>;
export type ListBulkJobsQueryError = ErrorType<unknown>;
/**
 * @summary List past bulk search jobs
 */
export declare function useListBulkJobs<TData = Awaited<ReturnType<typeof listBulkJobs>>, TError = ErrorType<unknown>>(params?: ListBulkJobsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBulkJobs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get a bulk job's results
 */
export declare const getGetBulkJobUrl: (id: number) => string;
export declare const getBulkJob: (id: number, options?: RequestInit) => Promise<BulkJobResponse>;
export declare const getGetBulkJobQueryKey: (id: number) => readonly [`/api/bulk/${number}`];
export declare const getGetBulkJobQueryOptions: <TData = Awaited<ReturnType<typeof getBulkJob>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBulkJob>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBulkJob>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBulkJobQueryResult = NonNullable<Awaited<ReturnType<typeof getBulkJob>>>;
export type GetBulkJobQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get a bulk job's results
 */
export declare function useGetBulkJob<TData = Awaited<ReturnType<typeof getBulkJob>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBulkJob>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Delete a bulk job
 */
export declare const getDeleteBulkJobUrl: (id: number) => string;
export declare const deleteBulkJob: (id: number, options?: RequestInit) => Promise<SuccessResponse>;
export declare const getDeleteBulkJobMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBulkJob>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteBulkJob>>, TError, {
    id: number;
}, TContext>;
export type DeleteBulkJobMutationResult = NonNullable<Awaited<ReturnType<typeof deleteBulkJob>>>;
export type DeleteBulkJobMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Delete a bulk job
 */
export declare const useDeleteBulkJob: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteBulkJob>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteBulkJob>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Export all profiles from a bulk job as a single CSV
 */
export declare const getExportBulkResultsUrl: (id: number) => string;
export declare const exportBulkResults: (id: number, options?: RequestInit) => Promise<string>;
export declare const getExportBulkResultsQueryKey: (id: number) => readonly [`/api/export/bulk/${number}`];
export declare const getExportBulkResultsQueryOptions: <TData = Awaited<ReturnType<typeof exportBulkResults>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof exportBulkResults>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof exportBulkResults>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ExportBulkResultsQueryResult = NonNullable<Awaited<ReturnType<typeof exportBulkResults>>>;
export type ExportBulkResultsQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Export all profiles from a bulk job as a single CSV
 */
export declare function useExportBulkResults<TData = Awaited<ReturnType<typeof exportBulkResults>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof exportBulkResults>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map