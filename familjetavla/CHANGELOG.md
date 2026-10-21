# Ändringar

## 0.11.0

- **Bensin- och dieselbilar.** En Volvo XC60 (eller annan bil utan batteri) upptäcks nu via sin bränslesensor och visas med bränslemätare i liter, räckvidd, hemma/borta och värmestart. Tankens storlek ställs in i guiden (standard 70 L).
- **Dammsugare.** Ny flik och ruta för robotdammsugare i Home Assistant: husets karta där du trycker på rummen du vill städa (Roborock och Dreame), starta, pausa, åk hem, hitta, sugkraft, inställningar (moppläge, volym, stör inte …) och förbrukningsdelar. Andra märken får start, paus, hem, sugkraft och karta.
- **Testtillägg.** Tillägget heter nu Familjetavla Test och har egen image, så det kan köra bredvid originalet.

## 0.10.0

- **Musik.** Tryck på en radiokanal så spelar den i vald högtalare: Google Home/Nest, Chromecast, Sonos eller annat som finns i Home Assistant. Välj en **förvald högtalare** (t.ex. Google Home i köket) under Inställningar → Huset → Musik, så räcker ett tryck på RIX FM för att det ska spela där.
- **Fliken Musik** har alla svenska kanaler: Sveriges Radio (P1–P3 och alla P4-kanaler, t.ex. P4 Östergötland) och övriga (Mix Megapol, RIX FM, Lugna Favoriter …). Sök, tryck för att spela, välj högtalare, och tryck ☆ för att lägga kanalen på startsidan. Väljer man en annan högtalare gäller det i fem minuter, sedan är den förvalda vald igen. Sveriges Radios kanaler kommer direkt från Sveriges Radio, övriga från den öppna katalogen radio-browser.info.
- **Liten ruta på startsidan** med bara favoriterna, t.ex. P4 Jönköping och RIX FM, med vad som spelas, Stopp och volym. Tryck på rutan för fliken.
- **Spotify:** finns integrationen Spotify i Home Assistant visar fliken vad som spelas, med Spela/Paus och Nästa. Annars står det steg för steg hur man lägger till den.
- Under Inställningar → Huset → Musik: **Prova** spelar en kanal direkt innan du lägger till den, och egna länkar till en ström går också. "Hämta från Home Assistant" hittar högtalarna själv (inte tv-apparater).

## 0.9.2

- **Välj vilka barn du får notiser om.** Under Påminnelser väljer varje vuxen vilka barn den följer – t.ex. en bonusförälder som bara vill ha sina egna barns gympapåse, utflykter och sjukdagar. Det du själv ska lämna, hämta eller skjutsa får du alltid, oavsett val.
- **Guiden tappar inte familjen.** Svarade postnummersökningen först när du redan gått vidare till "Vilka bor här?", försvann de du just lagt till. Nu ligger de kvar.

## 0.9.1

