// FIFA trigrams for nationalities, as API-Football spells them. Unknown names
// fall back to the first three letters, upper-cased.
const CODES: Record<string, string> = {
  Albania: "ALB", Algeria: "ALG", Angola: "ANG", Argentina: "ARG", Australia: "AUS", Austria: "AUT", Belgium: "BEL",
  "Bosnia & Herzegovina": "BIH", "Bosnia and Herzegovina": "BIH", Brazil: "BRA", "Burkina Faso": "BFA", Cameroon: "CMR",
  Canada: "CAN", "Cape Verde": "CPV", "Cape Verde Islands": "CPV", Chile: "CHI", Colombia: "COL", Croatia: "CRO",
  "Czech Republic": "CZE", Czechia: "CZE", Denmark: "DEN", Ecuador: "ECU", Egypt: "EGY", England: "ENG", France: "FRA",
  Germany: "GER", Ghana: "GHA", Greece: "GRE", "Guinea-Bissau": "GNB", Guinea: "GUI", Hungary: "HUN", Iceland: "ISL",
  Iran: "IRN", Israel: "ISR", Italy: "ITA", "Ivory Coast": "CIV", "Côte d'Ivoire": "CIV", Japan: "JPN", Luxembourg: "LUX",
  Mali: "MLI", Mexico: "MEX", Morocco: "MAR", Mozambique: "MOZ", Netherlands: "NED", Nigeria: "NGA", Norway: "NOR",
  Paraguay: "PAR", Peru: "PER", Poland: "POL", Portugal: "POR", Romania: "ROU", Russia: "RUS", "São Tomé e Príncipe": "STP",
  Scotland: "SCO", Senegal: "SEN", Serbia: "SRB", Slovakia: "SVK", Slovenia: "SVN", "South Korea": "KOR", "Korea Republic": "KOR",
  Spain: "ESP", Sweden: "SWE", Switzerland: "SUI", Tunisia: "TUN", Turkey: "TUR", Türkiye: "TUR", Ukraine: "UKR",
  "United States": "USA", USA: "USA", Uruguay: "URU", Venezuela: "VEN", Wales: "WAL",
};

export function nationCode(name: string | null | undefined): string | null {
  if (!name) return null;
  return CODES[name] ?? name.slice(0, 3).toUpperCase();
}
