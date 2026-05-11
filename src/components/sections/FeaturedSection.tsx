import { useNavigate } from 'react-router-dom';
import { EventCard } from '@/components/cards/EventCard';
import { Carousel } from '@/components/ui/Carousel';
import { useGetFeaturedEventsQuery } from '@/api/endpoints';
import { eventListItemToCardProps } from '@/lib/eventMappers';

export function FeaturedSection() {
  const navigate = useNavigate();
  const { data: paginated, isFetching, isError } = useGetFeaturedEventsQuery({ per_page: 8 });
  const events = paginated?.data ?? [];

  if (!isFetching && (isError || events.length === 0)) {
    return null;
  }

  return (
    <section className="bg-white px-6 lg:px-8 py-16 lg:py-24 border-t border-ink-10">
      <div className="max-w-[1280px] mx-auto">
        <Carousel
          overline="Don't miss out"
          title="Featured Events"
          viewAllHref="/events?featured=true"
        >
          {events.map((e) => {
            const props = eventListItemToCardProps(e);
            return (
              <div key={e.id} className="flex-shrink-0">
                <EventCard
                  {...props}
                  className="w-[280px]"
                  onClick={() => navigate(`/events/${e.slug ?? e.code ?? e.id}`)}
                />
              </div>
            );
          })}
        </Carousel>
      </div>
    </section>
  );
}
