# Stijlgids — muziekfles.nl

> Overgenomen van de stijlgids van studiowotto.com, met de afspraken die op deze
> site anders liggen erbij. De tokens onderaan staan in `css/wotto.css` en zijn
> de enige plek waar deze getallen thuishoren: staat er ergens in `site.css` een
> los getal, dan hoort dat hier vandaan te komen.

---

## Karakter

Dezelfde huisstijl als studiowotto.com, maar dan voor kinderen van groep 5 tot
en met 8. Vrolijk en stevig: volle kleuren, dikke lijnen, ronde vormen.

Twee dingen die deze site strenger doet dan de studiosite:

- **Geen schaduwen.** De vorm komt van de inktlijn eromheen, niet van diepte.
- **Alles wat je kunt aanraken is groot.** Een pad, een knop of een foto is
  bedoeld voor een kindervinger op een tablet, niet voor een muis.

---

## Kleuren

Volle merkkleuren, of wit en ink. Geen verzachte of getinte varianten. Waar je
normaal een lichte tint zou pakken, gebruik je een patroon — meestal een
stippellijn.

| Kleur | Hex | Rol op deze site |
|---|---|---|
| **Blauw** | `#0061E0` | Actie: knoppen, links, de graad waar je op speelt |
| **Koraal** | `#FF5757` | De kick, en de hartjes die je nog over hebt |
| **Zon** | `#FFF069` | De snare, gemarkeerde woorden, meldingen |
| **Mint** | `#38C789` | Goed geraakt |
| **Bubblegum** | `#F9B3D5` | De stippellijn tussen de blokken |
| Ink | `#1A2233` | Tekst, en elke rand |
| Wit | `#FFFFFF` | Vlakken en panelen |

### Tekst op kleur

Ink op wit, koraal, zon, mint en bubblegum. **Wit alleen op blauw en op ink.**
Wit op koraal of mint haalt het contrast niet.

Praktisch: alles wat een kleurvlak krijgt, krijgt ink-tekst — behalve blauw.
In de code staat dat als `--op-kleur`.

### Gestippeld = er nog niet

Een gestippelde rand betekent altijd hetzelfde: dit bestaat nog niet of kan nog
niet. De lessen die nog komen, een graad die op slot zit, de startknop die nog
niet mag. Nooit als versiering.

---

## Typografie

Fredoka voor koppen, knoppen en labels. Nunito voor lopende tekst.

### Schaal

`12, 14, 16, 18, 20, 24, 32, 40, 48` px. **16 is de basis.** Zit een maat er
tussenin, dan kies je de dichtstbijzijnde uit de rij — niet een eigen getal.

Grote koppen schalen mee met het scherm via `clamp()`, en ook daarvoor zijn het
vaste tokens. Elf verschillende clamp-formules zoals deze site ooit had is geen
schaal maar een verzameling.

### Gewichten en regelafstand

- Fredoka bold (700) voor koppen, semibold (600) voor labels.
- Nunito regular voor lopende tekst.
- Regelafstand: lopende tekst ~1,6 · koppen 1,1–1,25.

### Taal

De teksten zijn voor groep 5. Korte zinnen die één ding zeggen, en geen
abstracties waar een kind eerst iets anders voor moet weten. Liever *"het
boem-tsak dat onder bijna elk liedje zit"* dan *"de maat waar de rest van de
band op meespeelt"*.

---

## Layout

| | |
|---|---|
| Maximale breedte | `--content-max` — 1200px |
| Zijmarge | `--gutter` — `clamp(16px, 5vw, 64px)`, schaalt mee |
| Ruimte tussen blokken | `--section-y` — `clamp(40px, 6vw, 72px)` |

Eén kolom op een telefoon, meerdere op een groter scherm. Kaartenrijen klappen
in op de beschikbare ruimte (`repeat(auto-fit, minmax(...))`), niet op een vaste
breakpoint. De enige echte breakpoint is **720px**: daaronder wordt het
speelveld één kolom en worden de graden twee bij twee.

### Ruimteschaal

`4, 8, 12, 16, 24, 32, 48, 64` px. Marges en padding komen uit deze rij, zodat
alles op hetzelfde ritme zit.

