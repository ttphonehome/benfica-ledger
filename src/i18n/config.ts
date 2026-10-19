export const LANGS = ["pt", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "pt";
export const isLang = (x: string): x is Lang => (LANGS as readonly string[]).includes(x);
export const HTML_LANG: Record<Lang, string> = { pt: "pt-PT", en: "en" };
