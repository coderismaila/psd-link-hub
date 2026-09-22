/**
 * Page-level guard for admin routes. This is a convenience for the UI only — every admin API
 * handler enforces the role again with `requireAdmin`.
 */
export default defineNuxtRouteMiddleware(() => {
  const { user } = useUserSession()

  if (user.value?.role !== 'admin') {
    return navigateTo('/')
  }
})
