/* Les 1 — het spelletje onder aan de pagina

   Elke tel valt er een van de drie geluiden naar beneden. Raak hem op het moment
   dat hij op de doelvorm onderaan staat: hoe strakker, hoe meer punten. Mis je er
   een, dan ben je een hartje kwijt. Het tempo loopt langzaam op.

   Het spel speelt zelf geen drums. Het zet alleen de noten neer en telt hoe goed
   jij ze raakt -- jouw aanslag maakt het geluid, net als op de pads. Het luistert
   daarvoor mee via bijAanslag in drumkit.js, dus toetsenbord, muis en aanraken
   werken alle drie vanzelf mee. */

// ============================================================
//  Regels van het spel
// ============================================================

const HARTJES = 3;
const AANLOOP_TELLEN = 4;    // vier tellen meetellen voordat de eerste noot komt
const VOORUIT = 2.5;         // seconden dat een noot van tevoren te zien is
const DOEL_ONDER = 48;       // hoogte van de doelvorm, in pixels vanaf de onderkant

const START_BPM = 70;        // rustig beginnen: op 70 duurt een tel bijna een seconde
const MAX_BPM = 300;         // een plafond dat je eigenlijk niet hoort te halen
const BPM_STAP = 4;
const NOTEN_PER_STAP = 6;    // om de zes noten gaat het tempo omhoog

// Hoe dicht je erbij moet zitten, en wat het oplevert.
const VENSTERS = [
  { grens: 0.045, punten: 100, naam: 'Perfect' },
  { grens: 0.090, punten: 60, naam: 'Goed' },
  { grens: 0.150, punten: 25, naam: 'Net' }
];
const MIS_NA = 0.15;         // daarna telt de noot als gemist
const MIS_KOSTEN = 25;       // punten kwijt als je slaat waar geen noot is

// ============================================================
//  Het scherm
// ============================================================

const spelEl = document.getElementById('spel');
const baanEl = spelEl && spelEl.querySelector('[data-banen]');
const scoreEl = spelEl && spelEl.querySelector('[data-score]');
const hartjesEl = spelEl && spelEl.querySelector('[data-hartjes]');
const bpmEl = spelEl && spelEl.querySelector('[data-bpm]');
const oordeelEl = spelEl && spelEl.querySelector('[data-oordeel]');
const kaartEl = spelEl && spelEl.querySelector('[data-kaart]');
const aftelEl = spelEl && spelEl.querySelector('[data-aftellen]');
const recordEl = spelEl && spelEl.querySelector('[data-record]');
const wisEl = spelEl && spelEl.querySelector('[data-wis]');
const knoppenEl = spelEl && spelEl.querySelector('[data-knoppen]');

const banen = {};

function bouwBanen() {
  KIT.forEach((inst) => {
    const kleuren = (el) => {
      el.style.setProperty('--kleur', 'var(--' + inst.kleur + ')');
      el.style.setProperty('--op-kleur', inst.kleur === 'blauw' ? 'var(--wit)' : 'var(--ink)');
    };

    const baan = document.createElement('div');
    baan.className = 'baan';
    kleuren(baan);
    baan.innerHTML =
      '<span class="baan-doel"><svg viewBox="0 0 100 100" aria-hidden="true">' + VORMEN[inst.vorm] + '</svg></span>' +
      '<div class="baan-noten"></div>';
    baanEl.appendChild(baan);
    banen[inst.id] = { el: baan, noten: baan.querySelector('.baan-noten'), vorm: inst.vorm };

    // De knop onder de baan, zodat je tijdens het spelen niet omhoog hoeft te
    // kijken naar de pads. Hij krijgt gewoon de pad-rol, dus toetsenbord, muis
    // en aanraken werken er meteen op zonder eigen afhandeling.
    const knop = document.createElement('button');
    knop.className = 'pad spel-knop';
    knop.type = 'button';
    knop.dataset.id = inst.id;
    knop.setAttribute('aria-label', 'Speel ' + inst.naam);
    kleuren(knop);
    knop.innerHTML =
      '<svg class="vorm" viewBox="0 0 100 100" aria-hidden="true">' + VORMEN[inst.vorm] + '</svg>' +
      '<span class="pad-toets">' + inst.toetsLabel + '</span>';
    knoppenEl.appendChild(knop);
    meldPad(inst.id, knop);
  });
}

