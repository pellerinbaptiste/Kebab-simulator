import Link from "next/link";

import { Logo } from "@/components/brand/logo";

import { LEGAL, LEGAL_DOCS, type LegalDoc } from "@/lib/legal";
import { cn } from "@/lib/utils";

/** Mise en page commune des documents légaux (en français, langue du contrat). */
export function LegalPage({ doc }: { doc?: LegalDoc }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 text-sm leading-relaxed">
      <Link href="/" className="w-fit" aria-label="PronoLeague">
        <Logo className="text-lg" />
      </Link>

      <nav aria-label="Documents légaux" className="flex flex-wrap gap-2">
        <NavLink href="/legal" active={!doc}>
          Sommaire
        </NavLink>
        {LEGAL_DOCS.map((d) => (
          <NavLink key={d.slug} href={`/legal/${d.slug}`} active={doc?.slug === d.slug}>
            {d.title}
          </NavLink>
        ))}
      </nav>

      {doc ? (
        <article className="flex flex-col gap-5">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold tracking-tight">{doc.title}</h1>
            <p className="text-muted-foreground">Dernière mise à jour : {LEGAL.updatedAt}</p>
          </header>
          {doc.sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-2">
              <h2 className="text-base font-bold">{section.title}</h2>
              {section.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </section>
          ))}
        </article>
      ) : (
        <section className="flex flex-col gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">Informations légales</h1>
          <p className="text-muted-foreground">
            PronoLeague est un jeu gratuit joué avec des crédits virtuels sans valeur. Aucun argent réel n’est en jeu.
          </p>
          <ul className="flex flex-col gap-2">
            {LEGAL_DOCS.map((d) => (
              <li key={d.slug}>
                <Link href={`/legal/${d.slug}`} className="flex flex-col rounded-2xl border bg-card p-4 hover:bg-muted">
                  <span className="font-bold">{d.title}</span>
                  <span className="text-muted-foreground">{d.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-semibold",
        active ? "border-border bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}