- **Utflykt och matsäck från skolan.** Skriver skolan om en utflykt, friluftsdag eller studiebesök med datum ("på torsdag", "27/10", "27 oktober"), kommer en påminnelse dagen innan och samma dag – med vad som ska med (matsäck, vattenflaska, ombyteskläder, skridskor …): "Ella · friluftsdag imorgon – ta med matsäck, vattenflaska". Den hamnar i Kom ihåg och i morgonnotisen.
- **Säkerhetskopia.** Under Inställningar → Klart: ladda ner alla inställningar som en fil, och återställ dem på en ny dator. Med ett lösenord följer även inloggningar och länkar med, krypterade. (Som tillägg i Home Assistant ingår tavlan redan i HA:s egna säkerhetskopior.)
- **Sjuk / VAB.** Markera ett barn som sjukt idag eller imorgon, på mobilsidan (fliken Sjuk) eller genom att trycka på barnets händelse på tavlan. Förskola, skola och aktiviteter stryks den dagen, ingen behöver lämna, hämta eller skjutsa (och får ingen påminnelse), Kom ihåg säger "Maja är sjuk idag" och de vuxna får en notis. "Frisk igen" tar tillbaka allt.
- **Morgonnotis till telefonen.** Kl 06:45 (eller när du vill) kommer dagens kom ihåg till telefonen: vad du själv ska lämna och hämta, gympapåse, det som saknas på hyllan, regnkläder, soporna, skolans nyheter. Allt som står på tavlan når er även när ingen tittar på den. Ställs in per vuxen under Påminnelser.
- **Träning som flyttas eller ställs in.** Ändrar föreningen tiden i kalendern (SportAdmin, laget.se …) får den som skjutsar en notis: "Ny tid: Skjutsa Ella till F14 – Träning tis 21 okt: nu 18:00 (var 17:30)". Försvinner den helt kommer "Inställt?". Byter ni bara skjuts (buss, någon annan) kommer ingen notis, och om en kalender inte gick att läsa sägs aldrig något vara inställt.
- **Kallt på morgonen:** under 5° visar Kom ihåg (och morgonnotisen) "Mössa och vantar", vid minusgrader "Mössa, vantar och varma kläder" – kvällen innan och på morgonen.
- **"Lämnat ✓" direkt i notisen.** Tryck på knappen i lämningsnotisen så bockas det som saknades på hyllan av, utan att gå till tavlan.
- **"Ta med" i telefonen.** Det du markerat under "Saknas på hyllan" (t.ex. blöjor och extrakläder) står nu i påminnelsen till den som lämnar på förskolan eller fritids: kvällen innan kl 20 och en stund före lämningen, "Lämna Maja på förskolan 07:30 – ta med: blöjor, extrakläder". Den vanliga morgonlämningen får då en notis också, så det inte glöms när ingen tittar på tavlan. Det står också i den vuxnas kalenderlänk. Kräver påminnelser till telefonen (steget Påminnelser i guiden).

## 0.9.0

- **Lägg till från mobilen.** En enkel sida för telefonen: skriv "Tandläkare", välj dag, tid och vem, så hamnar det i veckan på tavlan direkt. Under Handla lägger man till på inköpslistan och ser vad som redan står där. Länken finns i guidens sista steg och under "Lägg tavlan på hemskärmen". Lägg den på telefonens hemskärm så är det ett tryck bort.
- **Rutorna är nu moduler.** Varje ruta på startsidan (Maten, Bil, Energi …) är en egen fil med namn, storlek och vad den öppnar, så det blir lätt för fler att bidra med nya rutor. Inget ändras i hur tavlan ser ut.
- **Bidra:** en guide på GitHub (CONTRIBUTING.md, på svenska och engelska) med mallar för en ny datakälla och en ny ruta, och ett formulär för att berätta vad som saknas hos er.

## 0.8.9

- **Vad elen kostar just nu.** Energi visar "Kostar nu 4,10 kr/tim" utifrån det ni köper och elpriset den här timmen, eller "Gratis just nu" när solen räcker till huset. Startsidans energiruta visar det också.
- **Solbåge i vädret.** Under temperaturen på startsidan syns dagens soluppgång och solnedgång som en båge, med solen där den är just nu.

## 0.8.8

- **Bara riktiga mätare föreslås.** Guiden föreslår aldrig egna mallsensorer eller hjälpare (template, utility meter, statistik m.m.) för energi och elpris, bara integrationer som Tibber, SolarEdge, Huawei, P1-mätare och Nord Pool. Tavlan räknar resten själv, så det fungerar likadant i alla hem. Vill du ändå använda en egen sensor kan du välja den själv i listan.
- **Husets förbrukning stämmer även när ni säljer el.** Med både solel och elmätare räknar tavlan alltid själv: solel + köpt − såld. Tidigare kunde en egen "förbrukning"-sensor användas, och om den bara visar köpt el (som Tibber, 0 när ni säljer) såg det ut som att huset inte drog något. En egen hussensor används nu bara om solel eller elmätare saknas.
- **Rätt "Idag" även när mätaren hackar.** Om en mätare i Home Assistant en kort stund visar 0 och sedan sitt riktiga värde igen räknades dagen dubbelt (t.ex. 57 kWh köpt i stället för 32). Nu skiljs en kort glitch från en riktig nollställning vid midnatt eller timskifte, och små rättningar bakåt räknas inte alls.
- **Kungälv** fungerar igen i Sök på adress (sophämtning) och går att välja.

