import { demoMarkerKey } from "./environment";
export { demoMarkerKey };
export function assertDemoMarker(value: unknown, projectRef: string) {
  const marker = value as Record<string, unknown> | null;
  if (!marker || marker.environment !== "demo" || marker.projectRef !== projectRef || marker.syntheticOnly !== true || marker.version !== 1 || typeof marker.instanceId !== "string" || !/^[0-9a-f-]{36}$/i.test(marker.instanceId) || typeof marker.preparedAt !== "string" || !Number.isFinite(Date.parse(marker.preparedAt))) throw new Error("DEMO_DATABASE_NOT_PREPARED");
}
