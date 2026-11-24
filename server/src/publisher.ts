import { choresForToday } from "./chores.js";
import type { FastifyBaseLogger } from "fastify";
import { fetchWithTimeout } from "./http.js";
import { haConnection } from "./connectors/ha.js";
import { custodyStatus } from "./custody.js";
import { collectWaste } from "./sources.js";
import { loadConfig } from "./store.js";
import { daysBetween, dayKey, startOfDay } from "./time.js";

/**
 * Feed the board's computed knowledge back into Home Assistant, so automations can use it:
 *   sensor.familjetavla_barnvecka_<namn>  hemma | borta  (attr: next_change, days_left)
 *   sensor.familjetavla_sysslor_<namn>      klart | <n> kvar  (attr: done, total, remaining) – t.ex. för att låsa tv:n tills sysslorna är gjorda
 *   sensor.familjetavla_nasta_sophamtning <datum>        (attr: type, days)
 * States set via POST /api/states vanish on HA restart, so they are re-sent every 10 minutes.
 */
export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

async function setState(entityId: string, state: string, attributes: Record<string, unknown>) {
  const conn = haConnection();
  if (!conn) return;
  const res = await fetchWithTimeout(`${conn.base}/states/${entityId}`, {
    method: "POST",
    timeoutMs: 10_000,
    headers: { authorization: `Bearer ${conn.token}`, "content-type": "application/json" },
    body: JSON.stringify({ state, attributes }),
  });
  if (!res.ok) throw new Error(`HA svarade ${res.status} för ${entityId}`);
}

export async function publishToHa() {
  const cfg = loadConfig();
  if (!haConnection() || !cfg.setupComplete) return;
  const now = new Date();
  for (const p of cfg.people.filter((x) => x.kind === "child" && x.name)) {
    const st = custodyStatus(p.custody, now);
    await setState(`sensor.familjetavla_barnvecka_${slug(p.name)}`, st.home ? "hemma" : "borta", {
      friendly_name: `${p.name} barnvecka`,
      icon: st.home ? "mdi:home-account" : "mdi:home-export-outline",
      next_change: st.nextChange ? dayKey(st.nextChange) : null,
      days_left: st.daysLeft,
    });
  }
  for (const c of choresForToday(cfg.people, now)) {
    const left = c.items.filter((i) => !i.done);
    await setState(`sensor.familjetavla_sysslor_${slug(c.name)}`, left.length ? `${left.length} kvar` : "klart", {
      friendly_name: `${c.name} sysslor`,
      icon: left.length ? "mdi:broom" : "mdi:check-circle",
      done: c.items.length - left.length,
      total: c.items.length,
      remaining: left.map((i) => i.title),
    });
  }
  const waste = await collectWaste(cfg, []);
  const next = waste.find((w) => w.date >= startOfDay(now));
  if (next) {
    await setState("sensor.familjetavla_nasta_sophamtning", dayKey(next.date), {
      friendly_name: "Nästa sophämtning",
      icon: "mdi:trash-can",
      device_class: "date",
      type: next.type,
      days: daysBetween(now, next.date),
    });
  }
}

export function startPublisher(log: FastifyBaseLogger) {
  const run = () => publishToHa().catch((e) => log.warn(`Kunde inte skicka sensorer till HA: ${(e as Error).message}`));
  setTimeout(run, 15_000);
  return setInterval(run, 10 * 60_000);
}
