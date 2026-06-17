import { useTranslation } from 'react-i18next';
import { CategoryTile } from '@/components/cards/CategoryTile';
import { useGetEventCategoriesQuery } from '@/api/endpoints';
import { categoryTileVisualForCategory, parseCategoryEventsCount } from '@/lib/eventCategoryUi';
import { pickLocalizedName } from '@/lib/localized';
import type { AppLanguage } from '@/lib/language';

export function CategorySection() {
  const { t, i18n } = useTranslation('landing');
  const language = (i18n.language === 'ar' ? 'ar' : 'en') as AppLanguage;
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
            {t('category.eyebrow')}
          </span>
          <h2 className="font-extrabold text-[36px] md:text-[48px] leading-[1.1] tracking-[-0.02em] text-ink">
            {t('category.title')}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {categories.map((cat) => {
            const style = categoryTileVisualForCategory(cat);
            const count = parseCategoryEventsCount(cat.events_count);
            return (
              <CategoryTile
                key={String(cat.id)}
                label={pickLocalizedName(cat, language) || cat.name}
                iconKey={cat.icon_key}
                iconSlugFallback={cat.slug}
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
