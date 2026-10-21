import { useState } from "react";
import type { Dashboard, DashVacuum } from "../../../server/src/types";
import { api } from "../api";
import { Icon } from "../Icon";
import type { Actions } from "../dashboard/Dashboard";
import { ControlView } from "../dashboard/Pages";
import type { WidgetModule } from "./types";

type Op = Parameters<typeof api.vacuumOp>[1];

const active = (v: DashVacuum) => v.phase === "cleaning" || v.phase === "returning";

/** The three buttons that make sense right now: start or pause, and home. */
function useOps(v: DashVacuum, actions: Actions) {
  const find = (d: Dashboard) => d.vacuums.find((x) => x.entityId === v.entityId);
  const run = (op: Op, label: string, done: string, check?: (x: DashVacuum | undefined) => boolean, value?: string) =>
    actions.run(`${v.name}: ${label}`, () => api.vacuumOp(v.index, op, value), { done, check: (d) => (check ? check(find(d)) : true), slow: "Skickat – dammsugaren kan ta en stund på sig." });
  return {
    start: () => run("start", "starta", `${v.name} städar`, (x) => x?.phase === "cleaning"),
    pause: () => run("pause", "pausa", `${v.name} pausad`, (x) => x?.phase === "paused"),
    home: () => run("home", "åk hem", `${v.name} åker hem`, (x) => x?.phase === "returning" || x?.phase === "docked"),
    locate: () => run("locate", "hitta", `${v.name} säger till`),
    fan: (value: string) => run("fan", "sugkraft", `Sugkraft: ${v.fanSpeeds.find((f) => f.value === value)?.label ?? value}`, (x) => x?.fanSpeed === value, value),
  };
}

function Status({ v }: { v: DashVacuum }) {
  const tone = v.phase === "error" || v.error ? "danger" : v.phase === "cleaning" ? "good" : v.phase === "offline" ? "warn" : "";
  return (
    <span className="row gap" style={{ flexWrap: "wrap" }}>
      <span className={`chip ${tone}`}>{v.error && v.phase !== "error" ? "Behöver hjälp" : v.label}</span>
      {v.battery !== null && <span className="chip">{v.battery} %{v.charging ? " · laddar" : ""}</span>}
    </span>
  );
}

// ---------- Home card ----------

function VacuumRow({ v, actions }: { v: DashVacuum; actions: Actions }) {
  const op = useOps(v, actions);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="card-head" style={{ alignItems: "baseline" }}>
        <b style={{ fontSize: 17 }}>{v.name}</b>
        <Status v={v} />
      </div>
      {v.error && <p className="error-text" style={{ margin: 0 }}>{v.error}</p>}
      <div className="row gap">
        {active(v) && v.can.pause ? (
          <button className="btn grow" onClick={(e) => (e.stopPropagation(), void op.pause())}>
            Pausa
          </button>
        ) : (
          v.can.start && (
            <button className="btn grow" disabled={v.phase === "offline"} onClick={(e) => (e.stopPropagation(), void op.start())}>
              {v.phase === "paused" ? "Fortsätt" : "Starta"}
            </button>
          )
        )}
        {v.can.home && v.phase !== "docked" && (
          <button className="btn grow" onClick={(e) => (e.stopPropagation(), void op.home())}>
            Hem
          </button>
        )}
      </div>
    </div>
  );
}

export function Vacuums({ data, actions }: { data: Dashboard; actions: Actions }) {
  if (!data.vacuums.length) return null;
  return (
    <section className="card">
      <div className="card-head">
        <h2>Dammsugare</h2>
      </div>
      {data.vacuums.map((v) => (
        <VacuumRow key={v.entityId} v={v} actions={actions} />
      ))}
    </section>
  );
}

// ---------- The tab ----------

