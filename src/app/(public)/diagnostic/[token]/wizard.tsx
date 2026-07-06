"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/form";
import type { IntakeAnswers } from "@/server/intake";
import { prefillDiagnosticAction, saveDiagnosticStep, submitDiagnostic } from "../actions";

export const SECTORS = [
  "Mode",
  "Food & boissons",
  "Musique",
  "Média & contenu",
  "Beauté & cosmétique",
  "Événementiel",
  "Tech & digital",
  "Artisanat & design",
  "Hôtellerie & tourisme",
  "Sport",
  "Autre",
];

const CHANNELS = ["Instagram", "TikTok", "WhatsApp", "Facebook", "YouTube", "X (Twitter)", "Site web", "Boutique physique", "Marchés & événements", "Radio / TV"];

type Answers = Partial<IntakeAnswers>;

interface StepDef {
  id: string;
  title: string;
  intro: string;
  fields: React.ReactNode | ((a: Answers, set: (k: keyof IntakeAnswers, v: string | string[]) => void) => React.ReactNode);
  validate?: (a: Answers) => string | null;
}

export function DiagnosticWizard({
  token,
  initialAnswers,
  countries,
  llmAssist = false,
}: {
  token: string;
  initialAnswers: Answers;
  countries: { code: string; name: string }[];
  llmAssist?: boolean;
}) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [freeText, setFreeText] = useState("");
  const [prefillState, setPrefillState] = useState<{ busy?: boolean; done?: boolean; error?: string }>({});

  const set = (k: keyof IntakeAnswers, v: string | string[]) =>
    setAnswers((a) => ({ ...a, [k]: v }));

  // Pré-remplissage IA (optionnel) : ne touche que les champs ENCORE VIDES —
  // les champs soumis tels quels resteront « À valider » au cockpit.
  const runPrefill = () => {
    setPrefillState({ busy: true });
    startTransition(async () => {
      const res = await prefillDiagnosticAction(token, freeText, SECTORS);
      if (!res.ok) {
        setPrefillState({ error: res.error });
        return;
      }
      setAnswers((a) => {
        const next = { ...a };
        const maybe = (k: keyof IntakeAnswers, v: string | string[] | undefined) => {
          if (v == null || (Array.isArray(v) ? v.length === 0 : !v.trim())) return;
          const cur = next[k];
          if (cur == null || (Array.isArray(cur) ? cur.length === 0 : !String(cur).trim())) {
            (next as Record<string, string | string[]>)[k] = v;
          }
        };
        maybe("brandName", res.prefill.brandName);
        maybe("city", res.prefill.city);
        maybe("online", res.prefill.online);
        if (res.prefill.sector && SECTORS.includes(res.prefill.sector)) maybe("sector", res.prefill.sector);
        maybe("histoire", res.prefill.histoire);
        maybe("valeurs", res.prefill.valeurs);
        maybe("preuves", res.prefill.preuves);
        maybe("canaux", res.prefill.canaux);
        maybe("rituels", res.prefill.rituels);
        maybe("communaute", res.prefill.communaute);
        return next;
      });
      setPrefillState({ done: true });
    });
  };

  const steps: StepDef[] = useMemo(
    () => [
      {
        id: "marque",
        title: "Votre marque",
        intro: "Les fondamentaux — c'est la seule étape entièrement obligatoire.",
        validate: (a) =>
          !a.brandName?.trim()
            ? "Le nom de la marque est requis."
            : !a.sector
              ? "Choisissez un secteur."
              : !a.country
                ? "Choisissez un pays."
                : null,
        fields: (a, s) => (
          <>
            <Field>
              <Label htmlFor="brandName">Nom de la marque *</Label>
              <Input id="brandName" value={a.brandName ?? ""} onChange={(e) => s("brandName", e.target.value)} placeholder="Ex. : Nyama Café" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="sector">Secteur *</Label>
                <Select id="sector" value={a.sector ?? ""} onChange={(e) => s("sector", e.target.value)}>
                  <option value="" disabled>Choisir…</option>
                  {SECTORS.map((sec) => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </Select>
              </Field>
              <Field>
                <Label htmlFor="country">Pays *</Label>
                <Select id="country" value={a.country ?? ""} onChange={(e) => s("country", e.target.value)}>
                  <option value="" disabled>Choisir…</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="city">Ville</Label>
                <Input id="city" value={a.city ?? ""} onChange={(e) => s("city", e.target.value)} placeholder="Ex. : Dakar" />
              </Field>
              <Field>
                <Label htmlFor="online">Présence en ligne</Label>
                <Input id="online" value={a.online ?? ""} onChange={(e) => s("online", e.target.value)} placeholder="Site, Instagram…" />
              </Field>
            </div>
          </>
        ),
      },
      {
        id: "authenticite",
        title: "Authenticité — qui êtes-vous vraiment ?",
        intro: "Racontez avec vos mots. Un champ vide vaut mieux qu'une réponse forcée.",
        fields: (a, s) => (
          <>
            <Field>
              <Label htmlFor="histoire">L&apos;histoire de la marque</Label>
              <FieldHint>D&apos;où vient-elle, qui l&apos;a fondée, pourquoi ?</FieldHint>
              <Textarea id="histoire" value={a.histoire ?? ""} onChange={(e) => s("histoire", e.target.value)} rows={5} />
            </Field>
            <Field>
              <Label htmlFor="valeurs">Vos valeurs</Label>
              <FieldHint>Une valeur par ligne (3 à 5 idéalement).</FieldHint>
              <Textarea id="valeurs" value={a.valeurs ?? ""} onChange={(e) => s("valeurs", e.target.value)} rows={4} placeholder={"Ex. :\nQualité artisanale\nFierté locale"} />
            </Field>
          </>
        ),
      },
      {
        id: "valeur",
        title: "Valeur — que vendez-vous ?",
        intro: "Votre offre, votre modèle, vos preuves.",
        fields: (a, s) => (
          <>
            <Field>
              <Label htmlFor="catalogue">Votre offre / catalogue</Label>
              <FieldHint>Produits, services, gammes — ce que le client peut acheter.</FieldHint>
              <Textarea id="catalogue" value={a.catalogue ?? ""} onChange={(e) => s("catalogue", e.target.value)} rows={4} />
            </Field>
            <Field>
              <Label htmlFor="business_model">Comment gagnez-vous de l&apos;argent ?</Label>
              <FieldHint>Sources de revenus, canaux de vente, logique de prix.</FieldHint>
              <Textarea id="business_model" value={a.business_model ?? ""} onChange={(e) => s("business_model", e.target.value)} rows={4} />
            </Field>
            <Field>
              <Label htmlFor="preuves">Vos preuves</Label>
              <FieldHint>Chiffres, témoignages, distinctions — ce qui prouve que ça marche.</FieldHint>
              <Textarea id="preuves" value={a.preuves ?? ""} onChange={(e) => s("preuves", e.target.value)} rows={3} />
            </Field>
          </>
        ),
      },
      {
        id: "distinction",
        title: "Distinction — pourquoi vous ?",
        intro: "Ce qui rend votre marque irremplaçable.",
        fields: (a, s) => (
          <>
            <Field>
              <Label htmlFor="positionnement">Votre positionnement</Label>
              <FieldHint>La place que vous occupez : pour qui, contre quoi, à la place de quoi.</FieldHint>
              <Textarea id="positionnement" value={a.positionnement ?? ""} onChange={(e) => s("positionnement", e.target.value)} rows={4} />
            </Field>
            <Field>
              <Label htmlFor="promesse_maitre">Votre promesse, en une phrase</Label>
              <Input id="promesse_maitre" value={a.promesse_maitre ?? ""} onChange={(e) => s("promesse_maitre", e.target.value)} placeholder="Ex. : Le meilleur café que tu aies bu, et il vient d'ici." />
            </Field>
            <Field>
              <Label htmlFor="personas">Vos publics prioritaires</Label>
              <FieldHint>Qui sont vos clients idéaux ? Que veulent-ils ?</FieldHint>
              <Textarea id="personas" value={a.personas ?? ""} onChange={(e) => s("personas", e.target.value)} rows={4} />
            </Field>
          </>
        ),
      },
      {
        id: "engagement",
        title: "Engagement — où vit votre audience ?",
        intro: "Vos canaux et l'état réel de votre communauté.",
        fields: (a, s) => (
          <>
            <fieldset>
              <legend className="text-sm font-medium">Vos canaux actifs</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {CHANNELS.map((c) => {
                  const list = a.canaux ?? [];
                  const checked = list.includes(c);
                  return (
                    <label key={c} className="flex cursor-pointer items-center gap-2 rounded-(--radius-sm) border border-line bg-surface-raised px-3 py-2 text-sm has-checked:border-accent has-checked:bg-accent-soft">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          s("canaux", e.target.checked ? [...list, c] : list.filter((x) => x !== c))
                        }
                        className="accent-(--accent)"
                      />
                      {c}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <Field>
              <Label htmlFor="rituels">Vos rendez-vous / rituels</Label>
              <FieldHint>Ce qui revient régulièrement : formats, événements, habitudes.</FieldHint>
              <Textarea id="rituels" value={a.rituels ?? ""} onChange={(e) => s("rituels", e.target.value)} rows={3} />
            </Field>
            <Field>
              <Label htmlFor="communaute">Votre communauté, honnêtement</Label>
              <FieldHint>Taille, lieux, animation — l&apos;état réel, pas l&apos;objectif.</FieldHint>
              <Textarea id="communaute" value={a.communaute ?? ""} onChange={(e) => s("communaute", e.target.value)} rows={3} />
            </Field>
          </>
        ),
      },
      {
        id: "contact",
        title: "Votre résultat",
        intro: "Votre score est prêt à être calculé.",
        validate: (a) =>
          !a.email?.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email)
            ? "Une adresse email valide est requise pour recevoir votre diagnostic."
            : null,
        fields: (a, s) => (
          <>
            <Field>
              <Label htmlFor="email">Votre email *</Label>
              <FieldHint>Pour retrouver votre diagnostic et activer votre espace ensuite.</FieldHint>
              <Input id="email" type="email" value={a.email ?? ""} onChange={(e) => s("email", e.target.value)} placeholder="vous@exemple.com" />
            </Field>
            <div className="rounded-(--radius-md) border border-line bg-surface-sunken/50 p-4 text-sm text-ink-muted">
              Le score est <strong className="text-ink">100 % déterministe</strong> : il mesure la complétude
              structurelle de vos réponses. Les champs laissés vides apparaîtront comme des axes de
              travail — jamais comme des données inventées.
            </div>
          </>
        ),
      },
    ],
    [countries],
  );

  const current = steps[step]!;
  const isLast = step === steps.length - 1;

  const goNext = () => {
    setError(null);
    const invalid = current.validate?.(answers);
    if (invalid) {
      setError(invalid);
      return;
    }
    startTransition(async () => {
      if (isLast) {
        const res = await submitDiagnostic(token, answers);
        if (res && !res.ok) setError(res.error);
        return;
      }
      const res = await saveDiagnosticStep(token, answers);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStep((s) => s + 1);
      window.scrollTo({ top: 0 });
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Progression */}
      <div className="flex items-center gap-1.5" aria-label={`Étape ${step + 1} sur ${steps.length}`}>
        {steps.map((s, i) => (
          <span
            key={s.id}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-line"}`}
            aria-hidden
          />
        ))}
      </div>
      <p className="mt-3 font-mono text-xs uppercase tracking-widest text-ink-faint">
        Étape {step + 1} / {steps.length}
      </p>
      <h1 className="mt-2 text-2xl font-semibold md:text-3xl">{current.title}</h1>
      <p className="mt-2 text-sm text-ink-muted">{current.intro}</p>

      {llmAssist && step === 0 && (
        <details className="mt-6 rounded-(--radius-md) border border-line bg-surface-raised p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Gagner du temps : pré-remplir depuis un texte libre (IA)
          </summary>
          <p className="mt-2 text-xs text-ink-muted">
            Collez votre bio, la page « à propos » de votre site, un pitch… L&apos;IA ne remplit que
            ce qui s&apos;y trouve vraiment, uniquement les champs vides — et tout champ pré-rempli
            restera marqué « à valider » tant que vous n&apos;y aurez pas retouché.
          </p>
          <Textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={5}
            className="mt-3"
            placeholder="Ex. : Nyama Café torréfie à Dakar des cafés d'Afrique…"
            aria-label="Texte libre à analyser"
          />
          <div className="mt-2 flex items-center gap-3">
            <Button type="button" size="sm" variant="outline" onClick={runPrefill} disabled={pending || prefillState.busy}>
              {prefillState.busy ? "Analyse…" : "Pré-remplir le questionnaire"}
            </Button>
            {prefillState.done && (
              <span className="text-xs font-medium text-success">
                Champs proposés — relisez chaque étape avant de valider.
              </span>
            )}
          </div>
          <FieldError>{prefillState.error}</FieldError>
        </details>
      )}

      <div className="mt-8 flex flex-col gap-5">
        {typeof current.fields === "function" ? current.fields(answers, set) : current.fields}
      </div>

      <FieldError>{error}</FieldError>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
          ← Retour
        </Button>
        <Button type="button" onClick={goNext} disabled={pending} size="lg">
          {pending ? "Enregistrement…" : isLast ? "Calculer mon score" : "Continuer"}
        </Button>
      </div>
    </div>
  );
}
