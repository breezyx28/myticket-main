import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Star } from '@phosphor-icons/react';
import {
  useCreateEngagementMutation,
  useGetVendorBySlugQuery,
  useGetVendorRatingsQuery,
} from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { pickRecentRatings, vendorToMarketplaceVendor } from '@/lib/marketplaceMappers';
import { createEngagementSchema } from '@/schemas/engagement';
import { ContactEngagementDialog } from '@/components/marketplace/ContactEngagementDialog';

export function VendorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contactOpen, setContactOpen] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [createEngagement, { isLoading: contactSubmitting }] = useCreateEngagementMutation();

  const {
    data: apiVendor,
    isLoading: vendorLoading,
    isError: vendorError,
  } = useGetVendorBySlugQuery({ slug: id! }, { skip: !id });

  const { data: ratingsSummary } = useGetVendorRatingsQuery({ slug: id! }, { skip: !id });

  const vendor = useMemo(
    () => (apiVendor ? vendorToMarketplaceVendor(apiVendor) : null),
    [apiVendor]
  );

  const recentRatings = useMemo(() => pickRecentRatings(ratingsSummary, 3), [ratingsSummary]);

  const summaryAverage =
    typeof ratingsSummary?.average === 'number' && !Number.isNaN(ratingsSummary.average)
      ? ratingsSummary.average
      : null;
  const displayRating = summaryAverage !== null ? summaryAverage : (vendor?.rating ?? 0);
  const ratingsCount = ratingsSummary?.count ?? 0;

  if (!id) {
    return <Navigate to="/marketplace" replace />;
  }

  if (vendorLoading) {
    return <div className="px-6 py-24 text-center text-ink-40">Loading…</div>;
  }

  if (vendorError || !vendor) {
    return <Navigate to="/marketplace" replace />;
  }

  return (
    <div className="bg-white pb-20 pt-10">
      <div className="mx-auto max-w-[960px] px-6 lg:px-8">
        <Link to="/marketplace" className="text-[13px] font-semibold text-coral hover:underline">
          ← Marketplace
        </Link>

        <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-start">
          <img
            src={vendor.image}
            alt=""
            className="h-48 w-48 shrink-0 rounded-2xl object-cover md:h-56 md:w-56"
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-coral">
              {vendor.serviceCategories.join(' · ')}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-ink">{vendor.name}</h1>
            <p className="mt-2 text-[14px] text-ink-60">
              {vendor.city} · ★ {displayRating.toFixed(1)}
            </p>
            <p className="mt-6 text-[15px] leading-relaxed text-ink-60">{vendor.bio}</p>
            {user?.role === 'organizer' && (
              <button
                type="button"
                className="mt-5 rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-ink-80"
                onClick={() => {
                  setContactError(null);
                  setContactOpen(true);
                }}
              >
                Contact vendor
              </button>
            )}
          </div>
        </div>

        <section className="mt-12 rounded-2xl border border-ink-10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-ink">Verification &amp; coverage</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-[14px] text-ink-60">
            <li>Commercial registration verified (mock)</li>
            <li>Service area: {vendor.city} and surrounding regions (demo)</li>
            <li>Insurance certificate on file for large events (simulated)</li>
          </ul>
        </section>

        {vendor.gallery.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-extrabold text-ink">Gallery</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {vendor.gallery.map((src) => (
                <img key={src} src={src} alt="" className="aspect-video rounded-xl object-cover" />
              ))}
            </div>
          </div>
        )}

        <section className="mt-12 rounded-2xl border border-ink-10 bg-ink-5/40 p-6">
          <h2 className="text-lg font-extrabold text-ink">Ratings</h2>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[15px] text-ink">
            <Star size={22} className="text-amber" weight="fill" />
            <span className="font-bold">{displayRating.toFixed(1)}</span>
            <span className="text-[13px] font-medium text-ink-60">
              {ratingsCount > 0
                ? `from ${ratingsCount} ${ratingsCount === 1 ? 'rating' : 'ratings'}`
                : 'No public ratings yet'}
            </span>
          </p>
          {recentRatings.length > 0 && (
            <ul className="mt-4 space-y-3 border-t border-ink-10 pt-4">
              {recentRatings.map((r) => (
                <li key={String(r.id)} className="rounded-xl bg-white/80 p-3 text-[13px] text-ink-60">
                  <p className="font-semibold text-ink">
                    {r.user_name?.trim() ? r.user_name : 'Anonymous'}{' '}
                    <span className="font-normal text-ink-40">· ★ {r.stars}</span>
                  </p>
                  {r.comment?.trim() ? (
                    <p className="mt-1 leading-relaxed">{r.comment}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[13px] text-ink-60">
            Mutual ratings with organizers appear after a completed booking (full product).
          </p>
          <button
            type="button"
            disabled
            className="mt-4 w-full rounded-full border border-dashed border-ink-20 bg-white px-5 py-3 text-[13px] font-semibold text-ink-40 sm:w-auto"
          >
            Mutual ratings after completed work
          </button>
        </section>
      </div>

      <ContactEngagementDialog
        open={contactOpen}
        targetKind="vendor"
        targetName={vendor.name}
        submitting={contactSubmitting}
        errorMessage={contactError}
        onClose={() => {
          if (contactSubmitting) return;
          setContactOpen(false);
          setContactError(null);
        }}
        onSubmit={async ({ topic, initial_message }) => {
          setContactError(null);
          try {
            await createEngagementSchema.validate({
              target_type: 'vendor',
              target_id: vendor.id,
              topic,
              initial_message: initial_message || undefined,
            });
          } catch (err) {
            setContactError(err instanceof Error ? err.message : 'Please review the form.');
            return;
          }
          try {
            const created = await createEngagement({
              target_type: 'vendor',
              target_id: vendor.id,
              topic,
              ...(initial_message ? { initial_message } : {}),
            }).unwrap();
            setContactOpen(false);
            navigate(`/engagements?focus=${encodeURIComponent(String(created.id))}`);
          } catch (err) {
            const message =
              err && typeof err === 'object' && 'data' in err && err.data
                && typeof (err as { data: { message?: unknown } }).data.message === 'string'
                ? ((err as { data: { message: string } }).data.message)
                : 'Could not start engagement.';
            setContactError(message);
          }
        }}
      />
    </div>
  );
}
