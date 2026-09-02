/* Klap mee — de oefening bij body percussion

   Op het digibord. De klapjes komen van rechts naar links; staat er een op het
   vak links, dan klapt de klas. Er is geen score en er zijn geen hartjes: het
   gaat erom dat je het sámen doet, en een cijfer erbij maakt daar een wedstrijd
   van.

   De juf zet bovenaan het tempo en het aantal maten, en kiest hoeveel klappen
   er per maat komen. Die instellingen blijven bewaard, zodat je ze niet elke
   les opnieuw hoeft te zetten.

   Het plannen werkt hetzelfde als in het ritmespel: elke stap wordt VOORUIT
   seconden van tevoren neergezet, en de rAF-lus rekent alleen nog uit waar een
   klapje op dit moment staat. */

// ============================================================
//  Wat er te kiezen valt
// ============================================================

// Zestien stappen is één maat van vier tellen. Een x is een klap.
const KLAPPATRONEN = [
  { id: 'een',   naam: '1 klap',   uitleg: 'alleen op de eerste tel',
    patroon: 'x...............' },
  { id: 'twee',  naam: '2 klappen', uitleg: 'op de eerste en de derde tel',
    patroon: 'x.......x.......' },
  { id: 'vier',  naam: '4 klappen', uitleg: 'op elke tel',
    patroon: 'x...x...x...x...' },
  { id: 'ritme', naam: 'Het ritme', uitleg: 'op elke tel, en dubbel op de vier',
    patroon: 'x...x...x...x.x.' }
];

const KLAP_STAPPEN = 16;      // zestienden in één maat
const KLAP_VOORUIT = 2.6;     // seconden dat een klapje van tevoren te zien is
const KLAP_AANLOOP = 4;       // tellen aftellen voordat de eerste maat begint
// Waar de ring staat leest hij uit de css (--doel-x), zodat die maat maar op
// een plek staat. Deze waarde is alleen het vangnet.
const KLAP_DOEL = 96;

// Vanaf de helft mag er af en toe een klapje bij. Nooit eentje weg: iets wat
// wegvalt haalt een klas uit de maat, iets extra's hoor je gewoon aankomen.
const KLAP_VARIATIE_KANS = 0.34;

const KLAP_INSTELLINGEN = [
  { id: 'begin', label: 'Begintempo', min: 50, max: 140, step: 5, waarde: 80, achter: 'bpm' },
  { id: 'eind',  label: 'Eindtempo',  min: 60, max: 200, step: 5, waarde: 130, achter: 'bpm' },
  { id: 'maten', label: 'Aantal maten', min: 4, max: 32, step: 2, waarde: 16, achter: 'maten' }
];

// ============================================================
//  Het scherm
// ============================================================

const klapEl = document.getElementById('klapspel');
const klapBaanEl = klapEl && klapEl.querySelector('[data-klap-baan]');
const klapNotenEl = klapEl && klapEl.querySelector('[data-klap-noten]');
const klapAftelEl = klapEl && klapEl.querySelector('[data-klap-aftellen]');
const klapKnopEl = klapEl && klapEl.querySelector('[data-klap-start]');
const klapBpmEl = klapEl && klapEl.querySelector('[data-klap-bpm]');
const klapMaatEl = klapEl && klapEl.querySelector('[data-klap-maat]');
const klapTotaalEl = klapEl && klapEl.querySelector('[data-klap-totaal]');
const klapSchuifEl = klapEl && klapEl.querySelector('[data-klap-schuifjes]');
const klapKeuzeEl = klapEl && klapEl.querySelector('[data-klap-keuze]');

// ============================================================
//  De instellingen, en ze onthouden
// ============================================================

const KLAP_SLEUTEL = 'wotto-muziekfles-klap';

const klapStand = { patroon: 'ritme' };
KLAP_INSTELLINGEN.forEach((p) => { klapStand[p.id] = p.waarde; });

// Elke waarde apart nakijken, net als bij de schuifjes van de drumles: opslag
// van een oudere versie mag de bladzijde nooit stukmaken.
function laadKlapStand() {
  let bewaard = null;
  try {
    bewaard = JSON.parse(localStorage.getItem(KLAP_SLEUTEL));
  } catch (e) {
    return;
  }
  if (!bewaard || typeof bewaard !== 'object') return;

  KLAP_INSTELLINGEN.forEach((p) => {
    const w = parseFloat(bewaard[p.id]);
    if (isFinite(w) && w >= p.min && w <= p.max) klapStand[p.id] = w;
  });
  if (KLAPPATRONEN.some((k) => k.id === bewaard.patroon)) klapStand.patroon = bewaard.patroon;
}

