import type { Id } from '@/api/types/common';
import type {
  MyRoleApplications,
  RoleApplicationKind,
  RoleApplicationStatus,
  RoleApplicationSummary,
} from '@/api/types/roleApplication';
import type { RoleOnboardingStatus } from '@/types/domain';

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as Record<string, unknown>;
}

/** Extract numeric / string id from API role-application payloads. */
export function resolveRoleApplicationId(raw: unknown): Id | null {
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return null;
    const n = Number(trimmed);
    return Number.isFinite(n) && String(n) === trimmed ? n : trimmed;
  }
  return null;
}

function normalizeKind(value: unknown): RoleApplicationKind | null {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/_application$/, '');
  if (raw === 'talent' || raw === 'vendor' || raw === 'organizer') return raw;
  return null;
}

/** Collapse `{ data: … }` / bare resource into `RoleApplicationSummary`. */
export function unwrapRoleApplicationSummary(raw: unknown): RoleApplicationSummary | null {
  let row = asRecord(raw);
  if (!row) return null;

  const nested = asRecord(row.data);
  if (nested) row = nested;

  const id = resolveRoleApplicationId(row.id ?? row.application_id ?? row.role_application_id);
  if (id == null) return null;

  const kind =
    normalizeKind(row.application_type) ??
    normalizeKind(row.kind) ??
    ('talent' as RoleApplicationKind);

  return {
    ...row,
    id,
    kind,
    status: String(row.status ?? 'draft'),
  } as RoleApplicationSummary;
}

/**
 * `GET /role-applications/me` returns `{ data: Application[] }`.
 * Legacy mocks used `{ talent, vendor, organizer }` — support both.
 */
export function normalizeMyRoleApplications(raw: unknown): MyRoleApplications {
  const row = asRecord(raw);
  if (!row) return {};

  if (row.talent != null || row.vendor != null || row.organizer != null) {
    return {
      talent: unwrapRoleApplicationSummary(row.talent),
      vendor: unwrapRoleApplicationSummary(row.vendor),
      organizer: unwrapRoleApplicationSummary(row.organizer),
    };
  }

  const list = Array.isArray(row.data) ? row.data : Array.isArray(raw) ? raw : [];
  const out: MyRoleApplications = {};

  for (const item of list) {
    const summary = unwrapRoleApplicationSummary(item);
    if (!summary) continue;
    const kind =
      normalizeKind(asRecord(item)?.application_type) ?? normalizeKind(summary.kind) ?? summary.kind;
    if (kind === 'talent') out.talent = summary;
    else if (kind === 'vendor') out.vendor = summary;
    else if (kind === 'organizer') out.organizer = summary;
  }

  return out;
}

/** Map API `RoleApplicationStatus` onto marketplace onboarding CTA states. */
export function apiStatusToOnboardingStatus(
  status: RoleApplicationStatus | null | undefined,
): RoleOnboardingStatus {
  const raw = String(status ?? '').toLowerCase();
  if (raw === 'draft' || raw === 'submitted' || raw === 'approved' || raw === 'rejected') {
    return raw;
  }
  if (raw === 'changes_requested') return 'rejected';
  if (raw === 'withdrawn') return 'not_started';
  return 'not_started';
}

if (import.meta.env.DEV) {
  const created = unwrapRoleApplicationSummary({
    data: { id: 3, application_type: 'talent', status: 'draft' },
  });
  const me = normalizeMyRoleApplications({
    data: [{ id: 5, application_type: 'vendor', status: 'submitted' }],
  });
  if (created?.id !== 3 || me.vendor?.id !== 5) {
    console.warn('[roleApplicationMappers] self-check failed', { created, me });
  }
}
