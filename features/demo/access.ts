import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { isDemoEnvironment } from "@/lib/environment";
export async function requireDemoViewer() {
  if (!isDemoEnvironment()) notFound();
  const user = await requireUser();
  if (!hasPermission(user, "demo:explore")) notFound();
  return user;
}
