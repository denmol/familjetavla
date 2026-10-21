// A tiny fake Home Assistant for development and screenshots: REST API, calendars, history,
// todo list, template (registry) and a couple of ICS feeds. No real HA needed.
//   node dev/mock-ha.mjs   → http://localhost:8123  (token: anything)
import { createServer } from "node:http";

const now = new Date();
const iso = (d) => d.toISOString();
const at = (days, h, m = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, h, m);
const ago = (hours) => iso(new Date(Date.now() - hours * 3_600_000));

const devices = {
  rr: { name: "Foppa", m: "Roborock", mo: "Roborock S8", area: null },
  tesla: { name: "Tesla Model Y", m: "Tesla", area: "Garage" },
  leaf: { name: "Nissan Leaf", m: "Nissan", area: "Garage" },
  inv: { name: "SolarEdge", m: "SolarEdge", area: null },
  spa: { name: "Spabad", m: "Balboa", area: "Altan" },
  hp: { name: "Värmepump", m: "Husdata", mo: "H66", area: "Teknikrum" },
};

const S = (entity_id, state, attributes = {}, device = null, area = null, updatedHoursAgo = 0) => ({
  entity_id,
  state: String(state),
  attributes: { friendly_name: attributes.friendly_name ?? entity_id, ...attributes },
  last_changed: ago(updatedHoursAgo),
  last_updated: ago(updatedHoursAgo),
  _device: device,
  _area: area,
});

const prices = Array.from({ length: 48 }, (_, h) => {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h);
  const hh = h % 24;
  const v = hh < 5 ? 0.1 + hh * 0.01 : hh >= 16 && hh < 20 ? 1.2 + (hh - 16) * 0.05 : hh >= 7 && hh < 10 ? 1.0 : 0.75;
  return { start: iso(t), end: iso(new Date(t.getTime() + 3_600_000)), value: Math.round(v * 100) / 100 };
});