// ============================================================
//  De begeleiding: een polka
// ============================================================

// Oom-pah. Op elke tel een lage basnoot, en precies tussen twee tellen in een
// kort akkoord -- die upbeat is waar een polka op drijft. De bas wisselt daarbij
// af tussen grondtoon en kwint, precies zoals een tuba dat in een polka doet.
//
// De toonsoort is A Phrygisch met grote terts: A, Bes, Cis, D, E, F, G. Dat is
// de klezmerladder, en de grap zit in die Bes -- een halve toon boven de
// grondtoon, waar je normaal een hele toon verwacht. Zodra het akkoord van A
// naar Bes stapt en weer terug heb je dat schelmse Balkangevoel te pakken.
//
// De rondgang is A | Bes | A | Bes: heen en weer, meer niet. Dat halve stapje
// tussen de grondtoon en de noot erboven is de klezmerstap zelf, en die heeft
// geen omweg nodig om te werken. Alle drie de stemmen schuiven per wissel een
// halve toon op en weer terug; er komt geen enkele noot buiten de ladder.
//
// Het staat als vier maten en niet als twee, zodat je later de tweede helft kunt
// laten afwijken zonder de rest aan te raken.
//
// De Dm, Gm, C en E hieronder worden op dit moment niet gebruikt; die staan
// klaar als je een maat wilt omwisselen.
//
// De maten tellen vanaf het allereerste begin, dus het aftellen ís maat 1.
const AKKOORDEN = {
  a:   { bas: 110.00, kwint: 164.81, tonen: [220.00, 277.18, 329.63] },  // A groot
  bes: { bas: 116.54, kwint: 174.61, tonen: [233.08, 293.66, 349.23] },  // Bes groot
  dm:  { bas: 146.83, kwint: 220.00, tonen: [220.00, 293.66, 349.23] },  // d klein
  gm:  { bas: 98.00, kwint: 146.83, tonen: [233.08, 293.66, 392.00] },   // g klein
  e:   { bas: 82.41, kwint: 123.47, tonen: [207.65, 246.94, 329.63] },   // E groot
  c:   { bas: 130.81, kwint: 196.00, tonen: [261.63, 329.63, 392.00] }   // C groot
};
// Elke maat is een lijstje. Staat er een akkoord in, dan duurt het de hele maat;
// staan er twee, dan krijgen ze allebei de helft. Zo kan maat 4 halverwege van
// Bes naar C stappen zonder dat de rest ingewikkelder wordt.
const RONDGANG = [['a'], ['bes'], ['a'], ['bes']];

// Het aftellen telt mee als maat 1: het duurt precies vier tellen, dus de
// rondgang loopt gewoon door van de aanloop het spel in zonder ergens opnieuw
// te beginnen. Je telt af op de A en de eerste noot valt op de Bes.
function akkoordVoor(tel) {
  const maat = RONDGANG[Math.floor(tel / 4) % RONDGANG.length];
  const deel = Math.floor((tel % 4) / (4 / maat.length));
  return AKKOORDEN[maat[deel]];
}

// De oom: een ronde lage noot, kort afgekapt.
const basVol = new Tone.Volume(-9).connect(master);
const basFilter = new Tone.Filter({ type: 'lowpass', frequency: 480, Q: 1 }).connect(basVol);
const basEnv = new Tone.AmplitudeEnvelope({ attack: 0.004, decay: 0.14, sustain: 0, release: 0.03 }).connect(basFilter);
const basOsc = new Tone.Oscillator({ type: 'triangle', frequency: 110 }).start();
basOsc.connect(basEnv);

