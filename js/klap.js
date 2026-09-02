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

// Hoeveel klappen er in één tel passen. De maat wordt per tel opgebouwd: elke
// tel krijgt een van de aantallen hieronder, of een rust. Zo is geen maat
// hetzelfde en blijft de tel toch altijd voelbaar.
const KLAPNIVEAUS = [
  { id: 'een',  naam: '1 klap per tel',
    uitleg: 'op elke tel een klap, soms een rust', keuzes: [1] },
  { id: 'twee', naam: '1 of 2 per tel',
    uitleg: 'een klap of twee, soms een rust', keuzes: [1, 2] },
  { id: 'vier', naam: '1, 2 of 4 per tel',
    uitleg: 'een, twee of vier klappen, soms een rust', keuzes: [1, 2, 4] }
];

// Hoe vaak een tel leeg blijft. De eerste tel van een maat nooit: daar hangt de
// hele klas aan, en een gat op de een raak je met zijn dertigen niet meer terug.
const KLAP_RUST_KANS = 0.18;

// Zoveel maten eerst gewoon op de tel, ongeacht wat er is ingesteld. Even samen
// in de maat komen voordat het gaat afwisselen.
const KLAP_AANLOOPMATEN = 2;

const KLAP_STAPPEN = 16;      // zestienden in één maat
const KLAP_VOORUIT = 2.6;     // seconden dat een klapje van tevoren te zien is
const KLAP_AANLOOP = 4;       // tellen aftellen voordat de eerste maat begint
// Waar de ring staat leest hij uit de css (--doel-x), zodat die maat maar op
// een plek staat. Deze waarde is alleen het vangnet.
const KLAP_DOEL = 96;

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

const klapStand = { patroon: 'twee' };
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
  if (KLAPNIVEAUS.some((k) => k.id === bewaard.patroon)) klapStand.patroon = bewaard.patroon;
}

function bewaarKlapStand() {
  try {
    localStorage.setItem(KLAP_SLEUTEL, JSON.stringify(klapStand));
  } catch (e) {
    // Opslag kan uit staan. De oefening werkt gewoon door.
  }
}

function niveauNu() {
  return KLAPNIVEAUS.find((k) => k.id === klapStand.patroon) || KLAPNIVEAUS[1];
}

// ============================================================
//  Het klapgeluid
// ============================================================

// Een handklap van één ruisstoot klinkt als een snare. Wat er een klap van
// maakt is dat het er eigenlijk drie zijn: een handklap kaatst na, en de 909
// bootst dat na met drie hele korte stootjes vlak achter elkaar en daarna een
// langere staart. Dat ratelende begin is het hele verschil.
//
// Elk stootje krijgt zijn eigen envelope. Eén envelope drie keer achter elkaar
// aanslaan binnen twintig milliseconden vraagt om gedoe; vier losse envelopes
// zijn goedkoop en doen precies wat er staat.
const KLAP_TIKKEN = [0, 0.009, 0.019];   // de naklappers, in seconden
const KLAP_STAART = 0.027;

// De metronoom uit polka.js staat in de drumles zacht onder de muziek. Hier is
// hij het houvast voor de hele klas, dus die gaat flink omhoog. Dit raakt alleen
// deze bladzijde: elke bladzijde bouwt zijn eigen stemmen op.
tikVol.volume.value = -1;

const klapVol = new Tone.Volume(-3).connect(master);

// Rond de 1100 hertz zit het lichaam van een klap; de hoogdoorlaat haalt het
// gerommel eronder weg zodat hij droog blijft.
const klapBand = new Tone.Filter({ type: 'bandpass', frequency: 1100, Q: 1.4 }).connect(klapVol);
const klapHoog = new Tone.Filter({ type: 'highpass', frequency: 480, Q: 0.7 }).connect(klapBand);
const klapMix = new Tone.Gain(0.5).connect(klapHoog);

const klapRuis = new Tone.Noise('white');

const klapTikEnvs = KLAP_TIKKEN.map(() => {
  const env = new Tone.AmplitudeEnvelope({
    attack: 0.0004, decay: 0.009, sustain: 0, release: 0.005
  }).connect(klapMix);
  klapRuis.connect(env);
  return env;
});

// De staart is langer en zachter: dat is de galm van je handen, niet de klap.
const klapStaartEnv = new Tone.AmplitudeEnvelope({
  attack: 0.001, decay: 0.16, sustain: 0, release: 0.02
}).connect(new Tone.Gain(0.7).connect(klapMix));
klapRuis.connect(klapStaartEnv);

function startKlapRuis() {
  if (klapRuis.state !== 'started') klapRuis.start();
}

