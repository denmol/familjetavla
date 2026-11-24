import type { Config, NamedEntity, SecurityEntities } from "../../../server/src/types";
import { Icon } from "../Icon";
import { EntityPicker, Text, Toggle } from "./parts";

type Key = Exclude<keyof SecurityEntities, "allowUnlock">;
const EMPTY: SecurityEntities = { cameras: [], locks: [], alarms: [], covers: [], openings: [] };

const GROUPS: { key: Key; title: string; add: string; domains: string[]; max: number }[] = [
  { key: "cameras", title: "Kameror", add: "Lägg till kamera", domains: ["camera"], max: 16 },
  { key: "locks", title: "Lås", add: "Lägg till lås", domains: ["lock"], max: 12 },
  { key: "alarms", title: "Larm", add: "Lägg till larm", domains: ["alarm_control_panel"], max: 4 },
  { key: "covers", title: "Garageport och grind", add: "Lägg till port", domains: ["cover"], max: 8 },
  { key: "openings", title: "Dörrar och fönster", add: "Lägg till dörr eller fönster", domains: ["binary_sensor"], max: 40 },
];

function List({ items, onChange }: { items: NamedEntity[]; onChange: (x: NamedEntity[]) => void }) {
  return (
    <>
      {items.map((x, i) => (
        <div className="row gap" key={x.entityId} style={{ alignItems: "center" }}>
          <div className="grow">
            <Text label={x.entityId} value={x.name} onChange={(v) => onChange(items.map((y, j) => (j === i ? { ...y, name: v } : y)))} />
          </div>
          <button className="btn small ghost" aria-label={`Ta bort ${x.name}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <Icon name="x" size={18} />
          </button>
        </div>
      ))}
    </>
  );
}

/** Huset → Säkerhet and Städ: what the two tabs show. Any brand that is in Home Assistant works. */
export function SecurityCard({ cfg, set }: { cfg: Config; set: (c: Config | ((prev: Config) => Config)) => void }) {
  const sec = cfg.entities.security ?? EMPTY;
  const robots = cfg.entities.robots ?? [];
  const setSec = (patch: Partial<SecurityEntities>) => set((c) => ({ ...c, entities: { ...c.entities, security: { ...EMPTY, ...c.entities.security, ...patch } } }));
  const setApps = (a: Config["entities"]["appliances"]) => set((c) => ({ ...c, entities: { ...c.entities, appliances: a } }));
  const setRobots = (r: Config["entities"]["robots"]) => set((c) => ({ ...c, entities: { ...c.entities, robots: r } }));
  return (
    <section className="card">
      <h2>Säkerhet</h2>
      <p className="muted" style={{ margin: "0 0 10px" }}>
        Kameror, lås, larm, portar och dörrar – vilket märke som helst som finns i Home Assistant (Verisure, Yale, Nuki, Reolink, UniFi, Ring, Somfy …). Visas under fliken Säkerhet.
      </p>
      {GROUPS.map((g) => (
        <div className="stack" style={{ gap: 8, marginBottom: 12 }} key={g.key}>
          <b>{g.title}</b>
          <List items={sec[g.key]} onChange={(x) => setSec({ [g.key]: x })} />
          {sec[g.key].length < g.max && (
            <EntityPicker label={g.add} domains={g.domains} value={undefined} onChange={(v, o) => v && !sec[g.key].some((x) => x.entityId === v) && setSec({ [g.key]: [...sec[g.key], { entityId: v, name: o?.name ?? v }] })} />
          )}
        </div>
      ))}
      <Toggle
        label="Tillåt upplåsning från tavlan"
        checked={Boolean(sec.allowUnlock)}
        onChange={(v) => setSec({ allowUnlock: v })}
        help="Av som standard: tavlan sitter där alla kan trycka. Låsa går alltid. Påslaget frågar tavlan först, och kräver låset en kod frågar den efter koden."
      />

      <h2 style={{ marginTop: 18 }}>Hushåll</h2>
      <p className="muted" style={{ margin: "0 0 10px" }}>
        Tvättmaskin, torktumlare, diskmaskin och ugn (Miele, Bosch/Siemens, Electrolux, Samsung, LG … eller en smart kontakt som mäter effekt), och robotdammsugare och robotgräsklippare (Roborock, Dreame, Ecovacs, Roomba, Automower …). Visas under fliken Hushåll. "Hämta från Home Assistant" hittar dem.
      </p>
      {(cfg.entities.appliances ?? []).map((a, i) => (
        <div className="row gap" key={`${a.name}${i}`} style={{ alignItems: "center" }}>
          <div className="grow">
            <Text label={[a.status, a.power].filter(Boolean).join(" · ")} value={a.name} onChange={(v) => setApps((cfg.entities.appliances ?? []).map((y, j) => (j === i ? { ...y, name: v } : y)))} />
          </div>
          <button className="btn small ghost" aria-label={`Ta bort ${a.name}`} onClick={() => setApps((cfg.entities.appliances ?? []).filter((_, j) => j !== i))}>
            <Icon name="x" size={18} />
          </button>
        </div>
      ))}
      {(cfg.entities.appliances ?? []).length < 10 && (
        <EntityPicker
          label="Lägg till maskin"
          domains={["sensor"]}
          value={undefined}
          help="Välj maskinens status-sensor – eller effekten (W) från en smart kontakt som maskinen sitter i."
          onChange={(v, o) => {
            if (!v) return;
            const name = o?.name ?? v;
            const kind = /disk|dish/i.test(name) ? "dishwasher" : /tork|dry/i.test(name) ? "dryer" : /tvätt|wash/i.test(name) ? "washer" : /ugn|oven/i.test(name) ? "oven" : "other";
            const power = /W$/.test(o?.unit ?? "") || /effekt|power/i.test(name);
            setApps([...(cfg.entities.appliances ?? []), { name, kind, ...(power ? { power: v } : { status: v }) }]);
          }}
        />
      )}
      <List items={robots} onChange={(x) => setRobots(x.map((y) => ({ ...robots.find((r) => r.entityId === y.entityId), ...y })))} />
      {robots.length < 8 && (
        <EntityPicker label="Lägg till robot" domains={["vacuum", "lawn_mower"]} value={undefined} onChange={(v, o) => v && !robots.some((r) => r.entityId === v) && setRobots([...robots, { entityId: v, name: o?.name ?? v }])} />
      )}
    </section>
  );
}
