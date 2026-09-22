import * as z from 'zod'

/**
 * The swatches offered in the category form. Stored as hex so a category's colour is its own
 * value rather than a role borrowed from the theme — categories are labels, not states.
 */
export const CATEGORY_PALETTE = [
  { name: 'Sky', hex: '#0284c7' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Fuchsia', hex: '#c026d3' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Amber', hex: '#ca8a04' },
  { name: 'Lime', hex: '#65a30d' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Cyan', hex: '#0891b2' },
  { name: 'Slate', hex: '#475569' }
] as const

export const DEFAULT_CATEGORY_COLOR = '#475569'

/**
 * Categories created before the palette stored a Nuxt UI token. Those rows still render, mapped
 * to the nearest swatch, so nothing has to be migrated by hand.
 */
const LEGACY_TOKENS: Record<string, string> = {
  primary: '#16a34a',
  secondary: '#65a30d',
  success: '#16a34a',
  info: '#0284c7',
  warning: '#ca8a04',
  error: '#dc2626',
  neutral: '#475569'
}

const HEX = /^#[0-9a-f]{6}$/i

/** Resolves whatever is stored on a category into a usable hex colour. */
export function categoryHex(color: string | null | undefined): string {
  if (!color) return DEFAULT_CATEGORY_COLOR
  if (HEX.test(color)) return color.toLowerCase()

  return LEGACY_TOKENS[color] ?? DEFAULT_CATEGORY_COLOR
}

export const categoryBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Use 60 characters or fewer'),
  color: z.string().trim().toLowerCase().regex(HEX, 'Pick a colour from the palette')
})

export type CategoryBody = z.output<typeof categoryBodySchema>
