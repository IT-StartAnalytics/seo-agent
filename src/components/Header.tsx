import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import LocaleSwitcher from './LocaleSwitcher';

export default function Header() {
  const t = useTranslations('Nav');
  return (
    <header className="sticky top-0 z-10 backdrop-blur border-b border-black/5 dark:border-white/10">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight text-lg">
          SEO<span className="text-indigo-500">Agent</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#features" className="hidden sm:inline text-foreground/70 hover:text-foreground">
            {t('features')}
          </a>
          <a href="#how" className="hidden sm:inline text-foreground/70 hover:text-foreground">
            {t('howItWorks')}
          </a>
          <LocaleSwitcher />
          <button className="rounded-full bg-foreground text-background px-4 py-1.5 text-sm font-medium">
            {t('signIn')}
          </button>
        </nav>
      </div>
    </header>
  );
}
