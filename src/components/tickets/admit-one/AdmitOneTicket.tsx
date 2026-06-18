import { forwardRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ticket as TicketIcon } from '@phosphor-icons/react';
import '@fontsource/staatliches/400.css';
import '@fontsource/nanum-pen-script/400.css';
import type { AdmitOneTicketViewModel } from '@/components/tickets/admit-one/admitOneTicketModel';
import styles from '@/components/tickets/admit-one/admitOneTicket.module.css';
import { cn } from '@/lib/utils';

const SITE_LOGO_SRC = '/favicon.svg';

export type AdmitOneTicketProps = {
  model: AdmitOneTicketViewModel;
  qrDataUrl: string | null;
  qrLoading?: boolean;
  variant?: 'display' | 'download';
  className?: string;
};

function TicketEventCover({ coverImageUrl }: { coverImageUrl: string | null }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [coverImageUrl]);

  if (!coverImageUrl || imageFailed) {
    return (
      <div className={styles.imagePlaceholder} aria-hidden>
        <img src={SITE_LOGO_SRC} alt="" className={styles.logoPlaceholder} />
      </div>
    );
  }

  return (
    <img
      src={coverImageUrl}
      alt=""
      className={styles.image}
      onError={() => setImageFailed(true)}
    />
  );
}

function BrandStrip({ brand }: { brand: string }) {
  return (
    <p className={styles.brandStrip} aria-hidden>
      <span>{brand}</span>
      <span>{brand}</span>
      <span>{brand}</span>
    </p>
  );
}

function TimeBlock({
  start,
  end,
  className,
  timeTbc,
  timeTo,
}: {
  start: string | null;
  end: string | null;
  className?: string;
  timeTbc: string;
  timeTo: string;
}) {
  if (!start) {
    return (
      <div className={cn(styles.time, className)}>
        <p>{timeTbc}</p>
      </div>
    );
  }
  return (
    <div className={cn(styles.time, className)}>
      {end && end !== start ? (
        <p>
          {start} <span>{timeTo}</span> {end}
        </p>
      ) : (
        <p>{start}</p>
      )}
    </div>
  );
}

export const AdmitOneTicket = forwardRef<HTMLDivElement, AdmitOneTicketProps>(function AdmitOneTicket(
  { model, qrDataUrl, qrLoading = false, variant = 'display', className },
  ref,
) {
  const { t } = useTranslation('tickets');

  return (
    <div
      ref={ref}
      className={cn(styles.root, variant === 'download' ? styles.download : styles.display, className)}
      aria-label={`${t('detail.fallbackTicket')} ${model.eventTitle}`}
    >
      <div className={styles.left}>
        <div className={styles.imageWrap}>
          <TicketEventCover coverImageUrl={model.coverImageUrl} />
          <BrandStrip brand={t('detail.brand')} />
          <div className={styles.leftTicketNumber}>
            <p>{model.ticketNumber}</p>
          </div>
        </div>

        <div className={styles.ticketInfo}>
          <p className={styles.date}>
            <span>{model.weekday}</span>
            <span className={styles.monthDay}>{model.monthDay}</span>
            <span>{model.year}</span>
          </p>

          <div className={styles.showName}>
            <h1>{model.eventTitle}</h1>
            <h2>{model.subtitle}</h2>
          </div>

          <TimeBlock
            start={model.timeStart}
            end={model.timeEnd}
            className={styles.leftTime}
            timeTbc={model.timeTbc}
            timeTo={model.timeTo}
          />

          <p className={styles.location}>
            <span>{model.venue}</span>
            <span className={styles.separator}>
              <TicketIcon size={20} weight="fill" aria-hidden color="#FF6B4A" />
            </span>
            <span>{model.city || '—'}</span>
          </p>
        </div>
      </div>

      <div className={styles.right}>
        <BrandStrip brand={t('detail.brand')} />
        <div className={styles.rightInfo}>
          <div className={styles.showName}>
            <h1>{model.eventTitle}</h1>
          </div>

          <TimeBlock
            start={model.timeStart}
            end={model.timeEnd}
            timeTbc={model.timeTbc}
            timeTo={model.timeTo}
          />

          <div className={styles.barcode}>
            {qrLoading ? (
              <div className={styles.barcodePlaceholder}>{t('detail.generatingQr')}</div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt={t('detail.qrAlt')} />
            ) : (
              <div className={styles.barcodePlaceholder}>{t('detail.qrUnavailable')}</div>
            )}
          </div>

          <p className={styles.rightTicketNumber}>{model.ticketNumber}</p>
        </div>
      </div>

      {!model.isActive ? (
        <div className={styles.statusOverlay} aria-label={`${t('detail.ticketStatus')}: ${model.statusLabel}`}>
          <span className={styles.statusRibbon}>{model.statusLabel.toUpperCase()}</span>
        </div>
      ) : null}
    </div>
  );
});
