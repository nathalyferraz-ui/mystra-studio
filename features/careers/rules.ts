export function jobAcceptsApplications(job: { status: string; publishedAt: Date | null; deadline: Date | null }, now = new Date()) { return job.status === "PUBLISHED" && !!job.publishedAt && job.publishedAt <= now && (!job.deadline || job.deadline > now); }
export function canReadApplications(user: AccessUser) { return hasPermission(user, "recruitment:manage"); }
import { hasPermission, type AccessUser } from "@/lib/permissions";
