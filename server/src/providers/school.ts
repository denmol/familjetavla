import { fetchIcs } from "../connectors/ics.js";
import { ha, haConnection } from "../connectors/ha.js";
import { getJson } from "../http.js";
import { schoolsoftCalendar, schoolsoftLogin, schoolsoftLunch } from "../connectors/schoolsoft.js";
import { isGymLesson, vklassEvents, vklassLogin, vklassWelcome } from "../connectors/vklass.js";
import { hhmm, shortDate, shortWeekday } from "../time.js";
import type { HaState } from "../connectors/ha.js";
import type { ProviderCtx, SchoolEvent, SchoolNewsItem, SchoolProvider } from "./types.js";

const preview = (e: { start: Date; allDay: boolean; title: string }) =>
  `${shortWeekday(e.start)} ${shortDate(e.start)}${e.allDay ? "" : ` ${hhmm(e.start)}`} · ${e.title}`;

function need(ctx: ProviderCtx, ...keys: string[]) {
  for (const k of keys) {
    const field = ctx.integration.provider;
    const v = ctx.str(k) || ctx.secret(k);
    if (!v) throw new Error(`Fyll i ${k === "password" ? "lösenord" : k === "username" ? "användarnamn" : k === "school" ? "skolans namn" : k} (${field}).`);
  }
}

export const vklass: SchoolProvider = {
  meta: {
    id: "vklass",
    category: "school",
    name: "Vklass",
    description: "Skola och förskola: schema, idrott, omsorgstid och matsedel för alla barn på kontot.",
    status: "beta",
    discoversChildren: true,
    fields: [
      { key: "username", label: "Användarnamn", type: "text", placeholder: "Som på vklass.se" },
      { key: "password", label: "Lösenord", type: "password", secret: true },
    ],
    guide: [
      "Logga in som vårdnadshavare med användarnamn och lösenord (inte bara BankID).",
      "Har du bara BankID: skapa ett lösenord under Mitt konto i Vklass.",
      "Barnen hämtas automatiskt – koppla dem till rätt person nedan.",
    ],
  },
  async test(ctx) {
    need(ctx, "username", "password");
    const s = await vklassLogin(ctx.str("username"), ctx.secret("password")!);
    const { children: kids, news } = await vklassWelcome(s);
    return {
      ok: true,
      message: `Inloggad. Hittade ${kids.length} barn och ${news.length} nyheter.`,
      discovered: kids.map((k) => k.name),
      preview: kids.flatMap((k) => (k.food[0] ? [`${k.name} · ${k.food[0].day}: ${k.food[0].dishes.join(", ")}`] : [])),
    };
  },
  async fetch(ctx, from, to) {
    need(ctx, "username", "password");
    const s = await vklassLogin(ctx.str("username"), ctx.secret("password")!);
    const { children: kids, news } = await vklassWelcome(s);
    const events: SchoolEvent[] = [];
    for (const k of kids) {
      if (!k.id) continue; // preschool child without lessons: menu and care time only
      for (const e of await vklassEvents(s, k.id, from, to)) events.push({ ...e, child: k.name, gym: isGymLesson(e) });
    }
    const food = kids.flatMap((k) => k.food.map((f) => ({ child: k.name, ...f })));
    const care = kids.flatMap((k) => (k.careTime ? [{ child: k.name, text: k.careTime }] : []));
    // The round badge on a news item holds the first letters of the child's name ("ES").
    const byBadge = (b?: string) => (b ? kids.filter((k) => k.name.slice(0, 2).toUpperCase() === b) : []);
    return {
      events,
      food,
      care,
      news: news.map(({ badge, ...n }) => {
        const m = byBadge(badge);
        return { ...n, child: m.length === 1 ? m[0].name : undefined };
      }),
    };
  },
};

/** Child names in SchoolSoft: from the calendar, or the account itself for a student login. */
async function schoolsoftData(ctx: ProviderCtx, from: Date, to: Date) {
  need(ctx, "school", "username", "password");
  const s = await schoolsoftLogin(ctx.str("school"), ctx.str("username"), ctx.secret("password")!);
  const [events, food] = await Promise.all([schoolsoftCalendar(s, from, to), schoolsoftLunch(s, new Date())]);
  const named = [...new Set(events.flatMap((e) => (e.child ? [e.child] : [])))];
  const kids = named.length ? named : [s.type === "student" && s.name ? s.name : "Barnet i SchoolSoft"];
  const only = kids.length === 1 ? kids[0] : "";
  return {
    session: s,
    kids,
    events: events.map((e) => ({ ...e, child: e.child || only || undefined, gym: isGymLesson(e) })),
    // The menu belongs to the school; with several children it is shown as a shared menu.
    food: food.map((f) => ({ child: only, ...f })),
  };
}

