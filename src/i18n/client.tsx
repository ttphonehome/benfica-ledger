"use client";

import { createContext, useContext } from "react";
import type { Lang } from "./config";
import { getI18n, type I18n } from "./index";

const LangContext = createContext<Lang>("pt");

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** Text and formatters for the current language, in client components. */
export function useI18n(): I18n {
  return getI18n(useContext(LangContext));
}
