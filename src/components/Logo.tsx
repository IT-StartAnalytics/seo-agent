export default function Logo({
  size = 28,
  withWordmark = true,
  className = ''
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="seoLogoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill="url(#seoLogoGrad)" />
        <circle cx="17" cy="17" r="8" fill="none" stroke="#fff" strokeWidth="2.6" />
        <path d="M23 23 L29.5 29.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="M13 19.5 L16 16 L18.6 18 L21.5 13.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M30.2 8 l0.95 2.45 2.45 0.95 -2.45 0.95 -0.95 2.45 -0.95 -2.45 -2.45 -0.95 2.45 -0.95 z" fill="#fff" />
      </svg>
      {withWordmark && (
        <span className="font-semibold tracking-tight text-lg leading-none">
          SEO<span className="text-indigo-500">Agent</span>
        </span>
      )}
    </span>
  );
}
