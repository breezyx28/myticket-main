Design style (overall)
Modern consumer ticketing / events marketplace — clean, confident, and slightly editorial rather than corporate SaaS.

Light-first white pages with warm off-white sections (#F7F6F2, ink-5)
High-contrast typography — big extrabold headlines, tight tracking, small uppercase labels
Soft card UI — white surfaces, light borders (ink-10), subtle layered shadows (not heavy glassmorphism)
Playful but controlled — pastel accent blocks for categories/status, coral as the action color
Rounded, friendly geometry — rounded-2xl cards, rounded-full pills, search bars, and CTAs
Subtle motion — hover shadow lift, image scale on cards, framer-motion in places; respects reduced motion
Document-style moments — ticket/invoice layouts use print-inspired dark sidebars + mono codes (recent ticket restyle)
Stack: Tailwind v4 + shadcn/ui + Radix, Phosphor icons, occasional framer-motion.

Color schema
Neutrals (“Ink” system) — primary text & structure
Token	Hex	Role
ink
#0D0D0D
Primary text, dark buttons
ink-90 → ink-5
#1A1A1A → #F5F5F5
Muted text, borders, page tints
surface-page
#FFFFFF
Default background
surface-warm
#F0EDE6
Warm neutral surface
Brand / accent primaries (pastel-pop palette)
Token	Hex	Typical use
Coral
#FF6B4A
Primary CTA, links, errors, category labels
Lemon
#F5E642
Featured badges, highlights
Lime
#BAFF39
Sports / success accents
Sky
#A8C9F0
Info banners, arts
Mint
#4DFFC3
Active/success states, online
Teal
#6ECFB0
Family / secondary green
Amber
#F4A05A
Warnings, auction
Lavender
#C4B5F4
Theatre / purple categories
Blush
#F9B8C4
Fashion / soft pink
Indigo
#3355FF
Tech / strong blue accent
Each accent has light and dark variants for hovers and tints (e.g. coral/10, sky/15).

Semantic usage in UI
Actions: coral (links, primary buttons) or ink (dark CTAs)
Status: mint = active, amber = auction/warning, sky = info, lemon = featured/pending
Categories: mapped to the palette (music → coral, sports → lime, etc.) in categoryColors.ts
Typography
Role	Font
UI / body / headings
Plus Jakarta Sans (400–800)
Mono / codes / prices
Space Grotesk
Also loaded
Geist variable (via CSS import)
Patterns:

Headlines: font-extrabold, tracking-tight / negative letter-spacing on heroes
Labels: text-[11px], uppercase, wide tracking-[0.12em–0.2em]
Body: text-ink-60, relaxed line-height
Numbers/codes: font-mono, tabular-nums
Design trend type
Best described as:

“Warm minimal + pastel pop” — a 2024–2026 style common in consumer apps:
clean white layouts, soft shadows, rounded cards, one strong accent (coral), and muted pastel blocks for energy without going full brutalist or full gradient-heavy “AI landing page.”

Notably not:

Dark-mode-first
Heavy gradients everywhere
Sharp/brutalist corners
Generic gray-blue SaaS
It sits closer to Ticketmaster/Eventbrite modernized with a Saudi-market, editorial marketing feel (hero copy, warm cream backgrounds, bold type).

UI tokens (shape & depth)
From index.css:

Radius: up to 24px / 32px (rounded-2xl, rounded-[2rem] on documents)
Shadows: shadow-card-sm → shadow-card-xl (soft diffuse elevation)
Special: shadow-ticket (slight bottom offset for ticket affordance)
If you want this as a one-liner for a handoff doc:

MyTicket uses a warm-minimal events aesthetic: white/ink-5 surfaces, coral CTAs, pastel category accents, Plus Jakarta Sans + Space Grotesk, rounded cards with soft shadows, and bold editorial typography.