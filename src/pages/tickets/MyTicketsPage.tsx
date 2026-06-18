import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { X } from '@phosphor-icons/react';
import { useClaimGiftMutation, useListGiftsQuery, useListMyTicketsQuery } from '@/api/endpoints';
import type { TicketStatus } from '@/types/domain';
import { TicketListCard, TicketListCardSkeleton } from '@/components/tickets/TicketListCard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { apiGiftListItemToInboxRow, apiTicketToMockTicket } from '@/lib/ticketMappers';

const REMINDERS_BANNER_KEY = 'myticket_reminders_banner_dismissed';

type ViewMode = 'tickets' | 'gifts';

type ApiError = { data?: { message?: string } };
function readApiErrorMessage(err: unknown): string | null {
  return (err as ApiError | undefined)?.data?.message ?? null;
}

function formatDateTime(iso: string, fallback: string): string {
  if (!iso.trim()) return fallback;
  try {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return fallback;
    return new Date(iso).toLocaleString();
  } catch {
    return fallback;
  }
}

const GIFT_STATUS_KEYS = {
  pending: 'detail.giftStatusPending',
  claimed: 'detail.giftStatusClaimed',
  expired: 'detail.giftStatusExpired',
} as const;

function giftStatusLabel(status: string, t: (key: string) => string): string {
  if (status in GIFT_STATUS_KEYS) return t(GIFT_STATUS_KEYS[status as keyof typeof GIFT_STATUS_KEYS]);
  return status;
}

const FILTER_KEYS = {
  all: 'filterAll',
  active: 'filterActive',
  auction: 'filterAuction',
  gifted: 'filterGifted',
  used: 'filterUsed',
  expired: 'filterExpired',
  cancelled: 'filterCancelled',
  refunded: 'filterRefunded',
} as const satisfies Record<TicketStatus | 'all', string>;

