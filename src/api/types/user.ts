import type { Id, Iso8601 } from '@/api/types/common';

/** Active role-upgrade application summary from `GET /me`. */
export interface RoleUpgradeRequest {
  application_id: Id;
  target_role: 'organizer' | 'talent' | 'vendor' | string;
  status: string;
  submitted_at?: Iso8601 | null;
  reviewed_at?: Iso8601 | null;
  rejection_reason?: string | null;
  is_pending_review?: boolean;
}

export interface UserMe {
  id: Id;
  email: string;
  phone?: string | null;
  full_name: string;
  display_name?: string | null;
  bio?: string | null;
  /** Some API versions use `profile_image_url` instead of `avatar_url`. */
  profile_image_url?: string | null;
  avatar_url?: string | null;
  email_verified_at?: Iso8601 | null;
  phone_verified_at?: Iso8601 | null;
  two_factor_enabled?: boolean;
  /** Primary role string when the API does not return `roles[]`. */
  role?: string | null;
  roles?: string[];
  city?: string | number | null;
  city_id?: Id | number | null;
  /** Saudi administrative region id from `GET /reference/saudi-regions`. */
  region_id?: Id | number | null;
  /** Legacy string region name. */
  region?: string | null;
  /** Legacy alias; prefer `region_id` from `GET /me`. */
  saudi_region_id?: Id | number | null;
  date_of_birth?: Iso8601 | null;
  is_active?: boolean;
  is_suspended?: boolean;
  suspension_reason?: string | null;
  suspension_is_permanent?: boolean;
  suspended_at?: Iso8601 | null;
  suspended_by?: Id | null;
  last_login_at?: Iso8601 | null;
  last_login_ip?: string | null;
  deleted_at?: Iso8601 | null;
  /** Present when the guest has an in-flight role-upgrade application. */
  role_upgrade_request?: RoleUpgradeRequest | null;
  preferences?: NotificationPreferences;
  created_at?: Iso8601;
  updated_at?: Iso8601;
  [key: string]: unknown;
}

export interface UpdateMeRequest {
  full_name?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  phone?: string;
  /** Integer id from `GET /reference/saudi-regions` → cities. */
  city_id?: Id | number | null;
  /** Integer id from `GET /reference/saudi-regions`. */
  region_id?: Id | number | null;
  [key: string]: unknown;
}

/** `POST /me/profile-image` — multipart field `image` (max 4 MB). */
export interface UploadProfileImageResponse {
  user_id: Id;
  profile_image_url: string;
  avatar_url: string;
  content_type: string;
  size_bytes: number;
  synced_profiles?: string[];
}

export interface UploadProfileImageEnvelope {
  data: UploadProfileImageResponse;
}

export interface UserSession {
  id: Id;
  ip_address?: string;
  user_agent?: string;
  device_label?: string | null;
  last_active_at?: Iso8601;
  current?: boolean;
  [key: string]: unknown;
}

export type DevicePlatform = 'ios' | 'android' | 'web' | string;

export interface RegisterDeviceRequest {
  app: 'main_website' | string;
  platform: DevicePlatform;
  token: string;
  device_label?: string;
}

export interface UserDevice {
  id: Id;
  app: string;
  platform: DevicePlatform;
  device_label?: string | null;
  last_seen_at?: Iso8601 | null;
  /**
   * Confirmed not yet shipped per BACKEND_TEAM_ANSWERS.md (2026-05-09).
   * Backend says no current-device flag exists today on this endpoint.
   * The "This device" badge in ProfilePage stays hidden until the field appears.
   */
  is_current?: boolean;
  created_at?: Iso8601;
  [key: string]: unknown;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  [key: string]: unknown;
}

export interface UpdateNotificationPreferencesRequest {
  email?: boolean;
  push?: boolean;
  sms?: boolean;
}

/**
 * `GET/PATCH /me/preferences`. Wraps language/theme/marketing toggles + the
 * three notification channels in a single resource so the profile page can
 * read/write the whole preferences blob in one round-trip.
 */
export type LanguagePreference = 'en' | 'ar';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface UserPreferences {
  language: LanguagePreference;
  theme: ThemePreference;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  marketing_emails: boolean;
  [key: string]: unknown;
}

export interface UserPreferencesResponse {
  data: UserPreferences;
}

export interface UpdateUserPreferencesRequest {
  language?: LanguagePreference;
  theme?: ThemePreference;
  email_notifications?: boolean;
  push_notifications?: boolean;
  sms_notifications?: boolean;
  marketing_emails?: boolean;
}

/** `GET /me/devices`. */
export interface UserDeviceListResponse {
  data: UserDevice[];
}

/** `GET/PUT /me/talent-availability`. */
export type TalentAvailabilityStatus = 'available' | 'reserved';

export interface TalentAvailability {
  status: TalentAvailabilityStatus;
  [key: string]: unknown;
}

export interface UpdateTalentAvailabilityRequest {
  status: TalentAvailabilityStatus;
}

/**
 * `DELETE /me`. Frontend gates this behind a literal `"DELETE"` confirmation
 * string so an accidental fetch can never wipe the account.
 */
export interface DeleteAccountRequest {
  confirmation: 'DELETE';
  reason?: string;
}

export interface DeleteAccountResponse {
  ok: true;
  queued_resales: number;
  scheduled_purge_at: Iso8601;
  [key: string]: unknown;
}

export interface TalentProfileMe {
  id: Id;
  stage_name?: string;
  bio?: string;
  city?: string;
  contact_email?: string;
  contact_phone?: string;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  [key: string]: unknown;
}

export interface UpdateTalentProfileRequest {
  stage_name?: string;
  bio?: string;
  city?: string;
  contact_email?: string;
  contact_phone?: string;
  [key: string]: unknown;
}

export interface VendorProfileMe {
  id: Id;
  business_name?: string;
  bio?: string;
  city?: string;
  contact_email?: string;
  contact_phone?: string;
  service_categories?: string[];
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  [key: string]: unknown;
}

export interface UpdateVendorProfileRequest {
  business_name?: string;
  bio?: string;
  city?: string;
  contact_email?: string;
  contact_phone?: string;
  service_categories?: string[];
  [key: string]: unknown;
}
