import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { HTML_LANG, LANGS, isLang } from "@/i18n/config";
import { getI18n } from "@/i18n";
import { I18nProvider } from "@/i18n/client";
import "../globals.css";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const { t } = getI18n(lang);
  return { title: `${t("site.name")} · Benfica`, description: t("site.description") };
}

export const viewport: Viewport = { themeColor: "#0e0e0f", colorScheme: "dark" };

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <html lang={HTML_LANG[lang]} className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen">
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