const states = [
  S("vacuum.foppa", "docked", { friendly_name: "Foppa", fan_speed: "max_plus", fan_speed_list: ["quiet","balanced","turbo","max","max_plus","off","custom"], supported_features: 30524 }, "rr"),
  S("sensor.foppa_batteri", "100", { friendly_name: "Foppa Batteri", unit_of_measurement: "%", device_class: "battery" }, "rr"),
  S("sensor.foppa_status", "charging", { friendly_name: "Foppa Status", device_class: "enum" }, "rr"),
  S("sensor.foppa_nuvarande_rum", "Hallen", { friendly_name: "Foppa Nuvarande rum", device_class: "enum" }, "rr"),
  S("sensor.foppa_fel_pa_dammsugaren", "none", { friendly_name: "Foppa Fel på dammsugaren" }, "rr"),
  S("sensor.foppa_filtertid_kvar", "123.972777777778", { friendly_name: "Foppa Filtertid kvar", unit_of_measurement: "h", device_class: "duration" }, "rr"),
  S("sensor.foppa_huvudborste_tid_kvar", "117.214444444444", { friendly_name: "Foppa Huvudborste tid kvar", unit_of_measurement: "h", device_class: "duration" }, "rr"),
  S("sensor.foppa_sidoborste_tid_kvar", "17.2144444444444", { friendly_name: "Foppa Sidoborste tid kvar", unit_of_measurement: "h", device_class: "duration" }, "rr"),
  S("sensor.foppa_stadad_area", "55.3", { friendly_name: "Foppa Städad area", unit_of_measurement: "m²", device_class: "area" }, "rr"),
  S("sensor.foppa_totalt_antal_stadningar", "146", { friendly_name: "Foppa Totalt antal städningar" }, "rr"),
  S("sensor.foppa_sluttid_for_senaste_stadningen", "2026-08-29T15:02:09+00:00", { friendly_name: "Foppa Sluttid för senaste städningen", device_class: "timestamp" }, "rr"),
  S("select.foppa_mopplage", "standard", { friendly_name: "Foppa Moppläge", options: ["standard","deep","deep_plus","fast","custom"] }, "rr"),
  S("select.foppa_moppintensitet", "off", { friendly_name: "Foppa Moppintensitet", options: ["off","mild","standard","intense","custom"] }, "rr"),
  S("select.foppa_hemmet_rotation", "0", { friendly_name: "Foppa Hemmet rotation", options: ["0","90","180","270"] }, "rr"),
  S("number.foppa_volym", "100.0", { friendly_name: "Foppa Volym", min: 0, max: 100, step: 10 }, "rr"),
  S("switch.foppa_stor_inte", "off", { friendly_name: "Foppa Stör inte" }, "rr"),
  S("time.foppa_starttid_stor_ej_lage", "22:00:00", { friendly_name: "Foppa Starttid Stör ej-läge" }, "rr"),
  S("image.foppa_hemmet_custom", "2026-10-21T17:28:41.213332+00:00", { friendly_name: "Foppa Hemmet_custom", calibration_points: [{vacuum:{x:25500,y:25500},map:{x:700,y:612}},{vacuum:{x:35500,y:25500},map:{x:1500,y:612}},{vacuum:{x:25500,y:35500},map:{x:700,y:-188}}], rooms: {"1":{x0:26450,y0:22550,x1:26900,y1:25000,number:1,name:"Unknown"},"16":{x0:26950,y0:22350,x1:29800,y1:25100,number:16,name:"Köket"},"17":{x0:20450,y0:23600,x1:26250,y1:28150,number:17,name:"Hallen"},"18":{x0:25150,y0:25100,x1:31300,y1:32300,number:18,name:"Matplatsen"},"19":{x0:30950,y0:25750,x1:36500,y1:29750,number:19,name:"Vardagsrummet"},"20":{x0:18200,y0:19750,x1:23800,y1:25050,number:20,name:"Tvättstugan"},"21":{x0:29800,y0:21900,x1:33500,y1:25750,number:21,name:"Williams rum"},"22":{x0:32950,y0:22050,x1:36550,y1:25850,number:22,name:"Sovrummet"},"23":{x0:21600,y0:26300,x1:23150,y1:28750,number:23,name:"Badrummet"},"24":{x0:23200,y0:27000,x1:26200,y1:29400,number:24,name:"Kontoret"}}, entity_picture: "/api/image_proxy/image.foppa_hemmet_custom?token=x" }, "rr"),
  S("sensor.tesla_battery", 95, { friendly_name: "Tesla Model Y Battery", unit_of_measurement: "%", device_class: "battery" }, "tesla"),
  S("sensor.tesla_range", 532, { friendly_name: "Tesla Model Y Range", unit_of_measurement: "km" }, "tesla"),
  S("device_tracker.tesla_location", "not_home", { friendly_name: "Tesla Model Y Location" }, "tesla"),
  S("binary_sensor.tesla_charging", "off", { friendly_name: "Tesla Model Y Charging", device_class: "battery_charging" }, "tesla"),
  S("climate.tesla_climate", "off", { friendly_name: "Tesla Model Y Climate", current_temperature: 9, temperature: 21, hvac_modes: ["off", "heat_cool"] }, "tesla"),
  S("sensor.tesla_tire_pressure_front_left", 2.6, { friendly_name: "Tesla Model Y Tire pressure front left", unit_of_measurement: "bar" }, "tesla", null, 18),
  S("lock.tesla_doors", "locked", { friendly_name: "Tesla Model Y Doors" }, "tesla"),
  S("button.tesla_flash_lights", "unknown", { friendly_name: "Tesla Model Y Flash lights" }, "tesla"),
  S("button.tesla_honk", "unknown", { friendly_name: "Tesla Model Y Honk horn" }, "tesla"),
  S("sensor.leaf_battery_level", 87, { friendly_name: "Nissan Leaf Battery Level", unit_of_measurement: "%", device_class: "battery" }, "leaf", null, 18),
  S("sensor.leaf_range_ac_off", 233, { friendly_name: "Nissan Leaf Range (AC Off)", unit_of_measurement: "km" }, "leaf", null, 56),
  S("binary_sensor.leaf_plugged_in", "off", { friendly_name: "Nissan Leaf Plugged In", device_class: "plug" }, "leaf"),
  S("binary_sensor.leaf_charging", "off", { friendly_name: "Nissan Leaf Charging", device_class: "battery_charging" }, "leaf"),
  S("switch.leaf_climate_control", "off", { friendly_name: "Nissan Leaf Climate Control" }, "leaf"),
  S("sensor.leaf_state_of_charge", "unavailable", { friendly_name: "Nissan Leaf State of charge", unit_of_measurement: "%" }, "leaf"),
  S("button.leaf_update_data", "unknown", { friendly_name: "Nissan Leaf Update data" }, "leaf"),
  S("sensor.solaredge_current_power", 1840, { friendly_name: "SolarEdge Current Power", unit_of_measurement: "W", device_class: "power" }, "inv"),
  S("sensor.grid_power", 600, { friendly_name: "Grid power import", unit_of_measurement: "W", device_class: "power" }),
  S("sensor.house_power", 2440, { friendly_name: "House consumption", unit_of_measurement: "W", device_class: "power" }),
  S("climate.spa", "heat", { friendly_name: "Spa", current_temperature: 36.5, temperature: 38.5, hvac_action: "heating", preset_modes: ["ready", "rest"], preset_mode: "ready" }, "spa"),
  S("switch.spa_pump_1", "off", { friendly_name: "Spa Pump 1" }, "spa"),
  S("light.spa_light", "on", { friendly_name: "Spa Light" }, "spa"),
  S("sensor.h66_indoor", 21.4, { friendly_name: "Värmepump Inomhus", unit_of_measurement: "°C", device_class: "temperature" }, "hp"),
  S("sensor.h66_hot_water", 49, { friendly_name: "Värmepump Varmvatten", unit_of_measurement: "°C", device_class: "temperature" }, "hp"),
  S("sensor.h66_supply", 32.1, { friendly_name: "Värmepump Framledning", unit_of_measurement: "°C", device_class: "temperature" }, "hp"),
  S("sensor.h66_cop", 5.4, { friendly_name: "Värmepump COP" }, "hp"),
  S("select.h66_mode", "Auto", { friendly_name: "Värmepump Läge", options: ["Auto", "Värme", "Sänkt"] }, "hp"),
  S("number.h66_room_setpoint", 20.5, { friendly_name: "Värmepump Börvärde rum", unit_of_measurement: "°C", min: 15, max: 25, step: 0.5 }, "hp"),
  S("sensor.outdoor_temperature", 13, { friendly_name: "Ute", unit_of_measurement: "°C", device_class: "temperature" }),
  S("light.kok_tak", "on", { friendly_name: "Kök tak" }, null, "Kök"),
  S("light.kok_bank", "on", { friendly_name: "Kök bänk" }, null, "Kök"),
  S("light.vardagsrum", "on", { friendly_name: "Vardagsrum" }, null, "Vardagsrum"),
  S("light.fonster_vardagsrum", "on", { friendly_name: "Fönster vardagsrum" }, null, "Vardagsrum"),
  S("light.ute", "off", { friendly_name: "Ute entré" }, null, "Ute"),
  S("light.barnrum", "unavailable", { friendly_name: "Barnrum" }, null, "Barnrum"),
  S("scene.godnatt", "unknown", { friendly_name: "Godnatt – släck uppe" }),
  S("todo.shopping_list", 4, { friendly_name: "Inköpslista" }),
  S("calendar.familj", "off", { friendly_name: "Familjen" }),
  S("calendar.sophamtning", "off", { friendly_name: "Sophämtning" }),
  S("sensor.nordpool_kwh_se3_sek", prices[now.getHours()].value, { friendly_name: "Nordpool SE3", unit_of_measurement: "SEK/kWh", raw_today: prices.slice(0, 24), raw_tomorrow: prices.slice(24) }),
];
const byId = new Map(states.map((s) => [s.entity_id, s]));

