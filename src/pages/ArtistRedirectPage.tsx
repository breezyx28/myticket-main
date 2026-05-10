import { Navigate, useParams } from 'react-router-dom';
import { useGetTalentBySlugQuery } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { canBrowseMarketplace } from '@/lib/marketplaceAccess';

/** Resolves landing-page `/artists/:slug` links to marketplace talent profiles (Organizers/Vendors only). */
export function ArtistRedirectPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const canBrowse = canBrowseMarketplace(user);

  const { data, isError, isLoading, isFetching } = useGetTalentBySlugQuery(
    { slug: slug! },
    { skip: !canBrowse || !slug }
  );

  if (!canBrowse) {
    return <Navigate to="/events" replace />;
  }

  if (!slug) {
    return <Navigate to="/marketplace?type=talent" replace />;
  }

  if (isLoading || (isFetching && !data)) {
    return <div className="px-6 py-24 text-center text-ink-40">Loading…</div>;
  }

  if (isError || !data) {
    return <Navigate to="/marketplace?type=talent" replace />;
  }

  return <Navigate to={`/marketplace/talent/${data.slug}`} replace />;
}
