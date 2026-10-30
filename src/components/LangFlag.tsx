// Small inline-SVG flags for the meta language blocks (emoji flags render as plain letters on
// Windows, so they are drawn here). No ids inside the SVGs: the same flag can appear many times
// on one page. AR uses the UAE flag (main Arabic market); EN uses the UK flag.

type Props = {lang: string; className?: string};

function Shapes({lang}: {lang: string}) {
  switch (lang) {
    case 'en':
      return (
        <svg viewBox="0 0 60 30" preserveAspectRatio="none" className="h-full w-full">
          <rect width="60" height="30" fill="#012169" />
          <path d="M0,0L60,30M60,0L0,30" stroke="#fff" strokeWidth="6" />
          <path d="M0,0L60,30M60,0L0,30" stroke="#C8102E" strokeWidth="2" />
          <path d="M30,0v30M0,15h60" stroke="#fff" strokeWidth="10" />
          <path d="M30,0v30M0,15h60" stroke="#C8102E" strokeWidth="6" />
        </svg>
      );
    case 'ar':
      return (
        <svg viewBox="0 0 12 6" preserveAspectRatio="none" className="h-full w-full">
          <rect width="12" height="2" fill="#00732F" />
          <rect y="2" width="12" height="2" fill="#fff" />
          <rect y="4" width="12" height="2" fill="#000" />
          <rect width="3" height="6" fill="#FF0000" />
        </svg>
      );
    case 'ru':
      return (
        <svg viewBox="0 0 9 6" preserveAspectRatio="none" className="h-full w-full">
          <rect width="9" height="2" fill="#fff" />
          <rect y="2" width="9" height="2" fill="#0039A6" />
          <rect y="4" width="9" height="2" fill="#D52B1E" />
        </svg>
      );
    case 'fr':
      return (
        <svg viewBox="0 0 3 2" preserveAspectRatio="none" className="h-full w-full">
          <rect width="1" height="2" fill="#0055A4" />
          <rect x="1" width="1" height="2" fill="#fff" />
          <rect x="2" width="1" height="2" fill="#EF4135" />
        </svg>
      );
    case 'es':
      return (
        <svg viewBox="0 0 3 2" preserveAspectRatio="none" className="h-full w-full">
          <rect width="3" height="2" fill="#AA151B" />
          <rect y="0.5" width="3" height="1" fill="#F1BF00" />
        </svg>
      );
    case 'el':
      return (
        <svg viewBox="0 0 27 18" preserveAspectRatio="none" className="h-full w-full">
          <rect width="27" height="18" fill="#0D5EAF" />
          <path d="M0,3h27M0,7h27M0,11h27M0,15h27" stroke="#fff" strokeWidth="2" />
          <rect width="10" height="10" fill="#0D5EAF" />
          <path d="M5,0v10M0,5h10" stroke="#fff" strokeWidth="2" />
        </svg>
      );
    default:
      return null;
  }
}

export default function LangFlag({lang, className}: Props) {
  const l = String(lang || '').toLowerCase();
  if (!['en', 'ar', 'ru', 'fr', 'es', 'el'].includes(l)) return null;
  return (
    <span
      aria-hidden
      className={`inline-block h-3 w-[18px] shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10 dark:ring-white/15 ${className ?? ''}`}
    >
      <Shapes lang={l} />
    </span>
  );
}

// Flag + language code, for the "EN / AR / ..." heading of a meta block.
export function LangLabel({lang, label}: {lang: string; label?: string}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <LangFlag lang={lang} />
      <span>{label ?? String(lang || '').toUpperCase()}</span>
    </span>
  );
}
