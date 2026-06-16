import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function RequireGuestUpgrade() {
  const { user, isHydrating } = useAuth();
  const location = useLocation();

  if (isHydrating) {
    return <div className="px-6 py-24 text-center text-[13px] text-ink-40">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'guest') {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
}
