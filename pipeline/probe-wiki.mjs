// Prints the structure of English Wikipedia's S.L. Benfica season articles:
// section titles per season and a sample of the squad statistics wikitext.
// Read-only; follows Wikimedia's API etiquette (descriptive User-Agent, one
// request at a time).
const UA = "AguiaLedgerBot/0.1 (https://github.com/ttphonehome/benfica-ledger; fan analytics, data pipeline)";
const api = async (params) => {
  const url = "https://en.wikipedia.org/w/api.php?" + new URLSearchParams({ format: "json", formatversion: "2", ...params });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
};
const title = (y) => `${y}–${String((y + 1) % 100).padStart(2, "0")} S.L. Benfica season`;

for (let y = 2016; y <= 2026; y++) {
  const r = await api({ action: "parse", page: title(y), prop: "sections|revid", redirects: "1" });
  if (r.error) { console.log(`\n# ${title(y)}: ${r.error.code} ${r.error.info}`); continue; }
  const secs = r.parse.sections.map((s) => `${s.index}:${s.line}`);
  console.log(`\n# ${r.parse.title} (rev ${r.parse.revid}) sections: ${secs.join(" | ")}`);
  if (y === 2025 || y === 2016 || y === 2026) {
    const pick = r.parse.sections.find((s) => /appearances|squad statistics|playing statistics/i.test(s.line))
      ?? r.parse.sections.find((s) => /statistics/i.test(s.line));
    if (pick) {
      const w = await api({ action: "parse", page: r.parse.title, prop: "wikitext", section: pick.index });
      const text = w.parse.wikitext;
      console.log(`## section ${pick.index} "${pick.line}" (${text.length} chars):\n${text.slice(0, 3500)}\n…\n${text.slice(-600)}`);
    }
    const tr = r.parse.sections.find((s) => /^transfers? in$|^in$/i.test(s.line)) ?? r.parse.sections.find((s) => /transfer/i.test(s.line));
    if (tr && y === 2025) {
      const w = await api({ action: "parse", page: r.parse.title, prop: "wikitext", section: tr.index });
      console.log(`## section ${tr.index} "${tr.line}":\n${w.parse.wikitext.slice(0, 1500)}`);
    }
  }
}
