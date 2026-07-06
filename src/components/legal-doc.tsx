// Rendu commun des documents légaux : titre, préambule, articles numérotés.
// Les mentions [À COMPLÉTER : …] sont des faits société que seul l'opérateur
// peut fournir — jamais inventés (honest-empty appliqué au juridique).

export interface LegalSection {
  title: string;
  body: string[];
  list?: string[];
}

export function LegalDoc({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
}) {
  return (
    <article>
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 font-mono text-xs uppercase tracking-widest text-ink-faint">
        Dernière mise à jour : {updated}
      </p>
      {intro && <p className="mt-5 text-ink-muted">{intro}</p>}
      <div className="mt-8 space-y-8">
        {sections.map((s, i) => (
          <section key={s.title}>
            <h2 className="font-display text-lg font-semibold">
              {i + 1}. {s.title}
            </h2>
            {s.body.map((p) => (
              <p key={p.slice(0, 40)} className="mt-2 text-sm leading-relaxed text-ink-muted">
                {p}
              </p>
            ))}
            {s.list && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                {s.list.map((item) => (
                  <li key={item.slice(0, 40)}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
