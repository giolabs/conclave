import nextra from "nextra";

// Bilingual (EN/ES) setup. `i18n` here is read by Nextra alone to split the
// content directory (content/en/, content/es/) and derive NEXTRA_LOCALES —
// Nextra always strips `i18n` from the config before Next.js sees it, so this
// stays compatible with `output: "export"` (Next's own i18n routing is not).
const withNextra = nextra({
  contentDirBasePath: "/",
  // Without Next.js's own i18n routing/middleware (incompatible with
  // `output: "export"`), Nextra's auto-generated navigation (sidebar,
  // prev/next pagination, breadcrumbs) needs this to prefix its own links
  // with the current locale — hand-written links in prose still need their
  // own explicit /en//es/ prefix, this only covers pageMap-derived links.
  unstable_shouldAddLocaleToLinks: true,
});

export default withNextra({
  output: "export",
  basePath: "/conclave",
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  // Without this, `output: "export"` writes each route as a flat file
  // (e.g. en.html) instead of a directory with an index (en/index.html) —
  // GitHub Pages then 404s on the trailing-slash URL (/conclave/en/) that
  // the root redirect page and every internal link produce, even though
  // the slash-less form (/conclave/en) resolves fine. This matches what
  // static hosts expect for pretty URLs.
  trailingSlash: true,
  i18n: {
    locales: ["en", "es"],
    defaultLocale: "en",
  },
});
