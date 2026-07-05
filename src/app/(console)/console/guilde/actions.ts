"use server";

import { revalidatePath } from "next/cache";
import { requireAdminWithMfa } from "@/server/auth/guards";
import { decideApplication, moderateMission } from "@/server/guild";

export async function moderateMissionAction(formData: FormData): Promise<void> {
  const actor = await requireAdminWithMfa("/console/guilde");
  const missionId = String(formData.get("missionId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  if (decision !== "publish" && decision !== "reject") return;
  await moderateMission(missionId, decision, { id: actor.id, email: actor.email, operatorId: actor.operatorId }, reason);
  revalidatePath("/console/guilde");
  revalidatePath("/guilde");
}

export async function decideApplicationAction(formData: FormData): Promise<void> {
  const actor = await requireAdminWithMfa("/console/guilde");
  const applicationId = String(formData.get("applicationId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "SHORTLISTED" && decision !== "ACCEPTED" && decision !== "REJECTED") return;
  await decideApplication(applicationId, decision, { id: actor.id, email: actor.email, operatorId: actor.operatorId });
  revalidatePath("/console/guilde");
}
