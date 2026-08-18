import {setRequestLocale} from 'next-intl/server';
import Header from '@/components/Header';
import ModelSwitcher from '@/components/ModelSwitcher';
import {getGenerationModel, ALLOWED_MODELS} from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const current = await getGenerationModel();

  return (
    <>
      <Header />
      <main className="flex-1 mx-auto max-w-6xl px-6 py-12 w-full">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-foreground/60">Global options for the SEO Agent pipeline.</p>
        <div className="mt-8">
          <ModelSwitcher current={current} models={ALLOWED_MODELS} />
        </div>
        <p className="mt-6 text-xs text-foreground/45 max-w-xl">
          The n8n flow reads this model at generation time. gpt-5.6 models use reasoning + prompt
          caching; older models run without them. Per-model cost is on the Costs page.
        </p>
      </main>
    </>
  );
}
