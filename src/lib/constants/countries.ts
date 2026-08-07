export interface Country {
  iso: string;   // ISO 3166-1 alpha-2
  name: string;
  dialCode: string;
}

function flag(iso: string): string {
  return [...iso.toUpperCase()].map((c) =>
    String.fromCodePoint(c.charCodeAt(0) - 65 + 0x1f1e6),
  ).join("");
}

export const COUNTRIES: Country[] = [
  { iso: "AF", name: "Afghanistan", dialCode: "+93" },
  { iso: "AL", name: "Albania", dialCode: "+355" },
  { iso: "DZ", name: "Algeria", dialCode: "+213" },
  { iso: "AD", name: "Andorra", dialCode: "+376" },
  { iso: "AO", name: "Angola", dialCode: "+244" },
  { iso: "AG", name: "Antigua and Barbuda", dialCode: "+1268" },
  { iso: "AR", name: "Argentina", dialCode: "+54" },
  { iso: "AM", name: "Armenia", dialCode: "+374" },
  { iso: "AU", name: "Australia", dialCode: "+61" },
  { iso: "AT", name: "Austria", dialCode: "+43" },
  { iso: "AZ", name: "Azerbaijan", dialCode: "+994" },
  { iso: "BS", name: "Bahamas", dialCode: "+1242" },
  { iso: "BH", name: "Bahrain", dialCode: "+973" },
  { iso: "BD", name: "Bangladesh", dialCode: "+880" },
  { iso: "BB", name: "Barbados", dialCode: "+1246" },
  { iso: "BY", name: "Belarus", dialCode: "+375" },
  { iso: "BE", name: "Belgium", dialCode: "+32" },
  { iso: "BZ", name: "Belize", dialCode: "+501" },
  { iso: "BJ", name: "Benin", dialCode: "+229" },
  { iso: "BT", name: "Bhutan", dialCode: "+975" },
  { iso: "BO", name: "Bolivia", dialCode: "+591" },
  { iso: "BA", name: "Bosnia and Herzegovina", dialCode: "+387" },
  { iso: "BW", name: "Botswana", dialCode: "+267" },
  { iso: "BR", name: "Brazil", dialCode: "+55" },
  { iso: "BN", name: "Brunei", dialCode: "+673" },
  { iso: "BG", name: "Bulgaria", dialCode: "+359" },
  { iso: "BF", name: "Burkina Faso", dialCode: "+226" },
  { iso: "BI", name: "Burundi", dialCode: "+257" },
  { iso: "CV", name: "Cape Verde", dialCode: "+238" },
  { iso: "KH", name: "Cambodia", dialCode: "+855" },
  { iso: "CM", name: "Cameroon", dialCode: "+237" },
  { iso: "CA", name: "Canada", dialCode: "+1" },
  { iso: "CF", name: "Central African Republic", dialCode: "+236" },
  { iso: "TD", name: "Chad", dialCode: "+235" },
  { iso: "CL", name: "Chile", dialCode: "+56" },
  { iso: "CN", name: "China", dialCode: "+86" },
  { iso: "CO", name: "Colombia", dialCode: "+57" },
  { iso: "KM", name: "Comoros", dialCode: "+269" },
  { iso: "CG", name: "Congo", dialCode: "+242" },
  { iso: "CD", name: "Congo (DR)", dialCode: "+243" },
  { iso: "CR", name: "Costa Rica", dialCode: "+506" },
  { iso: "HR", name: "Croatia", dialCode: "+385" },
  { iso: "CU", name: "Cuba", dialCode: "+53" },
  { iso: "CY", name: "Cyprus", dialCode: "+357" },
  { iso: "CZ", name: "Czech Republic", dialCode: "+420" },
  { iso: "DK", name: "Denmark", dialCode: "+45" },
  { iso: "DJ", name: "Djibouti", dialCode: "+253" },
  { iso: "DM", name: "Dominica", dialCode: "+1767" },
  { iso: "DO", name: "Dominican Republic", dialCode: "+1809" },
  { iso: "EC", name: "Ecuador", dialCode: "+593" },
  { iso: "EG", name: "Egypt", dialCode: "+20" },
  { iso: "SV", name: "El Salvador", dialCode: "+503" },
  { iso: "GQ", name: "Equatorial Guinea", dialCode: "+240" },
  { iso: "ER", name: "Eritrea", dialCode: "+291" },
  { iso: "EE", name: "Estonia", dialCode: "+372" },
  { iso: "SZ", name: "Eswatini", dialCode: "+268" },
  { iso: "ET", name: "Ethiopia", dialCode: "+251" },
  { iso: "FJ", name: "Fiji", dialCode: "+679" },
  { iso: "FI", name: "Finland", dialCode: "+358" },
  { iso: "FR", name: "France", dialCode: "+33" },
  { iso: "GA", name: "Gabon", dialCode: "+241" },
  { iso: "GM", name: "Gambia", dialCode: "+220" },
  { iso: "GE", name: "Georgia", dialCode: "+995" },
  { iso: "DE", name: "Germany", dialCode: "+49" },
  { iso: "GH", name: "Ghana", dialCode: "+233" },
  { iso: "GR", name: "Greece", dialCode: "+30" },
  { iso: "GD", name: "Grenada", dialCode: "+1473" },
  { iso: "GT", name: "Guatemala", dialCode: "+502" },
  { iso: "GN", name: "Guinea", dialCode: "+224" },
  { iso: "GW", name: "Guinea-Bissau", dialCode: "+245" },
  { iso: "GY", name: "Guyana", dialCode: "+592" },
  { iso: "HT", name: "Haiti", dialCode: "+509" },
  { iso: "HN", name: "Honduras", dialCode: "+504" },
  { iso: "HU", name: "Hungary", dialCode: "+36" },
  { iso: "IS", name: "Iceland", dialCode: "+354" },
  { iso: "IN", name: "India", dialCode: "+91" },
  { iso: "ID", name: "Indonesia", dialCode: "+62" },
  { iso: "IR", name: "Iran", dialCode: "+98" },
  { iso: "IQ", name: "Iraq", dialCode: "+964" },
  { iso: "IE", name: "Ireland", dialCode: "+353" },
  { iso: "IL", name: "Israel", dialCode: "+972" },
  { iso: "IT", name: "Italy", dialCode: "+39" },
  { iso: "JM", name: "Jamaica", dialCode: "+1876" },
  { iso: "JP", name: "Japan", dialCode: "+81" },
  { iso: "JO", name: "Jordan", dialCode: "+962" },
  { iso: "KZ", name: "Kazakhstan", dialCode: "+7" },
  { iso: "KE", name: "Kenya", dialCode: "+254" },
  { iso: "KI", name: "Kiribati", dialCode: "+686" },
  { iso: "KW", name: "Kuwait", dialCode: "+965" },
  { iso: "KG", name: "Kyrgyzstan", dialCode: "+996" },
  { iso: "LA", name: "Laos", dialCode: "+856" },
  { iso: "LV", name: "Latvia", dialCode: "+371" },
  { iso: "LB", name: "Lebanon", dialCode: "+961" },
  { iso: "LS", name: "Lesotho", dialCode: "+266" },
  { iso: "LR", name: "Liberia", dialCode: "+231" },
  { iso: "LY", name: "Libya", dialCode: "+218" },
  { iso: "LI", name: "Liechtenstein", dialCode: "+423" },
  { iso: "LT", name: "Lithuania", dialCode: "+370" },
  { iso: "LU", name: "Luxembourg", dialCode: "+352" },
  { iso: "MG", name: "Madagascar", dialCode: "+261" },
  { iso: "MW", name: "Malawi", dialCode: "+265" },
  { iso: "MY", name: "Malaysia", dialCode: "+60" },
  { iso: "MV", name: "Maldives", dialCode: "+960" },
  { iso: "ML", name: "Mali", dialCode: "+223" },
  { iso: "MT", name: "Malta", dialCode: "+356" },
  { iso: "MH", name: "Marshall Islands", dialCode: "+692" },
  { iso: "MR", name: "Mauritania", dialCode: "+222" },
  { iso: "MU", name: "Mauritius", dialCode: "+230" },
  { iso: "MX", name: "Mexico", dialCode: "+52" },
  { iso: "FM", name: "Micronesia", dialCode: "+691" },
  { iso: "MD", name: "Moldova", dialCode: "+373" },
  { iso: "MC", name: "Monaco", dialCode: "+377" },
  { iso: "MN", name: "Mongolia", dialCode: "+976" },
  { iso: "ME", name: "Montenegro", dialCode: "+382" },
  { iso: "MA", name: "Morocco", dialCode: "+212" },
  { iso: "MZ", name: "Mozambique", dialCode: "+258" },
  { iso: "MM", name: "Myanmar", dialCode: "+95" },
  { iso: "NA", name: "Namibia", dialCode: "+264" },
  { iso: "NR", name: "Nauru", dialCode: "+674" },
  { iso: "NP", name: "Nepal", dialCode: "+977" },
  { iso: "NL", name: "Netherlands", dialCode: "+31" },
  { iso: "NZ", name: "New Zealand", dialCode: "+64" },
  { iso: "NI", name: "Nicaragua", dialCode: "+505" },
  { iso: "NE", name: "Niger", dialCode: "+227" },
  { iso: "NG", name: "Nigeria", dialCode: "+234" },
  { iso: "MK", name: "North Macedonia", dialCode: "+389" },
  { iso: "NO", name: "Norway", dialCode: "+47" },
  { iso: "OM", name: "Oman", dialCode: "+968" },
  { iso: "PK", name: "Pakistan", dialCode: "+92" },
  { iso: "PW", name: "Palau", dialCode: "+680" },
  { iso: "PS", name: "Palestine", dialCode: "+970" },
  { iso: "PA", name: "Panama", dialCode: "+507" },
  { iso: "PG", name: "Papua New Guinea", dialCode: "+675" },
  { iso: "PY", name: "Paraguay", dialCode: "+595" },
  { iso: "PE", name: "Peru", dialCode: "+51" },
  { iso: "PH", name: "Philippines", dialCode: "+63" },
  { iso: "PL", name: "Poland", dialCode: "+48" },
  { iso: "PT", name: "Portugal", dialCode: "+351" },
  { iso: "QA", name: "Qatar", dialCode: "+974" },
  { iso: "RO", name: "Romania", dialCode: "+40" },
  { iso: "RU", name: "Russia", dialCode: "+7" },
  { iso: "RW", name: "Rwanda", dialCode: "+250" },
  { iso: "KN", name: "Saint Kitts and Nevis", dialCode: "+1869" },
  { iso: "LC", name: "Saint Lucia", dialCode: "+1758" },
  { iso: "VC", name: "Saint Vincent and the Grenadines", dialCode: "+1784" },
  { iso: "WS", name: "Samoa", dialCode: "+685" },
  { iso: "SM", name: "San Marino", dialCode: "+378" },
  { iso: "ST", name: "Sao Tome and Principe", dialCode: "+239" },
  { iso: "SA", name: "Saudi Arabia", dialCode: "+966" },
  { iso: "SN", name: "Senegal", dialCode: "+221" },
  { iso: "RS", name: "Serbia", dialCode: "+381" },
  { iso: "SC", name: "Seychelles", dialCode: "+248" },
  { iso: "SL", name: "Sierra Leone", dialCode: "+232" },
  { iso: "SG", name: "Singapore", dialCode: "+65" },
  { iso: "SK", name: "Slovakia", dialCode: "+421" },
  { iso: "SI", name: "Slovenia", dialCode: "+386" },
  { iso: "SB", name: "Solomon Islands", dialCode: "+677" },
  { iso: "SO", name: "Somalia", dialCode: "+252" },
  { iso: "ZA", name: "South Africa", dialCode: "+27" },
  { iso: "KR", name: "South Korea", dialCode: "+82" },
  { iso: "SS", name: "South Sudan", dialCode: "+211" },
  { iso: "ES", name: "Spain", dialCode: "+34" },
  { iso: "LK", name: "Sri Lanka", dialCode: "+94" },
  { iso: "SD", name: "Sudan", dialCode: "+249" },
  { iso: "SR", name: "Suriname", dialCode: "+597" },
  { iso: "SE", name: "Sweden", dialCode: "+46" },
  { iso: "CH", name: "Switzerland", dialCode: "+41" },
  { iso: "SY", name: "Syria", dialCode: "+963" },
  { iso: "TW", name: "Taiwan", dialCode: "+886" },
  { iso: "TJ", name: "Tajikistan", dialCode: "+992" },
  { iso: "TZ", name: "Tanzania", dialCode: "+255" },
  { iso: "TH", name: "Thailand", dialCode: "+66" },
  { iso: "TL", name: "Timor-Leste", dialCode: "+670" },
  { iso: "TG", name: "Togo", dialCode: "+228" },
  { iso: "TO", name: "Tonga", dialCode: "+676" },
  { iso: "TT", name: "Trinidad and Tobago", dialCode: "+1868" },
  { iso: "TN", name: "Tunisia", dialCode: "+216" },
  { iso: "TR", name: "Turkey", dialCode: "+90" },
  { iso: "TM", name: "Turkmenistan", dialCode: "+993" },
  { iso: "TV", name: "Tuvalu", dialCode: "+688" },
  { iso: "UG", name: "Uganda", dialCode: "+256" },
  { iso: "UA", name: "Ukraine", dialCode: "+380" },
  { iso: "AE", name: "United Arab Emirates", dialCode: "+971" },
  { iso: "GB", name: "United Kingdom", dialCode: "+44" },
  { iso: "US", name: "United States", dialCode: "+1" },
  { iso: "UY", name: "Uruguay", dialCode: "+598" },
  { iso: "UZ", name: "Uzbekistan", dialCode: "+998" },
  { iso: "VU", name: "Vanuatu", dialCode: "+678" },
  { iso: "VE", name: "Venezuela", dialCode: "+58" },
  { iso: "VN", name: "Vietnam", dialCode: "+84" },
  { iso: "YE", name: "Yemen", dialCode: "+967" },
  { iso: "ZM", name: "Zambia", dialCode: "+260" },
  { iso: "ZW", name: "Zimbabwe", dialCode: "+263" },
].sort((a, b) => a.name.localeCompare(b.name));