## 0.8.7

- **Elen live med animation.** Energi visar "Just nu": sol, elnät och hus med strömmen som rör sig mellan dem. Prickarna går fortare och linjerna blir tjockare ju mer effekt som flyter, och pilarna visar åt vilket håll (köper eller säljer). Värdena följer Home Assistant ungefär varje sekund, utan att tavlan laddas om. Startsidans energiruta följer också med live.
- **Tavlan räknar ut elen själv.** Välj växelriktare (solel) och elmätare (köpt och såld el) under Huset → Energi, så räknar tavlan ut husets förbrukning, hur mycket av solelen ni använder själva och hur stor del av förbrukningen solen täcker. Det fungerar med alla märken – SolarEdge, Huawei, Fronius, Tibber Pulse, P1-mätare m.fl. – och kräver inga egna mallsensorer i Home Assistant.
- **Idag på Energi:** solel, köpt, såld och förbrukad el sedan midnatt, egenanvändning, "Solen täcker %" och vad den köpta elen kostat timme för timme med elpriset. Välj mätarställningarna (kWh) i guiden; både livstidsmätare och mätare som nollställs varje dag eller timme fungerar.
- Mätare med en sensor för köpt och en för såld el (som Tibber Pulse "Effekt" och "Elproduktion") hittas automatiskt.

## 0.8.6

- **Nyheter från skolan (Vklass).** Skolans nyheter syns på Skolan under "Från skolan", och olästa från senaste veckan står i Kom ihåg. Tryck så visas hela texten, och bilagor som affischer visas direkt i rutan. Bilagorna hämtas via tavlan, så inloggningen syns aldrig i webbläsaren.
- **Lägg i veckan.** Från en nyhet: välj dag, tid och barn, t.ex. "Workshop på biblioteket" tis 14:30–16:30. Den hamnar i veckan och i Planera veckan, så ni kan välja vem som skjutsar. Tas bort från händelsen.
- Källkollen räknar också Vklass-nyheterna, bara antal.
- **Stora hem:** "Hämta från Home Assistant" fungerar även med många entiteter (provat mot ett hem med 1000). Förut hittades inga bilar, rum eller lampgrupper där.
- **Energi och elpris väljs smartare:** mätare som visar ett värde går före de som säger "unknown", och Tibber Pulse/P1 går först för elnätet. Som elpris föreslås bara sensorer med kr, SEK eller öre per kWh (inte t.ex. en batterinivå som råkar heta "spot…").
- **Välj själv växelriktare och elmätare** under Huset → Energi, t.ex. SolarEdge för solel och Tibber Pulse för elnätet. Listorna visar bara effektsensorer (W/kW) med aktuellt värde, fungerande först, och går att söka i. Saknas en sensor för huset räknar tavlan sol + köpt el.
- Telefoner (Companion-appen) föreslås inte längre som bilar, och otillgängliga kalendrar föreslås inte i guiden. Är en vald kalender otillgänglig säger tavlan det i klartext.
- **Örebro** fungerar igen i Sök på adress (sophämtning) och går att välja.

## 0.8.5

- **E-ink-läge** för e-ink-skärmar (t.ex. Boox eller Kindle): svart på vitt, linjer i stället för färgade fält, inga animationer och ingen nattsläckning. Välj Tema → E-ink under Startskärm i inställningarna.
- Svaret efter tänd/släck väntar nu upp till 6 sekunder, så att molnstyrda lampor inte felaktigt får "svarade inte".

## 0.8.4