// De pah: drie blokgolven samen, dus een echt akkoord. Ze gaan eerst door een
// gain, want drie golven bij elkaar opgeteld zou boven vol bereik uitkomen.
const akkVol = new Tone.Volume(-15).connect(master);
const akkFilter = new Tone.Filter({ type: 'lowpass', frequency: 2600, Q: 1 }).connect(akkVol);
const akkEnv = new Tone.AmplitudeEnvelope({ attack: 0.003, decay: 0.1, sustain: 0, release: 0.03 }).connect(akkFilter);
const akkMix = new Tone.Gain(0.33).connect(akkEnv);
const akkOscs = AKKOORDEN.a.tonen.map((f) => {
  const osc = new Tone.Oscillator({ type: 'square', frequency: f }).start();
  osc.connect(akkMix);
  return osc;
});

// Grondtoon op de oneven tellen, kwint op de even: dat heen en weer springen is
// wat een polkabas doet, en het geeft de maat vanzelf zijn wiegende gang.
function basNoot(tijd, akkoord, tellengte, inMaat) {
  basOsc.frequency.setValueAtTime(inMaat % 2 === 0 ? akkoord.bas : akkoord.kwint, tijd);
  basEnv.decay = Math.min(0.2, tellengte * 0.4);
  basEnv.triggerAttack(tijd);
}

// De metronoom telt de eerste vier tellen mee, over de muziek heen. Zo hoor je
// het tempo hard genoeg om in te vallen, terwijl de polka al speelt. Zodra het
// spel begint houdt hij op: dan is de polka zelf je maat.
const tikOsc = new Tone.Oscillator({ type: 'sine', frequency: 1000 }).start();
const tikEnv = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 });
const tikVol = new Tone.Volume(-14);
tikOsc.chain(tikEnv, tikVol, master);

function tik(tijd, laatste) {
  tikOsc.frequency.setValueAtTime(laatste ? 1400 : 1000, tijd);
  tikEnv.triggerAttack(tijd);
}

function akkoordStoot(tijd, akkoord, tellengte) {
  akkoord.tonen.forEach((f, i) => akkOscs[i].frequency.setValueAtTime(f, tijd));
  akkEnv.decay = Math.min(0.14, tellengte * 0.3);
  akkEnv.triggerAttack(tijd);
}

// ============================================================
//  De topscore
// ============================================================

// Blijft in deze browser bewaard, net als de standen van de schuifjes hierboven.
const RECORD_SLEUTEL = 'wotto-muziekgames-les1-record';

function laadRecord() {
  try {
    const waarde = parseInt(localStorage.getItem(RECORD_SLEUTEL), 10);
    return Number.isFinite(waarde) && waarde >= 0 ? waarde : 0;
  } catch (e) {
    return 0;  // geen opslag beschikbaar: dan begin je elke keer op nul
  }
}

function bewaarRecord() {
  try {
    localStorage.setItem(RECORD_SLEUTEL, String(record));
  } catch (e) {
    // Opslag kan uit staan of vol zijn. Het spel werkt gewoon door.
  }
}

let record = laadRecord();

// Wissen vraagt eerst even door. Per ongeluk je topscore kwijtraken is zuur, en
// een gewoon vensterknopje van de browser wil ik hier niet: dat legt de audio
// stil en is voor een kind een schrikreactie. Twee keer tikken doet hetzelfde
// werk en blijft in de bladzijde.
let wisTimer = 0;

function wisRecord() {
  record = 0;
  bewaarRecord();
  werkBalkBij();
}

function ontwapenWissen() {
  clearTimeout(wisTimer);
  wisTimer = 0;
  if (wisEl) wisEl.textContent = 'Wis';
}

// Ook opslaan als je wegklikt zonder game over, anders ben je een net gehaald
// record kwijt zodra je de bladzijde verlaat.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') bewaarRecord();
});

// ============================================================
//  Verloop
// ============================================================

let spel = null;
let lus = 0;

function bpmVoor(telNr) {
  const stappen = Math.floor(Math.max(0, telNr - AANLOOP_TELLEN) / NOTEN_PER_STAP);
  return Math.min(MAX_BPM, START_BPM + stappen * BPM_STAP);
}

