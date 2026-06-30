import { useGetMeQuery } from '@/api/endpoints';
import { RoleUpgradeBannersSection } from '@/components/sections/RoleUpgradeBannersSection';
import { RoleUpgradeRequestStatus } from '@/components/profile/RoleUpgradeRequestStatus';
import { shouldShowRoleUpgradeStatus } from '@/lib/roleUpgradeRequest';

export function ProfileRolesTab() {
  const { data: me } = useGetMeQuery();
  const request = me?.role_upgrade_request;

  if (shouldShowRoleUpgradeStatus(request)) {
    return <RoleUpgradeRequestStatus request={request!} />;
  }

  return <RoleUpgradeBannersSection variant="profile" />;
}
