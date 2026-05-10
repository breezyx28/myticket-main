import { Outlet } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { Ticket } from '@phosphor-icons/react';

export function AuthLayout() {
  const location = useLocation();
  const isRegister = location.pathname === '/register';
  return (
    <div className="min-h-screen bg-ink-5 flex flex-col">
      <header className="border-b border-ink-10 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-lg items-center px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lemon">
              <Ticket size={18} className="text-ink" weight="fill" />
            </div>
            <span className="text-[17px] font-extrabold tracking-tight text-ink">
              My<span className="text-coral">Ticket</span>
            </span>
          </Link>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className={`w-full ${isRegister ? 'max-w-3xl' : 'max-w-md'}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
