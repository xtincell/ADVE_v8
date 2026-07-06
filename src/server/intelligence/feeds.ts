import "server-only";
import { XMLParser } from "fast-xml-parser";
import { db } from "@/server/db";

// Feeds externes RÉELS (cahier §8) : presse sectorielle via RSS Google News,
// indicateurs macro via l'API publique World Bank. Jamais de donnée fabriquée :
// pas de réponse → pas de signal.

const parser = new XMLParser({ ignoreAttributes: false });

async function fetchGoogleNewsRss(query: string): Promise<{ title: string; url: string; publishedAt: Date | null }[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=fr&gl=SN&ceid=SN:fr`;
  const res = await fetch(url, { headers: { "User-Agent": "LaFusee/2.0 (veille sectorielle)" } });
  if (!res.ok) return [];
  const xml = await res.text();
  const doc = parser.parse(xml) as { rss?: { channel?: { item?: unknown } } };
  const items = doc.rss?.channel?.item;
  const list = Array.isArray(items) ? items : items ? [items] : [];
  return list.slice(0, 5).map((raw) => {
    const item = raw as { title?: string; link?: string; pubDate?: string };
    return {
      title: String(item.title ?? "").slice(0, 300),
      url: String(item.link ?? ""),
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    };
  }).filter((i) => i.title && i.url);
}

interface WorldBankPoint {
  indicator: string;
  label: string;
  country: string;
  year: string;
  value: number;
}

async function fetchWorldBank(countryCodes: string[]): Promise<WorldBankPoint[]> {
  // Indicateur de croissance PIB (NY.GDP.MKTP.KD.ZG) — API publique, sans clé.
  const out: WorldBankPoint[] = [];
  for (const code of countryCodes) {
    const res = await fetch(
      `https://api.worldbank.org/v2/country/${code}/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=1&mrnev=1`,
    );
    if (!res.ok) continue;
    const data = (await res.json()) as [unknown, { country?: { value?: string }; date?: string; value?: number | null }[]?];
    const point = data[1]?.[0];
    if (point?.value != null) {
      out.push({
        indicator: "NY.GDP.MKTP.KD.ZG",
        label: "Croissance du PIB (%)",
        country: point.country?.value ?? code,
        year: point.date ?? "",
        value: Math.round(point.value * 10) / 10,
      });
    }
  }
  return out;
}

/** Rafraîchit les signaux des marques actives (cron `signals`). */
export async function refreshMarketSignals(): Promise<{ fetched: number }> {
  const operator = await db.operator.findFirst();
  if (!operator) return { fetched: 0 };
  const brands = await db.brand.findMany({
    where: { operatorId: operator.id, isShell: false, sector: { not: null } },
    select: { id: true, sector: true, country: true },
  });

  let fetched = 0;
  const seenSectors = new Set<string>();

  for (const brand of brands) {
    const sector = brand.sector!;
    // Presse par secteur (une requête par secteur distinct, réutilisée entre marques).
    if (!seenSectors.has(sector)) {
      seenSectors.add(sector);
      const news = await fetchGoogleNewsRss(`${sector} Afrique`);
      for (const n of news) {
        const exists = await db.marketSignal.findFirst({
          where: { operatorId: operator.id, source: "RSS_NEWS", url: n.url },
        });
        if (exists) continue;
        await db.marketSignal.create({
          data: {
            operatorId: operator.id,
            sector,
            source: "RSS_NEWS",
            title: n.title,
            url: n.url,
            publishedAt: n.publishedAt,
          },
        });
        fetched++;
      }
    }
  }

  // Macro World Bank : un point par pays distinct des marques actives.
  const countries = [...new Set(brands.map((b) => b.country).filter((c): c is string => !!c))];
  const macro = await fetchWorldBank(countries);
  for (const point of macro) {
    const title = `${point.label} — ${point.country} : ${point.value} % (${point.year})`;
    const exists = await db.marketSignal.findFirst({
      where: { operatorId: operator.id, source: "WORLD_BANK", title },
    });
    if (exists) continue;
    await db.marketSignal.create({
      data: {
        operatorId: operator.id,
        source: "WORLD_BANK",
        title,
        data: point as unknown as import("@prisma/client").Prisma.InputJsonValue,
        publishedAt: new Date(`${point.year}-12-31`),
      },
    });
    fetched++;
  }

  return { fetched };
}
