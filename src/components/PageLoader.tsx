export default function PageLoader({label = 'Loading…'}: {label?: string}) {
  return (
    <div className="flex-1 flex items-center justify-center py-32 w-full">
      <div className="flex flex-col items-center gap-3 text-foreground/55">
        <svg className="h-8 w-8 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}