function bewaarKlapStand() {
  try {
    localStorage.setItem(KLAP_SLEUTEL, JSON.stringify(klapStand));
  } catch (e) {
    // Opslag kan uit staan. De oefening werkt gewoon door.
  }
}

function patroonNu() {
  return KLAPPATRONEN.find((k) => k.id === klapStand.patroon) || KLAPPATRONEN[3];
}

// ============================================================
//  Het klapgeluid
// ============================================================

// Een klap is een korte ruisstoot met de nadruk rond de anderhalve kilohertz.
// De ruis loopt door en de envelope doet het aan- en uitzetten, precies zoals de
// stemmen in de drumles: zo hoeft er tijdens het spelen nooit iets gestart te
// worden.
const klapVol = new Tone.Volume(-3).connect(master);
const klapFilter = new Tone.Filter({ type: 'bandpass', frequency: 1600, Q: 1.1 }).connect(klapVol);
const klapEnv = new Tone.AmplitudeEnvelope({
  attack: 0.001, decay: 0.12, sustain: 0, release: 0.02
}).connect(klapFilter);
const klapRuis = new Tone.Noise('white');
klapRuis.connect(klapEnv);

function startKlapRuis() {
  if (klapRuis.state !== 'started') klapRuis.start();
}

function klapNu(tijd) {
  klapEnv.triggerAttack(tijd);
}

// ============================================================
//  De oefening
// ============================================================

let klap = null;
let klapLus = 0;

// Het tempo loopt in rechte lijn van het begin- naar het eindtempo, verdeeld
// over het aantal maten. Bij één maat is er niets te verdelen.
function klapBpmVoor(maat) {
  const totaal = Math.max(1, klapStand.maten - 1);
  const deel = Math.min(1, Math.max(0, maat) / totaal);
  return klapStand.begin + (klapStand.eind - klapStand.begin) * deel;
}

// Welke stappen in deze maat een klap krijgen. Vanaf de helft mag er af en toe
// eentje bij, op een plek waar nog niets staat.
function klappenVoor(maat) {
  const basis = patroonNu().patroon.split('');
  if (maat < Math.ceil(klapStand.maten / 2)) return basis;
  if (Math.random() > KLAP_VARIATIE_KANS) return basis;

  const vrij = [];
  for (let i = 0; i < KLAP_STAPPEN; i += 2) if (basis[i] === '.') vrij.push(i);
  if (!vrij.length) return basis;

  basis[vrij[Math.floor(Math.random() * vrij.length)]] = 'x';
  return basis;
}

function startKlap() {
  if (!klapEl) return;
  cancelAnimationFrame(klapLus);

  if (Tone.getContext().state !== 'running') {
    startGeluid().then(startKlap).catch(() => {});
    return;
  }
  startRuis();
  startKlapRuis();

  klap = {
    loopt: true,
    stapNr: 0,                       // zestienden vanaf het allereerste begin
    stapTijd: Tone.now() + 0.6,
    bpm: klapStand.begin,
    maat: 0,
    klappen: klappenVoor(0),
    noten: [],
    aanloop: [],
    aftelGetal: 0,
    aftelKlaar: false,
    eersteKlap: 0,
    einde: 0
  };

  klapKnopEl.textContent = 'Stop';
  klapZetKnoppen(true);
  toonKlapAftellen(0);
  werkKlapBalkBij();

  // Meteen vullen, niet pas bij het eerste beeld: dan staat het aftellen al
  // gepland voordat er iets getekend hoeft te worden.
  vulKlapAan(Tone.now());
  klapLus = requestAnimationFrame(klapStap);
}

function stopKlap() {
  if (!klap) return;
  klap.loopt = false;
  cancelAnimationFrame(klapLus);
  klap.noten.forEach((n) => n.el.remove());
  klap.noten = [];

  // Wat er nog vooruit gepland stond mag niet doorspelen over een gestopte
  // oefening heen.
  klapEnv.cancel(Tone.now());
  basEnv.cancel(Tone.now());
  akkEnv.cancel(Tone.now());
  tikEnv.cancel(Tone.now());

  toonKlapAftellen(0);
  klapKnopEl.textContent = 'Start';
  klapZetKnoppen(false);
  werkKlapBalkBij();
}

