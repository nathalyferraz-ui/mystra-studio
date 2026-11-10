"use client";
import { AdminErrorState } from "@/components/admin/primitives";
export default function Error({ retry }: { error: unknown; retry: () => void }) { return <AdminErrorState retry={retry} />; }
