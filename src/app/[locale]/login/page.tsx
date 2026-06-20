import {getTranslations, setRequestLocale} from 'next-intl/server';
import LoginForm from '@/components/LoginForm';
import LocaleSwitcher from '@/components/LocaleSwitcher';

export default async function LoginPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Login');

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="absolute top-5 right-6">
        <LocaleSwitcher />
      </div>
      <div className="w-full max-w-sm text-center">
        <div className="font-semibold tracking-tight text-2xl">
          SEO<span className="text-indigo-500">Agent</span>
        </div>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">
          {t('title')}
        </h1>
        <p className="mt-2 text-sm text-foreground/60">{t('subtitle')}</p>
      </div>
      <div className="mt-8 flex justify-center w-full">
        <LoginForm />
      </div>
    </main>
  );
}
