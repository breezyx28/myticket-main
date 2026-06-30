import type { RoleUpgradeRequest } from '@/api/types/user';

export function shouldShowRoleUpgradeStatus(request: RoleUpgradeRequest | null | undefined): boolean {
  if (!request) return false;
  if (request.is_pending_review) return true;
  const status = String(request.status ?? '').toLowerCase();
  return ['submitted', 'rejected', 'draft', 'changes_requested'].includes(status);
}

export function isRoleUpgradePending(request: RoleUpgradeRequest): boolean {
  if (request.is_pending_review) return true;
  const status = String(request.status ?? '').toLowerCase();
  return status === 'submitted' || status === 'draft' || status === 'changes_requested';
}

export function isRoleUpgradeRejected(request: RoleUpgradeRequest): boolean {
  return String(request.status ?? '').toLowerCase() === 'rejected';
}

export function roleUpgradeApplyPath(targetRole: string): string {
  const role = targetRole.trim().toLowerCase();
  if (role === 'talent' || role === 'vendor' || role === 'organizer') {
    return `/apply/${role}`;
  }
  return '/profile';
}
