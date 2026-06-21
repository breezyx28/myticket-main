import type { OnboardingRole } from '@/types/domain';
import type { MockUser } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/domain';
import { buildOrganizerPortalUrl } from '@/lib/organizerPortal';
import { buildTalentPortalUrl } from '@/lib/talentPortal';
import { buildVendorPortalUrl } from '@/lib/vendorPortal';

const PORTAL_ROLES = new Set<UserRole>(['organizer', 'talent', 'vendor']);

/** Portal route where a new role account completes profile after main-site register. */
const PORTAL_ONBOARDING_PATH: Record<OnboardingRole, string> = {
  organizer: '/register',
  talent: '/application',
  vendor: '/application',
};

export function shouldRedirectToRolePortal(role: UserRole | undefined): boolean {
  return role != null && PORTAL_ROLES.has(role);
}

function portalLoginPath(): string {
  return '/login';
}

function buildPortalUrlForRole(
  role: OnboardingRole,
  path: string,
  email?: string,
): string {
  const stub = email ? ({ email, role } as MockUser) : undefined;
  switch (role) {
    case 'organizer':
      return buildOrganizerPortalUrl(path, stub);
    case 'talent':
      return buildTalentPortalUrl(path, stub);
    case 'vendor':
      return buildVendorPortalUrl(path, stub);
  }
}

/** Portal URL to finish profile setup after direct role registration on the main site. */
export function getRolePortalOnboardingUrlForRole(
  role: OnboardingRole,
  email?: string,
): string {
  return buildPortalUrlForRole(role, PORTAL_ONBOARDING_PATH[role], email);
}

/** External dashboard login URL after main-site sign-in. */
export function getRolePortalLoginUrlForRole(
  role: OnboardingRole,
  email?: string,
): string {
  return buildPortalUrlForRole(role, portalLoginPath(), email);
}

/** External dashboard login URL for non-guest roles on the main site. */
export function getRolePortalLoginUrl(user: MockUser): string {
  if (!shouldRedirectToRolePortal(user.role)) return '/';
  return getRolePortalLoginUrlForRole(user.role as OnboardingRole, user.email);
}
