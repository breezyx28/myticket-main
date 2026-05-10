import { cn } from '@/lib/utils';

export type RegisterRoleTab = 'guest' | 'talent' | 'organizer' | 'vendor';

interface RoleTabsProps {
  value: RegisterRoleTab;
  onChange: (role: RegisterRoleTab) => void;
}

const ROLE_LABELS: { id: RegisterRoleTab; label: string }[] = [
  { id: 'guest', label: 'Guest' },
  { id: 'talent', label: 'Talent' },
  { id: 'organizer', label: 'Organizer' },
  { id: 'vendor', label: 'Vendor' },
];

export function RoleTabs({ value, onChange }: RoleTabsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-ink-10 bg-ink-5/60 p-2 sm:grid-cols-4">
      {ROLE_LABELS.map((role) => (
        <button
          key={role.id}
          type="button"
          onClick={() => onChange(role.id)}
          className={cn(
            'rounded-xl px-3 py-2 text-[12px] font-bold transition-colors',
            value === role.id ? 'bg-ink text-white' : 'bg-white text-ink-60 hover:bg-ink-10'
          )}
        >
          {role.label}
        </button>
      ))}
    </div>
  );
}
