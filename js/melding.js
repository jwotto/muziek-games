/* Een melding groot in beeld, met confetti

   Voor iets wat je moet zien terwijl je ergens anders op de bladzijde bezig
   bent: een gedeelte dat opengaat, een graad die je hebt gehaald. De melding
   ligt over de hele bladzijde heen maar vangt geen klikken en gaat vanzelf
   weer weg -- je hebt iets verdiend, je wordt niet onderbroken.

   Los bestand omdat twee lessen hem gebruiken: in de eerste ritmeles gaan er
   de geluiden en de game mee open, in de tweede de geluiden. Laden na
   drumkit.js, want minderBeweging komt daarvandaan. */

const meldingEl = document.querySelector('[data-melding]');
let meldTimer = 0;

// Groot midden in beeld, waar je ook op de bladzijde bent. Dat is nodig als
// het slot ergens anders zit dan waar je het openmaakt: in de eerste ritmeles
// speel je de game vrij bij de schuifjes, terwijl de game zelf beneden staat.
function meld(kop, regel) {
  if (!meldingEl) return;
  meldingEl.innerHTML = '<b>' + kop + '<span>' + regel + '</span></b>';
  clearTimeout(meldTimer);
  meldTimer = setTimeout(() => { meldingEl.textContent = ''; }, 4200);

  confetti(54, meldingEl);
  const kaart = meldingEl.firstElementChild;
  if (minderBeweging.matches || !kaart.animate) return;
  // De bounce hoort alleen op het opkomen. Zet je hem over de hele animatie, dan
  // schiet de overshoot voorbij de laatste keyframes en fadet het kaartje al weg
  // terwijl het nog groot in beeld hoort te staan.
  kaart.animate([
    { transform: 'scale(0.3) rotate(-14deg)', opacity: 0, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { transform: 'scale(1) rotate(-3deg)', opacity: 1, offset: 0.12, easing: 'linear' },
    { transform: 'scale(1) rotate(-3deg)', opacity: 1, offset: 0.85, easing: 'ease-in' },
    { transform: 'scale(1.15) rotate(-3deg)', opacity: 0 }
  ], { duration: 4200 });
}

// Losse snippers die uit een vak vallen en zichzelf opruimen. Geen bibliotheek:
// een handjevol spannetjes met elk een eigen val is precies genoeg. Het vak
// (laag) moet position: relative of fixed hebben, anders vallen ze ergens anders.
const SNIPPERKLEUREN = ['--koraal', '--zon', '--blauw', '--mint', '--bubblegum'];

function confetti(aantal, laag) {
  if (!laag || minderBeweging.matches || !laag.animate) return;
  const val = laag.clientHeight + 60;

  for (let i = 0; i < aantal; i++) {
    const snipper = document.createElement('span');
    snipper.className = 'snipper';
    snipper.style.background = 'var(' + SNIPPERKLEUREN[i % SNIPPERKLEUREN.length] + ')';
    snipper.style.left = Math.round(Math.random() * 100) + '%';
    if (i % 3 === 0) snipper.style.borderRadius = '50%';
    laag.appendChild(snipper);

    const beweging = snipper.animate([
      { transform: 'translate3d(0, -30px, 0) rotate(0deg)' },
      { transform: 'translate3d(' + Math.round((Math.random() - 0.5) * 200) + 'px, ' +
                   val + 'px, 0) rotate(' + Math.round((Math.random() * 4 - 2) * 360) + 'deg)' }
    ], {
      duration: 1500 + Math.random() * 1100,
      delay: Math.random() * 320,
      easing: 'cubic-bezier(0.3, 0.2, 0.7, 1)',
      fill: 'both'
    });
    beweging.onfinish = () => snipper.remove();
  }
}
