import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  EnvelopeSimple,
  Globe,
  MapPin,
  Phone,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { useGetTourismAdQuery } from '@/api/endpoints';
import { Button } from '@/components/ui/Button';
import { TOURISM_AD_WEEKDAYS, tourismWeekdayLabel } from '@/schemas/tourismAd';

export function TourismAdDetailPage() {
  const { t } = useTranslation('tourism');
  const { id } = useParams<{ id: string }>();
  const { data: ad, isLoading, isError } = useGetTourismAdQuery(id ?? '', {
    skip: !id,
  });

  if (isLoading) {
    return (
      <div className="px-6 py-24 text-center text-[13px] text-ink-40">{t('detail.loading')}</div>
    );
  }

  if (isError || !ad) {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-24 text-center">
        <h1 className="text-2xl font-extrabold text-ink">{t('detail.notAvailableTitle')}</h1>
        <p className="mt-3 text-[14px] text-ink-60">{t('detail.notAvailableBody')}</p>
        <Link to="/" className="mt-6 inline-block">
          <Button type="button" variant="dark" size="md">
            {t('detail.backHome')}
          </Button>
        </Link>
      </div>
    );
  }

  const cover = ad.cover_image_url || ad.gallery_urls[0] || '';
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${ad.latitude},${ad.longitude}`)}`;

  return (
    <div className="bg-white pb-20 pt-10">
      <div className="mx-auto max-w-[960px] px-6 lg:px-8">
        <Link
          to="/"
          className="text-[13px] font-semibold text-coral hover:underline"
        >
          {t('detail.backHome')}
        </Link>

        <div className="mt-6 overflow-hidden rounded-2xl border border-ink-10">
          {cover ? (
            <img
              src={cover}
              alt=""
              className="aspect-[21/9] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[21/9] items-center justify-center bg-ink-5 text-ink-40">
              {t('detail.noCoverImage')}
            </div>
          )}
        </div>

        {ad.gallery_urls.length > 1 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {ad.gallery_urls.map((url) => (
              <img
                key={url}
                src={url}
                alt=""
                className="h-20 w-28 shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
            ))}
          </div>
        ) : null}

        <div className="mt-8">
          <div className="flex flex-wrap items-center gap-2 text-ink-50">
            <MapPin size={18} weight="fill" className="text-coral" />
            <span className="text-[13px] font-semibold">{ad.location_name}</span>
          </div>
          <h1 className="mt-2 text-[32px] font-extrabold leading-tight text-ink md:text-[40px]">
            {ad.location_name}
          </h1>
          <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-70">
            {ad.description}
          </p>
        </div>

        {ad.services.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-[18px] font-extrabold text-ink">{t('detail.services')}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {ad.services.map((service) => (
                <span
                  key={service}
                  className="rounded-full bg-sky/15 px-3 py-1 text-[12px] font-semibold text-ink-70"
                >
                  {service}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="text-[18px] font-extrabold text-ink">{t('detail.openingHours')}</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-ink-10">
            <table className="w-full text-left text-[13px]">
              <tbody>
                {TOURISM_AD_WEEKDAYS.map((day) => {
                  const hours = ad.opening_hours?.[day];
                  return (
                    <tr key={day} className="border-b border-ink-10 last:border-0">
                      <td className="px-4 py-3 font-semibold text-ink">
                        {tourismWeekdayLabel(t, day)}
                      </td>
                      <td className="px-4 py-3 text-ink-60">
                        {hours?.closed
                          ? t('openingHours.closed')
                          : `${hours?.opens ?? '—'} – ${hours?.closes ?? '—'}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-[18px] font-extrabold text-ink">{t('detail.contact')}</h2>
          <ul className="mt-3 space-y-2 text-[14px]">
            {ad.contact?.phone ? (
              <li className="flex items-center gap-2">
                <Phone size={18} className="text-coral" />
                <a href={`tel:${ad.contact.phone}`} className="font-semibold text-ink hover:underline">
                  {ad.contact.phone}
                </a>
              </li>
            ) : null}
            {ad.contact?.email ? (
              <li className="flex items-center gap-2">
                <EnvelopeSimple size={18} className="text-coral" />
                <a href={`mailto:${ad.contact.email}`} className="font-semibold text-ink hover:underline">
                  {ad.contact.email}
                </a>
              </li>
            ) : null}
            {ad.contact?.whatsapp ? (
              <li className="flex items-center gap-2">
                <WhatsappLogo size={18} className="text-coral" />
                <a
                  href={`https://wa.me/${ad.contact.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-ink hover:underline"
                >
                  {ad.contact.whatsapp}
                </a>
              </li>
            ) : null}
            {ad.contact?.website ? (
              <li className="flex items-center gap-2">
                <Globe size={18} className="text-coral" />
                <a
                  href={ad.contact.website}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-ink hover:underline"
                >
                  {ad.contact.website}
                </a>
              </li>
            ) : null}
          </ul>
        </section>

        {ad.media_links.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-[18px] font-extrabold text-ink">{t('detail.socialLinks')}</h2>
            <ul className="mt-3 space-y-2">
              {ad.media_links.map((link) => (
                <li key={`${link.platform}-${link.url}`}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[14px] font-semibold text-coral hover:underline"
                  >
                    {link.platform}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="text-[18px] font-extrabold text-ink">{t('detail.location')}</h2>
          <p className="mt-2 text-[14px] text-ink-60">
            {ad.latitude}, {ad.longitude}
          </p>
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-[13px] font-semibold text-coral hover:underline"
          >
            {t('detail.openInMaps')}
          </a>
        </section>
      </div>
    </div>
  );
}
