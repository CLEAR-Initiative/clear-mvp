const SIGN = "[−+\\-\u2013\u2014]";
const NUMBER = `~?<?${SIGN}?\\$?\\d[\\d,]*(?:\\.\\d+)?(?:st|nd|rd|th)?(?:[MBK]|\\+|%)?`;
/** Unit words belong to a range ("8.58 / –8.6 million"). A lone number leaves them in the sentence. */
const UNIT = "(?:\\s+(?:million|billion|thousand))?";
const SEPARATOR = "(?:/|[\\-\u2013\u2014])";
const RANGE = `(?:\\s*${SEPARATOR}\\s*${NUMBER}${UNIT})?`;
const LEADING = new RegExp(`^(${NUMBER}${RANGE})`, "i");

/** A leading stat such as "8.58M", "55%", or "8.58 / –8.6 million". Bare small numbers stay in the sentence. */
export function leadingFigure(text: string): { figure: string; rest: string } | null {
  const match = text.match(LEADING);
  const figure = match?.[1];
  if (!figure) return null;
  const rest = text.slice(figure.length).trim();
  if (!rest || /^[−+-]?\d{1,2}$/.test(figure)) return null;
  return { figure, rest };
}
