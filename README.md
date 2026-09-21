# muziekfles.nl

Gratis online muzieklessen met muziekgames voor de basisschool. Gewone html, css
en javascript: geen bouwstap, wat in deze map staat is de site.

- `index.html` — de voorpagina met alle lessen
- `les1-drums.html`, `les2-drums.html`, `bodypercussion.html` — de lessen
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
6. **Doorlinken.** Zet de nieuwe les in het blok "Nog een les doen?" onderaan de
   andere lessen, en geef de nieuwe les zelf ook zo'n blok.
7. **Analytics.** Het Cloudflare-script staat onderaan elke bladzijde, vlak voor
   `</body>`. Kopieer je de bladzijde van een bestaande les, dan staat het er al.
8. **Nakijken.** Plak de link in <https://www.opengraph.xyz> om het kaartje te
   zien, en in <https://search.google.com/test/rich-results> voor de JSON-LD.
   Daarna in Google Search Console de nieuwe url laten indexeren.

## Dingen die er staan en moeten blijven staan

- `google21a895940f723b76.html` — hiermee weet Google Search Console dat de site
  van ons is. Weghalen of hernoemen en de koppeling is weg.
- `robots.txt` en `sitemap.xml` — de sitemap staat op
  <https://muziekfles.nl/sitemap.xml> en is in Search Console aangemeld.
- `fonts/` — Fredoka en Nunito staan op de site zelf, niet bij Google Fonts.
