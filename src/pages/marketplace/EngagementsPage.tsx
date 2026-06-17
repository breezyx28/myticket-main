import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ClockCounterClockwise } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAcceptEngagementMutation,
  useDeclineEngagementMutation,
  useGetTalentAvailabilityQuery,
  useListEngagementsQuery,
  usePostEngagementMessageMutation,
} from '@/api/endpoints';
import { engagementMessageSchema } from '@/schemas/engagement';
import { apiEngagementToMockEngagement } from '@/lib/engagementMappers';
import { cn } from '@/lib/utils';
import { canBrowseMarketplace } from '@/lib/marketplaceAccess';

const STATUS_PILL: Record<string, string> = {
  pending: 'bg-ink-5 text-ink-60',
  accepted: 'bg-mint/30 text-mint-dark',
  declined: 'bg-coral/15 text-coral',
  completed: 'bg-mint/40 text-mint-dark',
  cancelled: 'bg-ink-5 text-ink-40',
};

function readApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const candidate = (err as { data?: unknown }).data;
    if (candidate && typeof candidate === 'object') {
      const message = (candidate as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) return message;
    }
    const direct = (err as { message?: unknown }).message;
    if (typeof direct === 'string' && direct.trim().length > 0) return direct;
  }
  return fallback;
}

