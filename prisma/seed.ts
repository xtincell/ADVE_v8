// Seeds idempotents (cahier §11.4) : admin god-mode, canon UPgraders + La Fusée,
// pays/zones + grille tarifaire, jeu de démo complet — aucun écran vide à la première visite.
// Relançable sans dupliquer : `npm run db:seed`.

import { PrismaClient, type PillarKind, type Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { amendPillar } from "../src/server/brands/amend";
import { refreshRtisChain } from "../src/server/brands/rtis";
import { DEMO_BRAND, DEMO_INFERRED, LAFUSEE_CANON, UPGRADERS_CANON, type CanonBrand } from "./seed-canon";

const db = new PrismaClient();

const ADMIN_EMAIL = "xtincell@gmail.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Fusee!2026-admin";
const DEMO_PASSWORD = "demo1234";

// ─────────────────────────────────────────────── Référentiels

const COUNTRIES: [string, string, string, string, number][] = [
  // [code, nom, zone, devise, indice]
  ["SN", "Sénégal", "UEMOA", "XOF", 1.0],
  ["CI", "Côte d'Ivoire", "UEMOA", "XOF", 1.0],
  ["BJ", "Bénin", "UEMOA", "XOF", 0.9],
  ["BF", "Burkina Faso", "UEMOA", "XOF", 0.85],
  ["ML", "Mali", "UEMOA", "XOF", 0.85],
  ["NE", "Niger", "UEMOA", "XOF", 0.8],
  ["TG", "Togo", "UEMOA", "XOF", 0.9],
  ["GW", "Guinée-Bissau", "UEMOA", "XOF", 0.8],
  ["CM", "Cameroun", "CEMAC", "XAF", 1.0],
  ["GA", "Gabon", "CEMAC", "XAF", 1.1],
  ["CG", "Congo", "CEMAC", "XAF", 0.95],
  ["TD", "Tchad", "CEMAC", "XAF", 0.8],
  ["CF", "Centrafrique", "CEMAC", "XAF", 0.75],
  ["GQ", "Guinée équatoriale", "CEMAC", "XAF", 1.1],
  ["FR", "France", "DIASPORA", "EUR", 1.0],
  ["BE", "Belgique", "DIASPORA", "EUR", 1.0],
  ["CA", "Canada", "DIASPORA", "EUR", 1.0],
  ["US", "États-Unis", "DIASPORA", "EUR", 1.0],
  ["GB", "Royaume-Uni", "DIASPORA", "EUR", 1.0],
  ["MA", "Maroc", "OTHER", "XOF", 1.0],
  ["GN", "Guinée", "OTHER", "XOF", 0.85],
  ["CD", "RD Congo", "OTHER", "XOF", 0.85],
];

// Montants : FCFA entiers (XOF/XAF), centimes pour EUR. Ordres de grandeur cahier §6.2.
const PRICE_GRID: { tier: string; UEMOA: number; CEMAC: number; DIASPORA: number; OTHER: number }[] = [
  { tier: "INTAKE_FREE", UEMOA: 0, CEMAC: 0, DIASPORA: 0, OTHER: 0 },
  { tier: "INTAKE_PDF", UEMOA: 15_000, CEMAC: 15_000, DIASPORA: 2_500, OTHER: 15_000 },
  { tier: "ORACLE_FULL", UEMOA: 95_000, CEMAC: 95_000, DIASPORA: 14_500, OTHER: 95_000 },
  { tier: "COCKPIT_MONTHLY", UEMOA: 45_000, CEMAC: 45_000, DIASPORA: 6_900, OTHER: 45_000 },
  { tier: "RETAINER_BASE", UEMOA: 250_000, CEMAC: 250_000, DIASPORA: 38_000, OTHER: 250_000 },
  { tier: "RETAINER_PRO", UEMOA: 550_000, CEMAC: 550_000, DIASPORA: 84_000, OTHER: 550_000 },
  { tier: "RETAINER_ENTERPRISE", UEMOA: 0, CEMAC: 0, DIASPORA: 0, OTHER: 0 }, // 0 = sur devis
];

const ZONE_CURRENCY: Record<string, string> = { UEMOA: "XOF", CEMAC: "XAF", DIASPORA: "EUR", OTHER: "XOF" };

const SETTINGS: Record<string, unknown> = {
  "commission.rates": { APPRENTI: 0.3, COMPAGNON: 0.25, MAITRE: 0.2, ASSOCIE: 0.15 },
  "mcp.call_price": { amount: 100, currency: "XOF" },
  "manual_payment.duration_days": 30,
  "digest.weekday": 1, // lundi
};

async function seedOperator() {
  return db.operator.upsert({
    where: { slug: "upgraders" },
    update: {},
    create: { slug: "upgraders", name: "UPgraders" },
  });
}

async function seedCountries() {
  for (const [code, name, zone, currency, priceIndex] of COUNTRIES) {
    await db.country.upsert({
      where: { code },
      update: { name, zone, currency, priceIndex },
      create: { code, name, zone, currency, priceIndex },
    });
  }
}

async function seedPrices(operatorId: string) {
  for (const row of PRICE_GRID) {
    for (const zone of ["UEMOA", "CEMAC", "DIASPORA", "OTHER"] as const) {
      await db.priceRule.upsert({
        where: { operatorId_tier_zone: { operatorId, tier: row.tier as never, zone } },
        update: {},
        create: {
          operatorId,
          tier: row.tier as never,
          zone,
          amount: row[zone],
          currency: ZONE_CURRENCY[zone]!,
        },
      });
    }
  }
}

async function seedSettings(operatorId: string) {
  for (const [key, value] of Object.entries(SETTINGS)) {
    await db.setting.upsert({
      where: { operatorId_key: { operatorId, key } },
      update: {},
      create: { operatorId, key, value: value as Prisma.InputJsonValue },
    });
  }
}

async function seedUsers(operatorId: string) {
  const adminHash = await hash(ADMIN_PASSWORD, 10);
  const demoHash = await hash(DEMO_PASSWORD, 10);

  const admin = await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { operatorId },
    create: {
      email: ADMIN_EMAIL,
      name: "Alexandre (UPgraders)",
      passwordHash: adminHash,
      roles: ["ADMIN", "OPERATOR"],
      operatorId,
      country: "SN",
      emailVerified: new Date(),
    },
  });

  const founder = await db.user.upsert({
    where: { email: "fondateur@demo.test" },
    update: {},
    create: {
      email: "fondateur@demo.test",
      name: "Awa Cissé",
      passwordHash: demoHash,
      roles: ["FOUNDER"],
      operatorId,
      country: "SN",
      emailVerified: new Date(),
    },
  });

  const talent = await db.user.upsert({
    where: { email: "talent@demo.test" },
    update: {},
    create: {
      email: "talent@demo.test",
      name: "Moussa Diop",
      passwordHash: demoHash,
      roles: ["TALENT"],
      operatorId,
      country: "SN",
      emailVerified: new Date(),
    },
  });

  const agency = await db.user.upsert({
    where: { email: "agence@demo.test" },
    update: {},
    create: {
      email: "agence@demo.test",
      name: "Studio Baobab",
      passwordHash: demoHash,
      roles: ["AGENCY"],
      operatorId,
      country: "CI",
      emailVerified: new Date(),
    },
  });

  const pendingClient = await db.user.upsert({
    where: { email: "attente@demo.test" },
    update: {},
    create: {
      email: "attente@demo.test",
      name: "Binta Ndiaye",
      passwordHash: demoHash,
      roles: ["FOUNDER"],
      operatorId,
      country: "CI",
      emailVerified: new Date(),
    },
  });

  // Opérateur (rôle OPERATOR sans ADMIN) : accès Console sans exigence MFA — utile en démo/E2E.
  const ops = await db.user.upsert({
    where: { email: "ops@demo.test" },
    update: {},
    create: {
      email: "ops@demo.test",
      name: "Khadija Opératrice",
      passwordHash: demoHash,
      roles: ["OPERATOR"],
      operatorId,
      country: "SN",
      emailVerified: new Date(),
    },
  });

  return { admin, founder, talent, agency, pendingClient, ops };
}

