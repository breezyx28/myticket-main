import { CategoryTile } from '@/components/cards/CategoryTile';
import { useGetEventCategoriesQuery } from '@/api/endpoints';
import { categoryTileVisualForSlug, parseCategoryEventsCount } from '@/lib/eventCategoryUi';

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
            const style = categoryTileVisualForSlug(cat.slug);
            const count = parseCategoryEventsCount(cat.events_count);
            return (
              <CategoryTile
                key={String(cat.id)}
                label={cat.name}
                icon={style.icon}
                color={style.color}
                count={count}
                to={`/events?category=${encodeURIComponent(String(cat.id))}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