// De aanloop telt één maat af. Daarna begint maat 1.
const KLAP_AANLOOP_STAPPEN = KLAP_AANLOOP * 4;

function vulKlapAan(nu) {
  while (klap.stapTijd < nu + KLAP_VOORUIT) {
    const stap = klap.stapNr;
    const inAanloop = stap < KLAP_AANLOOP_STAPPEN;
    const maat = Math.floor((stap - KLAP_AANLOOP_STAPPEN) / KLAP_STAPPEN);
    const inMaat = ((stap - KLAP_AANLOOP_STAPPEN) % KLAP_STAPPEN + KLAP_STAPPEN) % KLAP_STAPPEN;

    const bpm = inAanloop ? klapStand.begin : klapBpmVoor(maat);
    const stapDuur = 15 / bpm;             // 60 / bpm / 4 zestienden
    const tel = Math.floor(stap / 4);

    // Nieuwe maat: nieuwe klappen uitzoeken.
    if (!inAanloop && inMaat === 0) {
      klap.maat = maat;
      klap.klappen = klappenVoor(maat);
    }

    if (inAanloop) {
      if (stap % 4 === 0) {
        tik(klap.stapTijd, stap === KLAP_AANLOOP_STAPPEN - 4);
        klap.aanloop.push(klap.stapTijd);
      }
    } else if (maat < klapStand.maten) {
      const akkoord = akkoordVoor(tel);

      // De polka: oom op de tel, pah op de helft ertussen.
      if (inMaat % 4 === 0) basNoot(klap.stapTijd, akkoord, 60 / bpm, inMaat / 4);
      if (inMaat % 4 === 2) akkoordStoot(klap.stapTijd, akkoord, 60 / bpm);

      // En een simpele beat eronder, zodat de pols er stevig in zit.
      if (inMaat === 0 || inMaat === 8) speel('kick', klap.stapTijd);
      if (inMaat === 4 || inMaat === 12) speel('snare', klap.stapTijd);
      if (inMaat % 4 === 0) speel('hihat', klap.stapTijd);

      if (klap.klappen[inMaat] === 'x') {
        klapNu(klap.stapTijd);
        klap.noten.push(maakKlapNoot(klap.stapTijd));
        if (!klap.eersteKlap) klap.eersteKlap = klap.stapTijd;
      }
    }

    klap.bpm = bpm;
    klap.stapTijd += stapDuur;
    klap.stapNr += 1;

    // Klaar? Nog even laten uitklinken, dan stoppen.
    if (!inAanloop && maat >= klapStand.maten && !klap.einde) {
      klap.einde = klap.stapTijd + 0.4;
    }
  }
}

function klapDoelX() {
  if (!klapBaanEl) return KLAP_DOEL;
  const uit = parseFloat(getComputedStyle(klapBaanEl).getPropertyValue('--doel-x'));
  return isFinite(uit) ? uit : KLAP_DOEL;
}

function maakKlapNoot(tijd) {
  const el = document.createElement('span');
  el.className = 'klap-noot';
  klapNotenEl.appendChild(el);
  return { tijd: tijd, el: el };
}

// ============================================================
//  Het beeld
// ============================================================

function klapStap() {
  if (!klap || !klap.loopt) return;
  const nu = Tone.now();

  vulKlapAan(nu);
  werkKlapAftellenBij(nu);

  // Van rechts naar links. Op zijn moment staat een klapje op het doelvak;
  // KLAP_VOORUIT seconden daarvoor staat hij tegen de rechterrand.
  const breedte = klapBaanEl ? klapBaanEl.clientWidth : 0;
  const doelX = klapDoelX();
  const over = [];

  klap.noten.forEach((noot) => {
    const deel = (noot.tijd - nu) / KLAP_VOORUIT;
    const x = doelX + deel * (breedte - doelX);

    // Voorbij het doel mag hij nog even doorlopen, dan is hij weg.
    if (x < -60) {
      noot.el.remove();
      return;
    }
    noot.el.style.transform = 'translateX(' + x + 'px)';
    noot.el.classList.toggle('raak', Math.abs(noot.tijd - nu) < 0.08);
    over.push(noot);
  });

  klap.noten = over;
  werkKlapBalkBij();

  if (klap.einde && nu > klap.einde) {
    stopKlap();
    return;
  }
  if (klap.loopt) klapLus = requestAnimationFrame(klapStap);
}

