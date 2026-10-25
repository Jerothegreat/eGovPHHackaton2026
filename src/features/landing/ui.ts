// Shared Tailwind class strings from docs/design/board-a.html. The board's `.s-egov` overrides
// (card radius and shadow, button hover and shadow, heading weights) are baked in here.

export const container = 'mx-auto w-full max-w-[1200px] 2xl:max-w-[1440px] px-4 md:px-8'
export const bleed = 'mx-auto w-full 3xl:max-w-[1920px]'

const btn =
  'inline-flex h-12 items-center justify-center rounded-[10px] px-6 text-[15px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
export const btnPrimary = `${btn} bg-accent text-accent-ink shadow-[0_8px_20px_-10px_rgb(0_71_171/.55)] hover:bg-accent-hover`
export const btnSecondary = `${btn} border border-line bg-surface text-ink hover:border-accent`

export const card = 'rounded-[16px] border border-line bg-surface shadow-[var(--t-shadow)]'
export const eyebrow = 'text-[13px] font-semibold uppercase tracking-[0.08em] text-accent'
export const h2 =
  'font-display font-bold tracking-[-0.025em] leading-[1.15] text-[28px] md:text-[34px] xl:text-[38px] 2xl:text-[46px]'
export const lead = 'text-[17px] md:text-[18px] 2xl:text-[20px] leading-relaxed text-muted'
export const sectionY = 'py-16 md:py-24 2xl:py-32'
