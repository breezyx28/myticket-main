import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass, ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { PhotoCluster } from '@/components/shapes/PhotoCluster';

export function HeroSection() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = keyword.trim();
    if (!q) {
      navigate('/events');
      return;
    }
    navigate(`/events?keyword=${encodeURIComponent(q)}`);
  }

  return (
    <section className="bg-[#F7F6F2] px-6 lg:px-8 py-12 lg:py-20 relative overflow-hidden">
      <div className="max-w-[1280px] mx-auto w-full flex flex-col md:flex-row md:items-center md:justify-between gap-10 lg:gap-6 relative z-10">

        {/* ── Left column: Text + Search ── */}
        <div className="flex flex-col gap-5 md:max-w-[540px] flex-shrink-0">
          <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.18em] text-lemon-dark">
            The Kingdom's Premier Ticketing Platform
          </span>

          <h1 className="font-extrabold text-[40px] sm:text-[50px] lg:text-[60px] xl:text-[68px] text-ink leading-[1.05] tracking-[-0.03em]">
            Discover &
            <br />
            book your next
            <br />
            live experience
          </h1>

          <p className="text-[15px] lg:text-[17px] text-ink-60 max-w-[420px] leading-relaxed">
            Find tickets to concerts, sports, comedy, and more across Saudi Arabia.
          </p>

          {/* Search Bar */}
          <form
            onSubmit={onSearchSubmit}
            className="flex items-center w-full max-w-[480px] bg-white rounded-full p-1.5 mt-2 shadow-card-md border border-ink-10 focus-within:border-ink-20 transition-colors"
          >
            <div className="flex items-center flex-1 gap-3 px-4">
              <MagnifyingGlass size={18} weight="bold" className="text-ink-40 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search events, artists, venues..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="bg-transparent text-ink text-[14px] placeholder:text-ink-40 outline-none w-full py-2"
              />
            </div>
            <Button type="submit" variant="primary" size="md" icon={ArrowRight} className="flex-shrink-0">
              Search
            </Button>
          </form>

          <p className="text-[13px] text-ink-40 mt-1">
            Already have an account?{' '}
            <a href="/login" className="text-ink font-semibold hover:underline underline-offset-2">
              Sign in
            </a>
          </p>
        </div>

        {/* ── Right column: Photo Cluster ── */}
        <div className="hidden md:flex justify-end items-center">
          <PhotoCluster />
        </div>
      </div>
    </section>
  );
}
