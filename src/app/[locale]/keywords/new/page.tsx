import {setRequestLocale} from 'next-intl/server';
import {use} from 'react';
import Header from '@/components/Header';
import KeywordIntake from '@/components/KeywordIntake';

export default function NewKeywordResearch({params}: {params: Promise<{locale: string}>}) {
  const {locale} = use(params);
  setRequestLocale(locale);
  return (
    <>
      <Header />
      <main className="flex-1 w-full">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <KeywordIntake />
        </div>
      </main>
    </>
  );
}
