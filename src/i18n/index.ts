import { en, type DictKey } from "./dictionaries/en";
import { pt } from "./dictionaries/pt";
import type { Lang } from "./config";
import { formatters, type Formatters } from "./format";

export type { Lang } from "./config";
export type { DictKey } from "./dictionaries/en";

const DICTS = { en, pt } as const;
export type Vars = Record<string, string | number>;

export interface I18n {
  lang: Lang;
  /** Look up text and fill {placeholders}. */
  t(key: DictKey, vars?: Vars): string;
  /** Plural: picks key_one / key_other by n, and passes n as {n}. */
  tp(key: string, n: number, vars?: Vars): string;
  f: Formatters;
}

const fill = (s: string, vars?: Vars) =>
  vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;

const cache = new Map<Lang, I18n>();

export function getI18n(lang: Lang): I18n {
  const hit = cache.get(lang);
  if (hit) return hit;
  const dict = DICTS[lang];
  const rules = new Intl.PluralRules(lang === "pt" ? "pt-PT" : "en");
  const t = (key: DictKey, vars?: Vars) => fill(dict[key] ?? en[key] ?? key, vars);
  const i18n: I18n = {
    lang,
    t,
    tp(key, n, vars) {
      const form = rules.select(n) === "one" ? "one" : "other";
      return t(`${key}_${form}` as DictKey, { n, ...vars });
    },
    f: formatters(lang),
  };
  cache.set(lang, i18n);
  return i18n;
}
