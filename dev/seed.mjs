// Fill a running Familjetavla (http://localhost:8099) with a demo family pointing at dev/mock-ha.mjs.
//   node dev/seed.mjs
const BASE = process.env.BASE ?? "http://localhost:8099";
const HA = process.env.MOCK_HA ?? "http://localhost:8123";

const today = new Date();
const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
const nextMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
const dk = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const { config } = await (await fetch(`${BASE}/api/config`)).json();

const next = {
  ...config,
  setupComplete: true,
  household: { ...config.household, name: "Familjen Demo", postcode: "41101", place: "Göteborg", municipality: "Göteborgs kommun" },
  people: [
    { id: "emil", name: "Emil", color: "#c79bff", kind: "adult" },
    // Children arrive next Monday (alternating weeks from next week)
    { id: "ella", name: "Ella", color: "#5ab8ff", kind: "child", custody: { mode: "alternating", anchorDate: dk(nextMonday), handoverDay: 1 } },
    { id: "leo", name: "Leo", color: "#f5c84b", kind: "child", custody: { mode: "alternating", anchorDate: dk(nextMonday), handoverDay: 1 } },
  ],
  calendars: [
    { id: "familj", name: "Familjen", provider: "ha", kind: "ha", entityId: "calendar.familj", category: "family" },
    { id: "ella-sport", name: "Fotboll F14", provider: "sportadmin", kind: "ics", personId: "ella", category: "sport", include: ["F14"], alwaysShow: ["match"], visibility: "custody" },
    { id: "leo-sim", name: "Simning", provider: "laget", kind: "ics", personId: "leo", category: "sport", visibility: "custody" },
  ],
  integrations: [
    { id: "price", category: "price", provider: "ha-price", settings: { entityId: "sensor.nordpool_kwh_se3_sek" } },
    { id: "waste", category: "waste", provider: "waste-ha", settings: { entityId: "calendar.sophamtning" } },
    { id: "skola-leo", category: "school", provider: "school-ics", settings: { platform: "SchoolSoft" }, personId: "leo" },
  ],
  shopping: { ...config.shopping, source: "ha", entityId: "todo.shopping_list" },
  ha: { mode: "manual", url: HA },
  entities: {
    cars: [
      { name: "Tesla Model Y", battery: "sensor.tesla_battery", range: "sensor.tesla_range", location: "device_tracker.tesla_location", charging: "binary_sensor.tesla_charging", climate: "climate.tesla_climate" },
      { name: "Nissan Leaf", battery: "sensor.leaf_battery_level", range: "sensor.leaf_range_ac_off", location: "binary_sensor.leaf_plugged_in", charging: "binary_sensor.leaf_charging", climate: "switch.leaf_climate_control" },
    ],
    vacuums: [
      {
        name: "Foppa",
        entityId: "vacuum.foppa",
        brand: "roborock",
        map: "image.foppa_hemmet_custom",
        battery: "sensor.foppa_batteri",
        room: "sensor.foppa_nuvarande_rum",
        error: "sensor.foppa_fel_pa_dammsugaren",
        sensors: ["sensor.foppa_filtertid_kvar", "sensor.foppa_huvudborste_tid_kvar", "sensor.foppa_sidoborste_tid_kvar", "sensor.foppa_stadad_area"],
        controls: ["select.foppa_mopplage", "select.foppa_moppintensitet", "select.hallen_foppa_rengoringslage", "number.foppa_volym", "switch.foppa_stor_inte"],
      },
    ],
    energy: { solar: "sensor.solaredge_current_power", grid: "sensor.grid_power", house: "sensor.house_power" },
    lights: [
      { name: "Kök", entityId: "light.kok_tak" },
      { name: "Vardagsrum", entityId: "light.vardagsrum" },
      { name: "Ute", entityId: "light.ute" },
      { name: "Barnrum", entityId: "light.barnrum" },
    ],
    temps: [
      { name: "Inne", entityId: "sensor.h66_indoor" },
      { name: "Ute", entityId: "sensor.outdoor_temperature" },
    ],
    lightGroups: [
      { name: "Kök", entities: ["light.kok_tak", "light.kok_bank"] },
      { name: "Vardagsrum", entities: ["light.vardagsrum", "light.fonster_vardagsrum", "light.barnrum"] },
    ],
    buttons: [{ name: "Godnatt – släck uppe", entityId: "scene.godnatt", style: "blue" }],
    climates: [{ name: "Spabad", entityId: "climate.spa", controls: ["switch.spa_pump_1", "light.spa_light"] }],
    deviceCards: [
      { title: "Värmepump", primary: "sensor.h66_indoor", sensors: ["sensor.h66_hot_water", "sensor.h66_supply", "sensor.h66_cop"], controls: ["select.h66_mode", "number.h66_room_setpoint"] },
    ],
    graphs: [
      { title: "Effekt", series: [{ name: "Hus", entityId: "sensor.house_power", color: "#f1f2fa" }, { name: "Sol", entityId: "sensor.solaredge_current_power", color: "#f5c84b" }] },
      { title: "Temperatur", series: [{ name: "Inne", entityId: "sensor.h66_indoor", color: "#f5c84b" }, { name: "Ute", entityId: "sensor.outdoor_temperature", color: "#8f93b3" }] },
    ],
  },
  schedules: [{ id: "tesla-v", name: "Tesla värme", entityId: "climate.tesla_climate", action: "on", days: [1, 2, 3, 4, 5], time: "06:40", enabled: true }],
};

const res = await fetch(`${BASE}/api/config`, {
  method: "PUT",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    config: next,
    secrets: {
      "ha.token": "mock",
      "calendar.ella-sport.url": `${HA}/ics/sportadmin-ella.ics`,
      "calendar.leo-sim.url": `${HA}/ics/laget-leo.ics`,
      "int.skola-leo.url": `${HA}/ics/skola-leo.ics`,
    },
  }),
});
console.log(res.status, res.ok ? "Demo-familj inlagd" : await res.text());
