export type DemoRoleFacts = { role: string; elevated: boolean; memberships: boolean; businessWrite: boolean; privateRead: boolean; auditWrite: boolean };
export function assertDemoRole(facts: DemoRoleFacts | undefined) {
  if (!facts || facts.role !== "mystra_demo_app" || facts.elevated !== false || facts.memberships !== false || facts.businessWrite !== false || facts.privateRead !== false || facts.auditWrite !== false) throw new Error("DEMO_DATABASE_ROLE_NOT_RESTRICTED");
}
