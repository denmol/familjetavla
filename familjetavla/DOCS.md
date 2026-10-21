# Familjetavla Test

Den här är en egen testversion (med Volvo/bensinbil och dammsugare) som kan köra **bredvid** originalet: egen data, egna inställningar och egen plats i sidomenyn. Slå på en annan port än originalets 8099 (t.ex. 8098) om plattan ska nå den direkt.

Öppna **Familjetavla Test** i sidomenyn. Första gången startar installationsguiden – den hittar själv det du har i Home Assistant (bilar, solel, värmepump, spabad, lampor …).

## Väggplatta (iPad/Android)

- **Via Home Assistant-appen:** öppna Familjetavla i sidomenyn. Inloggning sköts av Home Assistant.
- **Direkt:** slå på port 8099 under fliken Nätverk för tillägget och öppna `http://homeassistant.local:8099` på plattan. Sätt en PIN för inställningarna i guidens sista steg.

Se [README](https://github.com/murre87/familjetavla#väggplattan) för tips om helskärm, väckning med rörelsesensor och laddning.

## Sensorer tillbaka till Home Assistant

Tavlan skapar `sensor.familjetavla_barnvecka_<namn>` (hemma/borta) och `sensor.familjetavla_nasta_sophamtning`, som du kan använda i automationer – t.ex. sänka värmen i barnrummet när barnen är i andra hemmet.