export const schoolsoft: SchoolProvider = {
  meta: {
    id: "schoolsoft",
    category: "school",
    name: "SchoolSoft",
    description: "Kalender och matsedel med användarnamn och lösenord. Ny – testa gärna och berätta hur det gick.",
    status: "beta",
    discoversChildren: true,
    fields: [
      { key: "school", label: "Skolans namn i SchoolSoft", type: "text", placeholder: "Det som står efter sms.schoolsoft.se/" },
      { key: "username", label: "Användarnamn", type: "text" },
      { key: "password", label: "Lösenord", type: "password", secret: true },
    ],
    guide: [
      "Skolans namn finns i adressen när du loggar in: sms.schoolsoft.se/skolnamn/…",
      "Det fungerar bara med användarnamn och lösenord, inte BankID. Fråga skolan om du saknar lösenord.",
      "Tryck Testa och koppla barnen till familjen.",
    ],
  },
  async test(ctx) {
    const now = new Date();
    const d = await schoolsoftData(ctx, now, new Date(now.getTime() + 21 * 86_400_000));
    return {
      ok: true,
      message: `Inloggad som ${d.session.type === "guardian" ? "vårdnadshavare" : "elev"}. ${d.events.length} händelser kommande tre veckor, ${d.food.length} dagar med matsedel.`,
      discovered: d.kids,
      preview: [...d.food.slice(0, 3).map((f) => `${f.day}: ${f.dishes.join(", ")}`), ...d.events.slice(0, 3).map(preview)],
    };
  },
  async fetch(ctx, from, to) {
    const d = await schoolsoftData(ctx, from, to);
    return { events: d.events, food: d.food };
  },
};

const DAY_NAMES = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
const foodDay = (d: Date) => `${DAY_NAMES[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;

/**
 * Skolmaten.se – open menu, no login. API shape from the Skolmat HA integration
 * (github.com/Kaptensanders/skolmat): /api/4/menu/school/<slug>?year=&week=
 */
export const skolmaten: SchoolProvider = {
  meta: {
    id: "skolmaten",
    category: "school",
    name: "Skolmaten.se (skolmat)",
    description: "Veckans lunch från skolmaten.se – ingen inloggning. Används av en majoritet av kommunerna.",
    status: "beta",
    fields: [{ key: "url", label: "Skolans sida på skolmaten.se", type: "url", placeholder: "https://skolmaten.se/skolans-namn" }],
    guide: ["Sök upp skolan på skolmaten.se och kopiera adressen från webbläsaren.", "Välj vilket barn menyn gäller."],
  },
  async test(ctx) {
    const { food } = await this.fetch(ctx, new Date(), new Date(Date.now() + 14 * 86_400_000));
    if (!food?.length) throw new Error("Hittade ingen meny för skolan de kommande två veckorna.");
    return { ok: true, preview: food.slice(0, 5).map((f) => `${f.day}: ${f.dishes.join(", ")}`) };
  },
  async fetch(ctx, from) {
    const slug = new URL(ctx.str("url")).pathname.replace(/^\/+|\/+$/g, "");
    if (!slug) throw new Error("Klistra in skolans adress på skolmaten.se.");
    const headers = {
      accept: "application/json",
      referer: "https://skolmaten.se/",
      // Public web client token used by skolmaten.se's own front end.
      "client-token": "web-eaa12e50-c84c-4b4a-9cfe-4e3fcbcd9165",
    };
    type Day = { date: string; Meals?: { name: string }[] };
    const weeks: Day[] = [];
    for (const offset of [0, 7]) {
      const d = new Date(from.getTime() + offset * 86_400_000);
      const url = `https://skolmaten.se/api/4/menu/school/${encodeURIComponent(slug)}?year=${isoYear(d)}&week=${isoWeekNo(d)}`;
      const data = await getJson<{ WeekState?: { Days?: Day[] } }>(url, { headers });
      weeks.push(...(data.WeekState?.Days ?? []));
    }
    const food = weeks
      .filter((d) => d.Meals?.length)
      .map((d) => ({ child: "", day: foodDay(new Date(d.date)), dishes: d.Meals!.map((m) => m.name.trim()).filter(Boolean) }));
    return { events: [], food };
  },
};

function isoWeekNo(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86_400_000 + 1) / 7);
}
function isoYear(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return t.getUTCFullYear();
}

