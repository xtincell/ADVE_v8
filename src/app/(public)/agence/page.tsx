import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "UPgraders — l'agence",
  description:
    "UPgraders est l'agence-fixer de l'industrie créative d'Afrique francophone : la méthode La Fusée, opérée par des humains.",
};

export default function AgencePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">L&apos;agence</p>
      <h1 className="mt-3 max-w-3xl text-3xl font-semibold md:text-5xl">
        UPgraders : le fixer des marques qui visent l&apos;étoile.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-ink-muted">
        La Fusée est notre produit ; UPgraders est la maison qui l&apos;opère. Entre le consultant
        hors de prix et le freelance débordé, nous industrialisons ce que les grands réseaux
        réservent aux multinationales — au prix et au rythme du marché africain francophone.
      </p>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          ["Capture-then-grow", "Nous captons les marques à fort potentiel tôt, et nous grandissons avec elles. Vos moyens d'aujourd'hui ne plafonnent pas votre ambition."],
          ["Méthode avant esbroufe", "Tout passe par la mesure : un score reproductible, des piliers versionnés, des recommandations qui remontent à vos données."],
          ["Un réseau opéré", "La Guilde : des talents sélectionnés, contrôlés qualité, payés proprement — pilotés par nos soins sur vos missions."],
        ].map(([title, body]) => (
          <Card key={title}>
            <CardContent className="pt-5">
              <h2 className="font-display text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-ink-muted">{body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 rounded-(--radius-lg) border border-line bg-surface-raised p-8">
        <h2 className="text-xl font-semibold">Nous mangeons notre propre cuisine</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Les marques UPgraders et La Fusée sont pilotées dans l&apos;outil lui-même — mêmes
          piliers, même score, mêmes règles que nos clients. La démonstration est dans le produit :
          faites le diagnostic et comparez.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/diagnostic" className={buttonClass({})}>
            Faire le diagnostic
          </Link>
          <Link href="/contact" className={buttonClass({ variant: "outline" })}>
            Parler à l&apos;équipe
          </Link>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold">Où nous opérons</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Dakar est notre port d&apos;attache ; nous opérons l&apos;UEMOA, la CEMAC et la diaspora
          — en français, en FCFA, mobile money accepté. Les marques d&apos;ailleurs sont bienvenues :
          la méthode voyage bien.
        </p>
      </div>
    </div>
  );
}
