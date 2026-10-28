
# Rowwen Hèze – Kaart

Een eenvoudige, mobielvriendelijke website voor de Kaart voor slotconcertweekend van Rowwen Hèze.

## Bestanden

- `index.html` – de webpagina
- `styles.css` – vormgeving en mobiele weergave
- `app.js` – zoomen, slepen en de legenda weergeven
- `config.js` – titel, kaartbestand, groepskleuren en cirkels
- `assets/campingkaart.jpg` – de campingkaart

## Lokaal aanpassen

1. Plaats de nieuwe campingkaart in de map `assets`.
2. Gebruik bij voorkeur de bestandsnaam `kaart.png`.
3. Pas de groepen en kleuren aan in `config.js`.
4. Open `index.html` in een browser om de website te testen.

## Cirkels op de kaart

Elk legenda-item kan meerdere cirkels op de kaart tonen. Voeg voor elke cirkel
een positie toe aan de `circles`-lijst met eigen `x`, `y` en `diameter`:

```js
{
  name: "Groep 1",
  color: "#E53935",
  house_numbers: [431, 432, 434],
  circles: [
    { x: 300, y: 300, diameter: 120 },
    { x: 470, y: 500, diameter: 90 }
  ]
}
```

`house_numbers` worden alleen in de legenda getoond; ze maken geen markeringen
op de kaart. De legenda toont de kleur, groepsnaam en huisjesnummers in aparte
kolommen.

De coördinaten en diameter zijn in pixels van de originele kaartafbeelding.
Het nulpunt (`x: 0, y: 0`) ligt linksboven. Alle cirkels gebruiken de kleur
van het legenda-item en bewegen en schalen mee met de kaart.

## Online zetten met GitHub Pages

1. Maak een repository aan op GitHub, bijvoorbeeld
   `rowwenheze-kaart`.
2. Upload de kaart in de map `assets`.
3. Ga in de repository naar Settings.
4. Open Pages.
5. Kies bij de publicatiebron `Deploy from a branch`.
6. Selecteer de branch `main` en de map `/ (root)`.
7. Sla de instellingen op.

Na het publiceren is de website bereikbaar via:

https://JOUW-GITHUB-NAAM.github.io/rowwenheze-campingkaart/

Vervang `JOUW-GITHUB-NAAM` door je eigen GitHub-gebruikersnaam.

## De kaart ieder jaar vernieuwen

1. Vervang `assets/campingkaart.jpg` door de nieuwe kaart.
2. Pas de groepsnamen en kleuren aan in `config.js`.
3. Upload de gewijzigde bestanden naar GitHub.

De website houdt dezelfde URL zolang de repositorynaam,
je GitHub-gebruikersnaam en de Pages-instellingen hetzelfde blijven.

## Let op

- Gebruik in `config.js` geldige hex-kleuren, zoals `#E53935`.
- Houd de bestandsnaam van de kaart gelijk, of pas `image` in
  `config.js` aan.
- GitHub Pages is bedoeld voor statische websites. Er is geen
  server of database nodig.
- Bij een openbare repository is de website doorgaans voor iedereen
  toegankelijk. Publiceer dus geen gegevens die privé moeten blijven.
