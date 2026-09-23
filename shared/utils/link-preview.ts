export type LinkKind = 'sheets' | 'docs' | 'slides' | 'forms' | 'drive' | 'other'

export interface LinkPreview {
  /** False when the text is not a URL at all; nothing else is meaningful then. */
  valid: boolean
  /** Anything other than https is refused by the form; flagged here so the reason is visible. */
  secure: boolean
  host: string
  kind: LinkKind
  /** What to call it on screen, e.g. "Google Sheets". */
  label: string
  icon: string
  /** The Google document id, when the URL carries one. */
  documentId?: string
  /** The `gid` of a specific tab within a spreadsheet. */
  tabId?: string
}

const GOOGLE_PATHS: Record<string, { kind: LinkKind, label: string, icon: string }> = {
  spreadsheets: { kind: 'sheets', label: 'Google Sheets', icon: 'i-lucide-sheet' },
  document: { kind: 'docs', label: 'Google Docs', icon: 'i-lucide-file-text' },
  presentation: { kind: 'slides', label: 'Google Slides', icon: 'i-lucide-presentation' },
  forms: { kind: 'forms', label: 'Google Forms', icon: 'i-lucide-clipboard-list' }
}

const UNKNOWN: LinkPreview = {
  valid: false,
  secure: false,
  host: '',
  kind: 'other',
  label: 'Not a link yet',
  icon: 'i-lucide-link'
}

/**
 * Describes a link from the URL alone, without fetching it.
 *
 * Fetching would not help: these sheets are private to the organisation, so a request from this
 * app gets Google's sign-in page rather than the document. Reading the real title needs the Drive
 * API, which the PRD puts out of scope. What the address itself says is reliable, and the Open
 * button covers the rest.
 */
export function describeLinkUrl(value: string): LinkPreview {
  const trimmed = value?.trim()
  if (!trimmed) return { ...UNKNOWN }

  let url: URL

  try {
    url = new URL(trimmed)
  } catch {
    return { ...UNKNOWN, label: 'Not a valid address' }
  }

  const secure = url.protocol === 'https:'
  const host = url.hostname

  if (host === 'docs.google.com') {
    /*
     * Usually /spreadsheets/d/<id>/edit, but a multi-account session inserts the account index:
     * /spreadsheets/u/0/d/<id>/edit. Locating the `d` segment covers both.
     */
    const parts = url.pathname.split('/').filter(Boolean)
    const section = parts[0]
    const marker = parts.indexOf('d')
    const id = marker >= 0 ? parts[marker + 1] : undefined
    const known = section ? GOOGLE_PATHS[section] : undefined

    if (known) {
      // The tab is carried in the fragment (#gid=0) far more often than in the query.
      const gid = url.searchParams.get('gid')
        ?? new URLSearchParams(url.hash.replace(/^#/, '')).get('gid')
        ?? undefined

      return {
        valid: true,
        secure,
        host,
        ...known,
        documentId: id,
        tabId: gid ?? undefined
      }
    }
  }

  if (host === 'drive.google.com') {
    const parts = url.pathname.split('/').filter(Boolean)
    const folderIndex = parts.indexOf('folders')

    return {
      valid: true,
      secure,
      host,
      kind: 'drive',
      label: 'Google Drive folder',
      icon: 'i-lucide-folder',
      documentId: folderIndex >= 0 ? parts[folderIndex + 1] : undefined
    }
  }

  return {
    valid: true,
    secure,
    host,
    kind: 'other',
    label: host,
    icon: 'i-lucide-link'
  }
}

/** Shortens an id for display without pretending it is the whole thing. */
export function shortenId(id: string, keep = 8): string {
  return id.length <= keep * 2 + 1 ? id : `${id.slice(0, keep)}…${id.slice(-4)}`
}
