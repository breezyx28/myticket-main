import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Clock, WarningCircle } from '@phosphor-icons/react';
import type { RoleUpgradeRequest } from '@/api/types/user';
import { Button } from '@/components/ui/Button';
import {
  isRoleUpgradePending,
  isRoleUpgradeRejected,
  roleUpgradeApplyPath,
} from '@/lib/roleUpgradeRequest';
import { cn } from '@/lib/utils';

type RoleUpgradeRequestStatusProps = {
  request: RoleUpgradeRequest;
};

function formatSubmittedAt(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    );
  } catch {
    return null;
  }
}

export function RoleUpgradeRequestStatus({ request }: RoleUpgradeRequestStatusProps) {
  const { t, i18n } = useTranslation('profile');
  const pending = isRoleUpgradePending(request);
  const rejected = isRoleUpgradeRejected(request);
  const roleKey = String(request.target_role ?? '').toLowerCase();
  const roleLabel = t(`rolesUpgrade.roleLabels.${roleKey}`, {
    defaultValue: roleKey,
  });
  const submittedAt = formatSubmittedAt(request.submitted_at, i18n.language);

  if (!pending && !rejected) return null;

  return (
    <section className="mt-10 rounded-2xl border border-ink-10 bg-white p-6">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-40">
        {t('rolesUpgrade.eyebrow')}
      </span>

      <div
        className={cn(
          'mt-4 overflow-hidden rounded-2xl border',
          rejected ? 'border-coral/35 bg-coral/5' : 'border-ink-10 bg-ink-5/40',
        )}
      >
        <div className="flex gap-4 p-5 sm:p-6">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              rejected ? 'bg-coral/15 text-coral' : 'bg-white text-ink shadow-sm',
            )}
            aria-hidden
          >
            {rejected ? <WarningCircle size={24} weight="fill" /> : <Clock size={24} weight="bold" />}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold tracking-tight text-ink">
              {rejected
                ? t('rolesUpgrade.rejectedTitle', { role: roleLabel })
                : t('rolesUpgrade.pendingTitle', { role: roleLabel })}
            </h2>
            <p className="mt-2 text-pretty text-[14px] leading-relaxed text-ink-60">
              {rejected ? t('rolesUpgrade.rejectedBody') : t('rolesUpgrade.pendingBody')}
            </p>
            {submittedAt && pending ? (
              <p className="mt-2 text-[12px] font-medium text-ink-40">
                {t('rolesUpgrade.submittedAt', { date: submittedAt })}
              </p>
            ) : null}
          </div>
        </div>

        {rejected ? (
          <div className="border-t border-coral/20 bg-white/70 px-5 py-4 sm:px-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-40">
              {t('rolesUpgrade.rejectionReasonLabel')}
            </p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink">
              {request.rejection_reason?.trim() || t('rolesUpgrade.rejectionFallback')}
            </p>
            <Button
              asChild
              variant="dark"
              size="md"
              className="mt-4"
            >
              <Link to={roleUpgradeApplyPath(request.target_role)}>{t('rolesUpgrade.reapplyCta')}</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
