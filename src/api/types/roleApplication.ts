import type { Id, Iso8601 } from '@/api/types/common';

export type RoleApplicationKind = 'talent' | 'vendor' | 'organizer';
export type RoleApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | string;

export interface RoleApplicationSummary {
  id: Id;
  kind: RoleApplicationKind;
  status: RoleApplicationStatus;
  submitted_at?: Iso8601 | null;
  rejection_reason?: string | null;
  [key: string]: unknown;
}

export interface MyRoleApplications {
  talent?: RoleApplicationSummary | null;
  vendor?: RoleApplicationSummary | null;
  organizer?: RoleApplicationSummary | null;
  [key: string]: unknown;
}

export interface CreateTalentApplicationRequest {
  stage_name: string;
  contact_email: string;
  contact_phone: string;
  [key: string]: unknown;
}

export interface UpdateTalentApplicationRequest {
  stage_name?: string;
  bio?: string;
  contact_email?: string;
  contact_phone?: string;
  saudi_region_id?: string;
  city?: string;
  travel_ready?: boolean;
  location_public?: boolean;
  certificate_name?: string;
  accepted_quality_disclaimer?: boolean;
  /** PATCH-body field. Confirmed accepted as a URL string per BACKEND_TEAM_ANSWERS.md (2026-05-09). */
  profile_image?: string;
  [key: string]: unknown;
}

export interface TalentApplicationMediaUpload {
  url: string;
  caption?: string;
  kind?: 'image' | 'video' | 'certificate' | string;
}

export interface CreateVendorApplicationRequest {
  business_name: string;
  contact_email: string;
  contact_phone: string;
  service_categories: string[];
  [key: string]: unknown;
}

export interface UpdateVendorApplicationRequest {
  business_name?: string;
  bio?: string;
  contact_email?: string;
  contact_phone?: string;
  city?: string;
  coverage_area?: string;
  /**
   * Backend currently does not persist `service_categories` on vendor PATCH (only on create).
   * See BACKEND_TEAM_ANSWERS.md (2026-05-09). Orchestrator still sends it for forward-compat.
   */
  service_categories?: string[];
  [key: string]: unknown;
}

export interface VendorDocumentUpload {
  url: string;
  label?: string;
}

export interface VendorGalleryUpload {
  url: string;
  caption?: string;
}

export interface CreateOrganizerApplicationRequest {
  display_name: string;
  email: string;
  contact_phone: string;
  is_company: boolean;
  [key: string]: unknown;
}

export interface UpdateOrganizerApplicationRequest {
  display_name?: string;
  bio?: string;
  email?: string;
  contact_phone?: string;
  location?: string;
  is_company?: boolean;
  company_name?: string;
  company_info?: string;
  owner_name?: string;
  owner_info?: string;
  /** PATCH-body field. Confirmed accepted as a URL string per BACKEND_TEAM_ANSWERS.md (2026-05-09). */
  profile_image?: string;
  /** PATCH-body field. Confirmed accepted as a URL string per BACKEND_TEAM_ANSWERS.md (2026-05-09). */
  optional_document?: string;
  [key: string]: unknown;
}

export interface OrganizerSocialLinkUpload {
  url: string;
  label?: string;
}

/**
 * `GET /role-applications/{role}/{id}`. Returns the merged single-resource
 * view that the wizard step uses to seed its form: the application core plus
 * (when present) the talent / vendor / organizer sub-blob with all nested
 * media, documents, gallery items, and social links the wizard collects.
 */
export interface RoleApplicationTalentDetail {
  id: Id;
  stage_name?: string | null;
  bio?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  saudi_region_id?: Id | null;
  city?: string | null;
  travel_ready?: boolean | null;
  location_public?: boolean | null;
  certificate_name?: string | null;
  accepted_quality_disclaimer?: boolean | null;
  profile_image?: string | null;
  verification_media?: TalentApplicationMediaUpload[];
  [key: string]: unknown;
}

export interface RoleApplicationVendorDetail {
  id: Id;
  business_name?: string | null;
  bio?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  city?: string | null;
  coverage_area?: string | null;
  profile_image?: string | null;
  service_categories?: string[];
  verification_documents?: VendorDocumentUpload[];
  gallery?: VendorGalleryUpload[];
  [key: string]: unknown;
}

export interface RoleApplicationOrganizerDetail {
  id: Id;
  display_name?: string | null;
  bio?: string | null;
  email?: string | null;
  contact_phone?: string | null;
  location?: string | null;
  is_company?: boolean | null;
  company_name?: string | null;
  company_info?: string | null;
  owner_name?: string | null;
  owner_info?: string | null;
  profile_image?: string | null;
  optional_document?: string | null;
  social_links?: OrganizerSocialLinkUpload[];
  [key: string]: unknown;
}

export interface RoleApplicationDetail {
  id: Id;
  kind: RoleApplicationKind;
  status: RoleApplicationStatus;
  submitted_at?: Iso8601 | null;
  rejection_reason?: string | null;
  talent_application?: RoleApplicationTalentDetail | null;
  vendor_application?: RoleApplicationVendorDetail | null;
  organizer_application?: RoleApplicationOrganizerDetail | null;
  [key: string]: unknown;
}

export interface RoleApplicationDetailEnvelope {
  data: RoleApplicationDetail;
}
