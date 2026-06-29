import { ui, defaultLang, type Lang, type UIKey } from "./ui";

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split("/");
  if (lang in ui) return lang as Lang;
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t(key: UIKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}

/**
 * Build a URL for the same logical page in a different locale.
 * Strips the current locale prefix from the path and prepends the target one.
 */
export function localizedPath(url: URL, target: Lang, base: string): string {
  const segments = url.pathname.split("/").filter(Boolean);
  // base might be "conclave" → segments[0] == "conclave"
  const baseSlug = base.replace(/^\/|\/$/g, "");
  if (baseSlug && segments[0] === baseSlug) {
    segments.shift();
  }
  // segments[0] is the current locale prefix
  if (segments.length > 0 && (segments[0] === "en" || segments[0] === "es")) {
    segments[0] = target;
  } else {
    segments.unshift(target);
  }
  const prefix = baseSlug ? `/${baseSlug}` : "";
  return `${prefix}/${segments.join("/")}` + (url.pathname.endsWith("/") ? "/" : "");
}

/**
 * Prefix any relative path with the configured GitHub Pages base.
 * Use for all internal links so they work both locally and on Pages.
 */
export function withBase(path: string, base: string): string {
  const baseSlug = base.replace(/\/$/, "");
  if (path.startsWith("/")) return `${baseSlug}${path}`;
  return `${baseSlug}/${path}`;
}
