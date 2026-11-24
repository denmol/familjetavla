import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { api } from "./api";
import { canPrompt, inIngress, isInstalled, onInstallChange, platform, promptInstall, useSecureUrl } from "./install";

/** Where the phone opens "Lägg till från mobilen": the direct port when we are inside HA. */
export function quickAddUrl() {
  const base = inIngress() ? `http://${location.hostname}:8099/` : `${location.origin}${location.pathname}`;
  return `${base}#/lagg-till`;
}

/** "Lägg tavlan på hemskärmen" – a real install button where the browser allows it, otherwise the steps for this device. */
export function InstallHelp() {
  const [, rerender] = useState(0);
  const secureUrl = useSecureUrl(api);
  useEffect(() => {
    const off = onInstallChange(() => rerender((n) => n + 1));
    return () => {
      off();
    };
  }, []);
  if (isInstalled()) return <p className="muted">Tavlan är redan installerad på den här enheten.</p>;
  const direct = `http://${location.hostname}:8099/`;
  if (inIngress()) {
    return (
      <div className="stack" style={{ gap: 8 }}>
        <p>
          Du tittar på tavlan inne i Home Assistant. För att få den som egen app: öppna <b>{direct}</b> på surfplattan eller telefonen (porten
          8099 behöver vara öppen i tilläggets inställningar) och installera därifrån.
        </p>
      </div>
    );
  }
  const p = platform();
  const secure = window.isSecureContext;
  return (
    <div className="stack" style={{ gap: 10 }}>
      {secureUrl && p !== "ios" && !canPrompt() && (
        <>
          <a className="btn primary" style={{ alignSelf: "flex-start" }} href={secureUrl}>
            <Icon name="install" size={20} /> Öppna säker adress och installera
          </a>
          <small className="muted">
            Tavlan körs även med https på <b>{secureUrl.split("#")[0]}</b> (samma certifikat som Home Assistant). Där kan Chrome installera den som
            en riktig app. Adressen behöver nå tavlan på hemnätet.
          </small>
        </>
      )}
      {canPrompt() && (
        <button className="btn primary" style={{ alignSelf: "flex-start" }} onClick={() => void promptInstall()}>
          <Icon name="install" size={20} /> Installera Familjetavla
        </button>
      )}
      {p === "ios" && (
        <ol className="steps-list">
          <li>Öppna tavlan i Safari.</li>
          <li>
            Tryck på <b>Dela</b> (fyrkanten med en pil uppåt).
          </li>
          <li>
            Välj <b>Lägg till på hemskärmen</b> → <b>Lägg till</b>.
          </li>
          <li>Starta Familjetavla från hemskärmen – den öppnas i helskärm utan adressfält.</li>
        </ol>
      )}
      {p === "android" && !canPrompt() && (
        <ol className="steps-list">
          <li>Öppna tavlan i Chrome.</li>
          <li>
            Tryck på <b>⋮</b> uppe till höger → <b>Installera app</b> eller <b>Lägg till på startskärmen</b>.
          </li>
          <li>Starta Familjetavla från startskärmen.</li>
        </ol>
      )}
      {p === "desktop" && !canPrompt() && (
        <p>
          I Chrome eller Edge: klicka på installera-ikonen längst till höger i adressfältet. I Safari på Mac: Arkiv → <b>Lägg till i Dock</b>.
        </p>
      )}
      {!secure && !secureUrl && p !== "ios" && (
        <small className="muted">
          Tavlan körs utan https på hemnätet, så Chrome gör en genväg som öppnas i webbläsaren i stället för en riktig app. För en surfplatta på
          väggen fungerar en kioskapp som <b>Fully Kiosk Browser</b> bäst: helskärm, skärmen alltid på och start när plattan startar. Har
          Home Assistant https (Let's Encrypt, DuckDNS …) kan tavlan använda samma certifikat – se "Https" i README.
        </small>
      )}
    </div>
  );
}
