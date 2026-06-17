import { Navigate, useParams } from 'react-router-dom';

/** Legacy landing links `/artists/:slug` → public talent profile. */
export function ArtistRedirectPage() {
  const { slug } = useParams();

  if (!slug) {
    return <Navigate to="/events" replace />;
  }

  return <Navigate to={`/talents/${encodeURIComponent(slug)}`} replace />;
}
