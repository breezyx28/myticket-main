import { Navigate, useLocation } from 'react-router-dom';
import { RoleOnboardingFlow } from '@/components/auth/RoleOnboardingFlow';
import type { UpgradeRole } from '@/data/roleUpgradeBanners';

const APPLY_ROLES = new Set<UpgradeRole>(['talent', 'vendor', 'organizer']);

function parseApplyRole(pathname: string): UpgradeRole | null {
  const segment = pathname.split('/').filter(Boolean).pop();
  if (segment && APPLY_ROLES.has(segment as UpgradeRole)) {
    return segment as UpgradeRole;
  }
  return null;
}

export function ApplyRolePage() {
  const location = useLocation();
  const role = parseApplyRole(location.pathname);

  if (!role) {
    return <Navigate to="/404" replace />;
  }

  return (
    <div className="bg-white pb-20 pt-10">
      <div className="mx-auto max-w-[720px] px-6 lg:px-8">
        <RoleOnboardingFlow role={role} />
      </div>
    </div>
  );
}
