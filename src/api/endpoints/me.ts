import { baseApi } from '@/api/baseApi';
import type { AcknowledgementResponse } from '@/api/types/auth';
import type { Id } from '@/api/types/common';
import type {
  DeleteAccountRequest,
  DeleteAccountResponse,
  RegisterDeviceRequest,
  TalentAvailability,
  TalentProfileMe,
  UpdateMeRequest,
  UpdateTalentAvailabilityRequest,
  UpdateTalentProfileRequest,
  UpdateUserPreferencesRequest,
  UpdateVendorProfileRequest,
  UserDevice,
  UserDeviceListResponse,
  UserMe,
  UserPreferences,
  UserPreferencesResponse,
  UserSession,
  VendorProfileMe,
} from '@/api/types/user';

export const meApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<UserMe, void>({
      query: () => ({ url: '/me' }),
      providesTags: ['Me'],
    }),
    updateMe: build.mutation<UserMe, UpdateMeRequest>({
      query: (body) => ({ url: '/me', method: 'PATCH', body }),
      invalidatesTags: ['Me'],
    }),
    deleteMe: build.mutation<DeleteAccountResponse, DeleteAccountRequest>({
      query: (body) => ({ url: '/me', method: 'DELETE', body }),
      invalidatesTags: ['Me', 'Session', 'Device'],
    }),
    getPreferences: build.query<UserPreferences, void>({
      query: () => ({ url: '/me/preferences' }),
      transformResponse: (raw: UserPreferences | UserPreferencesResponse) =>
        'data' in (raw as UserPreferencesResponse)
          ? (raw as UserPreferencesResponse).data
          : (raw as UserPreferences),
      providesTags: ['Preferences'],
    }),
    updatePreferences: build.mutation<UserPreferences, UpdateUserPreferencesRequest>({
      query: (body) => ({ url: '/me/preferences', method: 'PATCH', body }),
      transformResponse: (raw: UserPreferences | UserPreferencesResponse) =>
        'data' in (raw as UserPreferencesResponse)
          ? (raw as UserPreferencesResponse).data
          : (raw as UserPreferences),
      invalidatesTags: ['Preferences', 'Me'],
    }),
    listSessions: build.query<UserSession[], void>({
      query: () => ({ url: '/me/sessions' }),
      providesTags: ['Session'],
    }),
    revokeSession: build.mutation<AcknowledgementResponse, { id: Id }>({
      query: ({ id }) => ({ url: `/me/sessions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Session'],
    }),
    listDevices: build.query<UserDevice[], void>({
      query: () => ({ url: '/me/devices' }),
      transformResponse: (raw: UserDeviceListResponse | UserDevice[]) =>
        Array.isArray(raw) ? raw : raw.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map((d) => ({ type: 'Device' as const, id: d.id })),
              { type: 'Device' as const, id: 'LIST' },
            ]
          : [{ type: 'Device' as const, id: 'LIST' }],
    }),
    registerDevice: build.mutation<UserDevice, RegisterDeviceRequest>({
      query: (body) => ({ url: '/me/devices', method: 'POST', body }),
      invalidatesTags: ['Device'],
    }),
    removeDevice: build.mutation<AcknowledgementResponse, { id: Id }>({
      query: ({ id }) => ({ url: `/me/devices/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Device'],
    }),
    getTalentAvailability: build.query<TalentAvailability, void>({
      query: () => ({ url: '/me/talent-availability' }),
      providesTags: ['TalentAvailability'],
    }),
    setTalentAvailability: build.mutation<TalentAvailability, UpdateTalentAvailabilityRequest>({
      query: (body) => ({ url: '/me/talent-availability', method: 'PUT', body }),
      invalidatesTags: ['TalentAvailability'],
    }),
    getTalentProfile: build.query<TalentProfileMe, void>({
      query: () => ({ url: '/me/talent-profile' }),
      providesTags: ['TalentProfile'],
    }),
    updateTalentProfile: build.mutation<TalentProfileMe, UpdateTalentProfileRequest>({
      query: (body) => ({ url: '/me/talent-profile', method: 'PATCH', body }),
      invalidatesTags: ['TalentProfile', 'Me'],
    }),
    getVendorProfile: build.query<VendorProfileMe, void>({
      query: () => ({ url: '/me/vendor-profile' }),
      providesTags: ['VendorProfile'],
    }),
    updateVendorProfile: build.mutation<VendorProfileMe, UpdateVendorProfileRequest>({
      query: (body) => ({ url: '/me/vendor-profile', method: 'PATCH', body }),
      invalidatesTags: ['VendorProfile', 'Me'],
    }),
  }),
});

export const {
  useGetMeQuery,
  useLazyGetMeQuery,
  useUpdateMeMutation,
  useDeleteMeMutation,
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
  useListSessionsQuery,
  useRevokeSessionMutation,
  useListDevicesQuery,
  useRegisterDeviceMutation,
  useRemoveDeviceMutation,
  useGetTalentAvailabilityQuery,
  useSetTalentAvailabilityMutation,
  useGetTalentProfileQuery,
  useUpdateTalentProfileMutation,
  useGetVendorProfileQuery,
  useUpdateVendorProfileMutation,
} = meApi;
