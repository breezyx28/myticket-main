import { baseApi } from '@/api/baseApi';
import type {
  ComplaintCategoriesResponse,
} from '@/api/types/complaint';
import type {
  EventCategoryListResponse,
  EventCategoryRef,
  EventCityListResponse,
  SaudiRegionsResponse,
  VendorServiceCategoryListResponse,
  VendorServiceCategoryRef,
} from '@/api/types/reference';

function normalizeEventCategoriesResponse(response: unknown): EventCategoryListResponse {
  if (Array.isArray(response)) {
    return { data: response as EventCategoryRef[] };
  }
  if (
    response &&
    typeof response === 'object' &&
    Array.isArray((response as EventCategoryListResponse).data)
  ) {
    return response as EventCategoryListResponse;
  }
  return { data: [] };
}

function normalizeVendorServiceCategoriesResponse(
  response: unknown,
): VendorServiceCategoryListResponse {
  if (Array.isArray(response)) {
    return { data: response as VendorServiceCategoryRef[] };
  }
  if (
    response &&
    typeof response === 'object' &&
    Array.isArray((response as VendorServiceCategoryListResponse).data)
  ) {
    return response as VendorServiceCategoryListResponse;
  }
  return { data: [] };
}

/**
 * Reference / taxonomy endpoints. These are the static-ish lookups the SPA
 * uses to populate selects and filter chips. They are co-located in a single
 * module so the front-end has one place to import all "lookup data" hooks
 * from, even when the underlying URLs live on different backend modules.
 */
export const referenceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getEventCategories: build.query<EventCategoryListResponse, void>({
      query: () => ({ url: '/events/categories' }),
      transformResponse: (response: unknown) => normalizeEventCategoriesResponse(response),
      providesTags: [{ type: 'EventTaxonomy', id: 'CATEGORIES' }],
    }),
    getEventCities: build.query<EventCityListResponse, void>({
      query: () => ({ url: '/events/cities' }),
      providesTags: [{ type: 'EventTaxonomy', id: 'CITIES' }],
    }),
    getSaudiRegions: build.query<SaudiRegionsResponse, void>({
      query: () => ({ url: '/reference/saudi-regions' }),
      providesTags: [{ type: 'SaudiRegion', id: 'LIST' }],
    }),
    getComplaintCategories: build.query<ComplaintCategoriesResponse, void>({
      query: () => ({ url: '/complaints/categories' }),
      providesTags: [{ type: 'ComplaintCategory', id: 'LIST' }],
    }),
    getVendorServiceCategories: build.query<VendorServiceCategoryListResponse, void>({
      query: () => ({ url: '/reference/vendor-service-categories' }),
      transformResponse: (response: unknown) =>
        normalizeVendorServiceCategoriesResponse(response),
      providesTags: [{ type: 'Vendor', id: 'SERVICE_CATEGORIES' }],
    }),
  }),
});

export const {
  useGetEventCategoriesQuery,
  useGetEventCitiesQuery,
  useGetSaudiRegionsQuery,
  useGetComplaintCategoriesQuery,
  useGetVendorServiceCategoriesQuery,
} = referenceApi;