function klapNu(tijd) {
  KLAP_TIKKEN.forEach((na, i) => klapTikEnvs[i].triggerAttack(tijd + na));
  klapStaartEnv.triggerAttack(tijd + KLAP_STAART);
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

// Een maat wordt tel voor tel opgebouwd. Elke tel krijgt een van de aantallen
// van het gekozen niveau, verdeeld over de tel: één klap valt op de tel zelf,
// twee klappen op de achtsten, vier op de zestienden.
function klappenVoor(maat) {
  const stappen = new Array(KLAP_STAPPEN).fill('.');
  const keuzes = niveauNu().keuzes;
  const rustig = maat < KLAP_AANLOOPMATEN;

  for (let tel = 0; tel < 4; tel++) {
    // De eerste tel van de maat blijft altijd staan.
    if (!rustig && tel > 0 && Math.random() < KLAP_RUST_KANS) continue;

    const aantal = rustig ? 1 : keuzes[Math.floor(Math.random() * keuzes.length)];
    const om = 4 / aantal;
    for (let i = 0; i < aantal; i++) stappen[tel * 4 + i * om] = 'x';
  }
  return stappen;
}

function startKlap() {
  if (!klapEl) return;
  cancelAnimationFrame(klapLus);

  if (Tone.getContext().state !== 'running') {
    startGeluid().then(startKlap).catch(() => {});
    return;
  }
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
  klapTikEnvs.forEach((env) => env.cancel(Tone.now()));
  klapStaartEnv.cancel(Tone.now());
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

      // De metronoom blijft doortikken, ook als het klappen begonnen is. Een
      // drumbeat eronder maakt het gezellig maar niet duidelijker; een kale tik
      // op elke tel is waar dertig kinderen zich aan vasthouden. De eerste tel
      // van de maat krijgt de hoge tik, zodat je hoort waar de maat begint.
      if (inMaat % 4 === 0) tik(klap.stapTijd, inMaat === 0);

      if (klap.klappen[inMaat] === 'x') {
        klapNu(klap.stapTijd);
        klap.noten.push(maakKlapNoot(klap.stapTijd, klappenInTel(klap.klappen, inMaat)));
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

// Dezelfde klaphanden als op de kaart van deze les op de voorpagina: de gevulde
// vorm, rood ingekleurd met een zwarte lijn eromheen, net als alles op deze site.
//
// Niet de lijnversie eroverheen leggen: fill en bold zijn bij Phosphor twee
// aparte tekeningen en niet dezelfde vorm in twee gewichten, dus die vallen niet
// samen. Eén vorm met een fill en een stroke doet precies wat we willen.
//
// De vormen staan hier uitgeschreven in plaats van als icoon uit het
// lettertype: dat komt van buiten, en een klapje dat niet laadt is een klapje
// dat je niet ziet aankomen. Opgehaald uit @phosphor-icons/core.
const KLAP_HANDEN =
  '<svg viewBox="0 0 256 256" aria-hidden="true">' +
  '<path d="M188.87,65A18,18,0,0,0,157.62,83L133.36,41a18,18,0,0,0-31.22,18L96.4,49A18,18,0,0,0,65.18,67l3.34,5.77A26,26,0,0,0,39.74,111l3,5.2A26,26,0,0,0,23.5,155l35.27,61a80.14,80.14,0,0,0,149.52-39.57A71.92,71.92,0,0,0,210,101.58Zm1.2,127.56A64.12,64.12,0,0,1,72.65,208L37.38,147a10,10,0,0,1,17.34-10L75,172a8,8,0,0,0,13.87-8L53.62,103A10,10,0,0,1,71,93l31.81,55a8,8,0,0,0,13.87-8l-26-45a10,10,0,0,1,17.35-10l36.5,63a8,8,0,0,0,13.87-8l-12.6-21.75A10,10,0,0,1,163.44,109l20.22,35A63.52,63.52,0,0,1,190.07,192.57ZM160.22,24V8a8,8,0,0,1,16,0V24a8,8,0,0,1-16,0Zm33.22,6,8-13.1a8,8,0,0,1,13.68,8.33l-8,13.11a8,8,0,0,1-6.84,3.83A8,8,0,0,1,193.44,30Zm45,33.66-15.05,4.85a8.15,8.15,0,0,1-2.46.39,8,8,0,0,1-2.46-15.62l15.06-4.85a8,8,0,1,1,4.91,15.23Z"/>' +
  '</svg>';

// Hoeveel klappen er in dezelfde tel zitten als deze. Dat bepaalt de kleur, dus
// je ziet aan een klapje al aankomen of het er eentje is of dat er twee of vier
// achter elkaar komen.
function klappenInTel(stappen, inMaat) {
  const tel = Math.floor(inMaat / 4);
  let aantal = 0;
  for (let i = 0; i < 4; i++) if (stappen[tel * 4 + i] === 'x') aantal += 1;
  return aantal;
}

function maakKlapNoot(tijd, aantal) {
  const el = document.createElement('span');
  el.className = 'klap-noot aantal-' + aantal;
  el.innerHTML = KLAP_HANDEN;
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

  klapKeuzeEl.innerHTML = KLAPNIVEAUS.map((k) => `
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
