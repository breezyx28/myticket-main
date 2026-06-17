export type UpgradeRole = 'organizer' | 'vendor' | 'talent';

export type RoleUpgradeBanner = {
  id: UpgradeRole;
  route: string;
  cardClass: string;
  badgeClass: string;
  ctaClass: string;
  image3d: string;
  imageClass: string;
};

export const roleUpgradeBanners: RoleUpgradeBanner[] = [
  {
    id: 'organizer',
    route: '/apply/organizer',
    cardClass:
      'bg-gradient-to-br from-[#1a2744] via-coral-dark to-coral text-white',
    badgeClass: 'bg-white/20 text-white',
    ctaClass: 'bg-white text-ink',
    image3d: '/assets/3d/concert-ticket.png',
    imageClass: 'h-[135%] max-w-none -bottom-[22%] -end-[4%]',
  },
  {
    id: 'vendor',
    route: '/apply/vendor',
    cardClass:
      'bg-gradient-to-br from-[#8fa8c4] via-[#b4c5d8] to-[#d8e3ef] text-ink',
    badgeClass: 'bg-ink/10 text-ink',
    ctaClass: 'bg-ink text-white',
    image3d: '/assets/3d/light.png',
    imageClass: 'h-[125%] max-w-none -bottom-[12%] -end-[2%]',
  },
  {
    id: 'talent',
    route: '/apply/talent',
    cardClass:
      'bg-gradient-to-br from-[#0f2618] via-indigo-dark to-indigo text-white',
    badgeClass: 'bg-white/15 text-white',
    ctaClass: 'bg-mint-light text-ink',
    image3d: '/assets/3d/mic.png',
    imageClass: 'h-[130%] max-w-none -bottom-[18%] -end-[6%]',
  },
];