- **Skriv in vem som skjutsar.** Välj "Annan skjutsar" och skriv namnet – t.ex. Marina, Ola eller Therese. Namnen sparas och kommer upp som knappar nästa gång, både i händelsen och i Planera veckan.
- **Veckan visar vem som kör.** Vid varje träning står namnet på den som skjutsar dit och hem ("Emil ⇄", "Emil → ← Marina"), så alla ser veckans planering direkt på startsidan.
- **All info från kalendern.** Tryck på en händelse så visas kalenderns anteckningar (t.ex. "Samling 11:50", vad man ska ta med), med klickbara länkar. Platsen öppnas i kartan.
- **Svar när du tänder och släcker.** Efter varje tryck på en lampa eller ett rum kollar tavlan att det faktiskt hände: "✓ Taklampa tänd" – eller "⚠ Taklampa svarade inte – är den offline eller strömlös?".
- **Rullande omsorgsschema.** Förskola och fritids kan ha olika tider på 2 eller 4 veckors schema (t.ex. vid skiftarbete): välj Rullande 2/4 veckor, fyll i varje vecka och vilken vecka som är vecka 1.
- **Svenska lag och InfoMentor** finns som egna val bland kalendrarna, med instruktion om var prenumerationslänken finns.
- Veckan på egen sida är lite tätare så att alla sju dagar ryms även på liggande Android-plattor.
- **Starta och stoppa laddningen av bilen** från bilsidan, om bilens integration i Home Assistant har en laddknapp. Bilens eget laddschema (schemalagd laddning, billigaste timmarna, klar till avgång) visas under.

## 0.8.3

- **Läxor och prov från Vklass** syns på skolsidan under läxor, prov och inlämningar (Vklass "Uppgifter"), i stället för att blandas in bland lektionerna.
- **Tryck på en läxa eller ett prov** så visas allt: dag och tid, lärarens hela beskrivning (t.ex. "Inför provet ska du kunna…") och en knapp till uppgiften i Vklass.
- **Ljus: varje lampa för sig.** Rummen visar sina lampor var för sig – tänd och släck en i taget – och ett reglage för ljusstyrka på lampor som går att dimma. "Tänd alla"/"Släck alla" finns kvar.
- **"+2" i veckan** går att trycka på och öppnar hela veckan.
- **Har ni Edlevo?** Ny hjälp i guidens skolsteg: Edlevo kan inte hämtas automatiskt (bara BankID), men skolmaten.se, omsorgstider och kalenderlänk ger det viktigaste – med knappar som lägger till dem.
- **Prova i molnet** (Codespaces) startar tavlan av sig själv, även när man öppnar den från mobilen.
- Lektionsnamnen städas: "Svenska (5:a:TH-26__SV)" blir "Svenska". Lärarnas planeringar visas inte.
- Rättat: uppdateringen kunde ge **"manifest unknown"** om man uppdaterade inom en halvtimme från en ny version. Nu annonseras en version till Home Assistant först när den går att hämta.

## 0.8.2

- **Skolmaten från Vklass kommer fram.** Matsedeln för idag, imorgon och resten av veckan hämtas för varje barn – provat mot ett riktigt Vklass-konto.
- **Förskolebarn i Vklass** följer med: barn utan lektioner (t.ex. på förskolan) hoppades förut över helt. Nu syns deras mat och omsorgstid.
- Omsorgstiden ("07:15 - 16:00") läses rätt.
- Veckokollen provar nu även Vklass, SportAdmin och laget.se med riktiga konton/kalendrar och Willys/Hemköps produktsökning (bara antal syns i rapporten).

## 0.8.1