function start() {
  if (!spelEl) return;
  cancelAnimationFrame(lus);

  spel = {
    loopt: true,
    telNr: 0,
    telTijd: Tone.now() + 0.6,
    bpm: START_BPM,
    noten: [],
    score: 0,
    hartjes: HARTJES,
    geraakt: 0,
    gemist: 0,
    laatste: [],      // om niet drie keer hetzelfde geluid achter elkaar te geven
    aanloop: [],      // de tijden van het aftellen
    aftelGetal: 0,
    aftelKlaar: false,
    eersteNoot: 0,
    recordBijStart: record
  };

  kaartEl.hidden = true;
  toonAftellen(0);
  toonOordeel('');
  werkBalkBij();
  lus = requestAnimationFrame(stap);
}

function stop() {
  spel.loopt = false;
  cancelAnimationFrame(lus);
  spel.noten.forEach((noot) => noot.el.remove());
  spel.noten = [];
  toonAftellen(0);
  // De begeleiding staat al een paar tellen vooruit gepland; die zou anders
  // doorspelen terwijl je game over in beeld staat.
  basEnv.cancel(Tone.now());
  akkEnv.cancel(Tone.now());
  tikEnv.cancel(Tone.now());

  bewaarRecord();

  const totaal = spel.geraakt + spel.gemist;
  const nieuwRecord = spel.score > spel.recordBijStart;
  kaartEl.querySelector('h3').textContent = nieuwRecord ? 'Nieuw record!' : 'Game over';
  kaartEl.querySelector('p').innerHTML = 'Je score is <b>' + spel.score + '</b>.<br>' +
    spel.geraakt + ' van de ' + totaal + ' goed geraakt, tot ' + Math.round(spel.bpm) + ' slagen per minuut.';
  kaartEl.querySelector('button').textContent = 'Nog een keer';
  kaartEl.hidden = false;
}

// Niet zomaar willekeurig, want dan wordt het een reeks losse noten in plaats van
// een beat. Op tel 1 komt meestal de kick en op tel 3 meestal de snare -- dat is
// het half-time patroon waar bijna elk nummer op leunt. Tel 2 en 4 blijven vrij,
// en ook op 1 en 3 zit een kans op iets anders, anders wordt het voorspelbaar.
const KANS_OP_PATROON = 0.8;

function kiesGeluid(tel) {
  const inMaat = tel % 4;
  // Ook het patroon houdt zich aan de regel van hooguit twee dezelfde op rij,
  // anders kon je met een vaste kick op tel 1 alsnog aan drie komen.
  const magNog = (id) => !(spel.laatste[0] === id && spel.laatste[1] === id);
  if (inMaat === 0 && magNog('kick') && Math.random() < KANS_OP_PATROON) return onthoud('kick');
  if (inMaat === 2 && magNog('snare') && Math.random() < KANS_OP_PATROON) return onthoud('snare');
  return onthoud(willekeurig());
}

// Willekeurig, maar nooit drie keer achter elkaar hetzelfde: dat speelt prettiger
// en het blijft even onvoorspelbaar.
function willekeurig() {
  const laatste = spel.laatste;
  const keus = KIT[Math.floor(Math.random() * KIT.length)].id;
  if (laatste.length >= 2 && laatste[0] === laatste[1] && laatste[0] === keus) {
    const anders = KIT.filter((i) => i.id !== keus);
    return anders[Math.floor(Math.random() * anders.length)].id;
  }
  return keus;
}

function onthoud(keus) {
  spel.laatste = [keus, spel.laatste[0]];
  return keus;
}

function maakNoot(id, tijd) {
  const el = document.createElement('span');
  el.className = 'noot';
  el.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true">' + VORMEN[banen[id].vorm] + '</svg>';
  banen[id].noten.appendChild(el);
  return { id: id, tijd: tijd, el: el, gehaald: false };
}

