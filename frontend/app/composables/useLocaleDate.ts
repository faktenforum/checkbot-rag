/**
 * Format dates and times using the current i18n locale (de-DE / en-US).
 */
export function useLocaleDate() {
  const { locale } = useI18n();

  const intlLocale = computed(() => {
    const code = locale.value === "en" ? "en-US" : "de-DE";
    return code;
  });

  function formatDate(date: Date | string | null | undefined): string {
    if (date == null) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString(intlLocale.value, { dateStyle: "medium" });
  }

  function formatDateTime(date: Date | string | null | undefined): string {
    if (date == null) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString(intlLocale.value, {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  return { formatDate, formatDateTime, intlLocale };
}
