// The board against a real Home Assistant (HA_URL + HA_TOKEN). Run only from the PRIVATE test repo:
// it lists what the board finds in that home. It only reads – nothing is switched or started.
// Writes a Markdown report to $REPORT (default ha-report.md); exit 1 if something the board needs fails.
// Same time zone as the app (server/src/index.ts), so "today" starts at Swedish midnight.
process.env.TZ ??= "Europe/Stockholm";
import { writeFileSync } from "node:fs";
import { ha, haConnection } from "../server/dist/connectors/ha.js";
import { carCharging, discover, readRegistry } from "../server/dist/discovery.js";
import { initHaSocket } from "../server/dist/connectors/haws.js";
import { energyNow, energyToday, todaySeries } from "../server/dist/energy.js";

const url = process.env.HA_URL;
const token = process.env.HA_TOKEN;
if (!url || !token) {
  console.log("HA_URL/HA_TOKEN saknas – hoppar över.");
  process.exit(0);
}
const conn = haConnection({ url, token });
const ok = [];
const problems = [];
async function check(name, fn) {
  try {
    ok.push(`**${name}:** ${await fn()}`);
  } catch (e) {
    problems.push(`**${name}:** ${e.message}`);
  }
}

let states = [];
let all = [];
await check("Anslutning", async () => {
  await ha.ping(conn);
  states = await ha.states(conn);
  const cfg = await fetch(`${url.replace(/\/+$/, "")}/api/config`, { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json());
  return `Home Assistant ${cfg.version ?? "?"}, ${states.length} entiteter`;
});
if (!states.length) {
  writeFileSync(process.env.REPORT ?? "ha-report.md", `## Behöver ses över\n${problems.map((p) => `- ${p}`).join("\n")}\n`);
  console.log(problems.join("\n"));
  process.exit(1);
}

// The board reads the registry over the websocket when it is connected, else in parts over REST.
await check("Register via REST (reserv)", async () => {
  const viaRest = await readRegistry(conn);
  return `${viaRest.length} entiteter, ${viaRest.filter((x) => x.d).length} med enhet, ${viaRest.filter((x) => x.a).length} med rum`;
});
const quiet = { info() {}, warn() {}, error() {}, debug() {}, trace() {}, fatal() {}, child() { return quiet; } };
const sock = initHaSocket(quiet);
sock.start(conn);
for (let i = 0; i < 40 && !(sock.connected && sock.states.size); i++) await new Promise((r) => setTimeout(r, 250));
await check("Register via websocket", async () => {
  if (!sock.connected) throw new Error("websocket ansluter inte – kontrollera att adressen tillåter websocket (wss://…/api/websocket)");
  all = await readRegistry(conn);
  return `${all.length} entiteter, ${all.filter((x) => x.d).length} med enhet, ${all.filter((x) => x.a).length} med rum`;
});
if (!all.length) all = await readRegistry(conn).catch(() => []);

const found = all.length ? discover(all) : null;
const byDomain = (d) => states.filter((s) => s.entity_id.startsWith(`${d}.`));

await check("Lampor", async () => {
  const lights = byDomain("light");
  const off = lights.filter((s) => s.state === "unavailable").length;
  const dim = lights.filter((s) => (s.attributes.supported_color_modes ?? []).some((m) => m !== "onoff")).length;
  const groups = found?.lightGroups ?? [];
  return `${lights.length} lampor (${dim} dimbara, ${off} otillgängliga), ${groups.length} rum/grupper: ${groups.map((g) => `${g.name} (${g.entities.length})`).join(", ") || "-"}`;
});

await check("Högtalare (Musik)", async () => {
  const players = byDomain("media_player");
  const picked = found?.speakers ?? [];
  const skipped = players.filter((s) => !picked.some((p) => p.entityId === s.entity_id));
  // Read only: what kind of player each is and what it can do – nothing is played.
  const kind = (s) => {
    const x = all.find((y) => y.e === s.entity_id);
    return `${s.entity_id} (${s.state}${x?.m ? `, ${x.m}` : ""}${s.attributes.device_class ? `, ${s.attributes.device_class}` : ""})`;
  };
  return `${players.length} mediaspelare. Föreslås: ${picked.map((p) => `${p.name} = ${kind(players.find((s) => s.entity_id === p.entityId))}`).join("; ") || "-"}. Hoppas över: ${skipped.map(kind).join("; ") || "-"}`;
});

await check("Bilar", async () => {
  const cars = found?.cars ?? [];
  if (!cars.length) return "inga bilar hittade";
  return cars
    .map((c) => {
      const ents = all.filter((x) => x.d && x.d === all.find((y) => y.e === c.battery)?.d);
      const ch = carCharging(ents, c.deviceName);
      const how = ch.switch ? `laddknapp (${ch.switch.name}, ${ch.switch.on ? "laddar" : "laddar inte"})` : ch.start || ch.stop ? `start/stopp-knappar` : "ingen laddknapp";
      return `${c.name}: batteri ${states.find((s) => s.entity_id === c.battery)?.state ?? "?"} %, ${how}, laddschema ${ch.schedule.length} st${ch.schedule.length ? ` (${ch.schedule.map((s) => `${s.name}=${s.value}`).join(", ")})` : ""}`;
    })
    .join("; ");
});

await check("Dammsugare", async () => {
  const vs = found?.vacuums ?? [];
  if (!vs.length) return "inga dammsugare hittade";
  const { rawRooms, placeRooms, roomCalls } = await import("../server/dist/vacuum.js");
  // Read only: what the board would offer – nothing is started.
  return vs
    .map((v) => {
      const map = states.find((s) => s.entity_id === v.map);
      const vac = states.find((s) => s.entity_id === v.entityId);
      const raw = rawRooms(map?.attributes, vac?.attributes);
      const rooms = placeRooms(raw, map?.attributes?.calibration_points);
      const cleaning = roomCalls(v.brand, v.entityId, raw, raw.map((r) => r.id)).length > 0;
      return `${v.name}: ${vac?.state}, märke ${v.brand ?? "okänt"}, karta ${v.map ?? "saknas"}, ${rooms.length} rum (${rooms.filter((r) => r.box).length} placerade på kartan), rumsstädning ${cleaning ? "ja" : "nej"}, ${v.sensors?.length ?? 0} värden, ${v.controls?.length ?? 0} inställningar`;
    })
    .join("; ");
});

await check("Kalendrar", async () => {
  const cals = byDomain("calendar");
  const now = new Date();
  const to = new Date(now.getTime() + 7 * 86_400_000);
  const rows = [];
  for (const c of cals.slice(0, 15)) {
    let err = "";
    const evs = await ha.calendarEvents(conn, c.entity_id, now, to).catch((e) => ((err = e.message), null));
    rows.push(evs ? `${c.attributes.friendly_name ?? c.entity_id}: ${evs.length} händelser (${evs.filter((e) => e.description).length} med anteckningar)` : `${c.entity_id} (${c.state}): ${err}`);
  }
  return `${cals.length} kalendrar – ${rows.join("; ") || "-"}`;
});

await check("Inköpslistor", async () => {
  const lists = byDomain("todo");
  const rows = [];
  for (const l of lists.slice(0, 5)) {
    const items = await ha.todoItems(conn, l.entity_id).catch(() => null);
    rows.push(items ? `${l.attributes.friendly_name ?? l.entity_id}: ${items.filter((i) => i.status === "needs_action").length} kvar` : `${l.entity_id}: kunde inte läsas`);
  }
  return rows.join("; ") || "inga listor";
});

const val = (id) => {
  const st = states.find((x) => x.entity_id === id);
  return st ? `${st.attributes.friendly_name ?? id} = ${st.state}${st.attributes.unit_of_measurement ? ` ${st.attributes.unit_of_measurement}` : ""}` : `${id} (saknas)`;
};
await check("Energi (det tavlan väljer)", async () => {
  const e = found?.energy ?? {};
  const rows = Object.entries(e).filter(([, id]) => typeof id === "string").map(([k, id]) => `${k}: ${val(id)}`);
  return rows.join("; ") || "inget hittat";
});
// The board's own calculation next to the home's own "today" sensors (Tibber, inverter …) as a check.
await check("Tavlans energiberäkning", async () => {
  const e = found?.energy ?? {};
  const map = new Map(states.map((x) => [x.entity_id, x]));
  const now = energyNow(e, map);
  const series = await todaySeries(conn, e, new Date());
  const units = Object.fromEntries(Object.keys(series).map((id) => [id, String(map.get(id)?.attributes.unit_of_measurement ?? "kWh")]));
  const t = energyToday(e, series, units, [], (p) => p) ?? {};
  const facit = states
    .filter((x) => /^(k?Wh)$/.test(String(x.attributes.unit_of_measurement ?? "")) && /idag|i dag|today|ackumulerad (förbrukning|produktion)$|köpt el idag/i.test(String(x.attributes.friendly_name ?? "")))
    .map((x) => val(x.entity_id));
  return [
    `nu: sol ${now.solarKw ?? "?"} kW, nät ${now.gridKw ?? "?"} kW, huset ${now.houseKw ?? "?"} kW, egen solel ${now.selfUseKw ?? "?"} kW`,
    `idag: förbrukat ${t.houseKwh ?? "?"} kWh, sol ${t.solarKwh ?? "?"}, köpt ${t.importKwh ?? "?"}, sålt ${t.exportKwh ?? "?"}, egen solel ${t.selfUseKwh ?? "?"}, självförsörjning ${t.selfSufficiencyPct ?? "?"} %`,
    `hemmets egna dagsvärden att jämföra med: ${facit.join("; ") || "-"}`,
  ].join(" | ");
});
await check("Elpris (förslag)", async () => {
  const p = found?.priceSensors ?? [];
  return `${p.length} st – de första: ${p.slice(0, 8).map((x) => val(x.entityId)).join("; ") || "-"}`;
});
await check("Energi-integrationer i hemmet", async () => {
  const makers = new Map();
  for (const x of all) if (x.m && /tibber|solaredge|huawei|fronius|growatt|easee|zaptec|nordpool|sma\b|enphase|goodwe|solis|sungrow|victron|ferroamp|shelly|p1|han/i.test(x.m)) makers.set(x.m, (makers.get(x.m) ?? 0) + 1);
  return [...makers].map(([m, n]) => `${m} (${n} entiteter)`).join(", ") || "inga kända";
});
const services = await ha.services(conn).catch(() => []);
const phones = Object.keys(services.find((s) => s.domain === "notify")?.services ?? {}).filter((n) => n.startsWith("mobile_app")).length;
await check("Övrigt tavlan hittar", async () =>
  [
    `temperaturer ${found?.temps.length ?? 0}`,
    `värme/klimat ${found?.climates.length ?? 0}`,
    `energi: ${Object.keys(found?.energy ?? {}).join(", ") || "-"}`,
    `elprissensorer ${found?.priceSensors.length ?? 0}`,
    `knappar ${found?.buttons.length ?? 0}`,
    `enhetskort ${found?.deviceCards.length ?? 0}`,
    `personer ${byDomain("person").length}`,
    `telefoner för påminnelser ${phones}`,
  ].join(", "),
);

const report = [
  problems.length ? "## Behöver ses över\n" + problems.map((p) => `- ${p}`).join("\n") : "## Home Assistant: allt fungerar",
  "\n## Det tavlan hittar\n" + ok.map((o) => `- ${o}`).join("\n"),
  "\n_Testet läser bara – inget tänds, släcks eller startas._",
].join("\n");
writeFileSync(process.env.REPORT ?? "ha-report.md", report + "\n");
console.log(report);
sock.stop();
process.exit(problems.length ? 1 : 0);
