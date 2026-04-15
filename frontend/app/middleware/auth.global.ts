export default defineNuxtRouteMiddleware(async (to) => {
  // Skip auth check for the login page itself
  if (to.path === "/login") return;

  const { currentUser, fetchMe } = useAuth();

  // On first load currentUser is undefined - fetch it
  if (currentUser.value === undefined) {
    await fetchMe();
  }

  if (!currentUser.value) {
    return navigateTo("/login");
  }
});
