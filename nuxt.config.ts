// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Opts into the framework defaults as of this date; bump it deliberately, not casually.
  compatibilityDate: '2026-09-23',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxthub/core', 'nuxt-auth-utils', '@vueuse/nuxt', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/png', href: '/ke-logo.png' }]
    },
    pageTransition: { name: 'page', mode: 'out-in' }
  },
  // Components are named after the file alone, so `components/links/LinkCard.vue` is `<LinkCard>`
  // rather than `<LinksLinkCard>`.
  components: [{ path: '~/components', pathPrefix: false }],
  hub: {
    db: 'sqlite' // local file: .data/db/sqlite.db (libsql)
  },
  routeRules: {
    // Security headers for every response. The app is never meant to be framed.
    '/**': {
      headers: {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'referrer-policy': 'strict-origin-when-cross-origin'
      }
    },
    /*
     * Every API response is scoped to the signed-in user — the link list carries that user's own
     * pins and hidden links — so nothing here may be stored by a browser, proxy or CDN. This is
     * also why none of these routes use `defineCachedEventHandler`: a shared server-side cache
     * would hand one user's view to another.
     */
    '/api/**': {
      headers: {
        'cache-control': 'no-store, private',
        'x-content-type-options': 'nosniff'
      }
    },
    // The brand mark never changes without a new filename.
    '/ke-logo.png': {
      headers: { 'cache-control': 'public, max-age=31536000, immutable' }
    }
  },
  runtimeConfig: {
    adminEmail: '',
    adminPassword: '',
    adminName: 'Administrator',
    public: {
      appTimezone: 'UTC'
    }
  },
  nitro: {
    experimental: { tasks: true },
    scheduledTasks: {
      '15 0 * * *': ['archive:monthly'] // daily 00:15 server time
    }
  },
  typescript: {
    typeCheck: false,
    strict: true
  }
})