export const COUNTRIES_BY_DIAL_LENGTH = [...COUNTRIES].sort(
  (a, b) => b.dialCode.length - a.dialCode.length,
);

export const COUNTRY_SELECT_DATA = COUNTRIES.map((c) => ({
  value: c.iso,
  label: `${flag(c.iso)} ${c.name} (${c.dialCode})`,
}));

export function getDialCode(iso: string): string {
  return COUNTRIES.find((c) => c.iso === iso)?.dialCode ?? "+1";
}

/**
 * Resolve a location's country name to an ISO 3166-1 alpha-2 code.
 *
 * `locations` stores the long COD/UN form ("Venezuela (Bolivarian Republic
 * of)") while this list uses short names, so fall back to a longest-prefix
 * match. Longest wins so "South Sudan" is not swallowed by "Sudan".
 * Returns null when nothing matches, letting callers decide their own default
 * instead of silently landing on one country.
 */
export function isoForCountryName(name: string | null | undefined): string | null {
  if (!name) return null;
  const lower = name.trim().toLowerCase();

  const exact = COUNTRIES.find((c) => c.name.toLowerCase() === lower);
  if (exact) return exact.iso;

  let best: Country | undefined;
  for (const c of COUNTRIES) {
    const k = c.name.toLowerCase();
    if (lower.startsWith(`${k} (`) || lower.startsWith(`${k} `)) {
      if (!best || c.name.length > best.name.length) best = c;
    }
  }
  return best?.iso ?? null;
}
