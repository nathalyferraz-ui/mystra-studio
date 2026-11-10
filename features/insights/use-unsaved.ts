"use client";
import { useEffect } from "react";
export function useUnsavedChanges(dirty: boolean, saving: boolean) {
  useEffect(() => {
    if (!dirty || saving) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const followLink = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") as HTMLAnchorElement | null : null;
      if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === "_blank" || link.hasAttribute("download")) return;
      const destination = new URL(link.href, location.href);
      if (destination.origin === location.origin && destination.pathname === location.pathname && destination.search === location.search) return;
      if (!window.confirm("Há alterações não salvas. Deseja sair sem salvar?")) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", followLink, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", followLink, true); };
  }, [dirty, saving]);
}
