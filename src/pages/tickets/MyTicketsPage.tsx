import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClaimGiftMutation, useListGiftsQuery, useListMyTicketsQuery } from '@/api/endpoints';
import type { TicketStatus } from '@/types/domain';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { apiGiftListItemToInboxRow, apiTicketToMockTicket } from '@/lib/ticketMappers';

const REMINDERS_BANNER_KEY = 'myticket_reminders_banner_dismissed';

const STATUS_LABEL: Record<TicketStatus, string> = {
  active: 'Active',
  auction: 'In auction',
  gifted: 'Gifted',
  used: 'Used',
  expired: 'Expired',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

type ViewMode = 'tickets' | 'gifts';

type ApiError = { data?: { message?: string } };
function readApiErrorMessage(err: unknown): string | null {
  return (err as ApiError | undefined)?.data?.message ?? null;
}

function formatDateTime(iso: string): string {
  if (!iso.trim()) return 'Date TBC';
  try {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return 'Date TBC';
    return new Date(iso).toLocaleString();
  } catch {
    return 'Date TBC';
  }
}

export function MyTicketsPage() {
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
      setClaimError(readApiErrorMessage(err) ?? 'Could not claim this gift. Please try again.');
    } finally {
      setClaimingId(null);
    }
  }

  if (!user) {
    return (
      <div className="bg-white pb-20 pt-10">
        <div className="mx-auto max-w-[720px] px-6 lg:px-8">
          <h1 className="text-[32px] font-extrabold tracking-tight text-ink">My tickets</h1>
          <p className="mt-4 text-[14px] text-ink-60">
            Sign in to view your tickets and gifts inbox.
          </p>
          <Link
            to="/login?next=%2Fmy-tickets"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-ink-80"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white pb-20 pt-10">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <h1 className="text-[32px] font-extrabold tracking-tight text-ink">My tickets</h1>
        <p className="mt-2 max-w-xl text-[15px] text-ink-60">
          View, download, gift, or list tickets. Gifts you receive show up in the inbox.
        </p>

        {remindersBannerOpen && (
          <div className="relative mt-6 rounded-2xl border border-sky/40 bg-sky/15 px-4 py-3 pr-12 text-[13px] leading-relaxed text-ink-60">
            <p>
              <strong className="text-ink">Event reminders</strong> (24h / 1h) shown elsewhere in this demo are
              illustrative only. In production they would be delivered by email and push based on your preferences.
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
              className="absolute right-3 top-3 rounded-full px-2 py-1 text-[11px] font-bold text-ink-40 hover:bg-white/80"
              aria-label="Dismiss"
            >
              ✕
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
              {v === 'tickets' ? 'Tickets' : 'Gifts inbox'}
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
                  {s === 'all' ? 'All' : STATUS_LABEL[s]}
                </button>
              ))}
            </div>

            {ticketsLoading && (
              <p className="mt-10 text-center text-[13px] text-ink-40">Loading tickets…</p>
            )}
            {ticketsError && !ticketsLoading && (
              <p className="mt-10 rounded-lg border border-coral/40 bg-coral/10 px-4 py-3 text-center text-[13px] font-semibold text-coral">
                Could not load your tickets. Please refresh and try again.
              </p>
            )}

            {!ticketsLoading && !ticketsError && (
              <>
                <ul className="mt-10 space-y-4">
                  {filteredTickets.map((t) => (
                    <li key={t.id}>
                      <Link
                        to={`/my-tickets/${t.id}`}
                        className="flex flex-col gap-3 rounded-2xl border border-ink-10 bg-ink-5/30 p-5 transition-colors hover:border-coral sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-extrabold text-ink">{t.eventTitle || 'Event'}</p>
                          <p className="mt-1 text-[13px] text-ink-60">
                            {[t.city, t.venue].filter(Boolean).join(' · ') || 'Venue TBC'}
                            {t.dateStart ? ` · ${formatDateTime(t.dateStart)}` : ''}
                          </p>
                          {t.ticketCode && (
                            <p className="mt-1 font-mono text-[12px] font-semibold text-ink-50">{t.ticketCode}</p>
                          )}
                          <p className="mt-1 text-[12px] text-ink-40">
                            {t.typeName || 'Ticket'}
                            {t.seatLabel ? ` · ${t.seatLabel}` : ''}
                            {t.orderRef ? ` · ${t.orderRef}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide',
                              t.status === 'active' && 'bg-mint/40 text-ink',
                              t.status === 'auction' && 'bg-amber/30 text-ink',
                              t.status === 'gifted' && 'bg-sky/40 text-ink',
                              t.status === 'used' && 'bg-ink-10 text-ink-60',
                              t.status === 'expired' && 'bg-ink-10 text-ink-40',
                              t.status === 'cancelled' && 'bg-red-100 text-red-800',
                              t.status === 'refunded' && 'bg-purple-100 text-purple-800'
                            )}
                          >
                            {STATUS_LABEL[t.status]}
                          </span>
                          <span className="text-[13px] font-semibold text-coral">View →</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>

                {filteredTickets.length === 0 && (
                  <p className="mt-12 text-center text-[15px] text-ink-40">
                    No tickets in this view.{' '}
                    <Link to="/events" className="font-semibold text-coral hover:underline">
                      Browse events
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
              <p className="mt-10 text-center text-[13px] text-ink-40">Loading gifts…</p>
            )}
            {giftsError && !giftsLoading && (
              <p className="mt-10 rounded-lg border border-coral/40 bg-coral/10 px-4 py-3 text-center text-[13px] font-semibold text-coral">
                Could not load your gifts inbox. Please refresh and try again.
              </p>
            )}
            {!giftsLoading && !giftsError && (
              <ul className="mt-8 space-y-4">
                {gifts.map((g) => {
                  const expiresLabel = g.expiresAt ? formatDateTime(g.expiresAt) : null;
                  const canClaim = g.status === 'pending';
                  return (
                    <li
                      key={g.id}
                      className="flex flex-col gap-3 rounded-2xl border border-ink-10 bg-ink-5/30 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-extrabold text-ink">{g.eventTitle}</p>
                        <p className="mt-1 text-[13px] text-ink-60">From {g.senderName}</p>
                        {g.message && (
                          <p className="mt-1 text-[12px] italic text-ink-40">&ldquo;{g.message}&rdquo;</p>
                        )}
                        {expiresLabel && g.status === 'pending' && (
                          <p className="mt-1 text-[12px] text-ink-40">Expires {expiresLabel}</p>
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
                          {g.status}
                        </span>
                        {canClaim && (
                          <Button
                            type="button"
                            variant="dark"
                            size="sm"
                            disabled={claiming && claimingId === g.id}
                            onClick={() => void onClaim(g.id)}
                          >
                            {claiming && claimingId === g.id ? 'Claiming…' : 'Claim'}
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
                No gifts waiting in your inbox.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