let todo = [
  { uid: "1", summary: "Mjölk", status: "needs_action" },
  { uid: "2", summary: "Bananer", status: "needs_action" },
  { uid: "3", summary: "Tacoskal", status: "needs_action" },
  { uid: "4", summary: "Kaffe", status: "completed" },
];

const calendars = {
  "calendar.familj": [
    { summary: "Middag: tacos", start: at(0, 18), end: at(0, 19) },
    { summary: "Föräldramöte", start: at(4, 19), end: at(4, 20) },
    { summary: "Fredagsmys", allDay: 5 },
  ],
  "calendar.sophamtning": [
    { summary: "Matavfall", allDay: 2 },
    { summary: "Restavfall", allDay: 5 },
  ],
};
const calEvent = (e) =>
  e.allDay !== undefined
    ? { summary: e.summary, start: { date: dk(at(e.allDay, 0)) }, end: { date: dk(at(e.allDay + 1, 0)) } }
    : { summary: e.summary, start: { dateTime: iso(e.start) }, end: { dateTime: iso(e.end) } };
const dk = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const icsDate = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}00`;
const monday = at(-((now.getDay() + 6) % 7), 0);
const ics = (events) =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//mock//familjetavla//SV",
    ...events.flatMap((e, i) => [
      "BEGIN:VEVENT",
      `UID:${i}@mock`,
      `DTSTART;TZID=Europe/Stockholm:${icsDate(e.start)}`,
      `DTEND;TZID=Europe/Stockholm:${icsDate(e.end)}`,
      ...(e.rrule ? [`RRULE:${e.rrule}`] : []),
      ...(e.cat ? [`CATEGORIES:${e.cat}`] : []),
      `SUMMARY:${e.title}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ].join("\r\n");
