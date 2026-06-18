import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type RegisterRoleTab = 'guest' | 'talent' | 'organizer' | 'vendor';

interface RoleTabsProps {
  value: RegisterRoleTab;
  onChange: (role: RegisterRoleTab) => void;
}

const ROLE_IDS: RegisterRoleTab[] = ['guest', 'talent', 'organizer', 'vendor'];

export function RoleTabs({ value, onChange }: RoleTabsProps) {
  const { t } = useTranslation('authPages');

  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-ink-10 bg-ink-5/60 p-2 sm:grid-cols-4">
      {ROLE_IDS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'rounded-xl px-3 py-2 text-[12px] font-bold transition-colors',
            value === id ? 'bg-ink text-white' : 'bg-white text-ink-60 hover:bg-ink-10'
          )}
        >
          {t(`register.roles.${id}.label`)}
        </button>
      ))}
    </div>
  );
}
