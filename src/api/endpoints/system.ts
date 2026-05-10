import { baseApi } from '@/api/baseApi';

interface HealthResponse {
  status: string;
  [key: string]: unknown;
}

interface VersionResponse {
  version: string;
  build?: string;
  [key: string]: unknown;
}

export const systemApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getHealth: build.query<HealthResponse, void>({
      query: () => ({ url: '/health' }),
    }),
    getVersion: build.query<VersionResponse, void>({
      query: () => ({ url: '/version' }),
    }),
  }),
});

export const { useGetHealthQuery, useGetVersionQuery } = systemApi;