- **Sophämtning från SRV Återvinning** (Botkyrka, Haninge, Huddinge, Nynäshamn och Salem): skriv gatuadress, tryck Testa och välj din adress. Bygger på samma öppna tjänst som Waste Collection Schedule i Home Assistant.
- **Alla sopleverantörer provade på riktigt.** Varje renhållare i Sök på adress har provats mot en riktig adress. 18 fungerar: Borås, Danderyd, Falkenberg, Varberg, Herrljunga/Vårgårda, June Avfall (Jönköping, Habo, Mullsjö), Kretslopp Sydost, Ljungby, Lund, Lycksele, Mark, Orust, Partille, Skellefteå, SSAM (Växjö m.fl.), Stenungsund, Uppsala Vatten och Vafab Miljö – plus SRV.
- Tio svarade inte och går inte längre att välja: Boden, Gotland, Kiruna, Kungälv, Lerum, Lidköping, Mölndal, Nacka, Örebro och Roslagsvatten. Har du valt någon av dem säger tavlan det tydligt; använd Eget schema eller Från Home Assistant. De provas varje vecka och kommer tillbaka när de fungerar.
- Rättat: **Lund** gav aldrig träff (deras tjänst vill ha sökningen i ett annat format). June Avfall känner nu igen Habo och Mullsjö från postnumret.
- **Veckovis källkoll**: GitHub provar varje vecka alla renhållare, SRV, skolmaten.se, elpriset, vädret och postnummersökningen mot de riktiga tjänsterna, och bevakar koden i Waste Collection Schedule som sopkopplingarna bygger på. Ändras något skapas ett ärende, så att en rättad version kan komma innan någon märker felet.

## 0.8.0

- **Tryck på ett kort** så öppnas dess egen sida: Maten → veckans mat, Skolan → skolsidan, Kom ihåg, Inköpslista och Hos oss (kommande fyra veckor). Elpris, bil, ljus och värme går till sina flikar. Knappar och kryssrutor i korten fungerar som vanligt.
- **Tillbaka och Hem** överst på alla sidor och flikar. Androids bakåtknapp och webbläsarens bakåt fungerar också.
- **Skolsidan** per barn: dagens hela schema (tid, ämne, sal), läxor, prov och inlämningar de kommande två veckorna, och veckan måndag–fredag.
- **Ny version finns**: tavlan säger till när en nyare version är publicerad och hur man uppdaterar (tillägg eller Docker). Kollar GitHub var sjätte timme i bakgrunden; stängs av med `UPDATE_CHECK=off`.
- **Installera som app**: knapp på tavlan och i guidens sista steg – installerar direkt där webbläsaren tillåter det, annars stegen för iPad, Android eller dator, och tips om kioskapp för väggplattan.
- **Ingen scroll på surfplattor** (iPad och Android, liggande och stående): startsidan, sidorna och flikarna ryms alltid på skärmen. Innehållet krymper lite vid behov, men aldrig under läsbar storlek; det som inte ryms ligger bakom en knapp, t.ex. "+3 dagar – visa hela veckan" eller "+2 kort till". Liggande surfplatta får flikarna i en list till vänster så att tavlan får hela höjden. Mobilen scrollar som vanligt.
- Startsidan visar sammanfattningar – Kom ihåg de 4 viktigaste, inköpslistan de 5 första, veckan 3 händelser per dag – och sidan bakom kortet visar allt.
- **Prova i molnet**: knappen "Öppna i GitHub Codespaces" startar tavlan hos GitHub utan egen server, för att prova med Vklass och kalendrar.
- **Självkontroll på alla skärmar** vid varje ändring: iPad liggande/stående, iPad mini, Android-platta liggande/stående, Android-mobil, iPhone, iPhone SE och iPhone liggande – 11 sidor var. Kontrollerar att inget hamnar bakom flikraden, att surfplattor inte scrollar, att inget sticker ut åt sidan och att inga fel uppstår.
- Självkontrollen granskar också text: ingen text bakom eller ovanpå annan, inget kapat, i både ljust och mörkt läge, guiden och rutorna medräknade.
- Rättat: **"String must contain at most 30 character(s)"** vid Hämta från Home Assistant. Långa namn från HA kortas nu i stället för att stoppa sparandet, och många givare eller rum ryms.
- Rättat: aktivitetsnamn kapades till några bokstäver på smala mobiler; datum kring sommartid/vintertid i skolschemat.

## 0.7.0

