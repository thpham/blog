/** Set by the inline theme script in src/layouts/Base.astro. */
interface Window {
  __ithingsTheme?: { set(pref: "auto" | "light" | "dark"): void };
}

// The Pagefind UI ships as an untyped JS bundle.
declare module "@pagefind/default-ui" {
  class PagefindUI {
    constructor(options: { element: Element; showSubResults?: boolean; showImages?: boolean; baseUrl?: string });
  }
  export { PagefindUI };
}

declare module "@pagefind/default-ui/css/ui.css";