function werkKlapAftellenBij(nu) {
  if (!klapAftelEl || klap.aftelKlaar) return;

  if (klap.eersteKlap && nu >= klap.eersteKlap) {
    klap.aftelKlaar = true;
    toonKlapAftellen(0);
    return;
  }
  let getal = 0;
  for (let i = 0; i < klap.aanloop.length; i++) if (nu >= klap.aanloop[i]) getal = i + 1;
  if (getal !== klap.aftelGetal) {
    klap.aftelGetal = getal;
    toonKlapAftellen(getal);
  }
}

function toonKlapAftellen(getal) {
  if (!klapAftelEl) return;
  klapAftelEl.textContent = getal ? String(getal) : '';
  if (!getal || minderBeweging.matches || !klapAftelEl.animate) return;
  klapAftelEl.animate(
    [{ transform: 'scale(0.6)' }, { transform: 'scale(1)' }],
    { duration: 240, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
  );
}

function werkKlapBalkBij() {
  if (!klapEl) return;
  klapBpmEl.textContent = Math.round(klap ? klap.bpm : klapStand.begin);
  klapMaatEl.textContent = klap ? Math.min(klapStand.maten, klap.maat + 1) : 0;
  klapTotaalEl.textContent = klapStand.maten;
}

// ============================================================
//  De knoppen van de juf
// ============================================================

function bouwKlapKnoppen() {
  if (!klapSchuifEl || !klapKeuzeEl) return;

  klapSchuifEl.innerHTML = KLAP_INSTELLINGEN.map((p) => `
    <div class="klap-schuif">
      <label for="klap-${p.id}">${p.label}<b data-toon="${p.id}"></b></label>
      <input type="range" id="klap-${p.id}" data-klap="${p.id}"
             min="${p.min}" max="${p.max}" step="${p.step}">
    </div>
  `).join('');

  klapKeuzeEl.innerHTML = KLAPPATRONEN.map((k) => `
    <button class="klap-keus" type="button" data-patroon="${k.id}">
      <span class="klap-keus-naam">${k.naam}</span>
      <span class="klap-keus-uitleg">${k.uitleg}</span>
    </button>
  `).join('');

  KLAP_INSTELLINGEN.forEach((p) => {
    document.getElementById('klap-' + p.id).value = klapStand[p.id];
  });
  werkKlapKnoppenBij();
}

function werkKlapKnoppenBij() {
  KLAP_INSTELLINGEN.forEach((p) => {
    const toon = klapSchuifEl.querySelector('[data-toon="' + p.id + '"]');
    if (toon) toon.textContent = klapStand[p.id] + ' ' + p.achter;
  });
  klapKeuzeEl.querySelectorAll('.klap-keus').forEach((knop) => {
    knop.setAttribute('aria-pressed', String(knop.dataset.patroon === klapStand.patroon));
  });
  werkKlapBalkBij();
}

// Tijdens het lopen staan de instellingen vast: halverwege het tempo omgooien
// haalt de klas uit de maat.
function klapZetKnoppen(bezig) {
  if (klapSchuifEl) klapSchuifEl.querySelectorAll('input').forEach((el) => { el.disabled = bezig; });
  if (klapKeuzeEl) klapKeuzeEl.querySelectorAll('button').forEach((el) => { el.disabled = bezig; });
}

// ============================================================
//  Aanzetten
// ============================================================

if (klapEl) {
  laadKlapStand();
  bouwKlapKnoppen();
  werkKlapBalkBij();

  klapKnopEl.addEventListener('click', () => {
    if (klap && klap.loopt) stopKlap();
    else startKlap();
  });

  klapSchuifEl.addEventListener('input', (e) => {
    if (e.target.type !== 'range') return;
    klapStand[e.target.dataset.klap] = parseFloat(e.target.value);
    werkKlapKnoppenBij();
  });

  klapSchuifEl.addEventListener('change', (e) => {
    if (e.target.type === 'range') bewaarKlapStand();
  });

  klapKeuzeEl.addEventListener('click', (e) => {
    const knop = e.target.closest('.klap-keus');
    if (!knop) return;
    klapStand.patroon = knop.dataset.patroon;
    werkKlapKnoppenBij();
    bewaarKlapStand();
  });
}
