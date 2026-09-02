# Wotto huisstijl

Basis voor alle Studio Wotto gamification webapps. Vrolijk, speels, duidelijk. Gemaakt voor kinderen, dus grote knoppen, veel kleur en alles mag een beetje stuiteren.

## Kleuren

| Naam | Hex | Gebruik |
|---|---|---|
| Blauw | `#0061E0` | Primaire kleur, knoppen, links |
| Koraal | `#FF5757` | Accenten, fout, energie |
| Mint | `#38C789` | Goed, score, bevestiging |
| Zon | `#FFF069` | Highlights, achtergrondvlakken |
| Bubblegum | `#F9B3D5` | Zachte accenten, decoratie |
| Ink | `#1A2233` | Tekst en icons |

Ink is een voorstel, pas aan naar de waarde die je nu al gebruikt als die anders is.

Kleuren altijd vol gebruiken, geen transparante of afgezwakte tinten.

## Typografie

Fredoka voor koppen en UI elementen zoals knoppen en scores.
Nunito voor lopende tekst en uitleg.

Beide gratis via Google Fonts.

```css
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400..700&family=Nunito:wght@400..900&display=swap');
```

Richtlijn voor gewichten. Fredoka Medium (500) of SemiBold (600) voor koppen, Nunito Regular (400) voor body en Bold (700) voor nadruk.

## Icons

Phosphor Icons in de Bold weight, altijd in ink. Gratis en open source (MIT).

Via CDN

```html
<script src="https://unpkg.com/@phosphor-icons/web"></script>
<i class="ph-bold ph-music-notes"></i>
```

Via npm

```
npm i @phosphor-icons/web
```

Voor React is er `@phosphor-icons/react` met `weight="bold"`.

## Vormtaal

Grote afrondingen, minimaal 16px op kaarten en 999px (pill) op knoppen.

Dotted border is de zachte variant. Gebruik die voor secundaire elementen, lege staten en placeholders.

```css
.soft {
  border: 3px dotted var(--blauw);
  border-radius: 24px;
}
```

## Beweging

Knoppen zijn bouncy. Overshoot op hover, indrukken op click.

```css
.knop {
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.knop:hover { transform: scale(1.06); }
.knop:active { transform: scale(0.94); }
```

Respecteer `prefers-reduced-motion` en zet animaties dan uit.

## Tokens

Alle waardes staan als CSS variabelen in `wotto.css`, die kun je direct in de repo droppen.
