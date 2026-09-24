/**
 * Holds a user on the change-password page while their account still carries a password an admin
 * set. Runs after `auth.global` (alphabetical order), so by here we know whether anyone is signed
 * in. The server refuses the rest of the API regardless — this only spares the user from walking
 * into a wall of 403s.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  if (!loggedIn.value || !user.value?.mustChangePassword) {
    return
  }

  if (to.path === '/change-password') {
    return
  }

  return navigateTo('/change-password')
})
