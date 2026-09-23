# muziekfles.nl

Gratis online muzieklessen met muziekgames voor de basisschool. Gewone html, css
en javascript: geen bouwstap, wat in deze map staat is de site.

- `index.html` — de voorpagina met alle lessen
- `les1-drums.html`, `les2-drums.html`, `bodypercussion.html`, `bodypercussion2.html` — de lessen
- `css/wotto.css` — de huisstijl-tokens en de lettertypes, `css/site.css` — de rest
- `css/iconen.css` — de paar Phosphor-iconen die de site gebruikt
- `img/` — de plaatjes zoals de site ze laadt, `img/bron/` — de originelen
- `tools/` — scripts voor plaatjes en deelkaartjes (Python met Pillow)
- `stijl.md` — de stijlgids

## Een nieuwe les: doe dit voordat hij online gaat

Elke keer, ook als het "maar even een bladzijde erbij" is. Zonder deze stappen
staat de les er wel, maar vindt Google hem niet goed en ziet een gedeelde link
eruit als een kale grijze balk.

1. **Deelkaartje maken.** Elke les heeft een eigen kaartje van 1200 x 630, in de
   kleur van de les. Zet de les onderaan in `tools/deelkaart.py` en draai
   `python tools/deelkaart.py`. Verwijs ernaar in `og:image`, `twitter:image` en
   in de `image` van de JSON-LD, en geef `og:image:alt` een echte beschrijving.
2. **De kop van de bladzijde.** Kopieer de `<head>` van een bestaande les en pas
   aan: `<title>`, `description`, `canonical`, alle `og:` en `twitter:` regels en
   het JSON-LD-blok (`name`, `description`, `url`, `typicalAgeRange`, `teaches`
   en de kruimel onderaan).
3. **Plaatjes klein maken.** Origineel in `img/bron/`, dan
   `python tools/plaatje.py naam.png --breedte 480`. Het script print de `width`
   en `height` voor in de `<img>`. Altijd een `alt` die zegt wat je ziet, en
   `loading="lazy"` op alles wat je pas na scrollen ziet.
4. **Sitemap.** Nieuwe regel in `sitemap.xml`, met de datum van vandaag als
   `lastmod`. Verander je later veel aan een les, zet dan de datum opnieuw.
5. **Voorpagina.** Een kaart in `index.html`, en een regel in de `ItemList` van
   het JSON-LD daar.
6. **Niet doorlinken naar andere lessen.** Onderaan een les staat bewust geen
   "volgende les": dat leidt af, en dan klikt een kind door terwijl dat nog niet
   mag. De weg terug is de knop "Alle lessen" bovenaan, en die is genoeg.
7. **Analytics.** Het Cloudflare-script staat onderaan elke bladzijde, vlak voor
   `</body>`. Kopieer je de bladzijde van een bestaande les, dan staat het er al.
8. **Nakijken.** Plak de link in <https://www.opengraph.xyz> om het kaartje te
   zien, en in <https://search.google.com/test/rich-results> voor de JSON-LD.
   Daarna in Google Search Console de nieuwe url laten indexeren.

## Het moet werken op een digibord

De lessen worden gegeven op een Prowise-bord, en dat is geen grote telefoon. Er
zit een infraroodraam omheen met een eigen driver, vaak een beheerde Windows of
een oudere Android-browser erachter. Twee dingen die we daar hebben geleerd:

**Aanraken kwam niet aan.** Knoppen die op `click` luisteren deden het, maar de
pads, de drumfoto's en de sequencervakjes niet: die luisterden alleen naar
`pointerdown`, en dat kwam op het bord niet (goed) binnen. Music Lab en Ableton
Learning Music werkten er wel, want die luisteren op de oude manier.

- Alles wat je indrukt loopt daarom via `bijNeer()` in `js/drumkit.js`. Die
  probeert `pointerdown`, dan `touchstart`, dan `mousedown`, en als laatste
  `click`, en zorgt dat een aanraking maar één keer telt. **Hang nooit zelf een
  losse `pointerdown` aan iets**; gebruik `bijNeer`, ook in een nieuwe les.
- Gewone knoppen (start, kies een beat, een niveau) mogen op `click` blijven:
  dat werkt overal.
- Wat je sleept krijgt `touch-action` in de css, anders pakt het bord de veeg af
  om te scrollen: `none` op de pads en het sequencerbord, `pan-y` op de
  schuifjes, `manipulation` op de drumfoto's.
- Schrijf javascript die een oudere browser ook leest: geen `?.`, `??` of
  andere nieuwe syntax. Eén regel die hij niet kent en het hele script doet
  niets meer, terwijl de bladzijde er gewoon goed uitziet.

**Animaties sprongen in plaats van te veren.** Dat is waarschijnlijk geen fout
maar de instelling "minder beweging": staat in Windows "Animatie-effecten" uit
(beheerde schoolcomputers hebben dat vaak), of op Android "Animaties
verwijderen" aan, dan geeft de browser `prefers-reduced-motion` door en kiest de
site bewust een sprong in plaats van een veer (zie `stijl.md`). Nog niet op het
bord zelf nagekeken; een traag bord dat beeldjes overslaat geeft hetzelfde beeld.

Nakijken zonder bord: in Chrome DevTools de apparaatbalk aan voor aanraken, en
onder Rendering "Emulate CSS media feature prefers-reduced-motion". Maar het
echte bord blijft de enige echte toets, dus probeer een nieuwe les daar voordat
je hem in de klas gebruikt.

## Dingen die er staan en moeten blijven staan

- `google21a895940f723b76.html` — hiermee weet Google Search Console dat de site
  van ons is. Weghalen of hernoemen en de koppeling is weg.
- `robots.txt` en `sitemap.xml` — de sitemap staat op
  <https://muziekfles.nl/sitemap.xml> en is in Search Console aangemeld.
- `fonts/` — Fredoka en Nunito staan op de site zelf, niet bij Google Fonts.