/** School lunch from the Skolmat integration in HA (Mashie, Matilda, FoodIT, Mateo, skolmat.info …). */
export const skolmatHa: SchoolProvider = {
  meta: {
    id: "skolmat-ha",
    category: "school",
    name: "Skolmat från Home Assistant",
    description: "Använd Skolmat-integrationen (HACS) – stöder Mashie, Matilda, FoodIT, Mateo, skolmat.info m.fl.",
    status: "stable",
    needsHa: true,
    fields: [{ key: "entityId", label: "Skolmat-kalender", type: "entity", domains: ["calendar"] }],
  },
  async test(ctx) {
    const { food } = await this.fetch(ctx, new Date(), new Date(Date.now() + 14 * 86_400_000));
    return { ok: true, preview: (food ?? []).slice(0, 5).map((f) => `${f.day}: ${f.dishes.join(", ")}`) };
  },
  async fetch(ctx, from, to) {
    const conn = haConnection();
    if (!conn) throw new Error("Home Assistant är inte anslutet.");
    const evs = await ha.calendarEvents(conn, ctx.str("entityId"), from, to);
    return { events: [], food: evs.map((e) => ({ child: "", day: foodDay(e.start), dishes: [e.title, ...(e.description ? [e.description] : [])].slice(0, 2) })) };
  },
};

export const schoolIcs: SchoolProvider = {
  meta: {
    id: "school-ics",
    category: "school",
    name: "Annan skolplattform (kalenderlänk)",
    description: "InfoMentor, Unikum, IST, Skola24, SchoolSoft med BankID m.fl. som kan exportera schemat som kalender.",
    status: "stable",
    fields: [
      { key: "platform", label: "Plattform", type: "select", options: ["SchoolSoft", "Unikum", "IST", "Skola24", "InfoMentor", "Edlevo", "Annan"].map((p) => ({ value: p, label: p })), default: "SchoolSoft" },
      { key: "url", label: "Kalenderlänk (ICS/webcal)", type: "url", secret: true, placeholder: "webcal://… eller https://….ics" },
    ],
    guide: [
      "Leta efter Prenumerera, Synka kalender eller Exportera schema i skolans app eller webb.",
      "Kopiera länken (börjar ofta med webcal:// eller slutar på .ics) och klistra in här.",
      "Lägg till en länk per barn och välj vilket barn den gäller.",
      "Matsedeln kommer inte med kalenderlänken. Lägg till Skolmaten.se eller Skolmat från Home Assistant för lunchen.",
    ],
  },
  async test(ctx) {
    const url = ctx.secret("url");
    if (!url) throw new Error("Klistra in kalenderlänken.");
    const now = new Date();
    const evs = await fetchIcs(url, now, new Date(now.getTime() + 21 * 86_400_000));
    return { ok: true, message: `${evs.length} händelser kommande tre veckor.`, preview: evs.slice(0, 5).map(preview) };
  },
  async fetch(ctx, from, to) {
    const url = ctx.secret("url");
    if (!url) return { events: [] };
    const evs = await fetchIcs(url, from, to);
    return { events: evs.map((e) => ({ ...e, gym: isGymLesson(e) })) };
  },
};

// ---------- InfoMentor via Home Assistant ----------

const SPAN = /(\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})/;
const pad2 = (n: number | string) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** A school day the platform has told us about. */
export interface KnownDay {
  /** "08:30" */
  s: string;
  e: string;
  /** Number of lessons, first and last lesson. */
  n?: number;
  f?: string;
  z?: string;
}

/**
 * The InfoMentor sensor ("William Skoldag" = "08:30–14:00") holds one school day, the next one, and
 * moves on at night. So the day is remembered by its date: tomorrow's hours are today's tomorrow.
 * Days more than a week old are dropped.
 */
export function rememberSchoolDay(known: Record<string, KnownDay>, st: Pick<HaState, "state" | "attributes"> | undefined, today: Date): Record<string, KnownDay> {
  const out = { ...known };
  const a = (st?.attributes ?? {}) as Record<string, unknown>;
  const m = st ? SPAN.exec(st.state) : null;
  const date = typeof a.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(a.date) ? a.date : "";
  if (m && date) {
    out[date] = {
      s: `${pad2(m[1])}:${m[2]}`,
      e: `${pad2(m[3])}:${m[4]}`,
      n: typeof a.lesson_count === "number" ? a.lesson_count : undefined,
      f: typeof a.first_lesson === "string" ? a.first_lesson : undefined,
      z: typeof a.last_lesson === "string" ? a.last_lesson : undefined,
    };
  }
  const oldest = ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7));
  for (const k of Object.keys(out)) if (k < oldest) delete out[k];
  return out;
}

/** The remembered days as events that span the school day. */
export function schoolDayEvents(known: Record<string, KnownDay>, from: Date, to: Date): SchoolEvent[] {
  const out: SchoolEvent[] = [];
  for (const [date, d] of Object.entries(known)) {
    const [y, mo, da] = date.split("-").map(Number);
    const [sh, sm] = d.s.split(":").map(Number);
    const [eh, em] = d.e.split(":").map(Number);
    const start = new Date(y, mo - 1, da, sh, sm);
    const end = new Date(y, mo - 1, da, eh, em);
    if (!(end > start) || end < from || start > to) continue;
    const detail = [d.n ? `${d.n} lektioner` : "", d.f && d.z ? `${d.f} – ${d.z}` : ""].filter(Boolean).join(" · ");
    out.push({ title: "Skoldag", start, end, allDay: false, description: detail || undefined, schoolDay: true });
  }
  return out;
}