### Afronding

| Token | Waarde | Waarvoor |
|---|---|---|
| `--radius-sm` | 8px | kleine dingen: een stip, een noot |
| `--radius-md` | 16px | knoppen die geen pil zijn |
| `--radius` | 24px | panelen, kaders, foto's |
| `--radius-pill` | 999px | knoppen, pilletjes, badges |

### Randen

Overal `4px solid var(--ink)` op grote vlakken, `3px` op kleine (knoppen,
pilletjes). Nergens een schaduw.

---

## Beweging

Alles veert met `--bounce` (`cubic-bezier(0.34, 1.56, 0.64, 1)`).

Twee dingen die we onderweg hebben geleerd en die hier blijven staan:

- **De bounce hoort op het opkomen, niet over de hele animatie.** Zet je hem op
  het geheel, dan schiet de overshoot voorbij de laatste keyframe en is de puls
  na een derde van de tijd al voorbij.
- **Iets dat opveert mag de bladzijde niet breder maken.** Een transform telt mee
  voor de breedte van de pagina; steekt hij eruit, dan verschijnt er een
  schuifbalk en verspringt de opmaak. Hoe ver iets opveert staat daarom per
  element in `data-puls`: klein en vrijstaand mag 32%, een grote foto tegen de
  rand hooguit 12%.

Bij `prefers-reduced-motion` gaat alle beweging uit, maar blijft de terugkoppeling
staan — een sprong in plaats van een veer, nooit niets.

---

## Geluid

Deze site maakt geluid, en daar gelden eigen regels voor. Ze staan uitgebreid in
`js/drumkit.js`, kort samengevat:

- **Nooit een stem starten of stoppen tijdens het spelen.** Alles loopt door; een
  envelope doet het aan- en uitzetten.
- **Alles wordt 12 ms vooruit gepland** (`VOORSPRONG`). `Tone.now()` is het
  moment van het laatst afgeronde blok, dus precies daarop plannen valt in het
  verleden.
- **Een aanslag mag nooit wegvallen.** Botst er iets, dan schuift het een
  milliseconde op — het wordt niet overgeslagen.

---

## Tokens

Deze staan in `css/wotto.css` en gelden voor de hele site.

```css
:root {
  /* Kleuren */
  --blauw: #0061E0;
  --koraal: #FF5757;
  --mint: #38C789;
  --zon: #FFF069;
  --bubblegum: #F9B3D5;
  --ink: #1A2233;
  --wit: #FFFFFF;

  /* Fonts */
  --font-kop: 'Fredoka', sans-serif;
  --font-body: 'Nunito', sans-serif;

  /* Tekstschaal */
  --text-xs:   0.75rem;   /* 12 */
  --text-sm:   0.875rem;  /* 14 */
  --text-base: 1rem;      /* 16 */
  --text-md:   1.125rem;  /* 18 */
  --text-lg:   1.25rem;   /* 20 */
  --text-xl:   1.5rem;    /* 24 */
  --text-2xl:  2rem;      /* 32 */
  --text-3xl:  2.5rem;    /* 40 */
  --text-4xl:  3rem;      /* 48 */

  /* Koppen die meeschalen */
  --text-hero:     clamp(2.4rem, 7vw, 5rem);
  --text-kop:      clamp(1.4rem, 3.5vw, 1.9rem);
  --text-kaartkop: clamp(1.4rem, 5vw, 2rem);
  --text-melding:  clamp(1.6rem, 7vw, 3.2rem);
  --text-cijfer:       clamp(2.4rem, 10vw, 4rem);
  --text-cijfer-klein: clamp(1.6rem, 6vw, 2.4rem);
  --text-aftellen: clamp(4rem, 13vw, 8rem);
  --text-label:    clamp(0.85rem, 2.2vw, 1.15rem);

  /* Ruimte */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;

  /* Layout */
  --content-max: 1200px;
  --gutter: clamp(16px, 5vw, 64px);
  --section-y: clamp(40px, 6vw, 72px);

  /* Vorm */
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius: 24px;
  --radius-pill: 999px;

  /* Beweging */
  --bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```
