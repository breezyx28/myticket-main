import { useState } from 'react';
import { Check, Star } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { SavedCard } from '@/api/types/savedCard';
import {
  useDeleteSavedCardMutation,
  useUpdateSavedCardDefaultMutation,
} from '@/api/endpoints';
import { CreditCard } from '@/components/checkout/CreditCard';
import {
  creditCardNetworkForBrand,
  displayCardExpiration,
  displayCardHolder,
  maskSavedCardNumber,
  savedCardDisplayLabel,
} from '@/components/checkout/checkoutCreditCardUtils';
import { Button } from '@/components/ui/Button';
import { formatCardBrand, formatSavedCardExpiry } from '@/lib/cardPayment';
import { toAuthApiError } from '@/lib/authErrors';
import { cn } from '@/lib/utils';

type SavedCardsSectionProps = {
  savedCards: SavedCard[];
  loading: boolean;
  error: boolean;
  onMessage: (message: string) => void;
  onError: (message: string | null) => void;
};

export function SavedCardsSection({
  savedCards,
  loading,
  error,
  onMessage,
  onError,
}: SavedCardsSectionProps) {
  const { t } = useTranslation('profile');
  const [updateDefault, { isLoading: settingDefault }] = useUpdateSavedCardDefaultMutation();
  const [deleteSavedCard, { isLoading: deleting }] = useDeleteSavedCardMutation();
  const [pendingDefaultId, setPendingDefaultId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function onSetDefault(id: string) {
    onError(null);
    setPendingDefaultId(id);
    try {
      await updateDefault({ id }).unwrap();
      onMessage(t('savedCards.defaultUpdated'));
    } catch (e) {
      const apiErr = toAuthApiError(e, t('savedCards.updateDefaultError'));
      onError(apiErr.status === 404 ? t('savedCards.cardGone') : apiErr.message);
    } finally {
      setPendingDefaultId(null);
    }
  }

  async function onRemove(id: string) {
    onError(null);
    setPendingDeleteId(id);
    try {
      await deleteSavedCard({ id }).unwrap();
      onMessage(t('savedCards.cardRemoved'));
    } catch (e) {
      const apiErr = toAuthApiError(e, t('savedCards.deleteError'));
      onError(apiErr.status === 404 ? t('savedCards.cardGone') : apiErr.message);
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <section className="mt-10 space-y-5 rounded-2xl border border-ink-10 p-6">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-ink">{t('savedCards.title')}</h2>
        <p className="mt-1 max-w-[65ch] text-[13px] leading-relaxed text-ink-60">{t('savedCards.lead')}</p>
      </div>

      {loading && (
        <div className="space-y-4" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-xl bg-ink-10/60" />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-[12px] font-semibold text-coral">
          {t('savedCards.loadError')}
        </p>
      )}

      {!loading && !error && savedCards.length === 0 && (
        <p className="rounded-xl border border-ink-10 bg-ink-5/40 px-4 py-8 text-center text-[13px] text-ink-40">
          {t('savedCards.empty')}
        </p>
      )}

      {!loading && !error && savedCards.length > 0 && (
        <ul className="space-y-4">
          {savedCards.map((card) => {
            const cardId = String(card.id);
            const isDefault = Boolean(card.is_default);
            const expiry = formatSavedCardExpiry(card.exp_month, card.exp_year);
            const busyDefault = settingDefault && pendingDefaultId === cardId;
            const busyDelete = deleting && pendingDeleteId === cardId;

            return (
              <li
                key={cardId}
                className={cn(
                  'flex flex-col gap-4 rounded-xl border bg-white p-4 transition-[border-color,box-shadow] sm:flex-row sm:items-center sm:justify-between',
                  isDefault ? 'border-mint/30 shadow-[0_8px_24px_-12px_rgba(26,26,26,0.12)]' : 'border-ink-10',
                )}
              >
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="shrink-0 self-center sm:self-auto">
                    <CreditCard
                      network={creditCardNetworkForBrand(card.brand)}
                      label={savedCardDisplayLabel(card, formatCardBrand)}
                      cardNumber={maskSavedCardNumber(card.last4)}
                      cardHolder={displayCardHolder(card.cardholder_name ?? '')}
                      cardExpiration={displayCardExpiration(expiry)}
                      width={220}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-ink">
                      {formatCardBrand(card.brand)}
                      <span className="font-mono text-ink-60">•••• {card.last4}</span>
                      {isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-mint/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mint-dark">
                          <Check className="size-3" weight="bold" aria-hidden />
                          {t('savedCards.default')}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-[12px] text-ink-60">
                      {t('savedCards.expires', { expiry })}
                      {card.cardholder_name ? ` · ${card.cardholder_name}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:shrink-0 sm:flex-col">
                  {!isDefault && (
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      disabled={busyDefault || busyDelete}
                      loading={busyDefault}
                      onClick={() => void onSetDefault(cardId)}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Star className="size-4" aria-hidden />
                      {t('savedCards.setDefault')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    disabled={busyDefault || busyDelete}
                    loading={busyDelete}
                    onClick={() => void onRemove(cardId)}
                  >
                    {t('savedCards.remove')}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