export function EngagementsPage() {
  const { t, i18n } = useTranslation(['marketplace', 'common']);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const talentReady = user?.role === 'talent';
  const isOrganizer = user?.role === 'organizer';
  const canRespond = Boolean(isOrganizer || user?.role === 'vendor' || talentReady);

  const {
    data: engagementsPaged,
    isLoading,
    isFetching,
    isError,
  } = useListEngagementsQuery({ page: 1, per_page: 50 }, { skip: !user });

  const list = useMemo(
    () => (engagementsPaged?.data ?? []).map(apiEngagementToMockEngagement),
    [engagementsPaged]
  );

  const { data: talentAvailability } = useGetTalentAvailabilityQuery(undefined, {
    skip: !talentReady,
  });

  const [acceptEngagement, { isLoading: accepting }] = useAcceptEngagementMutation();
  const [declineEngagement, { isLoading: declining }] = useDeclineEngagementMutation();
  const [postEngagementMessage, { isLoading: posting }] = usePostEngagementMessageMutation();

  const focusId = searchParams.get('focus');
  useEffect(() => {
    if (!focusId) return;
    setSelectedId(focusId);
  }, [focusId]);

  const selected = useMemo(
    () => list.find((e) => e.id === selectedId) ?? null,
    [list, selectedId]
  );

  const statusCounts = useMemo(
    () => ({
      pending: list.filter((x) => x.status === 'pending').length,
      accepted: list.filter((x) => x.status === 'accepted').length,
      declined: list.filter((x) => x.status === 'declined').length,
    }),
    [list]
  );

  async function onAccept(id: string) {
    setActionError(null);
    try {
      await acceptEngagement({ id }).unwrap();
    } catch (err) {
      setActionError(readApiErrorMessage(err, t('marketplace:engagement.couldNotAccept')));
    }
  }

  async function onDecline(id: string) {
    setActionError(null);
    try {
      await declineEngagement({ id }).unwrap();
    } catch (err) {
      setActionError(readApiErrorMessage(err, t('marketplace:engagement.couldNotDecline')));
    }
  }

  async function onSendMessage() {
    if (!selected) return;
    const trimmed = message.trim();
    if (!trimmed) return;
    setActionError(null);
    try {
      await engagementMessageSchema.validate({ body: trimmed });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('marketplace:engagement.messageInvalid'));
      return;
    }
    try {
      await postEngagementMessage({ id: selected.id, body: { body: trimmed } }).unwrap();
      setMessage('');
    } catch (err) {
      setActionError(readApiErrorMessage(err, t('marketplace:engagement.couldNotSend')));
    }
  }

  if (!user) {
    return (
      <div className="bg-ink-5/40 pb-20 pt-10">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="rounded-3xl border border-ink-10 bg-white p-8 text-center">
            <h1 className="text-[28px] font-extrabold text-ink">{t('marketplace:engagement.title')}</h1>
            <p className="mt-3 text-[14px] text-ink-60">
              {t('marketplace:engagement.signInPrompt')}
            </p>
            <Link
              to="/login"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 text-[13px] font-semibold text-white hover:bg-ink-80"
            >
              {t('common:signIn')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ink-5/40 pb-20 pt-10">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
        <Link
          to={canBrowseMarketplace(user) ? '/marketplace' : '/'}
          className="text-[13px] font-semibold text-coral hover:underline"
        >
          {i18n.dir() === 'rtl' ? '→' : '←'} {canBrowseMarketplace(user) ? t('marketplace:title', 'Marketplace') : t('common:home', 'Home')}
        </Link>

        <div className="mt-4 rounded-3xl border border-ink-10 bg-white p-6 md:p-8">
          <h1 className="text-[32px] font-extrabold text-ink">{t('marketplace:engagement.title')}</h1>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-60">
            {t('marketplace:engagement.lead')}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-ink-10 bg-ink-5/50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-40">
                {t('marketplace:engagement.pending')}
              </p>
              <p className="mt-1 text-xl font-extrabold text-ink">{statusCounts.pending}</p>
            </div>
            <div className="rounded-xl border border-ink-10 bg-mint/20 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-40">
                {t('marketplace:engagement.accepted')}
              </p>
              <p className="mt-1 text-xl font-extrabold text-ink">{statusCounts.accepted}</p>
            </div>
            <div className="rounded-xl border border-ink-10 bg-coral/10 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-40">
                {t('marketplace:engagement.declined')}
              </p>
              <p className="mt-1 text-xl font-extrabold text-ink">{statusCounts.declined}</p>
            </div>
          </div>

          {talentReady && (
            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-ink-10 bg-ink-5/40 px-3 py-2">
              <span className="text-[12px] font-semibold text-ink-60">
                {t('marketplace:engagement.availabilityLabel')}
              </span>
              <span
                className={cn(
                  'rounded-full px-3 py-1.5 text-[12px] font-semibold',
                  talentAvailability?.status === 'reserved'
                    ? 'bg-ink text-white'
                    : 'bg-mint text-ink'
                )}
              >
                {talentAvailability?.status === 'reserved'
                  ? t('marketplace:engagement.reserved')
                  : t('marketplace:engagement.available')}
              </span>
              <span className="text-[12px] text-ink-40">
                {t('marketplace:engagement.manageFrom')}{' '}
                <Link to="/profile" className="font-semibold text-coral hover:underline">
                  {t('marketplace:engagement.accountRoles')}
                </Link>
              </span>
            </div>
          )}

          {!canRespond && (
            <div className="mt-4 rounded-xl border border-lemon bg-lemon/15 p-4 text-[13px] text-ink-60">
              <p className="font-semibold text-ink">{t('marketplace:engagement.talentRequiredTitle')}</p>
              <p className="mt-1">{t('marketplace:engagement.talentRequiredBody')}</p>
            </div>
          )}

          {actionError && (
            <div className="mt-4 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-[13px] font-semibold text-coral">
              {actionError}
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
          <aside className="rounded-2xl border border-ink-10 bg-white p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">
                {t('marketplace:engagement.conversations')}
              </p>
              <span className="rounded-full bg-ink-5 px-2.5 py-1 text-[11px] font-semibold text-ink-60">
                {t('marketplace:engagement.total', { count: list.length })}
              </span>
            </div>
            {isLoading ? (
              <div className="rounded-xl border border-dashed border-ink-20 bg-ink-5/40 px-4 py-8 text-center text-[13px] text-ink-40">
                {t('marketplace:engagement.loading')}
              </div>
            ) : isError ? (
              <div className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-6 text-center text-[13px] font-semibold text-coral">
                {t('marketplace:engagement.loadError')}
              </div>
            ) : list.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink-20 bg-ink-5/40 px-4 py-8 text-center text-[13px] text-ink-40">
                {t('marketplace:engagement.empty')}
              </div>
            ) : (
              <ul className="space-y-2">
                {list.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(e.id)}
                      className={cn(
                        'w-full rounded-xl border p-3 text-start transition-colors',
                        selectedId === e.id ? 'border-coral bg-coral/5' : 'border-ink-10 hover:border-ink-20'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-ink">{isOrganizer ? e.topic : e.organizerName}</p>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                            STATUS_PILL[e.status] ?? 'bg-ink-5 text-ink-60'
                          )}
                        >
                          {t(`marketplace:engagement.${e.status}` as const, e.status)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12px] text-ink-60">{isOrganizer ? e.preview : e.topic}</p>
                      <p className="mt-2 text-[11px] text-ink-40">{new Date(e.createdAt).toLocaleDateString()}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className="rounded-2xl border border-ink-10 bg-white p-5 md:p-6">
            {selected ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-extrabold text-ink">{selected.topic}</h2>
                    <p className="mt-1 text-[13px] text-ink-40">
                      {isOrganizer
                        ? t('marketplace:engagement.started')
                        : t('marketplace:engagement.from', { name: selected.organizerName })}{' '}
                      · {new Date(selected.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-semibold uppercase',
                      STATUS_PILL[selected.status] ?? 'bg-ink-5 text-ink-60'
                    )}
                  >
                    {t(`marketplace:engagement.${selected.status}` as const, selected.status)}
                  </span>
                </div>

                {selected.preview && (
                  <p className="mt-4 rounded-xl border border-ink-10 bg-ink-5/50 px-4 py-3 text-[14px] leading-relaxed text-ink-60">
                    {selected.preview}
                  </p>
                )}

                <div className="mt-5 rounded-xl border border-ink-10 bg-ink-5/30 p-4">
                  <p className="text-[12px] font-semibold text-ink-60">{t('marketplace:engagement.thread')}</p>
                  {selected.messages.length === 0 ? (
                    <p className="mt-3 rounded-xl border border-dashed border-ink-20 bg-white px-3 py-6 text-center text-[12px] text-ink-40">
                      {t('marketplace:engagement.noMessages')}
                    </p>
                  ) : (
                    <ul className="mt-3 max-h-[280px] space-y-2 overflow-y-auto pr-1">
                      {selected.messages.map((msg) => (
                        <li
                          key={msg.id}
                          className={cn(
                            'rounded-xl px-3 py-2 text-[12px]',
                            msg.sender === 'talent'
                              ? 'ms-8 bg-ink text-white'
                              : 'me-8 border border-ink-10 bg-white text-ink-60'
                          )}
                        >
                          <p>{msg.text}</p>
                          <p className={cn('mt-1 text-[10px]', msg.sender === 'talent' ? 'text-white/70' : 'text-ink-40')}>
                            {new Date(msg.createdAt).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex gap-2">
                    <input
                      value={message}
                      disabled={!canRespond || posting}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        canRespond
                          ? t('marketplace:engagement.replyPlaceholder')
                          : t('marketplace:engagement.replyDisabled')
                      }
                      className="w-full rounded-xl border border-ink-10 bg-white px-4 py-2.5 text-[13px]"
                    />
                    <Button
                      variant="dark"
                      size="md"
                      disabled={!canRespond || posting || message.trim().length < 1}
                      onClick={onSendMessage}
                    >
                      {posting ? t('marketplace:engagement.sending') : t('marketplace:engagement.send')}
                    </Button>
                  </div>
                </div>

                {!isOrganizer && selected.status === 'pending' && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      variant="dark"
                      size="md"
                      onClick={() => onAccept(selected.id)}
                      disabled={!canRespond || accepting || declining}
                    >
                      {accepting ? t('marketplace:engagement.accepting') : t('marketplace:engagement.accept')}
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => onDecline(selected.id)}
                      disabled={!canRespond || accepting || declining}
                    >
                      {declining ? t('marketplace:engagement.declining') : t('marketplace:engagement.decline')}
                    </Button>
                  </div>
                )}
                {selected.status === 'accepted' && (
                  <p className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-mint-dark">
                    <CheckCircle size={16} weight="fill" />
                    {isOrganizer
                      ? t('marketplace:engagement.acceptedOrganizer')
                      : t('marketplace:engagement.acceptedTalent')}
                  </p>
                )}
                {selected.status === 'declined' && (
                  <p className="mt-6 inline-flex items-center gap-2 text-[13px] text-ink-60">
                    <ClockCounterClockwise size={16} weight="fill" className="text-ink-40" />
                    {isOrganizer
                      ? t('marketplace:engagement.declinedOrganizer')
                      : t('marketplace:engagement.declinedTalent')}
                  </p>
                )}
                {selected.status === 'completed' && (
                  <p className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-mint-dark">
                    <CheckCircle size={16} weight="fill" />
                    {t('marketplace:engagement.completedMsg')}
                  </p>
                )}
                {selected.status === 'cancelled' && (
                  <p className="mt-6 inline-flex items-center gap-2 text-[13px] text-ink-60">
                    <ClockCounterClockwise size={16} weight="fill" className="text-ink-40" />
                    {t('marketplace:engagement.cancelledMsg')}
                  </p>
                )}
              </>
            ) : isFetching ? (
              <div className="rounded-xl border border-dashed border-ink-20 bg-ink-5/40 px-4 py-12 text-center text-[14px] text-ink-40">
                {t('common:loading')}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-ink-20 bg-ink-5/40 px-4 py-12 text-center text-[14px] text-ink-40">
                {t('marketplace:engagement.selectConversation')}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
