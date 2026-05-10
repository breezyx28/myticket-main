import { baseApi } from '@/api/baseApi';
import type { AcknowledgementResponse } from '@/api/types/auth';
import type { Id } from '@/api/types/common';
import type {
  CreateOrganizerApplicationRequest,
  CreateTalentApplicationRequest,
  CreateVendorApplicationRequest,
  MyRoleApplications,
  OrganizerSocialLinkUpload,
  RoleApplicationDetail,
  RoleApplicationDetailEnvelope,
  RoleApplicationKind,
  RoleApplicationSummary,
  TalentApplicationMediaUpload,
  UpdateOrganizerApplicationRequest,
  UpdateTalentApplicationRequest,
  UpdateVendorApplicationRequest,
  VendorDocumentUpload,
  VendorGalleryUpload,
} from '@/api/types/roleApplication';

const TALENT = 'role-applications/talent';
const VENDOR = 'role-applications/vendor';
const ORGANIZER = 'role-applications/organizer';

export const roleApplicationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyRoleApplications: build.query<MyRoleApplications, void>({
      query: () => ({ url: '/role-applications/me' }),
      providesTags: ['RoleApplication'],
    }),
    /**
     * Single-application detail used by the wizard to seed its form. Backend
     * returns the application core merged with the matching `*_application`
     * sub-blob (talent / vendor / organizer); the envelope-or-bare shapes are
     * collapsed via `transformResponse` so callers always destructure
     * `RoleApplicationDetail`.
     */
    getRoleApplication: build.query<
      RoleApplicationDetail,
      { role: RoleApplicationKind; id: Id }
    >({
      query: ({ role, id }) => ({ url: `/role-applications/${role}/${id}` }),
      transformResponse: (raw: RoleApplicationDetail | RoleApplicationDetailEnvelope) =>
        'data' in (raw as RoleApplicationDetailEnvelope)
          ? (raw as RoleApplicationDetailEnvelope).data
          : (raw as RoleApplicationDetail),
      providesTags: (_res, _err, arg) => [
        { type: 'RoleApplication', id: `${arg.role}:${arg.id}` },
        'RoleApplication',
      ],
    }),

    /* Talent application */
    createTalentApplication: build.mutation<
      RoleApplicationSummary,
      CreateTalentApplicationRequest
    >({
      query: (body) => ({ url: `/${TALENT}`, method: 'POST', body }),
      invalidatesTags: ['RoleApplication'],
    }),
    updateTalentApplication: build.mutation<
      RoleApplicationSummary,
      { id: Id; body: UpdateTalentApplicationRequest }
    >({
      query: ({ id, body }) => ({ url: `/${TALENT}/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['RoleApplication'],
    }),
    submitTalentApplication: build.mutation<RoleApplicationSummary, { id: Id }>({
      query: ({ id }) => ({ url: `/${TALENT}/${id}/submit`, method: 'POST' }),
      invalidatesTags: ['RoleApplication'],
    }),
    resubmitTalentApplication: build.mutation<RoleApplicationSummary, { id: Id }>({
      query: ({ id }) => ({ url: `/${TALENT}/${id}/resubmit`, method: 'POST' }),
      invalidatesTags: ['RoleApplication'],
    }),
    withdrawTalentApplication: build.mutation<AcknowledgementResponse, { id: Id }>({
      query: ({ id }) => ({ url: `/${TALENT}/${id}/withdraw`, method: 'POST' }),
      invalidatesTags: ['RoleApplication'],
    }),
    addTalentMedia: build.mutation<
      AcknowledgementResponse,
      { id: Id; body: TalentApplicationMediaUpload }
    >({
      query: ({ id, body }) => ({ url: `/${TALENT}/${id}/media`, method: 'POST', body }),
      invalidatesTags: ['RoleApplication'],
    }),
    deleteTalentMedia: build.mutation<AcknowledgementResponse, { id: Id; mediaId: Id }>({
      query: ({ id, mediaId }) => ({
        url: `/${TALENT}/${id}/media/${mediaId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RoleApplication'],
    }),

    /* Vendor application */
    createVendorApplication: build.mutation<
      RoleApplicationSummary,
      CreateVendorApplicationRequest
    >({
      query: (body) => ({ url: `/${VENDOR}`, method: 'POST', body }),
      invalidatesTags: ['RoleApplication'],
    }),
    updateVendorApplication: build.mutation<
      RoleApplicationSummary,
      { id: Id; body: UpdateVendorApplicationRequest }
    >({
      query: ({ id, body }) => ({ url: `/${VENDOR}/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['RoleApplication'],
    }),
    submitVendorApplication: build.mutation<RoleApplicationSummary, { id: Id }>({
      query: ({ id }) => ({ url: `/${VENDOR}/${id}/submit`, method: 'POST' }),
      invalidatesTags: ['RoleApplication'],
    }),
    resubmitVendorApplication: build.mutation<RoleApplicationSummary, { id: Id }>({
      query: ({ id }) => ({ url: `/${VENDOR}/${id}/resubmit`, method: 'POST' }),
      invalidatesTags: ['RoleApplication'],
    }),
    withdrawVendorApplication: build.mutation<AcknowledgementResponse, { id: Id }>({
      query: ({ id }) => ({ url: `/${VENDOR}/${id}/withdraw`, method: 'POST' }),
      invalidatesTags: ['RoleApplication'],
    }),
    addVendorDocument: build.mutation<
      AcknowledgementResponse,
      { id: Id; body: VendorDocumentUpload }
    >({
      query: ({ id, body }) => ({
        url: `/${VENDOR}/${id}/documents`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['RoleApplication'],
    }),
    deleteVendorDocument: build.mutation<AcknowledgementResponse, { id: Id; docId: Id }>({
      query: ({ id, docId }) => ({
        url: `/${VENDOR}/${id}/documents/${docId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RoleApplication'],
    }),
    addVendorGalleryItem: build.mutation<
      AcknowledgementResponse,
      { id: Id; body: VendorGalleryUpload }
    >({
      query: ({ id, body }) => ({
        url: `/${VENDOR}/${id}/gallery`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['RoleApplication'],
    }),
    deleteVendorGalleryItem: build.mutation<AcknowledgementResponse, { id: Id; itemId: Id }>({
      query: ({ id, itemId }) => ({
        url: `/${VENDOR}/${id}/gallery/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RoleApplication'],
    }),

    /* Organizer application */
    createOrganizerApplication: build.mutation<
      RoleApplicationSummary,
      CreateOrganizerApplicationRequest
    >({
      query: (body) => ({ url: `/${ORGANIZER}`, method: 'POST', body }),
      invalidatesTags: ['RoleApplication'],
    }),
    updateOrganizerApplication: build.mutation<
      RoleApplicationSummary,
      { id: Id; body: UpdateOrganizerApplicationRequest }
    >({
      query: ({ id, body }) => ({ url: `/${ORGANIZER}/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['RoleApplication'],
    }),
    submitOrganizerApplication: build.mutation<RoleApplicationSummary, { id: Id }>({
      query: ({ id }) => ({ url: `/${ORGANIZER}/${id}/submit`, method: 'POST' }),
      invalidatesTags: ['RoleApplication'],
    }),
    resubmitOrganizerApplication: build.mutation<RoleApplicationSummary, { id: Id }>({
      query: ({ id }) => ({ url: `/${ORGANIZER}/${id}/resubmit`, method: 'POST' }),
      invalidatesTags: ['RoleApplication'],
    }),
    withdrawOrganizerApplication: build.mutation<AcknowledgementResponse, { id: Id }>({
      query: ({ id }) => ({ url: `/${ORGANIZER}/${id}/withdraw`, method: 'POST' }),
      invalidatesTags: ['RoleApplication'],
    }),
    addOrganizerSocialLink: build.mutation<
      AcknowledgementResponse,
      { id: Id; body: OrganizerSocialLinkUpload }
    >({
      query: ({ id, body }) => ({
        url: `/${ORGANIZER}/${id}/social-links`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['RoleApplication'],
    }),
    deleteOrganizerSocialLink: build.mutation<
      AcknowledgementResponse,
      { id: Id; linkId: Id }
    >({
      query: ({ id, linkId }) => ({
        url: `/${ORGANIZER}/${id}/social-links/${linkId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RoleApplication'],
    }),
  }),
});

export const {
  useGetMyRoleApplicationsQuery,
  useGetRoleApplicationQuery,
  useLazyGetRoleApplicationQuery,
  useCreateTalentApplicationMutation,
  useUpdateTalentApplicationMutation,
  useSubmitTalentApplicationMutation,
  useResubmitTalentApplicationMutation,
  useWithdrawTalentApplicationMutation,
  useAddTalentMediaMutation,
  useDeleteTalentMediaMutation,
  useCreateVendorApplicationMutation,
  useUpdateVendorApplicationMutation,
  useSubmitVendorApplicationMutation,
  useResubmitVendorApplicationMutation,
  useWithdrawVendorApplicationMutation,
  useAddVendorDocumentMutation,
  useDeleteVendorDocumentMutation,
  useAddVendorGalleryItemMutation,
  useDeleteVendorGalleryItemMutation,
  useCreateOrganizerApplicationMutation,
  useUpdateOrganizerApplicationMutation,
  useSubmitOrganizerApplicationMutation,
  useResubmitOrganizerApplicationMutation,
  useWithdrawOrganizerApplicationMutation,
  useAddOrganizerSocialLinkMutation,
  useDeleteOrganizerSocialLinkMutation,
} = roleApplicationsApi;