async function seedBrandFromCanon(
  operatorId: string,
  canon: CanonBrand,
  opts: { founderId?: string; isDemo?: boolean; certainty?: "OFFICIAL" | "DECLARED" } = {},
) {
  const brand = await db.brand.upsert({
    where: { operatorId_slug: { operatorId, slug: canon.slug } },
    update: {},
    create: {
      operatorId,
      slug: canon.slug,
      name: canon.name,
      sector: canon.sector,
      country: canon.country,
      city: canon.city,
      founderId: opts.founderId,
      isDemo: opts.isDemo ?? false,
    },
  });

  const already = await db.pillar.count({ where: { brandId: brand.id, version: { gt: 0 } } });
  if (already > 0) return { brand, seededPillars: false };

  for (const [kind, fields] of Object.entries(canon.pillars)) {
    const changes = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        { value, certainty: (opts.certainty ?? "OFFICIAL") as never },
      ]),
    );
    await amendPillar({
      brandId: brand.id,
      kind: kind as PillarKind,
      changes,
      mode: "SEED",
      actor: { email: "seed@la-fusee" },
      note: "Seed canon",
    });
  }
  return { brand, seededPillars: true };
}

async function seedDemoWorld(operatorId: string, users: Awaited<ReturnType<typeof seedUsers>>) {
  // ── Marque démo (parcours réaliste, incomplète, avec champs INFERRED à valider)
  const { brand: nyama, seededPillars } = await seedBrandFromCanon(operatorId, DEMO_BRAND, {
    founderId: users.founder.id,
    isDemo: true,
    certainty: "DECLARED",
  });

  if (seededPillars) {
    for (const [kind, fields] of Object.entries(DEMO_INFERRED)) {
      const changes = Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [key, { value, certainty: "INFERRED" as never }]),
      );
      await amendPillar({
        brandId: nyama.id,
        kind: kind as PillarKind,
        changes,
        mode: "SEED",
        actor: { email: "seed@la-fusee" },
        note: "Seed démo — pré-remplissage à valider",
      });
    }
    // Signaux marché saisis manuellement (source MANUAL — honnête) pour nourrir le pilier T.
    await db.marketSignal.createMany({
      data: [
        {
          operatorId,
          brandId: nyama.id,
          sector: DEMO_BRAND.sector,
          source: "MANUAL",
          title: "La consommation de café de spécialité progresse dans les capitales ouest-africaines",
          summary: "Multiplication des coffee shops indépendants à Dakar et Abidjan observée par l'équipe terrain.",
        },
        {
          operatorId,
          brandId: nyama.id,
          sector: DEMO_BRAND.sector,
          source: "MANUAL",
          title: "Les marques food locales gagnent en visibilité face aux importés",
          summary: "Préférence croissante pour le « consommer local » chez les 25-40 ans urbains.",
        },
      ],
    });
    await refreshRtisChain(nyama.id, { email: "seed@la-fusee" });
  }

  // ── Communauté (Devotion Ladder) — saisie manual-first
  if ((await db.communityMember.count({ where: { brandId: nyama.id } })) === 0) {
    const members: [string, string, string][] = [
      ["Fatou Sarr", "EVANGELISTE", "Organise des dégustations chez elle, recrute des abonnés"],
      ["Ibrahima Fall", "EVANGELISTE", "Poste chaque semaine sur le café, amène des clients B2B"],
      ["Aïcha Koné", "AMBASSADEUR", "Partage systématiquement les nouveautés"],
      ["Omar Ba", "AMBASSADEUR", "A fait entrer Nyama dans son coworking"],
      ["Mariam Touré", "AMBASSADEUR", "Cliente fidèle, avis détaillés"],
      ["Cheikh Gueye", "ENGAGE", "Abonné mensuel, participe au groupe WhatsApp"],
      ["Adama Sy", "ENGAGE", "Abonnée, vient aux événements"],
      ["Khady Diallo", "ENGAGE", "Commande B2B régulière"],
      ["Seydou Traoré", "PARTICIPANT", "Achète au corner, suit sur Instagram"],
      ["Nafi Mbaye", "PARTICIPANT", "Commente les publications"],
      ["Lamine Sow", "PARTICIPANT", "Client occasionnel"],
      ["Rokhaya Faye", "INTERESSE", "Suit sur Instagram"],
      ["Modou Kane", "INTERESSE", "A goûté une fois au corner"],
      ["Astou Diagne", "SPECTATEUR", "Voit passer les publications"],
      ["Pape Ndour", "SPECTATEUR", "Connait la marque de nom"],
    ];
    await db.communityMember.createMany({
      data: members.map(([name, level, note]) => ({
        brandId: nyama.id,
        name,
        level: level as never,
        note,
        channel: "whatsapp",
      })),
    });
  }

  // ── Actions & demande (Cockpit Opérations)
  if ((await db.brandAction.count({ where: { brandId: nyama.id } })) === 0) {
    await db.brandAction.createMany({
      data: [
        {
          brandId: nyama.id,
          title: "Formuler la promesse maître et la tester sur 10 clients",
          pillarKind: "DISTINCTION",
          status: "DOING",
          dueAt: new Date(Date.now() + 14 * 86_400_000),
          createdById: users.founder.id,
        },
        {
          brandId: nyama.id,
          title: "Publier 5 preuves clients (avis, chiffres, photos)",
          pillarKind: "VALEUR",
          status: "TODO",
          dueAt: new Date(Date.now() + 30 * 86_400_000),
          createdById: users.founder.id,
        },
        {
          brandId: nyama.id,
          title: "Lancer le rituel « Cupping du samedi » au corner Kermel",
          pillarKind: "ENGAGEMENT",
          status: "TODO",
          dueAt: new Date(Date.now() + 45 * 86_400_000),
          createdById: users.founder.id,
        },
      ],
    });
  }
  if ((await db.brandRequest.count({ where: { brandId: nyama.id } })) === 0) {
    await db.brandRequest.create({
      data: {
        brandId: nyama.id,
        authorId: users.founder.id,
        subject: "Shooting produit pour le lancement de la 3e origine",
        message:
          "Nous lançons une origine Éthiopie en septembre. Besoin d'un shooting produit + 3 visuels réseaux. Budget indicatif 150 000 FCFA.",
        status: "OPEN",
      },
    });
  }

  // ── Guilde : profils + missions + candidature
  const talentProfile = await db.talentProfile.upsert({
    where: { userId: users.talent.id },
    update: {},
    create: {
      userId: users.talent.id,
      operatorId,
      headline: "Directeur artistique & motion designer",
      bio: "10 ans entre Dakar et Abidjan. Identités visuelles, motion, direction de shooting. J'aime les marques qui assument.",
      skills: ["Direction artistique", "Identité visuelle", "Motion design", "Photographie"],
      portfolio: [
        { title: "Identité Woyofal Market", url: "https://example.com/woyofal" },
        { title: "Motion Fest'Africa", url: "https://example.com/festafrica" },
      ],
      country: "SN",
      city: "Dakar",
      tier: "COMPAGNON",
      available: true,
    },
  });

  await db.agencyProfile.upsert({
    where: { userId: users.agency.id },
    update: {},
    create: {
      userId: users.agency.id,
      operatorId,
      name: "Studio Baobab",
      description: "Agence créative indépendante à Abidjan — brand content, social media, événementiel.",
      services: ["Brand content", "Social media", "Événementiel"],
      country: "CI",
      website: "https://example.com/studio-baobab",
    },
  });

  const missionsSeed = [
    {
      slug: "identite-visuelle-sira-mode",
      title: "Identité visuelle complète pour une marque de mode émergente",
      summary: "Sira Mode cherche un(e) DA pour créer son identité : logo, palette, typographies, brand book.",
      brief: {
        contexte: "Marque de prêt-à-porter féminin lancée à Abidjan, première collection en précommande.",
        objectifs: ["Identité mémorable et déclinable", "Brand book utilisable par des prestataires"],
        livrables: ["Logo + variantes", "Palette & typographies", "Brand book PDF 20 pages"],
        contraintes: "Livraison sous 6 semaines, 2 allers-retours inclus.",
      },
      skills: ["Direction artistique", "Identité visuelle"],
      sector: "Mode",
      country: "CI",
      budgetMin: 350_000,
      budgetMax: 600_000,
      status: "PUBLISHED" as const,
      shellBrand: { slug: "sira-mode", name: "Sira Mode", sector: "Mode", country: "CI" },
      contactName: "Mariame Sylla",
      contactEmail: "mariame@sira-mode.test",
    },
    {
      slug: "video-lancement-nyama-cafe",
      title: "Campagne de lancement vidéo — café de spécialité",
      summary: "Nyama Café lance sa 3e origine : besoin d'une vidéo hero 45s + 6 déclinaisons verticales.",
      brief: {
        contexte: "Torréfacteur artisanal à Dakar, lancement origine Éthiopie en septembre.",
        objectifs: ["Vidéo hero 45s", "Déclinaisons stories/reels"],
        livrables: ["1 master 16:9", "6 verticales 9:16", "Pack photos"],
        contraintes: "Tournage au corner Kermel, produit disponible dès août.",
      },
      skills: ["Vidéo", "Montage", "Direction photo"],
      sector: "Food & boissons",
      country: "SN",
      budgetMin: 250_000,
      budgetMax: 400_000,
      status: "PUBLISHED" as const,
      brandSlug: "nyama-cafe",
      contactName: "Awa Cissé",
      contactEmail: "fondateur@demo.test",
    },
    {
      slug: "refonte-site-teranga-suites",
      title: "Refonte du site vitrine d'un hôtel boutique",
      summary: "Teranga Suites (Saly) veut un site sobre, rapide, réservable par WhatsApp.",
      brief: {
        contexte: "Hôtel boutique 12 chambres à Saly, clientèle diaspora et locale.",
        objectifs: ["Site vitrine 5 pages", "Intégration réservation WhatsApp"],
        livrables: ["Maquettes", "Site en production", "Guide d'édition"],
        contraintes: "Mobile-first, photos existantes fournies.",
      },
      skills: ["Web design", "Développement web"],
      sector: "Hôtellerie",
      country: "SN",
      budgetMin: 400_000,
      budgetMax: 700_000,
      status: "PENDING_REVIEW" as const,
      shellBrand: { slug: "teranga-suites", name: "Teranga Suites", sector: "Hôtellerie", country: "SN" },
      contactName: "Jean-Pierre Mendy",
      contactEmail: "jp@teranga-suites.test",
    },
  ];

  for (const m of missionsSeed) {
    const existing = await db.mission.findUnique({ where: { slug: m.slug } });
    if (existing) continue;

    let brandId: string | undefined;
    if ("brandSlug" in m && m.brandSlug) {
      const b = await db.brand.findUnique({ where: { operatorId_slug: { operatorId, slug: m.brandSlug } } });
      brandId = b?.id;
    } else if ("shellBrand" in m && m.shellBrand) {
      const shell = await db.brand.upsert({
        where: { operatorId_slug: { operatorId, slug: m.shellBrand.slug } },
        update: {},
        create: {
          operatorId,
          slug: m.shellBrand.slug,
          name: m.shellBrand.name,
          sector: m.shellBrand.sector,
          country: m.shellBrand.country,
          isShell: true,
          isDemo: true,
        },
      });
      brandId = shell.id;
    }

    const mission = await db.mission.create({
      data: {
        operatorId,
        brandId,
        slug: m.slug,
        title: m.title,
        summary: m.summary,
        brief: m.brief as Prisma.InputJsonValue,
        skills: m.skills,
        sector: m.sector,
        country: m.country,
        budgetMin: m.budgetMin,
        budgetMax: m.budgetMax,
        currency: "XOF",
        contactName: m.contactName,
        contactEmail: m.contactEmail,
        status: m.status,
        publishedAt: m.status === "PUBLISHED" ? new Date() : null,
        isDemo: true,
      },
    });

    if (m.slug === "identite-visuelle-sira-mode") {
      await db.missionApplication.create({
        data: {
          missionId: mission.id,
          talentId: users.talent.id,
          status: "SUBMITTED",
          message:
            "Bonjour, DA basé à Dakar avec plusieurs identités mode à mon actif. Je propose une immersion de 2 jours à Abidjan pour cadrer l'univers avant toute exécution.",
          quote: {
            lignes: [
              { label: "Recherche & moodboards", amount: 120_000 },
              { label: "Logo + variantes", amount: 180_000 },
              { label: "Brand book 20 pages", amount: 150_000 },
            ],
            delaiJours: 40,
            conditions: "50 % à la commande, 50 % à la livraison.",
          } as Prisma.InputJsonValue,
          quoteAmount: 450_000,
        },
      });
    }
  }

  // ── Abonnements : un ACTIF (gates premium visibles) + un EN ATTENTE (file de validation Console)
  const activeSub = await db.subscription.findFirst({
    where: { userId: users.founder.id, tier: "COCKPIT_MONTHLY", status: "ACTIVE" },
  });
  if (!activeSub) {
    const sub = await db.subscription.create({
      data: {
        operatorId,
        userId: users.founder.id,
        brandId: nyama.id,
        tier: "COCKPIT_MONTHLY",
        status: "ACTIVE",
        provider: "MANUAL_WHATSAPP",
        currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
        validatedAt: new Date(),
      },
    });
    const payment = await db.payment.create({
      data: {
        operatorId,
        userId: users.founder.id,
        brandId: nyama.id,
        subscriptionId: sub.id,
        tier: "COCKPIT_MONTHLY",
        provider: "MANUAL_WHATSAPP",
        amount: 45_000,
        currency: "XOF",
        status: "SUCCEEDED",
        validatedAt: new Date(),
      },
    });
    await db.invoice.create({
      data: {
        number: "FUS-2026-000001",
        operatorId,
        paymentId: payment.id,
        toName: users.founder.name ?? "Client",
        toEmail: users.founder.email,
        lines: [{ label: "Cockpit — abonnement mensuel", amount: 45_000 }] as Prisma.InputJsonValue,
        amount: 45_000,
        currency: "XOF",
      },
    });
  }

  // Le founder démo a acheté l'Oracle (one-shot) — la génération est débloquée pour Nyama.
  const oraclePaid = await db.payment.findFirst({
    where: { userId: users.founder.id, tier: "ORACLE_FULL", status: "SUCCEEDED" },
  });
  if (!oraclePaid) {
    await db.payment.create({
      data: {
        operatorId,
        userId: users.founder.id,
        brandId: nyama.id,
        tier: "ORACLE_FULL",
        provider: "MANUAL_WHATSAPP",
        amount: 95_000,
        currency: "XOF",
        status: "SUCCEEDED",
        validatedAt: new Date(),
      },
    });
  }

  const pendingSub = await db.subscription.findFirst({
    where: { userId: users.pendingClient.id, status: "PENDING_MANUAL" },
  });
  if (!pendingSub) {
    const sub = await db.subscription.create({
      data: {
        operatorId,
        userId: users.pendingClient.id,
        tier: "COCKPIT_MONTHLY",
        status: "PENDING_MANUAL",
        provider: "MANUAL_WHATSAPP",
      },
    });
    await db.payment.create({
      data: {
        operatorId,
        userId: users.pendingClient.id,
        subscriptionId: sub.id,
        tier: "COCKPIT_MONTHLY",
        provider: "MANUAL_WHATSAPP",
        amount: 45_000,
        currency: "XOF",
        status: "PENDING",
      },
    });
  }

  // ── Notifications de démo pour le founder
  if ((await db.notification.count({ where: { userId: users.founder.id } })) === 0) {
    await db.notification.createMany({
      data: [
        {
          userId: users.founder.id,
          type: "SYSTEM",
          title: "Bienvenue dans le Cockpit",
          body: "Votre marque Nyama Café est prête. Complétez vos piliers pour faire décoller votre score.",
          href: "/cockpit",
        },
        {
          userId: users.founder.id,
          type: "SCORE_UPDATED",
          title: "Score mis à jour",
          body: "Le score de Nyama Café a été recalculé après vos derniers amendements.",
          href: "/cockpit/marque",
        },
      ],
    });
  }

  return { nyama, talentProfile };
}

