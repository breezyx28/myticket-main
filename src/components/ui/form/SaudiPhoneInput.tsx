import { cn } from '@/lib/utils';

const SAUDI_CODE = '+966';
const MAX_LOCAL_DIGITS = 10;

function normalizeToLocalDigits(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith(SAUDI_CODE)) {
    return trimmed.slice(SAUDI_CODE.length).replace(/[^\d]/g, '');
  }
  return trimmed.replace(/^\+/, '').replace(/[^\d]/g, '');
}

export function SaudiPhoneInput({
  id,
  value,
  onChange,
  placeholder = '5XXXXXXXX',
  className,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const local = normalizeToLocalDigits(value);

  return (
    <div className={cn('mt-1.5 flex overflow-hidden rounded-xl border border-ink-10 bg-white', className)}>
      <input
        value={SAUDI_CODE}
        readOnly
        disabled
        className="w-20 border-r border-ink-10 bg-ink-5 px-3 py-3 text-center text-[14px] font-semibold text-ink-40"
      />
      <input
        id={id}
        type="tel"
        autoComplete="tel-national"
        value={local}
        maxLength={MAX_LOCAL_DIGITS}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '').slice(0, MAX_LOCAL_DIGITS);
          onChange(digits ? `${SAUDI_CODE}${digits}` : '');
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 px-4 py-3 text-[14px] outline-none"
      />
    </div>
  );
}

