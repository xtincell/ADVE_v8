import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/guards";

// Aiguillage post-connexion : chaque rôle atterrit sur sa surface.
export default async function ApresConnexionPage() {
  const user = await requireUser();
  if (user.roles.includes("ADMIN") || user.roles.includes("OPERATOR")) redirect("/console");
  if (user.roles.includes("TALENT")) redirect("/creator");
  if (user.roles.includes("AGENCY")) redirect("/agency");
  redirect("/cockpit");
}