- Nytt kort: **Skolan idag** – när varje barn börjar och slutar ("Ella 08:10–14:30"), med Idrott-märke. Visar nästa skoldag när dagens är slut, och bara barn som bor hos er just då. Kommer från schemat i Vklass, SchoolSoft eller kalenderlänken; kvällsmöten räknas inte.
- Startskärm: välj **storlek** per ruta – Auto, Liten, Normal eller Stor. Auto gör rutorna större när ni visar få och mer kompakta när ni visar många.
- De rutor som ligger först i er ordning hamnar högst upp i högerkolumnen på iPad (och direkt under Nu på telefonen), så det viktigaste alltid syns.

## 0.6.2

- Nytt kort på startsidan: **Maten** – dagens skollunch per barn (efter kl 14 morgondagens, efter fredagslunchen måndagens) och kvällens middag, i stor text. Slås på av sig självt och hamnar först under Nu-rutan; flyttas eller stängs av under Startskärm.
- Rättat: skolmat för t.ex. den 1:a kunde matcha "19/10".

## 0.6.1

- Skolsteget: "Saknas er skolplattform? Berätta vilken" – länk till ett färdigt formulär på GitHub (plattform, kommun, hur föräldrar loggar in, om du kan testa).

## 0.6.0

**Genomlysning efter att 0.5.0 inte startade**
- Tillägget och containern stängs nu av direkt vid stopp, omstart och uppdatering (tidigare hängde den tills den tvångsavslutades).
- Home Assistant startar om tillägget om det slutar svara (watchdog).
- En skadad inställningsfil sparas undan som `config.json.corrupt-…` i stället för att tyst skrivas över, och varje sparning behåller en `.bak`. Filer skrivs säkert till disk.
- Tidsgränser gäller nu hela hämtningen – en källa som slutar svara mitt i kan inte låta tavlan hänga.
- Ett bakgrundsfel kan inte längre stoppa hela tavlan.
- iPad liggande: högerkolumnen var tom och resten ihoptryckt – nu fördelas korten efter innehåll, och flikradens tomma plats används när det bara finns en flik.
- "Planera veckan" finns alltid, även för familjer utan förskola – det är också där veckans middagar planeras.
- Postnumret slås upp av sig självt och sparas även om uppslaget misslyckas.
- En tom rad (person eller kalender utan namn) låser inte längre guiden; felmeddelanden på svenska.
- PIN-koden måste vara 4–8 siffror. Ören med decimalkomma går att skriva på iPad. Elområde följer postnumret.
- Kom ihåg tjatar inte om en lämning som redan passerat.
- Visar "Ingen kontakt med tavlan just nu" när servern inte svarar, och ett meddelande när något inte gick att spara.
- Kalenderlänken från Påminnelser pekar på port 8099 när den skapas via Home Assistant.
- Svenska: "2 källor", "1 timme", "Fem korta steg".
- Ny: **SchoolSoft** med användarnamn och lösenord – kalender och matsedel, barnen kopplas som i Vklass. Beta.
- InfoMentor, Unikum m.fl.: guiden för kalenderlänk säger hur man får med matsedeln.

**Provas på riktigt före varje release:** GitHub bygger den riktiga imagen och en webbläsare går igenom guiden och tavlan – som Home Assistant-tillägg bakom ingress (med en låtsas-Supervisor), efter omstart, och som Docker med PIN och upplåsning av en ny skärm. Chromium startas i imagen och avstängningen tidtas. Releasen publiceras bara om allt går igenom.

## 0.5.1

- Rättat: Docker-imagen och tillägget startade inte ("Cannot find package '@fastify/static'"). Några serverpaket kom inte med i imagen.
- CI bygger och startar nu den riktiga imagen före varje release.

## 0.5.0

