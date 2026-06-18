import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

export function RequireAuth() {
  const { t } = useTranslation('common');
  const { user, isHydrating } = useAuth();
  const location = useLocation();

  if (isHydrating) {
    return <div className="px-6 py-24 text-center text-[13px] text-ink-40">{t('loading')}</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
