import * as React from 'react';
import { cn } from '@/lib/utils';

type FormSectionCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function FormSectionCard({ eyebrow, title, description, children, className }: FormSectionCardProps) {
  return (
    <section className={cn('rounded-2xl border border-ink-10 bg-white p-6 shadow-card-md', className)}>
      {eyebrow ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-40">{eyebrow}</p>
      ) : null}
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
      {description ? <p className="mt-2 text-[14px] leading-relaxed text-ink-60">{description}</p> : null}
      <div className="mt-8">{children}</div>
    </section>
  );
}