**Rättningar efter granskning 3**
- Matsedel utan datum ("Måndag" från Vklass) gäller bara innevarande vecka – hoppar aldrig fram till nästa. Veckonummer på matsedeln ("vecka 43") används när det finns.
- "Samma som lunchen" bryr sig inte om tillbehör som potatis, pasta och sallad.
- APT och "stänger 15:00" betyder tidig stängning: omsorgen ligger kvar och Kom ihåg säger "kolla när förskolan stänger". Bara heldags stängt/planeringsdag tar bort dagen.
- Ingen 30-minutersnotis för den vanliga morgonlämningen – bara när just den morgonen är ändrad. Kvällsnotisen skickas igen om planen ändras efter kl 20.

**Nytt**
- **Krockar i Planera veckan:** har en vuxen något i sin egen kalender vid lämning eller hämtning (eller resa/semester hela dagen) står det på knappen, t.ex. "Emil ⚠ – Kundmöte 16:00–17:15". Valda vuxna som är upptagna räknas som "att lösa".
- **Middagsfavoriter:** tryckbara favoriter som tavlan lär sig av era middagar, och "Som vanligt: tacoskal, ost" lägger samma varor i inköpslistan.
- **Saknas på hyllan:** markera blöjor, extrakläder, regnkläder … på förskolans lämning – det står i Kom ihåg tills ni bockar av.
- **Återkommande per veckodag** för förskolan, t.ex. "Tisdag: Utflykt – packa ryggsäck och frukt".

## 0.4.0

- **Veckans mat** i Planera veckan: barnens skol- och förskolelunch per dag bredvid familjens middag. Varnar när middagen är samma som lunchen, och "Att handla" lägger varorna i inköpslistan.
- Middagen syns i veckan på tavlan, och "Middag ikväll" i Kom ihåg på eftermiddagen.

## 0.3.1

- **Standard för skjuts i guiden** per kalender ("Ella brukar ta sig dit/hem: cyklar själv"), och knappen "Alltid så" i Planera veckan. Ett standardval räknas som planerat – självgående barn ger inga gula varningar.
- Vklass-barn kopplas på alla delnamn ("Karl Leo Andersson" → Leo) när det är entydigt.
- Kalenderlänken förklarar ärligt var den fungerar (iPhone/Mac på hemmanätet, Remote Calendar i Home Assistant – inte Google Kalender).

## 0.3.0

- **Planera veckan:** allt de kommande 7 dagarna som behöver någon som lämnar, hämtar eller skjutsar – med ett tryck per val. Det som saknar ansvarig syns i gult, och Kom ihåg säger till om det gäller idag eller imorgon.
- **Påminnelser till rätt telefon** via Home Assistant-appen: X minuter innan det man själv ansvarar för, kvällen innan kl 20 och "Planera veckan" söndag kl 19. Eller en egen kalenderlänk per vuxen att prenumerera på.
- **Kortare guide:** första gången bara Hem, Familjen, Kalendrar, Skola och förskola – sedan Klart. Hemmet (bil, ljus, värme), sopor, inköp, elpris och påminnelser läggs till från sista steget eller senare.

## 0.2.0

- **Ingen familjeform som standard:** barn bor "hela tiden" tills du väljer växelvis. Nytt: eget 14-dagarsschema (2-2-3, 2-2-5-5, varannan helg …).
- **Hos oss:** barn med olika rytm får en rad var, och det står "byter hem" i stället för "åker".
- **Förskola och fritids:** omsorgstider per veckodag, vem som lämnar och hämtar (ändras per dag på tavlan), dagens tider från Vklass, och varning en vecka i förväg för planeringsdagar och stängt.
- **Matcher alla veckor, träningar bara när barnet är här:** nu ett tydligt val på idrottskalendern.
- **Skärmar låses upp med PIN en gång:** andra enheter på nätverket kommer inte åt tavlan.
- Vklass-barn kopplas automatiskt på förnamn. Skjutsval sparas på kalenderhändelsens UID, så de finns kvar om träningen flyttas.
- Startskärmen ryms på en iPad, tydligare guide, säkrare beroenden.

## 0.1.0

- Första versionen: familjetavla, installationsguide, hämtning från Home Assistant, leverantörsmoduler för skola, mataffär, sopor och elpris.
