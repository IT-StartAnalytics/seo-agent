// Detects when a field's text is not in the script expected for its language
// (e.g. an Arabic version that actually contains English text).

type Script = 'latin' | 'arabic' | 'cyrillic';

export function expectedScript(lang: string): Script {
  if (lang === 'ar') return 'arabic';
  if (lang === 'ru') return 'cyrillic';
  return 'latin'; // en, fr
}

export function isLangMismatch(lang: string, text: string | null | undefined): boolean {
  if (!text) return false;
  const exp = expectedScript(lang);
  let latin = 0;
  let arabic = 0;
  let cyrillic = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || (c >= 0xc0 && c <= 0x24f)) latin++;
    else if (
      (c >= 0x600 && c <= 0x6ff) ||
      (c >= 0x750 && c <= 0x77f) ||
      (c >= 0x8a0 && c <= 0x8ff) ||
      (c >= 0xfb50 && c <= 0xfdff) ||
      (c >= 0xfe70 && c <= 0xfeff)
    )
      arabic++;
    else if (c >= 0x400 && c <= 0x4ff) cyrillic++;
  }
  const total = latin + arabic + cyrillic;
  if (total < 4) return false; // too short to judge confidently
  const counts: Record<Script, number> = {latin, arabic, cyrillic};
  let dominant: Script = 'latin';
  (['arabic', 'cyrillic'] as Script[]).forEach((sc) => {
    if (counts[sc] > counts[dominant]) dominant = sc;
  });
  // Flag when the expected script is clearly a minority and another script dominates.
  return dominant !== exp && counts[exp] / total < 0.4;
}
