import { useEffect, useState } from "react";
// "Lägg på hemskärmen": Chrome/Edge/Samsung Internet offer a real install prompt (only over https),
// Safari on iPad/iPhone needs the Share menu. We catch the prompt early, before React starts.
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    listeners.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((f) => f());
  });
}

export function onInstallChange(f: () => void) {
  listeners.add(f);
  return () => listeners.delete(f);
}

export const canPrompt = () => deferred !== null;

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const p = deferred;
  deferred = null;
  await p.prompt();
  const { outcome } = await p.userChoice;
  listeners.forEach((f) => f());
  return outcome === "accepted";
}

/** Already opened from the home screen (no browser bars). */
export function isInstalled(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export type Platform = "ios" | "android" | "desktop";
export function platform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch points give it away.
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

/** Inside Home Assistant's ingress frame an install would install Home Assistant, not the board. */
export function inIngress(): boolean {
  return location.pathname.includes("/hassio_ingress/") || window.self !== window.top;
}

/**
 * The board's https address (same certificate as Home Assistant), when the server has one and this
 * page is plain http: there Chrome can install it as a real app. null otherwise.
 */
export function useSecureUrl(api: { secureUrl?: () => Promise<{ url: string | null }> }): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (window.isSecureContext && location.protocol === "https:") return;
    let live = true;
    api
      .secureUrl?.()
      .then((r) => live && setUrl(r.url ? `${r.url}${location.hash}` : null))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [api]);
  return url;
}
