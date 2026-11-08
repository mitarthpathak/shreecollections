import { ViewTransition } from 'react';

/** Every page is wrapped so route changes play the gold-thread curtain. */
export function Page({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <main id="main" className={`relative min-h-svh pt-[var(--header-h)] pb-tabbar ${className}`}>
        {children}
      </main>
    </ViewTransition>
  );
}

export function PageHeading({ eyebrow, title, titleHi, children }: { eyebrow?: string; title: string; titleHi?: string; children?: React.ReactNode }) {
  return (
    <header className="mx-auto max-w-[1600px] px-4 pb-6 pt-10 md:px-8 md:pt-16">
      {eyebrow && <p className="label mb-3 text-gold-text">{eyebrow}</p>}
      <h1 className="font-editorial font-medium text-[clamp(2.4rem,7vw,6rem)] leading-[0.95] text-fg">{title}</h1>
      {titleHi && (
        <p lang="hi" className="font-hindi-display mt-2 text-xl text-fg-muted md:text-2xl">
          {titleHi}
        </p>
      )}
      {children}
    </header>
  );
}
