import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { marked } from "marked";

// Blog léger (cahier §4.1) : articles markdown dans content/blog/, zéro table,
// zéro CMS. L'opérateur publie en commitant un fichier .md avec un front-matter
// minimal (title / date / description).

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  html: string;
}

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { meta, body: raw.slice(match[0].length) };
}

export function listPosts(): BlogPost[] {
  let files: string[];
  try {
    files = readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  return files
    .map((file) => {
      const raw = readFileSync(path.join(BLOG_DIR, file), "utf8");
      const { meta, body } = parseFrontmatter(raw);
      return {
        slug: file.replace(/\.md$/, ""),
        title: meta.title ?? file,
        date: meta.date ?? "",
        description: meta.description ?? "",
        html: marked.parse(body, { async: false }),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): BlogPost | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  return listPosts().find((p) => p.slug === slug) ?? null;
}
