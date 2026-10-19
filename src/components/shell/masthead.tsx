"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LANGS } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

// Site name, tagline and the language switch. Scrolls away; the nav sticks.
export function Masthead() {
  const { t, lang } = useI18n();
  return (
    <header className="grid grid-cols-[1fr_auto] items-end gap-6 border-b border-border px-(--pad) pt-[22px] pb-[18px] max-sm:grid-cols-1">
      <div>
        <div className="text-[clamp(28px,3.4vw,44px)] leading-none font-semibold tracking-[-0.035em]">
          {t("site.name")}
          <span className="font-light text-mute">{t("site.tagline")}</span>
        </div>
        <div className="mt-2 font-mono text-[11px] tracking-[0.12em] text-mute uppercase">{t("site.sub")}</div>
      </div>
      <LangSwitch current={lang} label={t("lang.label")} />
    </header>
  );
}

function LangSwitch({ current, label }: { current: string; label: string }) {
  const pathname = usePathname();
  // Keep the #player= fragment when switching language.
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const swap = (lang: string) => pathname.replace(/^\/(pt|en)(?=\/|$)/, `/${lang}`) + hash;

  return (
    <nav aria-label={label} className="flex items-center gap-1 font-mono text-[11px] tracking-[0.12em] uppercase">
      {LANGS.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-mute-2" aria-hidden>/</span>}
          <Link
            href={swap(l)}
            hrefLang={l === "pt" ? "pt-PT" : "en"}
            lang={l === "pt" ? "pt-PT" : "en"}
            aria-current={l === current ? "true" : undefined}
            scroll={false}
            className={cn(
              "inline-flex min-h-8 items-center px-1.5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none touch:min-h-11 touch:px-3",
              l === current ? "text-foreground underline decoration-primary decoration-2 underline-offset-4" : "text-mute",
            )}
          >
            {l === "pt" ? "PT" : "EN"}
          </Link>
        </span>
      ))}
    </nav>
  );
}
