import type { Metadata } from 'next';
import { Page, PageHeading } from '@/components/Page';
import { brand, brandTodos } from '@/brand.config';
import { Todo } from '@/components/Todo';

export const metadata: Metadata = {
  title: 'About',
  description: `${brand.name} is a ladies' garments store in ${brand.location.city}, ${brand.location.state}, for suits and sarees.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <Page>
      <PageHeading eyebrow={brand.tagline} title="Our Story" titleHi="हमारी कहानी" />
      <div className="mx-auto max-w-3xl space-y-6 px-4 pb-20 md:px-8">
        {brand.ownerStory ? (
          brand.ownerStory.map((p) => (
            <p key={p} className="font-editorial text-2xl leading-relaxed text-ivory/90">{p}</p>
          ))
        ) : (
          <>
            <p className="font-editorial text-2xl leading-relaxed text-ivory/90">
              {brand.name} is a ladies&apos; garments store in {brand.location.city}, {brand.location.state}, for suits and sarees —
              Banarasi and Chanderi, Bandhani and Leheriya, Anarkali and Sharara.
            </p>
            <Todo label="owner story (two or three short paragraphs)" />
          </>
        )}
        {brandTodos.length > 0 && (
          <section className="panel mt-12 rounded-3xl p-6" aria-labelledby="todo-h">
            <h2 id="todo-h" className="label text-pitambar">For the owner: details still needed</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {brandTodos.map((t) => (
                <li key={t.key}><Todo label={t.label} /></li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ivory-dim">Every item lives in <code>src/brand.config.ts</code>; fill it once and it updates across the site.</p>
          </section>
        )}
      </div>
    </Page>
  );
}
