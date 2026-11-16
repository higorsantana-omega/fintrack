# DESIGN.md · fintrack

> If this file and the code disagree, the code wins until the person decides. Note the conflict under Open questions.

## Product
Personal finance tracker (web app in `web/`). Used by the owner and by relatives or friends the owner brings in, each with their own account, mostly on a laptop or desktop.
Covers bank accounts, transactions, goals (Metas), credit cards and invoices (Cartões), debts and loans (Dívidas),
category budgets (Categorias) and a wishlist.
Main jobs, in order:
1. See the balance across accounts at a glance (Dashboard). This is the first read on screen.
2. Log a transaction fast (Dashboard).
3. See how much is left to spend in each category this month (Categorias).

## Audience and voice
The owner is technical; relatives and friends may not be, and arrive not knowing where to start. The text sounds like a tool: short, plain labels with no exclamation marks and no celebration copy.
Examples: "Salvar", "Saldo", "Restam R$ 300".
All UI text is in Portuguese (Brazil); code identifiers are in English.
Money: R$ 1.234,56, or R$ 1,2 mil when compact. Dates: 16/11/2026. Months: Out/2026, or Out/26 when short.

## Mood
Words: premium. Never like: a generic SaaS admin dashboard (grey cards and blue buttons everywhere).

## Brand
Design system source: `web/tailwind.config.js` (tokens) and `web/src/view/components` (29 components).
- Logo: `web/src/view/components/Logo.tsx`, a wallet mark plus wordmark that takes the current text colour and is drawn in teal-900. **Settled.**
- Primary: teal-900 `#087F5B`. **Settled.**
- Income and expense: green-800 and red-800 in the transaction list today. They must stay clearly green and red.
- Category colours: 14 colour/background pairs in `web/src/view/constants/ColorsConstants.ts`.
- **Open to change toward premium:**
  - Greys: Open Color gray today.
  - Font: DM Sans today.
  - Corner radius: rounded-2xl is the most common today (70 uses).

## References
- **Linear**
  - Take: small, tight type with hierarchy from weight and shade rather than size; dense, evenly spaced lists (for transactions).
  - Avoid: tiny amounts (balances and totals stay large); the lack of colour (income and expense keep clear green and red).
- **Stripe Dashboard**
  - Take: money formatting (equal-width digits, right-aligned amounts); small coloured status labels (Paga, Vencida, Pendente).
  - Avoid: decorative mini charts. A chart has to answer a question or it doesn't go in.

## Constraints
- Desktop first (1280 px laptop). Phone layouts come second but must keep working, since the code already has `md:` breakpoints.
- Light theme first. Colour tokens are named by role, so a dark theme can be added later without rework.
- Icons: Lucide only.
- Stack: Tailwind only, Radix UI primitives, `cn()` for conditional classes.
- Accessibility: WCAG AA contrast and a visible keyboard focus ring (assumed).
- Motion: keep the existing short enter animations (150–400 ms) and add no decorative motion (assumed).

## Decisions log
- 2026-11-16: Desktop first. The owner and the relatives or friends who use it work on a laptop or desktop.
- 2026-11-16: New accounts get a step-by-step setup screen outside the normal app (option A of three). Relatives and friends arrive not knowing where to start.
- 2026-11-16: Tool-like voice (short, plain labels). The owner's choice.
- 2026-11-16: Keep the logo and teal-900; greys, font and corner radius may change. The owner wants it to feel premium.
- 2026-11-16: Light first, with role-named tokens ready for dark. Dark is wanted later without a rework.
- 2026-11-16: Lucide is the only icon set. It's already used for categories, has more finance icons and one stroke style.

## Open questions
- "Premium" is the only mood word. A second word (calm? crisp?) would help choose between equally valid options.
- Font: keep DM Sans, or switch to something tighter in the spirit of Linear?
- Greys: keep Open Color gray, or move to a warmer or cooler neutral?
- Corners: keep rounded-2xl, or go tighter?
- Equal-width digits for amounts are not used anywhere yet (no `tabular-nums` in the code).
- Moving the 35 Radix icon imports to Lucide: when, and as a separate change?
- Code conflict: `web/index.html` has `lang="en"`, but the UI is in Portuguese (Brazil).
- Code conflict: Sora and JetBrains Mono are loaded in `web/index.html` but unused. Remove them, or use one?
