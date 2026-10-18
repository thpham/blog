/** Set by the inline theme script in src/layouts/Base.astro. */
interface Window {
  __ithingsTheme?: { set(pref: "auto" | "light" | "dark"): void };
}
