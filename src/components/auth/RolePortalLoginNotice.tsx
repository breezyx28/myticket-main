import { useTranslation } from 'react-i18next';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { InlineNotice } from '@/components/ui/form/InlineNotice';
import type { OnboardingRole } from '@/types/domain';

const PORTAL_ROLES = new Set<string>(['organizer', 'talent', 'vendor']);

function normalizePortalRole(role: string): OnboardingRole | null {
  const key = role.trim().toLowerCase();
  return PORTAL_ROLES.has(key) ? (key as OnboardingRole) : null;
}

type RolePortalLoginNoticeProps = {
  role: string;
  portalUrl: string;
  className?: string;
};

export function RolePortalLoginNotice({ role, portalUrl, className }: RolePortalLoginNoticeProps) {
  const { t } = useTranslation('authPages');
  const portalRole = normalizePortalRole(role);
  const roleLabel = portalRole
    ? t(`register.roles.${portalRole}.label`)
    : role.trim() || t('register.roles.guest.label');

  return (
    <InlineNotice
      variant="warning"
      title={t('login.rolePortal.title', { role: roleLabel })}
      className={className}
    >
      <p className="text-[13px] leading-relaxed text-ink-70">
        {t('login.rolePortal.body', { role: roleLabel })}
      </p>
      <a
        href={portalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-coral hover:underline"
      >
        {t('login.rolePortal.cta', { role: roleLabel })}
        <ArrowSquareOut size={16} weight="bold" className="rtl:-scale-x-100" aria-hidden />
      </a>
    </InlineNotice>
  );
}
