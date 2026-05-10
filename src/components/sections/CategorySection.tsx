import {
  MusicNote,
  Trophy,
  Palette,
  Smiley,
  Monitor,
  Users,
  ForkKnife,
  TShirt,
  Cpu,
  Microphone,
  Tag,
  type Icon,
} from '@phosphor-icons/react';
import { CategoryTile } from '@/components/cards/CategoryTile';
import { useGetEventCategoriesQuery } from '@/api/endpoints';

type CategoryStyle = { icon: Icon; color: string };

/**
 * Category presentation by slug. Backend slugs are kebab-case; we fall back
 * to a generic style when an unknown slug arrives so the section never
 * empties.
 */
const STYLE_BY_SLUG: Record<string, CategoryStyle> = {
  music: { icon: MusicNote, color: 'bg-coral text-white' },
  sports: { icon: Trophy, color: 'bg-lime text-ink' },
  arts: { icon: Palette, color: 'bg-sky text-ink' },
  'arts-and-culture': { icon: Palette, color: 'bg-sky text-ink' },
  comedy: { icon: Smiley, color: 'bg-lemon text-ink' },
  online: { icon: Monitor, color: 'bg-mint text-ink' },
  family: { icon: Users, color: 'bg-teal text-ink' },
  food: { icon: ForkKnife, color: 'bg-amber text-ink' },
  'food-and-drink': { icon: ForkKnife, color: 'bg-amber text-ink' },
  fashion: { icon: TShirt, color: 'bg-blush text-ink' },
  tech: { icon: Cpu, color: 'bg-indigo text-white' },
  theatre: { icon: Microphone, color: 'bg-lavender text-ink' },
};

const DEFAULT_STYLE: CategoryStyle = { icon: Tag, color: 'bg-ink-10 text-ink' };

export function CategorySection() {
  const { data, isFetching, isError } = useGetEventCategoriesQuery();
  const categories = data?.data ?? [];

  if (!isFetching && (isError || categories.length === 0)) {
    return null;
  }

  return (
    <section className="bg-white px-6 lg:px-8 py-16 lg:py-24">
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-10">
          <span className="text-[11px] text-ink-40 uppercase tracking-[0.14em] block mb-1.5 font-medium">
            Explore by interest
          </span>
          <h2 className="font-extrabold text-[36px] md:text-[48px] leading-[1.1] tracking-[-0.02em] text-ink">
            What are you into?
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {categories.map((cat) => {
            const style = STYLE_BY_SLUG[cat.slug.toLowerCase()] ?? DEFAULT_STYLE;
            const count = typeof cat.events_count === 'number' ? cat.events_count : undefined;
            return (
              <CategoryTile
                key={cat.slug}
                label={cat.name}
                icon={style.icon}
                color={style.color}
                count={count}
                to={`/events?category=${encodeURIComponent(cat.slug)}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