const at2 = (base, days, h, m = 0) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + days, h, m);

const feeds = {
  // SportAdmin-style feed with two teams in one link
  "/ics/sportadmin-ella.ics": ics([
    { title: "F14 – Träning", cat: "F14", start: at2(monday, 0, 17, 30), end: at2(monday, 0, 19), rrule: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=12" },
    { title: "F14 – Match mot IFK", cat: "F14", start: at2(monday, 12, 10), end: at2(monday, 12, 12) },
    { title: "F14 – Match mot BK", cat: "F14", start: at2(monday, 5, 10), end: at2(monday, 5, 12) },
    { title: "Futsal – Träning", cat: "Futsal", start: at2(monday, 3, 18), end: at2(monday, 3, 19), rrule: "FREQ=WEEKLY;COUNT=8" },
  ]),
  "/ics/laget-leo.ics": ics([
    { title: "Simträning", start: at2(monday, 1, 18), end: at2(monday, 1, 19), rrule: "FREQ=WEEKLY;BYDAY=TU,TH;COUNT=12" },
  ]),
  "/ics/skola-leo.ics": ics([{ title: "Idrott", start: at2(monday, 1, 8, 10), end: at2(monday, 1, 9), rrule: "FREQ=WEEKLY;COUNT=8" }]),
};

function registry() {
  return states.map((s) => {
    const d = s._device ? devices[s._device] : null;
    return {
      e: s.entity_id,
      n: s.attributes.friendly_name,
      a: s._area ?? d?.area ?? null,
      d: s._device,
      dn: d?.name ?? null,
      m: d?.m ?? null,
      mo: d?.mo ?? null,
      dc: s.attributes.device_class ?? null,
      u: s.attributes.unit_of_measurement ?? null,
      st: s.state,
      lu: s.last_updated,
    };
  });
}

const pub = (s) => {
  const { _device, _area, ...rest } = s;
  return rest;
};

function body(req) {
  return new Promise((r) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => r(b ? JSON.parse(b) : {}));
  });
}

function send(res, code, data, type = "application/json") {
  res.writeHead(code, { "content-type": type });
  res.end(typeof data === "string" ? data : JSON.stringify(data));
}

