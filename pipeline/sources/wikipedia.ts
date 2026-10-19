// Read-only MediaWiki API client for English Wikipedia, following Wikimedia's
// etiquette: descriptive User-Agent, one request at a time, a short pause.
// Text from Wikipedia is CC BY-SA 4.0; the site credits it in the footer.

const UA = "AguiaLedgerBot/0.1 (https://github.com/ttphonehome/benfica-ledger; Benfica fan analytics data pipeline)";
let last = 0;

export async function wikiApi<T>(params: Record<string, string>): Promise<T> {
  const wait = last + 400 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const url = "https://en.wikipedia.org/w/api.php?" + new URLSearchParams({ format: "json", formatversion: "2", ...params });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status} for ${params.page ?? ""}`);
  return (await res.json()) as T;
}

export const seasonArticle = (startYear: number) =>
  `${startYear}–${String((startYear + 1) % 100).padStart(2, "0")} S.L. Benfica season`;

export interface WikiSeasonPage {
  title: string;
  revid: number;
  sections: { index: string; line: string }[];
}

export async function seasonPage(startYear: number): Promise<WikiSeasonPage | null> {
  const r = await wikiApi<{ error?: { code: string }; parse?: { title: string; revid: number; sections: { index: string; line: string }[] } }>({
    action: "parse",
    page: seasonArticle(startYear),
    prop: "sections|revid",
    redirects: "1",
  });
  if (r.error || !r.parse) return null;
  return { title: r.parse.title, revid: r.parse.revid, sections: r.parse.sections.map((s) => ({ index: s.index, line: s.line })) };
}

export async function sectionWikitext(title: string, index: string): Promise<string> {
  const r = await wikiApi<{ parse: { wikitext: string } }>({ action: "parse", page: title, prop: "wikitext", section: index });
  return r.parse.wikitext;
}