// Noten aanmaken tot zover we vooruit kijken. De begeleiding loopt door alle
// tellen heen, ook tijdens het aftellen, zodat je het tempo al in je hebt
// voordat de eerste noot valt.
function vulAan(nu) {
  while (spel.telTijd < nu + VOORUIT) {
    const tel = spel.telNr;
    const tellengte = 60 / bpmVoor(tel);
    const akkoord = akkoordVoor(tel);

    // De polka loopt vanaf de eerste tel, dus ook onder het aftellen. Je hoort
    // de muziek al voordat de eerste noot valt.
    basNoot(spel.telTijd, akkoord, tellengte, tel % 4);

    // De pah valt op de upbeat, en op elke tweede tel wordt die verdubbeld tot
    // twee zestienden: 1 en, 2 en-ne, 3 en, 4 en-ne. Dat huppelt.
    akkoordStoot(spel.telTijd + tellengte / 2, akkoord, tellengte);
    if (tel % 2 === 1) akkoordStoot(spel.telTijd + tellengte * 0.75, akkoord, tellengte);

    if (tel < AANLOOP_TELLEN) {
      tik(spel.telTijd, tel === AANLOOP_TELLEN - 1);
      spel.aanloop.push(spel.telTijd);
    } else {
      if (tel === AANLOOP_TELLEN) spel.eersteNoot = spel.telTijd;
      spel.noten.push(maakNoot(kiesGeluid(tel), spel.telTijd));
    }

    spel.bpm = bpmVoor(tel);
    spel.telTijd += tellengte;
    spel.telNr += 1;
  }
}

// Het aftellen: 1, 2, 3, 4 in de maat mee, en weg zodra de eerste noot valt.
function werkAftellenBij(nu) {
  if (spel.aftelKlaar || !aftelEl) return;

  if (spel.eersteNoot && nu >= spel.eersteNoot) {
    spel.aftelKlaar = true;
    toonAftellen(0);
    return;
  }

  let getal = 0;
  for (let i = 0; i < spel.aanloop.length; i++) if (nu >= spel.aanloop[i]) getal = i + 1;
  if (getal !== spel.aftelGetal) {
    spel.aftelGetal = getal;
    toonAftellen(getal);
  }
}

