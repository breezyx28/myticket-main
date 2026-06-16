export type UpgradeRole = 'organizer' | 'vendor' | 'talent';

type BannerCopy = {
  roleLabel: string;
  title: string;
  titleAccent?: string;
  summary: string;
  cta: string;
};

export type RoleUpgradeBanner = {
  id: UpgradeRole;
  route: string;
  cardClass: string;
  badgeClass: string;
  ctaClass: string;
  image3d: string;
  imageClass: string;
  en: BannerCopy;
  ar: BannerCopy;
};

export const roleUpgradeBanners: RoleUpgradeBanner[] = [
  {
    id: 'organizer',
    route: '/register?role=organizer',
    cardClass:
      'bg-gradient-to-br from-[#1a2744] via-coral-dark to-coral text-white',
    badgeClass: 'bg-white/20 text-white',
    ctaClass: 'bg-white text-ink',
    image3d: '/assets/3d/concert-ticket.png',
    imageClass: 'h-[135%] max-w-none -bottom-[22%] -end-[4%]',
    en: {
      roleLabel: 'Organizer',
      title: 'Ready to run',
      titleAccent: 'the show?',
      summary:
        'Create events, define tickets and seating, manage sales workflows, and coordinate talent and vendor hiring.',
      cta: 'Apply as Organizer',
    },
    ar: {
      roleLabel: 'منظم',
      title: 'هل أنت جاهز',
      titleAccent: 'لإدارة العرض؟',
      summary:
        'أنشئ الفعاليات وحدد التذاكر والمقاعد وأدر عمليات البيع ونسق التعاقد مع المواهب والموردين.',
      cta: 'قدّم كمنظم',
    },
  },
  {
    id: 'vendor',
    route: '/register?role=vendor',
    cardClass:
      'bg-gradient-to-br from-[#8fa8c4] via-[#b4c5d8] to-[#d8e3ef] text-ink',
    badgeClass: 'bg-ink/10 text-ink',
    ctaClass: 'bg-ink text-white',
    image3d: '/assets/3d/light.png',
    imageClass: 'h-[125%] max-w-none -bottom-[12%] -end-[2%]',
    en: {
      roleLabel: 'Vendor',
      title: 'Get discovered',
      titleAccent: 'and hired',
      summary:
        'List services in Marketplace, respond to organizer inquiries, and manage your engagement availability with verified trust.',
      cta: 'Become a Vendor',
    },
    ar: {
      roleLabel: 'مورد',
      title: 'احصل على الاكتشاف',
      titleAccent: 'والتوظيف',
      summary:
        'اعرض خدماتك في السوق وتابع طلبات المنظمين وأدر حالة التوفر للارتباطات مع ملف موثق.',
      cta: 'كن موردًا',
    },
  },
  {
    id: 'talent',
    route: '/register?role=talent',
    cardClass:
      'bg-gradient-to-br from-[#0f2618] via-indigo-dark to-indigo text-white',
    badgeClass: 'bg-white/15 text-white',
    ctaClass: 'bg-mint-light text-ink',
    image3d: '/assets/3d/mic.png',
    imageClass: 'h-[130%] max-w-none -bottom-[18%] -end-[6%]',
    en: {
      roleLabel: 'Talent',
      title: 'Your stage',
      titleAccent: 'awaits',
      summary:
        'Create your performer profile, showcase verification media, accept engagements, and grow your reputation with ratings.',
      cta: 'List Your Talent',
    },
    ar: {
      roleLabel: 'موهبة',
      title: 'مسرحك',
      titleAccent: 'ينتظرك',
      summary:
        'أنشئ ملفك كمؤدٍ واعرض نماذج أعمالك وقبل الارتباطات وابن سمعتك من خلال التقييمات.',
      cta: 'سجّل موهبتك',
    },
  },
];
