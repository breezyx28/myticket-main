import { baseApi } from '@/api/baseApi';
import type { UploadFileEnvelope, UploadFileResponse } from '@/api/types/tourismAd';

export type UploadContext = 'tourism_ad_gallery';

export const uploadsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    uploadFile: build.mutation<
      UploadFileResponse,
      { file: File; context: UploadContext }
    >({
      query: ({ file, context }) => {
        const body = new FormData();
        body.append('file', file);
        body.append('context', context);
        return { url: '/uploads', method: 'POST', body };
      },
      transformResponse: (response: UploadFileEnvelope) => response.data,
    }),
  }),
});

export const { useUploadFileMutation } = uploadsApi;
