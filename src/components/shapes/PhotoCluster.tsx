import { unsplash } from '@/lib/utils';

const photos = {
  circleMan: unsplash('1507003211169-0a1dd7228f2d', 400),
  archWoman: unsplash('1531746020798-e6953c6e8e04', 400),
  squareWoman: unsplash('1544005313-94ddf0286df2', 400),
};

function CircleOutline({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="10" cy="10" r="8.5" stroke="#0D0D0D" strokeWidth="1.5" />
    </svg>
  );
}

function StarburstShape({ className }: { className?: string }) {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className={className}>
      <path
        d="M28 4L30.5 22.5L44 12L33 28L52 26L33 28L44 44L30.5 33.5L28 52L25.5 33.5L12 44L23 28L4 26L23 28L12 12L25.5 22.5Z"
        fill="#0D0D0D"
      />
    </svg>
  );
}

function TriangleOutline({ className }: { className?: string }) {
  return (
    <svg width="18" height="16" viewBox="0 0 18 16" fill="none" className={className}>
      <path d="M9 1.5L16.5 14.5L1.5 14.5Z" stroke="#0D0D0D" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function YellowBlob({ className }: { className?: string }) {
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" fill="none" className={className}>
      <path
        d="M70 0C108.66 0 140 31.34 140 70C140 108.66 108.66 140 70 140C70 140 70 70 70 70C70 70 0 70 0 70C0 31.34 31.34 0 70 0Z"
        fill="#F5E642"
      />
    </svg>
  );
}

function CoralCircle({ className }: { className?: string }) {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" className={className}>
      <circle cx="26" cy="26" r="26" fill="#FF6B4A" />
    </svg>
  );
}

function GreenCircle({ className }: { className?: string }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className={className}>
      <circle cx="22" cy="22" r="22" fill="#4DFFC3" />
    </svg>
  );
}

export function PhotoCluster() {
  return (
    <div className="relative w-[420px] h-[460px] flex-shrink-0">

      {/* ── Row 1: Circle photo + stat bubble + arch photo ── */}

      <div className="absolute top-[8px] left-[50px] w-[120px] h-[120px] rounded-full overflow-hidden bg-ink z-10">
        <img src={photos.circleMan} alt="" className="w-full h-full object-cover object-top" loading="lazy" />
      </div>

      <CircleOutline className="absolute top-[0px] left-[195px] z-10" />

      <div className="absolute top-[20px] left-[210px] bg-ink text-white rounded-[20px] px-5 py-3.5 z-20 shadow-blob">
        <span className="text-[10px] font-medium opacity-60 block leading-tight">Live<br />Events</span>
        <span className="font-black text-[28px] leading-none font-mono mt-1 block">8,240+</span>
      </div>

      <div className="absolute top-[0px] right-[0px] w-[110px] h-[160px] rounded-t-[70px] rounded-b-2xl overflow-hidden bg-lavender z-10">
        <img src={photos.archWoman} alt="" className="w-full h-full object-cover object-top" loading="lazy" />
      </div>

      {/* ── Row 2: Square photo + starburst ── */}

      <div className="absolute top-[150px] left-[10px] w-[150px] h-[170px] rounded-3xl overflow-hidden bg-indigo z-10">
        <img src={photos.squareWoman} alt="" className="w-full h-full object-cover object-top" loading="lazy" />
      </div>

      <StarburstShape className="absolute top-[200px] left-[200px] z-10" />

      {/* ── Row 3: Stat bubble + shapes ── */}

      <GreenCircle className="absolute bottom-[90px] left-[50px] z-0" />

      <div className="absolute bottom-[55px] left-[85px] bg-white rounded-[20px] px-5 py-3.5 z-20 shadow-card-md border border-ink-10">
        <span className="text-[10px] font-medium text-ink-40 block leading-tight">Tickets<br />Sold</span>
        <span className="font-black text-[28px] leading-none font-mono mt-1 block text-ink">2.1M</span>
      </div>

      <CoralCircle className="absolute bottom-[60px] right-[80px] z-0" />

      <YellowBlob className="absolute bottom-[0px] right-[0px] z-0" />

      <TriangleOutline className="absolute bottom-[35px] right-[65px] z-10" />
    </div>
  );
}
