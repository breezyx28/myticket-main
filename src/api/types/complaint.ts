import type { Id, Iso8601 } from '@/api/types/common';

export type ComplaintCategory =
  | 'organizer'
  | 'venue'
  | 'safety'
  | 'staff'
  | 'other'
  | string;

export type ComplaintStatus =
  | 'submitted'
  | 'in_review'
  | 'resolved'
  | 'withdrawn'
  | string;

export interface Complaint {
  id: Id;
  category: ComplaintCategory;
  subject: string;
  body: string;
  status: ComplaintStatus;
  related_order_id?: Id | null;
  related_event_id?: Id | null;
  attachments?: string[];
  created_at: Iso8601;
  updated_at?: Iso8601;
  [key: string]: unknown;
}

export interface CreateComplaintRequest {
  category: ComplaintCategory;
  subject: string;
  body: string;
  related_order_id?: Id;
  related_event_id?: Id;
  attachments?: string[];
  [key: string]: unknown;
}

/**
 * `GET /complaints/categories` — taxonomy of complaint categories with their
 * subcategories. Drives the cascading <select> in the complaint form so the
 * frontend never has to hardcode the list.
 */
export interface ComplaintSubcategoryRef {
  id: string;
  label: string;
  label_ar?: string | null;
  [key: string]: unknown;
}

export interface ComplaintCategoryDef {
  id: string;
  label: string;
  label_ar?: string | null;
  subcategories: ComplaintSubcategoryRef[];
  [key: string]: unknown;
}

export interface ComplaintCategoriesResponse {
  data: ComplaintCategoryDef[];
}