export function MyTicketsPage() {
  const { t } = useTranslation('tickets');
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>('tickets');
  const [filter, setFilter] = useState<TicketStatus | 'all'>('all');
  const [remindersBannerOpen, setRemindersBannerOpen] = useState(() => {
    try {
      return sessionStorage.getItem(REMINDERS_BANNER_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const {
    data: ticketsPaged,
    isLoading: ticketsLoading,
    isError: ticketsError,
  } = useListMyTicketsQuery({ page: 1, per_page: 20 }, { skip: !user });

  const {
    data: giftsPaged,
    isLoading: giftsLoading,
    isError: giftsError,
  } = useListGiftsQuery({ page: 1, per_page: 20 }, { skip: !user || view !== 'gifts' });

  const [claimGift, { isLoading: claiming }] = useClaimGiftMutation();
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const tickets = useMemo(
    () => (ticketsPaged?.data ?? []).map((t) => apiTicketToMockTicket(t)),
    [ticketsPaged]
  );
  const gifts = useMemo(
    () => (giftsPaged?.data ?? []).map(apiGiftListItemToInboxRow),
    [giftsPaged]
  );

  const filteredTickets = useMemo(() => {
    if (filter === 'all') return tickets;
    return tickets.filter((t) => t.status === filter);
  }, [tickets, filter]);

  async function onClaim(id: string) {
    setClaimError(null);
    setClaimingId(id);
    try {
      await claimGift({ id }).unwrap();
      setView('tickets');
    } catch (err) {
      setClaimError(readApiErrorMessage(err) ?? t('claimError'));
    } finally {
      setClaimingId(null);
    }
  }

  if (!user) {
    return (
      <div className="bg-white pb-20 pt-10">
        <div className="mx-auto max-w-[720px] px-6 lg:px-8">
          <h1 className="text-[32px] font-extrabold tracking-tight text-ink">{t('guestTitle')}</h1>
          <p className="mt-4 text-[14px] text-ink-60">{t('guestDescription')}</p>
          <Link
            to="/login?next=%2Fmy-tickets"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-ink-80"
          >
            {t('logIn')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('pb-20 pt-10', user ? 'bg-ink-5' : 'bg-white')}>
      <div className={cn('mx-auto px-6 lg:px-8', user ? 'max-w-4xl' : 'max-w-[720px]')}>
        <h1 className="text-[32px] font-extrabold tracking-tight text-ink">{t('title')}</h1>
        <p className="mt-2 max-w-xl text-[15px] text-ink-60">{t('description')}</p>

        {remindersBannerOpen && (
          <div className="relative mt-6 rounded-2xl border border-sky/40 bg-sky/15 px-4 py-3 pe-12 text-[13px] leading-relaxed text-ink-60">
            <p>
              <strong className="text-ink">{t('remindersTitle')}</strong> {t('remindersBody')}
            </p>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.setItem(REMINDERS_BANNER_KEY, '1');
                } catch {
                  /* ignore */
                }
                setRemindersBannerOpen(false);
              }}
              className="absolute end-3 top-3 rounded-full p-1.5 text-ink-40 transition-colors hover:bg-white/80"
              aria-label={t('dismiss')}
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        )}

        <div className="mt-8 inline-flex rounded-full border border-ink-10 bg-ink-5/60 p-1">
          {(['tickets', 'gifts'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                'rounded-full px-4 py-1.5 text-[12px] font-bold transition-colors',
                view === v ? 'bg-ink text-white' : 'text-ink-60 hover:bg-white'
              )}
            >
              {v === 'tickets' ? t('tabTickets') : t('tabGifts')}
            </button>
          ))}
        </div>

        {view === 'tickets' && (
          <>
            <div className="mt-6 flex flex-wrap gap-2">
              {(
                ['all', 'active', 'auction', 'gifted', 'used', 'expired', 'cancelled', 'refunded'] as const
              ).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilter(s)}
                  className={cn(
                    'rounded-full px-4 py-2 text-[12px] font-bold transition-colors',
                    filter === s ? 'bg-ink text-white' : 'bg-ink-5 text-ink-60 hover:bg-ink-10'
                  )}
                >
                  {t(FILTER_KEYS[s])}
                </button>
              ))}
            </div>

            {ticketsLoading && (
              <ul className="mt-10 space-y-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <TicketListCardSkeleton key={i} />
                ))}
              </ul>
            )}
            {ticketsError && !ticketsLoading && (
              <p className="mt-10 rounded-lg border border-coral/40 bg-coral/10 px-4 py-3 text-center text-[13px] font-semibold text-coral">
                {t('errorLoad')}
              </p>
            )}

            {!ticketsLoading && !ticketsError && (
              <>
                <ul className="mt-10 space-y-4">
                  {filteredTickets.map((t, index) => (
                    <TicketListCard key={t.id} ticket={t} index={index} />
                  ))}
                </ul>

                {filteredTickets.length === 0 && (
                  <p className="mt-12 text-center text-[15px] text-ink-40">
                    {t('empty')}{' '}
                    <Link to="/events" className="font-semibold text-coral hover:underline">
                      {t('browseEvents')}
                    </Link>
                  </p>
                )}
              </>
            )}
          </>
        )}

        {view === 'gifts' && (
          <>
            {claimError && (
              <p className="mt-6 rounded-lg border border-coral/40 bg-coral/10 px-4 py-2 text-[12px] font-semibold text-coral">
                {claimError}
              </p>
            )}
            {giftsLoading && (
              <p className="mt-10 text-center text-[13px] text-ink-40">{t('giftsLoading')}</p>
            )}
            {giftsError && !giftsLoading && (
              <p className="mt-10 rounded-lg border border-coral/40 bg-coral/10 px-4 py-3 text-center text-[13px] font-semibold text-coral">
                {t('giftsError')}
              </p>
            )}
            {!giftsLoading && !giftsError && (
              <ul className="mt-8 space-y-4">
                {gifts.map((g) => {
                  const expiresLabel = g.expiresAt ? formatDateTime(g.expiresAt, t('dateTbc')) : null;
                  const canClaim = g.status === 'pending';
                  return (
                    <li
                      key={g.id}
                      className="flex flex-col gap-3 rounded-2xl border border-ink-10 bg-ink-5/30 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-extrabold text-ink">{g.eventTitle}</p>
                        <p className="mt-1 text-[13px] text-ink-60">{t('giftsFrom', { sender: g.senderName })}</p>
                        {g.message && (
                          <p className="mt-1 text-[12px] italic text-ink-40">&ldquo;{g.message}&rdquo;</p>
                        )}
                        {expiresLabel && g.status === 'pending' && (
                          <p className="mt-1 text-[12px] text-ink-40">
                            {t('giftsExpires', { date: expiresLabel })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide',
                            g.status === 'pending' && 'bg-lemon/40 text-ink',
                            g.status === 'claimed' && 'bg-mint/40 text-ink',
                            g.status === 'expired' && 'bg-ink-10 text-ink-40'
                          )}
                        >
                          {giftStatusLabel(g.status, t)}
                        </span>
                        {canClaim && (
                          <Button
                            type="button"
                            variant="dark"
                            size="sm"
                            disabled={claiming && claimingId === g.id}
                            onClick={() => void onClaim(g.id)}
                          >
                            {claiming && claimingId === g.id ? t('giftsClaiming') : t('giftsClaim')}
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {!giftsLoading && !giftsError && gifts.length === 0 && (
              <p className="mt-12 text-center text-[15px] text-ink-40">
                {t('giftsEmpty')}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
