/** "Álvaro Carreras" -> "alvaro-carreras". Same rule as the placeholder import. */
export function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Lower-case, accent-free tokens of a name, for matching across sources. */
export function nameTokens(s: string): string[] {
  return slug(s).split("-").filter(Boolean);
}
