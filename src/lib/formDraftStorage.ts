import type {
  BaseRegistrationFields,
  OrganizerOnboardingDraft,
  TalentOnboardingDraft,
  VendorOnboardingDraft,
} from '@/types/domain';

export type RegisterRoleDraft = 'guest' | 'talent' | 'organizer' | 'vendor';
export type RegisterStageDraft = 'basic' | 'role-selection' | 'onboarding';

const REGISTER_DRAFT_KEY = 'myticket_register_draft_v1';
const EVENTS_FILTER_DRAFT_KEY = 'myticket_events_filters_v1';
const LOGIN_DRAFT_KEY = 'myticket_login_draft_v1';

export interface RegisterPageDraft {
  stage: RegisterStageDraft;
  role: RegisterRoleDraft;
  wizardStep: number;
  basic: BaseRegistrationFields;
  talentDraft: TalentOnboardingDraft;
  vendorDraft: VendorOnboardingDraft;
  organizerDraft: OrganizerOnboardingDraft;
}

export interface EventsFilterDraft {
  keyword: string;
  /** `event_categories.id` as string (older drafts may still hold a slug until re-saved). */
  category: string;
  city: string;
  dateFrom: string;
  dateTo: string;
  priceMin: string;
  priceMax: string;
  layoutType: 'all' | 'seated' | 'free';
  availabilityOnly: boolean;
  advancedOpen: boolean;
}

export interface LoginPageDraft {
  email: string;
  password: string;
}

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore storage failures */
  }
}

function clearKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore storage failures */
  }
}

export type ApplyRoleDraft = 'talent' | 'organizer' | 'vendor';

const APPLY_DRAFT_KEY = 'myticket_apply_draft_v1';

export interface ApplyPageDraft {
  role: ApplyRoleDraft;
  wizardStep: number;
  talentDraft: TalentOnboardingDraft;
  vendorDraft: VendorOnboardingDraft;
  organizerDraft: OrganizerOnboardingDraft;
}

export function readApplyDraft(): ApplyPageDraft | null {
  return readJson<ApplyPageDraft>(APPLY_DRAFT_KEY);
}

export function writeApplyDraft(value: ApplyPageDraft): void {
  writeJson(APPLY_DRAFT_KEY, value);
}

export function clearApplyDraft(): void {
  clearKey(APPLY_DRAFT_KEY);
}

export function readRegisterDraft(): RegisterPageDraft | null {
  return readJson<RegisterPageDraft>(REGISTER_DRAFT_KEY);
}

export function writeRegisterDraft(value: RegisterPageDraft): void {
  writeJson(REGISTER_DRAFT_KEY, value);
}

export function clearRegisterDraft(): void {
  clearKey(REGISTER_DRAFT_KEY);
}

export function readEventsFilterDraft(): EventsFilterDraft | null {
  return readJson<EventsFilterDraft>(EVENTS_FILTER_DRAFT_KEY);
}

export function writeEventsFilterDraft(value: EventsFilterDraft): void {
  writeJson(EVENTS_FILTER_DRAFT_KEY, value);
}

export function clearEventsFilterDraft(): void {
  clearKey(EVENTS_FILTER_DRAFT_KEY);
}

export function readLoginDraft(): LoginPageDraft | null {
  return readJson<LoginPageDraft>(LOGIN_DRAFT_KEY);
}

export function writeLoginDraft(value: LoginPageDraft): void {
  writeJson(LOGIN_DRAFT_KEY, value);
}

export function clearLoginDraft(): void {
  clearKey(LOGIN_DRAFT_KEY);
}
