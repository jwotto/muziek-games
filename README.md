# muziekfles.nl

Gratis online muzieklessen met muziekgames voor de basisschool. Gewone html, css
en javascript: geen bouwstap, wat in deze map staat is de site.

- `index.html` — de voorpagina met alle lessen
- `les1-drums.html`, `les2-drums.html`, `bodypercussion.html`, `bodypercussion2.html`,
  `ritmeskater.html` — de lessen
- `js/drumkit.js` — de drumgeluiden en alles wat de lessen delen: `master`,
  `bijNeer`, `animeer`, `stilNu`. Staat op elke lespagina.
- `js/polka.js` — de polka onder de ritmespellen, `js/hiphop.js` — de hiphopbeat
  onder de ritme skater, `js/lijfgeluid.js` — boem, klap en de klaphanden
- `css/wotto.css` — de huisstijl-tokens en de lettertypes, `css/site.css` — de rest
- `css/iconen.css` — de paar Phosphor-iconen die de site gebruikt
- `img/` — de plaatjes zoals de site ze laadt, `img/bron/` — de originelen
- `tools/` — scripts voor plaatjes en deelkaartjes (Python met Pillow); `tools/sprites.py` zet de
  sprite sheet van de ritme skater om naar `img/renner-sprites.webp`
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
een oudere Android-browser erachter. Wat we daar hebben geleerd:

**De animaties moeten altijd werken, op elk bord en elke computer.** Het
meeknikken van het bord, de plaatjes die op de maat groter worden, de pads die
meeslaan, het aftellen en de confetti: dat hoort bij de les, de klas leest de
maat eraf. Het mag nooit uitgaan door een instelling van de computer
("Animatie-effecten" of "minder beweging"), en ook niet op een oude browser.
Het kost bijna niets: het zijn een paar korte veren per tel, alleen
`transform` (dat doet de grafische kaart), en geen zware effecten. Het geluid
plannen kost meer dan dit.

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

**Animaties sprongen in plaats van te veren.** Op het bord werden de drumstellen
in één klap groter en kleiner, en de klapjes en de knikkende rand van het
ritmevierkant bewogen helemaal niet. Alle veren en pulsen liepen via
`el.animate()`, en een oudere browser kent die niet (of maar half). Dan werd de
animatie overgeslagen en bleef alleen het harde verspringen van de classes over.

- Alles wat beweegt loopt daarom via `animeer()` in `js/drumkit.js`. Kent de
  browser `animate()`, dan gebruikt hij die; zo niet (of gooit hij een fout),
  dan doet `animeer()` dezelfde beweging zelf, beeldje voor beeldje met
  `requestAnimationFrame`. Hij kan transform en opacity, offsets, easing per
  keyframe, `delay`, `fill` en `onfinish`. **Roep nooit zelf `el.animate()`
  aan**; gebruik `animeer`, ook in een nieuwe les.
- **De site kijkt niet naar "minder beweging".** Staat in Windows
  "Animatie-effecten" uit (beheerde schoolcomputers hebben dat vaak), of op
  Android "Animaties verwijderen" aan, dan geeft de browser
  `prefers-reduced-motion` door. Eerst sloeg de site dan alle pulsen over, en
  dat was de echte reden dat het bord niet meebewoog. Dat is eruit: de beweging
  hoort bij de les. **Zet er in een nieuwe les geen `prefers-reduced-motion`
  of `matchMedia` voor beweging in.**

**Na stoppen bleef er zacht een toon of piepje hangen.** De bas, het akkoord en
de tik zijn oscillators die altijd aan staan; een envelope zet per noot het
volume even open. Bij stoppen werd alles wat vooruit gepland stond gewist met
`env.cancel()`. Maar Tone laat een noot in drie stappen wegzakken, en viel je
stop precies tussen de laatste twee, dan werd ook die laatste stap naar nul
gewist en bleef het volume op een kiertje staan (rond de -42 dB).

- Stoppen gaat daarom via `stilNu(env)` in `js/drumkit.js`: eerst wissen, dan de
  noot netjes laten uitklinken met `triggerRelease`. **Gebruik nooit een losse
  `env.cancel()`** om te stoppen; gebruik `stilNu`.

**Na wegklikken en terugkomen deed de muziek gek.** De spellen zetten hun noten
een paar seconden vooruit klaar en plannen de rest bij elk beeldje dat de
browser tekent (`requestAnimationFrame`). Klik je de bladzijde weg, dan tekent
de browser niets meer, maar de audioklok loopt door. Bij terugkomen liep het
spel seconden achter en haalde het alles in één keer in: alle gemiste noten
tegelijk.

- Daarom zet `js/drumkit.js` de audioklok stil zodra de bladzijde onzichtbaar
  wordt (`visibilitychange`) en laat hem weer lopen bij terugkomen. Alles gaat
  dan verder waar het was, alsof het op pauze stond. Dat geldt vanzelf voor
  elke bladzijde die `drumkit.js` laadt.
- **Plan in een nieuw spel altijd op de audioklok** (`Tone.now()`), niet op
  `Date.now()` of `performance.now()`, en laad `drumkit.js`. Dan pauzeert het
  vanzelf mee. Een eigen klok loopt door terwijl de muziek stilstaat, en dan
  heb je hetzelfde probleem terug.

Nakijken zonder bord: in Chrome DevTools de apparaatbalk aan voor aanraken, en
onder Rendering "Emulate CSS media feature prefers-reduced-motion" op reduce
(alles moet dan gewoon blijven bewegen). Hoe een oude
browser het doet zie je door in de console `Element.prototype.animate =
undefined` te typen en daarna iets te laten bewegen: dan loopt alles via de
reserve van `animeer()`. Maar het
echte bord blijft de enige echte toets, dus probeer een nieuwe les daar voordat
je hem in de klas gebruikt.

## Dingen die er staan en moeten blijven staan

- `google21a895940f723b76.html` — hiermee weet Google Search Console dat de site
  van ons is. Weghalen of hernoemen en de koppeling is weg.
- `robots.txt` en `sitemap.xml` — de sitemap staat op
  <https://muziekfles.nl/sitemap.xml> en is in Search Console aangemeld.
- `fonts/` — Fredoka en Nunito staan op de site zelf, niet bij Google Fonts.