function toonAftellen(getal) {
  if (!aftelEl) return;
  aftelEl.textContent = getal ? String(getal) : '';
  if (!getal || minderBeweging.matches || !aftelEl.animate) return;
  aftelEl.animate(
    [{ transform: 'scale(0.6)' }, { transform: 'scale(1)' }],
    { duration: 240, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
  );
}

function stap() {
  if (!spel || !spel.loopt) return;
  const nu = Tone.now();

  vulAan(nu);
  werkAftellenBij(nu);

  // De noten vallen van boven naar beneden. Op het moment dat een noot aan de
  // beurt is staat hij op de doelvorm; VOORUIT seconden daarvoor staat hij
  // bovenaan de baan.
  const hoogte = baanEl.firstElementChild ? baanEl.firstElementChild.clientHeight : 0;
  const doelY = hoogte - DOEL_ONDER;
  const grens = MIS_NA * vensterSchaal();
  const over = [];

  spel.noten.forEach((noot) => {
    if (noot.tijd + grens < nu) {
      noot.el.remove();
      misNoot();
      return;
    }
    const deel = (noot.tijd - nu) / VOORUIT;
    noot.el.style.transform = 'translateY(' + (doelY - deel * doelY) + 'px)';
    over.push(noot);
  });

  spel.noten = over;

  if (spel.loopt) lus = requestAnimationFrame(stap);
}

function misNoot() {
  spel.gemist += 1;
  spel.hartjes -= 1;
  toonOordeel('Mis');
  werkBalkBij();
  if (spel.hartjes <= 0) stop();
}

// ============================================================
//  Meeluisteren met de aanslagen
// ============================================================

// Bij hoog tempo liggen de noten dichter op elkaar dan het trefvenster breed is.
// Op 300 bpm zit er 200 ms tussen twee noten terwijl je tot 150 ms ernaast mag
// zitten: dan overlappen de vensters en zou het juist makkelijker worden naarmate
// het sneller gaat. Daarom knijpen ze mee, tot hooguit een halve tel.
function vensterSchaal() {
  const tel = 60 / spel.bpm;
  return Math.min(1, (tel * 0.45) / MIS_NA);
}

// Welke noot bedoelde je? De dichtstbijzijnde in dezelfde baan die nog open staat.
function dichtstbij(id, wanneer) {
  let beste = null;
  spel.noten.forEach((noot) => {
    if (noot.id !== id || noot.gehaald) return;
    if (!beste || Math.abs(noot.tijd - wanneer) < Math.abs(beste.tijd - wanneer)) beste = noot;
  });
  return beste;
}

function beoordeel(id, wanneer) {
  if (!spel || !spel.loopt) return null;

  const schaal = vensterSchaal();
  const noot = dichtstbij(id, wanneer);
  const afwijking = noot ? Math.abs(noot.tijd - wanneer) : Infinity;

  if (afwijking > MIS_NA * schaal) {
    // Slaan waar geen noot is kost punten. Anders zou je alle drie de toetsen
    // elke tel kunnen rammen en altijd raak zitten.
    spel.score = Math.max(0, spel.score - MIS_KOSTEN);
    toonOordeel('Naast');
    werkBalkBij();
    return 'Naast';
  }

  const venster = VENSTERS.find((v) => afwijking <= v.grens * schaal);
  spel.score += venster.punten;
  spel.geraakt += 1;
  noot.gehaald = true;
  noot.el.classList.add('raak');
  const weg = noot.el;
  setTimeout(() => weg.remove(), 180);
  spel.noten = spel.noten.filter((n) => n !== noot);

  toonOordeel(venster.naam);
  werkBalkBij();
  return venster.naam;
}

bijAanslag = beoordeel;

// ============================================================
//  Balk bovenin
// ============================================================

// Werkt ook als er nog geen spel loopt, zodat je voor de start al ziet hoeveel
// hartjes je krijgt en op welk tempo het begint.
function werkBalkBij() {
  if (!spelEl) return;
  const score = spel ? spel.score : 0;
  const bpm = spel ? spel.bpm : START_BPM;
  const over = spel ? spel.hartjes : HARTJES;

  // De topscore loopt live mee, zodat je hem ziet sneuvelen terwijl je speelt.
  // Alleen zolang het spel echt loopt: anders zou de eindstand van een afgelopen
  // beurt er later alsnog in kruipen, en zou wissen niet blijven plakken.
  if (spel && spel.loopt && spel.score > record) record = spel.score;

  scoreEl.textContent = score;
  bpmEl.textContent = Math.round(bpm);
  recordEl.textContent = record;

  let hartjes = '';
  for (let i = 0; i < HARTJES; i++) {
    hartjes += i < over
      ? '<i class="ph-bold ph-heart heel" aria-hidden="true"></i>'
      : '<i class="ph-bold ph-heart-break kwijt" aria-hidden="true"></i>';
  }
  hartjesEl.innerHTML = hartjes;
  hartjesEl.setAttribute('aria-label', over + ' van de ' + HARTJES + ' hartjes over');
}

let oordeelTimer = 0;

function toonOordeel(tekst) {
  if (!spelEl) return;
  oordeelEl.textContent = tekst;
  oordeelEl.dataset.soort = tekst.toLowerCase();
  clearTimeout(oordeelTimer);
  if (tekst) oordeelTimer = setTimeout(() => { oordeelEl.textContent = ''; }, 500);
}

// ============================================================
//  Aanzetten
// ============================================================

if (spelEl) {
  bouwBanen();
  werkBalkBij();
  kaartEl.querySelector('button').addEventListener('click', start);

  wisEl.addEventListener('click', () => {
    if (wisTimer) {
      ontwapenWissen();
      wisRecord();
      return;
    }
    wisEl.textContent = 'Zeker?';
    wisTimer = setTimeout(ontwapenWissen, 3000);
  });
}
