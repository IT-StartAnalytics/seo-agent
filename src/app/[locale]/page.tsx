import {useTranslations} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {use} from 'react';
import Header from '@/components/Header';

export default function Home({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = use(params);
  setRequestLocale(locale);
  const t = useTranslations('Hero');
  const f = useTranslations('Features');
  const footer = useTranslations('Footer');

  const features = [
    {title: f('content.title'), body: f('content.body')},
    {title: f('meta.title'), body: f('meta.body')},
    {title: f('bilingual.title'), body: f('bilingual.body')}
  ];

  return (
    <>
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-24 text-center">
          <span className="inline-block rounded-full border border-black/10 dark:border-white/15 px-3 py-1 text-xs font-medium text-foreground/70">
            {t('badge')}
          </span>
          <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight max-w-3xl mx-auto">
            {t('title')}
          </h1>
          <p className="mt-6 text-lg text-foreground/70 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <button className="rounded-full bg-foreground text-background px-6 py-3 text-sm font-medium">
              {t('ctaPrimary')}
            </button>
            <a
              href="#features"
              className="rounded-full border border-black/15 dark:border-white/20 px-6 py-3 text-sm font-medium"
            >
              {t('ctaSecondary')}
            </a>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center">
              {f('heading')}
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-black/5 dark:border-white/10 bg-background p-6"
                >
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="mt-2 text-sm text-foreground/70">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5 dark:border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-foreground/60 flex items-center justify-between">
          <span>SEO Agent</span>
          <span>© {new Date().getFullYear()} — {footer('rights')}</span>
        </div>
      </footer>
    </>
  );
}