function toggle(id, on) {
  const s = byId.get(id);
  if (!s || s.state === "unavailable") return;
  s.state = on === undefined ? (s.state === "on" ? "off" : "on") : on ? (id.startsWith("climate.") ? "heat_cool" : "on") : "off";
  s.last_changed = s.last_updated = iso(new Date());
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  if (feeds[p]) return send(res, 200, feeds[p], "text/calendar");
  if (p.startsWith("/api/image_proxy/")) {
    console.log("image_proxy", p, req.headers.authorization ? "with bearer" : "NO AUTH");
    return send(res, 200, '<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1200" viewBox="0 0 1800 1200"><rect x="816" y="644" width="228" height="220" fill="hsl(180,40%,45%)" fill-opacity=".5" stroke="#fff" stroke-width="2"/><rect x="296" y="400" width="464" height="364" fill="hsl(200,40%,45%)" fill-opacity=".5" stroke="#fff" stroke-width="2"/><rect x="672" y="68" width="492" height="576" fill="hsl(220,40%,45%)" fill-opacity=".5" stroke="#fff" stroke-width="2"/><rect x="1136" y="272" width="444" height="320" fill="hsl(240,40%,45%)" fill-opacity=".5" stroke="#fff" stroke-width="2"/><rect x="116" y="648" width="448" height="424" fill="hsl(260,40%,45%)" fill-opacity=".5" stroke="#fff" stroke-width="2"/><rect x="1044" y="592" width="296" height="308" fill="hsl(280,40%,45%)" fill-opacity=".5" stroke="#fff" stroke-width="2"/><rect x="1296" y="584" width="288" height="304" fill="hsl(300,40%,45%)" fill-opacity=".5" stroke="#fff" stroke-width="2"/><rect x="388" y="352" width="124" height="196" fill="hsl(320,40%,45%)" fill-opacity=".5" stroke="#fff" stroke-width="2"/><rect x="516" y="300" width="240" height="192" fill="hsl(340,40%,45%)" fill-opacity=".5" stroke="#fff" stroke-width="2"/></svg>', "image/svg+xml");
  }
  if (p === "/api/") return send(res, 200, { message: "API running." });
  if (p === "/api/states" && req.method === "GET") return send(res, 200, states.map(pub));
  if (p.startsWith("/api/states/")) {
    const id = decodeURIComponent(p.slice(12));
    if (req.method === "POST") {
      const b = await body(req);
      console.log("published", id, b.state);
      return send(res, 200, { entity_id: id, ...b });
    }
    return byId.has(id) ? send(res, 200, pub(byId.get(id))) : send(res, 404, { message: "Entity not found." });
  }
  if (p === "/api/template") return send(res, 200, JSON.stringify(registry()), "text/plain");
  if (p.startsWith("/api/calendars/")) return send(res, 200, (calendars[decodeURIComponent(p.slice(15))] ?? []).map(calEvent));
  if (p.startsWith("/api/history/period/")) {
    const ids = (url.searchParams.get("filter_entity_id") ?? "").split(",");
    const start = new Date(decodeURIComponent(p.slice(20)));
    return send(
      res,
      200,
      ids.map((id) =>
        Array.from({ length: 48 }, (_, i) => {
          const base = Number(byId.get(id)?.state) || 1;
          const wave = id.includes("solar") ? Math.max(0, Math.sin(((i - 14) / 20) * Math.PI)) * 4000 : base * (0.7 + 0.5 * Math.abs(Math.sin(i / 5)));
          return { entity_id: id, state: String(Math.round(wave * 10) / 10), last_changed: iso(new Date(start.getTime() + i * 30 * 60_000)) };
        }),
      ),
    );
  }
  if (p.startsWith("/api/services/")) {
    const [, , , domain, service] = p.split("/");
    const b = await body(req);
    const ids = [].concat(b.entity_id ?? []);
    console.log("service", domain, service, JSON.stringify(b));
    if (domain === "todo" && service === "get_items") return send(res, 200, { service_response: { [ids[0]]: { items: todo } } });
    if (domain === "todo" && service === "add_item") todo.push({ uid: String(Date.now()), summary: b.item, status: "needs_action" });
    if (domain === "todo" && service === "update_item") todo = todo.map((t) => (t.uid === b.item ? { ...t, status: b.status } : t));
    if (domain === "todo" && service === "remove_completed_items") todo = todo.filter((t) => t.status !== "completed");
    if (service === "toggle") ids.forEach((id) => toggle(id));
    if (service === "turn_on") ids.forEach((id) => toggle(id, true));
    if (service === "turn_off") ids.forEach((id) => toggle(id, false));
    if (service === "set_preset_mode") ids.forEach((id) => (byId.get(id).attributes.preset_mode = b.preset_mode));
    if (service === "select_option") ids.forEach((id) => (byId.get(id).state = b.option));
    if (service === "set_value") ids.forEach((id) => (byId.get(id).state = String(b.value)));
    return send(res, 200, []);
  }
  send(res, 404, { message: "not found" });
}).listen(8123, () => console.log("Mock Home Assistant på http://localhost:8123"));
