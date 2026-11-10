import { Braces, Fingerprint, Globe, Orbit } from "lucide-react";

const icons = { code: Braces, design: Fingerprint, strategy: Orbit, web: Globe };

export function ServiceIcon({ name, size = 32 }: { name: string | null; size?: number }) {
  const Icon = icons[name as keyof typeof icons] ?? Orbit;
  return <Icon size={size} strokeWidth={1.15} aria-hidden="true" />;
}