function readKnown(ctx: ProviderCtx): Record<string, KnownDay> {
  try {
    const v = JSON.parse(ctx.secret("days") ?? "{}") as Record<string, KnownDay>;
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** The school's news from the InfoMentor sensor (attribute "news"). */
export function infomentorNews(st: Pick<HaState, "attributes"> | undefined): SchoolNewsItem[] {
  const list = st?.attributes?.news;
  if (!Array.isArray(list)) return [];
  return list.flatMap((n: Record<string, unknown>) => {
    const title = text(n?.title);
    if (!title) return [];
    const published = text(n.published);
    const iso = published && !Number.isNaN(Date.parse(published)) ? new Date(published).toISOString() : undefined;
    return [{ id: `${title}|${published}`, title, text: text(n.text) || text(n.body) || text(n.content) || text(n.summary), published: iso, files: [] }];
  });
}

/**
 * InfoMentor through its Home Assistant integration (HACS): the school hours from the "Skoldag" sensor,
 * the school's calendar posts (swim test, dress-up day …) and its news. Replaces a calendar link, which only
 * carries single events – the board then took one swim test for the whole school day.
 */
export const infomentorHa: SchoolProvider = {
  meta: {
    id: "infomentor-ha",
    category: "school",
    name: "InfoMentor från Home Assistant",
    description: "Skoltider, händelser och nyheter från InfoMentor-integrationen (HACS) i Home Assistant. En per barn.",
    status: "beta",
    needsHa: true,
    fields: [
      { key: "schoolDay", label: "Skoldag-sensor (t.ex. William Skoldag)", type: "entity", domains: ["sensor"] },
      { key: "entityId", label: "Skolkalender (händelser, valfri)", type: "entity", domains: ["calendar"] },
      { key: "news", label: "Skolans nyheter (valfri)", type: "entity", domains: ["sensor"] },
    ],
    guide: [
      "Installera InfoMentor-integrationen i Home Assistant (HACS) och logga in med barnets konto.",
      "Välj barnets Skoldag-sensor. Den ger skolans start- och sluttid för nästa skoldag; tavlan minns dagen tills den är över.",
      "Välj gärna skolkalendern för händelser som simprov och utklädningsdag, och sensorn för skolans nyheter.",
      "Lägg till en per barn och välj vilket barn den gäller.",
    ],
  },
  async test(ctx) {
    const conn = haConnection();
    if (!conn) throw new Error("Home Assistant är inte anslutet.");
    const dayId = ctx.str("schoolDay");
    const calId = ctx.str("entityId");
    if (!dayId && !calId) throw new Error("Välj Skoldag-sensorn eller skolkalendern.");
    const lines: string[] = [];
    if (dayId) {
      const st = await ha.state(conn, dayId).catch(() => null);
      if (!st) throw new Error(`Hittar inte ${dayId} i Home Assistant.`);
      const known = rememberSchoolDay({}, st, new Date());
      const [date, d] = Object.entries(known)[0] ?? [];
      lines.push(d ? `Skoldag ${date}: ${d.s}–${d.e}` : `Sensorn säger "${st.state}" – ingen tid att läsa än.`);
    }
    if (calId) {
      const now = new Date();
      const evs = await ha.calendarEvents(conn, calId, now, new Date(now.getTime() + 21 * 86_400_000));
      lines.push(...evs.slice(0, 4).map(preview));
    }
    return { ok: true, message: dayId ? "Skoldagen läses från Home Assistant." : "Kalendern läses från Home Assistant.", preview: lines };
  },
  async fetch(ctx, from, to) {
    const conn = haConnection();
    if (!conn) throw new Error("Home Assistant är inte anslutet.");
    const events: SchoolEvent[] = [];
    const dayId = ctx.str("schoolDay");
    if (dayId) {
      const st = await ha.state(conn, dayId).catch(() => undefined);
      const before = readKnown(ctx);
      const known = rememberSchoolDay(before, st, new Date());
      if (JSON.stringify(known) !== JSON.stringify(before)) ctx.remember("days", JSON.stringify(known));
      events.push(...schoolDayEvents(known, from, to));
    }
    const calId = ctx.str("entityId");
    if (calId) {
      const evs = await ha.calendarEvents(conn, calId, from, to);
      events.push(...evs.map((e) => ({ ...e, gym: isGymLesson(e), post: true })));
    }
    const newsId = ctx.str("news");
    const news = newsId ? infomentorNews(await ha.state(conn, newsId).catch(() => undefined)) : [];
    return { events, news };
  },
};
