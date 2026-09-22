// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxthub/core', 'nuxt-auth-utils', '@vueuse/nuxt', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  hub: {
    db: 'sqlite' // local file: .data/db/sqlite.db (libsql)
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