async function main() {
  console.log("── Seed La Fusée v2 (idempotent)");
  const operator = await seedOperator();
  await seedCountries();
  await seedPrices(operator.id);
  await seedSettings(operator.id);
  const users = await seedUsers(operator.id);

  const up = await seedBrandFromCanon(operator.id, UPGRADERS_CANON, { founderId: users.admin.id });
  if (up.seededPillars) await refreshRtisChain(up.brand.id, { email: "seed@la-fusee" });

  const lf = await seedBrandFromCanon(operator.id, LAFUSEE_CANON, { founderId: users.admin.id });
  if (lf.seededPillars) await refreshRtisChain(lf.brand.id, { email: "seed@la-fusee" });

  await seedDemoWorld(operator.id, users);

  const [brands, countries, prices, missions] = await Promise.all([
    db.brand.count(),
    db.country.count(),
    db.priceRule.count(),
    db.mission.count(),
  ]);
  console.log(`✓ Opérateur : ${operator.name}`);
  console.log(`✓ ${brands} marques (canon + démo), ${countries} pays, ${prices} règles de prix, ${missions} missions`);
  console.log(`✓ Admin god-mode : ${ADMIN_EMAIL} (mot de passe : ${process.env.SEED_ADMIN_PASSWORD ? "SEED_ADMIN_PASSWORD" : ADMIN_PASSWORD})`);
  console.log(`✓ Comptes démo : fondateur@demo.test / talent@demo.test / agence@demo.test (mot de passe : ${DEMO_PASSWORD})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
