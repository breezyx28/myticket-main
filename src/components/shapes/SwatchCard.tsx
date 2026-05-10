import { Ticket } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface SwatchCardProps {
  name: string;
  role?: string;
  image: string;
  bg: string;
  text?: string;
}

export function SwatchCard({ name, role, image, bg, text = 'text-white' }: SwatchCardProps) {
  return (
    <div
      className={cn('rounded-[20px] overflow-hidden flex-shrink-0 group cursor-pointer', bg)}
      style={{ width: '220px', height: '320px' }}
    >
      <div className="p-5 flex items-start justify-between">
        <div>
          {name.split(' ').map((word, i) => (
            <span key={i} className={cn('font-extrabold text-[24px] block leading-tight', text)}>
              {word}
            </span>
          ))}
          {role && (
            <span className={cn('text-[12px] opacity-60 mt-1 block font-medium', text)}>{role}</span>
          )}
        </div>
        <div className="w-7 h-7 rounded-full bg-black/15 flex items-center justify-center flex-shrink-0">
          <Ticket size={12} className={text} weight="bold" />
        </div>
      </div>
      <div className="mx-3 mb-3 rounded-xl overflow-hidden" style={{ height: '180px' }}>
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>
    </div>
  );
}