/** The floor plan, with a tappable rectangle per room when the map is calibrated. */
function FloorPlan({ v, picked, toggle }: { v: DashVacuum; picked: string[]; toggle: (id: string) => void }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [broken, setBroken] = useState(false);
  if (!v.mapVersion || broken) return null;
  // Big rooms first, so a small room inside a big one stays on top and can be tapped.
  const boxed = v.rooms.filter((r) => r.box).sort((a, b) => b.box!.w * b.box!.h - a.box!.w * a.box!.h);
  const font = size ? Math.max(14, Math.round(size.w / 45)) : 20;
  return (
    <div className="vac-map" aria-label={`Karta över ${v.name}`}>
      <img
        src={api.vacuumMapUrl(v.index, v.mapVersion)}
        alt=""
        onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        onError={() => setBroken(true)}
      />
      {size && v.canRooms && boxed.length > 0 && (
        <svg viewBox={`0 0 ${size.w} ${size.h}`} role="group" aria-label="Rum">
          {boxed.map((r) => {
            const b = r.box!;
            const on = picked.includes(r.id);
            return (
              <g key={r.id} className={`vac-room ${on ? "on" : ""} ${v.room === r.name ? "here" : ""}`} role="button" tabIndex={0} aria-pressed={on} aria-label={r.name} onClick={() => toggle(r.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle(r.id)}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={font / 2} />
                <text x={b.x + b.w / 2} y={b.y + b.h / 2} fontSize={Math.max(font * 0.6, Math.min(font, b.w / (r.name.length * 0.6)))} textAnchor="middle" dominantBaseline="middle">
                  {r.name}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

function VacuumView({ v, actions }: { v: DashVacuum; actions: Actions }) {
  const op = useOps(v, actions);
  const [picked, setPicked] = useState<string[]>([]);
  const [twice, setTwice] = useState(false);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const names = v.rooms.filter((r) => picked.includes(r.id)).map((r) => r.name);
  const cleanRooms = () =>
    actions.confirm(`Städa ${names.join(", ")}${twice ? " två gånger" : ""}?`, "Städa", async () => {
      await actions.run(`${v.name}: städa ${names.join(", ")}`, () => api.vacuumRooms(v.index, picked, twice ? 2 : 1), {
        done: `${v.name} städar ${names.join(", ")}`,
        check: (d) => d.vacuums.find((x) => x.entityId === v.entityId)?.phase === "cleaning",
        slow: "Skickat – dammsugaren kan ta en stund på sig.",
      });
      setPicked([]);
    });
  // Time settings cannot be changed from here (Home Assistant's time entity needs its own call): shown as a row.
  const settings = v.controls.filter((c) => c.domain !== "time");
  const times = v.controls.filter((c) => c.domain === "time");
  return (
    <div className="page-grid">
      <section className="card strong">
        <div className="card-head">
          <h2>{v.name}</h2>
          <Status v={v} />
        </div>
        {v.error && <p className="error-text" style={{ margin: 0 }}>{v.error}</p>}
        <div className="grid-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          {active(v) && v.can.pause ? (
            <button className="big-btn" onClick={() => void op.pause()}>
              Pausa
            </button>
          ) : (
            v.can.start && (
              <button className="big-btn amber" disabled={v.phase === "offline"} onClick={() => void op.start()}>
                {v.phase === "paused" ? "Fortsätt" : "Starta städning"}
              </button>
            )
          )}
          {v.can.home && (
            <button className="big-btn" disabled={v.phase === "docked" || v.phase === "offline"} onClick={() => void op.home()}>
              Åk hem
            </button>
          )}
          {v.can.locate && (
            <button className="btn" disabled={v.phase === "offline"} onClick={() => void op.locate()}>
              Hitta dammsugaren
            </button>
          )}
          {v.can.stop && active(v) && (
            <button className="btn" onClick={() => void actions.run(`${v.name}: stopp`, () => api.vacuumOp(v.index, "stop"), { done: `${v.name} stoppad`, check: (d) => !active(d.vacuums.find((x) => x.entityId === v.entityId) ?? v) })}>
              Stoppa
            </button>
          )}
        </div>
        {v.room && <span className="muted">Just nu i: {v.room}</span>}
      </section>

      {(v.mapVersion || v.rooms.length > 0) && (
        <section className="card vac-wide">
          <div className="card-head">
            <h2>Karta</h2>
            {v.canRooms && <span className="muted">{picked.length ? `${picked.length} valda` : "Tryck på rummen du vill städa"}</span>}
          </div>
          <FloorPlan v={v} picked={picked} toggle={toggle} />
          {v.canRooms && !v.rooms.some((r) => r.box) && (
            <div className="seg" role="group" aria-label="Rum">
              {v.rooms.map((r) => (
                <button key={r.id} className={`seg-btn ${picked.includes(r.id) ? "on" : ""}`} aria-pressed={picked.includes(r.id)} onClick={() => toggle(r.id)}>
                  {r.name}
                </button>
              ))}
            </div>
          )}
          {v.canRooms && (
            <div className="row gap">
              <button className={`btn ${twice ? "selected" : ""}`} aria-pressed={twice} onClick={() => setTwice(!twice)}>
                2 gånger
              </button>
              <button className="big-btn amber grow" disabled={!picked.length || v.phase === "offline"} onClick={cleanRooms}>
                {picked.length ? `Städa ${picked.length} rum` : "Välj rum"}
              </button>
            </div>
          )}
          {v.rooms.length > 0 && !v.canRooms && <p className="muted" style={{ margin: 0 }}>Rumsstädning från tavlan finns för Roborock och Dreame. Övriga märken: välj rum i märkets egen app.</p>}
        </section>
      )}

      {v.fanSpeeds.length > 0 && (
        <section className="card">
          <h2>Sugkraft</h2>
          <div className="seg" role="radiogroup" aria-label="Sugkraft">
            {v.fanSpeeds.map((f) => (
              <button key={f.value} role="radio" aria-checked={v.fanSpeed === f.value} className={`seg-btn ${v.fanSpeed === f.value ? "on" : ""}`} onClick={() => void op.fan(f.value)}>
                {f.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {(settings.length > 0 || times.length > 0) && (
        <section className="card">
          <h2>Inställningar</h2>
          <div className="stack" style={{ gap: 10 }}>
            {settings.map((c) => (
              <ControlView key={c.entityId} c={c} actions={actions} />
            ))}
            {times.map((c) => (
              <div className="row gap" key={c.entityId}>
                <span className="grow">{c.name}</span>
                <b className="tabular">{c.state.slice(0, 5)}</b>
              </div>
            ))}
          </div>
        </section>
      )}

      {v.rows.length > 0 && (
        <section className="card">
          <h2>Förbrukning och statistik</h2>
          <div className="stack" style={{ gap: 0 }}>
            {v.rows.map((r) => (
              <div key={r.name} className="row gap" style={{ padding: "10px 0", borderBottom: "1px solid var(--card-border)" }}>
                <span className="grow" style={{ minWidth: 0, overflowWrap: "anywhere" }}>{r.name}</span>
                <b style={{ textAlign: "right", opacity: r.ok ? 1 : 0.5 }}>{r.value}</b>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function VacuumPage({ data, actions }: { data: Dashboard; actions: Actions }) {
  const [sel, setSel] = useState(0);
  const v = data.vacuums[Math.min(sel, data.vacuums.length - 1)];
  if (!v) return <p className="muted">Välj dammsugare under Inställningar → Huset → Dammsugare.</p>;
  return (
    <main className="stack" style={{ gap: 18 }}>
      {data.vacuums.length > 1 && (
        <div className="seg" role="tablist" aria-label="Dammsugare">
          {data.vacuums.map((x, i) => (
            <button key={x.entityId} role="tab" aria-selected={i === sel} className={`seg-btn ${i === sel ? "on" : ""}`} onClick={() => setSel(i)}>
              <Icon name="vacuum" size={20} />
              {x.name}
            </button>
          ))}
        </div>
      )}
      <VacuumView v={v} actions={actions} />
    </main>
  );
}

const widget: WidgetModule = {
  id: "vacuums",
  label: "Dammsugare",
  size: (data) => (data.vacuums.length ? 1 + data.vacuums.length * 2 : 0),
  render: ({ data, actions }) => <Vacuums data={data} actions={actions} />,
  opens: { tab: "vacuums" },
};
export default widget;
