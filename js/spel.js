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
const TELLEN_PER_STAP = 6;   // om de zes tellen gaat het tempo omhoog

// Hoe dicht je erbij moet zitten, en wat het oplevert.
const VENSTERS = [
  { grens: 0.045, punten: 100, naam: 'Perfect' },
  { grens: 0.090, punten: 60, naam: 'Goed' },
  { grens: 0.150, punten: 25, naam: 'Net' }
];
const MIS_NA = 0.15;         // daarna telt de noot als gemist
const MIS_KOSTEN = 25;       // punten kwijt als je slaat waar geen noot is

// ============================================================
//  De vier moeilijkheidsgraden
// ============================================================

// Op elke tel valt er iets, op elke graad: je speelt altijd de hele beat mee, en
// dat is precies wat een beat een beat maakt. Het verschil zit dus niet in
// hoeveel er valt maar in wat.
//
// Elke graad heeft twee dingen. In geluiden staat waar hij uit put -- Easy is
// alleen de kick, dan komt de snare erbij, dan de hihat. In noot staat het vaste
// patroon waarmee hij begint, met een teller die vanaf de eerste noot loopt, dus
// 0 is de eerste tel van de maat na het aftellen.
//
// Dat vaste patroon houdt het maar even vol: zodra je de graad gehaald hebt laat
// het los en wordt het willekeurig, binnen de geluiden van die graad. Zie
// geluidVoor hieronder.
const NIVEAUS = [
  { id: 'easy', naam: 'Easy',
    toelichting: 'alleen de kick, op elke tel',
    geluiden: ['kick'],
    noot: () => 'kick' },

  { id: 'medium', naam: 'Medium',
    toelichting: 'kick en snare, om en om',
    geluiden: ['kick', 'snare'],
    noot: (i) => ['kick', 'snare'][i % 2] },

  { id: 'hard', naam: 'Hard',
    toelichting: 'kick, hihat, snare, hihat',
    geluiden: ['kick', 'snare', 'hihat'],
    noot: (i) => ['kick', 'hihat', 'snare', 'hihat'][i % 4] }
];

// Zoveel noten moet je halen zonder al je hartjes te verliezen; dan gaat de
// graad erboven open. Het spel loopt daarna gewoon door en het tempo blijft
// oplopen: het is een tussenstand, geen eindstreep.
const VRIJSPEEL_NOTEN = 20;

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
const knoppenEl = spelEl && spelEl.querySelector('[data-knoppen]');
const veldEl = spelEl && spelEl.querySelector('.spel-veld');
const vrijEl = spelEl && spelEl.querySelector('[data-vrij]');
// De graadknoppen staan op twee plekken: boven het veld en op de kaart. Ze
// worden allebei uit dezelfde lijst gebouwd en samen bijgewerkt.
const niveauRijen = spelEl ? Array.from(spelEl.querySelectorAll('[data-niveaus]')) : [];
const kaartCijfersEl = spelEl && spelEl.querySelector('[data-kaart-cijfers]');
const kaartTekstEl = spelEl && spelEl.querySelector('[data-kaart-tekst]');
const kaartKnopEl = spelEl && spelEl.querySelector('[data-kaart-knop]');
const niveauUitlegEl = spelEl && spelEl.querySelector('[data-niveau-uitleg]');
// Deze staat bovenaan in de balk, buiten het spel: het is de knop die alles wist.
const wisAllesEl = document.querySelector('[data-wis-alles]');

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
//  Topscores en vrijgespeelde graden
// ============================================================

// Alles wat je opbouwt staat onder een sleutel: hoeveel graden er open staan en
// de beste score per graad. Blijft in deze browser bewaard, net als de standen
// van de schuifjes hierboven.
const OPSLAG_SLEUTEL = 'wotto-muziekgames-les1-spel';

function legeStand() {
  const records = {};
  NIVEAUS.forEach((niveau) => { records[niveau.id] = 0; });
  return { vrij: 1, records: records };
}

// Elke waarde apart nakijken. Opslag van een oudere versie, of iets wat met de
// hand is aangepast, mag de bladzijde nooit stukmaken: wat niet klopt valt terug
// op nul en op alleen Easy open.
function laadVoortgang() {
  const stand = legeStand();
  let bewaard = null;
  try {
    bewaard = JSON.parse(localStorage.getItem(OPSLAG_SLEUTEL));
  } catch (e) {
    return stand;  // geen opslag beschikbaar, of er staat geen geldige tekst in
  }
  if (!bewaard || typeof bewaard !== 'object') return stand;

  const vrij = parseInt(bewaard.vrij, 10);
  if (Number.isFinite(vrij)) stand.vrij = Math.min(NIVEAUS.length, Math.max(1, vrij));

  const records = bewaard.records;
  if (records && typeof records === 'object') {
    NIVEAUS.forEach((niveau) => {
      const waarde = parseInt(records[niveau.id], 10);
      if (Number.isFinite(waarde) && waarde >= 0) stand.records[niveau.id] = waarde;
    });
  }
  return stand;
}

function bewaarVoortgang() {
  try {
    localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify(voortgang));
  } catch (e) {
    // Opslag kan uit staan of vol zijn. Het spel werkt gewoon door.
  }
}

let voortgang = laadVoortgang();

// Je begint op de hoogste graad die je hebt vrijgespeeld: daar was je gebleven.
// De makkelijkere staan er gewoon naast als je terug wilt.
let niveauNr = voortgang.vrij - 1;

function huidigNiveau() { return NIVEAUS[niveauNr]; }

// record is de topscore van de graad waar je nu op staat, zodat de balk ernaast
// er live in mee kan lopen. De andere drie blijven intussen in voortgang staan.
function laadRecord() { return voortgang.records[huidigNiveau().id]; }

function bewaarRecord() {
  voortgang.records[huidigNiveau().id] = record;
  bewaarVoortgang();
}

let record = laadRecord();

// Wissen vraagt eerst even door. Per ongeluk je topscores kwijtraken is zuur, en
// een gewoon vensterknopje van de browser wil ik hier niet: dat legt de audio
// stil en is voor een kind een schrikreactie. Twee keer tikken doet hetzelfde
// werk en blijft in de bladzijde.
let wisTimer = 0;

// Alles terug naar het begin: alle topscores op nul en alleen Easy nog open.
// Handig als de volgende klas achter dezelfde computer gaat zitten.
function wisVoortgang() {
  // Loopt er nog een beurt, dan die eerst netjes afsluiten: anders schrijft stop()
  // zijn score er even later alsnog in.
  if (spel && spel.loopt) stop();

  voortgang = legeStand();
  niveauNr = 0;
  record = 0;
  bewaarVoortgang();
  werkNiveausBij();
  werkBalkBij();
  toonStartkaart();
}

function ontwapenWissen() {
  clearTimeout(wisTimer);
  wisTimer = 0;
  if (wisAllesEl) wisAllesEl.textContent = 'Wis voortgang';
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
  const stappen = Math.floor(Math.max(0, telNr - AANLOOP_TELLEN) / TELLEN_PER_STAP);
  return Math.min(MAX_BPM, START_BPM + stappen * BPM_STAP);
}

function start() {
  if (!spelEl) return;
  cancelAnimationFrame(lus);

  spel = {
    loopt: true,
    niveau: niveauNr,   // vast voor deze beurt, zodat wisselen halverwege niet kan
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
    vrijgespeeld: false,
    recordBijStart: record
  };

  kaartEl.hidden = true;
  toonAftellen(0);
  toonOordeel('');
  werkBalkBij();
  werkNiveausBij();
  lus = requestAnimationFrame(stap);
}

function stop() {
  spel.loopt = false;
  cancelAnimationFrame(lus);
  if (vrijEl) { clearTimeout(vrijTimer); vrijEl.textContent = ''; }
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
  toonKaart(
    nieuwRecord ? 'Nieuw record!' : 'Game over',
    '<div class="cijfer"><span>jouw score</span><b>' + spel.score + '</b></div>' +
    '<div class="cijfer beste"><span>beste op ' + huidigNiveau().naam + '</span><b>' + record + '</b></div>',
    spel.geraakt + ' van de ' + totaal + ' goed geraakt, tot ' +
      Math.round(spel.bpm) + ' slagen per minuut.',
    'Nog een keer'
  );
  werkNiveausBij();
}

// Niet zomaar willekeurig, want dan wordt het een reeks losse noten in plaats van
// een beat. Op tel 1 komt meestal de kick en op tel 3 meestal de snare -- dat is
// het half-time patroon waar bijna elk nummer op leunt. Tel 2 en 4 blijven vrij,
// en ook op 1 en 3 zit een kans op iets anders, anders wordt het voorspelbaar.
const KANS_OP_PATROON = 0.8;
const ALLE_GELUIDEN = KIT.map((inst) => inst.id);

// Kiest uit de geluiden die de graad heeft. Op Medium zit daar geen hihat bij,
// dus die kan er ook niet uit rollen.
function kiesGeluid(tel, geluiden) {
  const uit = geluiden || ALLE_GELUIDEN;
  const inMaat = tel % 4;
  // Ook het patroon houdt zich aan de regel van hooguit twee dezelfde op rij,
  // anders kon je met een vaste kick op tel 1 alsnog aan drie komen.
  const magNog = (id) => !(spel.laatste[0] === id && spel.laatste[1] === id);
  const heeft = (id) => uit.indexOf(id) >= 0;
  if (inMaat === 0 && heeft('kick') && magNog('kick') && Math.random() < KANS_OP_PATROON) return onthoud('kick');
  if (inMaat === 2 && heeft('snare') && magNog('snare') && Math.random() < KANS_OP_PATROON) return onthoud('snare');
  return onthoud(willekeurig(uit));
}

// Willekeurig, maar nooit drie keer achter elkaar hetzelfde: dat speelt prettiger
// en het blijft even onvoorspelbaar. Heeft een graad maar een geluid, dan valt er
// niets te kiezen en vervalt die regel vanzelf.
function willekeurig(geluiden) {
  const uit = geluiden || ALLE_GELUIDEN;
  const laatste = spel.laatste;
  const keus = uit[Math.floor(Math.random() * uit.length)];
  if (uit.length > 1 && laatste.length >= 2 && laatste[0] === laatste[1] && laatste[0] === keus) {
    const anders = uit.filter((id) => id !== keus);
    return anders[Math.floor(Math.random() * anders.length)];
  }
  return keus;
}

// Welk geluid valt er op noot i? De eerste noten volgen het vaste patroon van de
// graad, zodat je het in je vingers krijgt. Heb je er VRIJSPEEL_NOTEN gehaald --
// precies het punt waarop de volgende graad opengaat -- dan laat het patroon los
// en wordt het willekeurig, maar wel binnen de geluiden van die graad. Zo blijft
// dezelfde beurt tot het eind spannend in plaats van een rondje dat zich herhaalt.
function geluidVoor(i) {
  const niveau = NIVEAUS[spel.niveau];
  if (i < VRIJSPEEL_NOTEN) return onthoud(niveau.noot(i));
  return kiesGeluid(i, niveau.geluiden);
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
      // De graad zegt wat er op deze tel valt.
      spel.noten.push(maakNoot(geluidVoor(tel - AANLOOP_TELLEN), spel.telTijd));
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
  // Eerst afgaan, dan pas vrijspelen: is de twintigste noot je laatste hartje,
  // dan ben je er wel gekomen maar niet doorheen.
  if (spel.hartjes <= 0) { stop(); return; }
  kijkVrijspelen();
}

// ============================================================
//  Vrijspelen
// ============================================================

// Haal je de eerste VRIJSPEEL_NOTEN noten zonder al je hartjes te verliezen, dan
// gaat de graad erboven open. Het spel stopt daar niet voor: je speelt door, het
// tempo blijft oplopen en je topscore kun je nog altijd verbeteren.
function kijkVrijspelen() {
  if (!spel || !spel.loopt || spel.vrijgespeeld) return;
  if (spel.geraakt + spel.gemist < VRIJSPEEL_NOTEN) return;
  spel.vrijgespeeld = true;   // hooguit een keer per beurt

  const volgende = spel.niveau + 1;
  if (volgende >= NIVEAUS.length) return;   // Expert is de laatste
  if (voortgang.vrij > volgende) return;    // stond allang open

  voortgang.vrij = volgende + 1;
  bewaarVoortgang();
  werkNiveausBij();
  vier(NIVEAUS[volgende].naam);
}

// Groot in beeld, maar het spel loopt er gewoon onderdoor. Vandaar dat de melding
// geen muisklikken vangt en boven in het veld hangt, waar nog geen noot geraakt
// hoeft te worden: je hebt iets verdiend, je wordt niet onderbroken.
let vrijTimer = 0;

function vier(naam) {
  if (!vrijEl) return;
  vrijEl.innerHTML = '<b>' + naam + '<span>vrijgespeeld!</span></b>';
  clearTimeout(vrijTimer);
  vrijTimer = setTimeout(() => { vrijEl.textContent = ''; }, 2200);

  confetti(44);
  const kaart = vrijEl.firstElementChild;
  if (minderBeweging.matches || !kaart.animate) return;
  // De bounce hoort alleen op het opkomen. Zet je hem over de hele animatie, dan
  // schiet de overshoot voorbij de laatste keyframes en fadet het kaartje al weg
  // terwijl het nog groot in beeld hoort te staan.
  kaart.animate([
    { transform: 'scale(0.3) rotate(-14deg)', opacity: 0, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { transform: 'scale(1) rotate(-3deg)', opacity: 1, offset: 0.18, easing: 'linear' },
    { transform: 'scale(1) rotate(-3deg)', opacity: 1, offset: 0.8, easing: 'ease-in' },
    { transform: 'scale(1.15) rotate(-3deg)', opacity: 0 }
  ], { duration: 2200 });
}

// Losse snippers die het veld uit vallen en zichzelf opruimen. Geen bibliotheek:
// een handjevol spannetjes met elk een eigen val is precies genoeg.
const SNIPPERKLEUREN = ['--koraal', '--zon', '--blauw', '--mint', '--bubblegum'];

function confetti(aantal) {
  if (!veldEl || minderBeweging.matches || !veldEl.animate) return;
  const val = veldEl.clientHeight + 60;

  for (let i = 0; i < aantal; i++) {
    const snipper = document.createElement('span');
    snipper.className = 'snipper';
    snipper.style.background = 'var(' + SNIPPERKLEUREN[i % SNIPPERKLEUREN.length] + ')';
    snipper.style.left = Math.round(Math.random() * 100) + '%';
    if (i % 3 === 0) snipper.style.borderRadius = '50%';
    veldEl.appendChild(snipper);

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
  kijkVrijspelen();
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

// Een oordeel flitst voorbij, maar een vrijgespeelde graad mag wat langer blijven
// staan en zijn eigen kleur krijgen.
function toonOordeel(tekst, soort, ms) {
  if (!spelEl) return;
  oordeelEl.textContent = tekst;
  oordeelEl.dataset.soort = soort || tekst.toLowerCase();
  clearTimeout(oordeelTimer);
  if (tekst) oordeelTimer = setTimeout(() => { oordeelEl.textContent = ''; }, ms || 500);
}

// ============================================================
//  De rij met de vier graden
// ============================================================

const niveauKnoppen = [];

function bouwNiveaus() {
  niveauRijen.forEach((rij) => {
    NIVEAUS.forEach((niveau, i) => {
      const knop = document.createElement('button');
      knop.className = 'niveau';
      knop.type = 'button';
      knop.dataset.niveau = niveau.id;
      knop.innerHTML =
        '<span class="niveau-naam">' + niveau.naam + '</span>' +
        '<span class="niveau-beste"></span>';
      knop.addEventListener('click', () => kiesNiveau(i));
      rij.appendChild(knop);
      niveauKnoppen.push(knop);
    });
  });
}

// Een plek waar de hele rij wordt bijgewerkt: welke graad aan staat, wat er open
// is, en hoe hoog je er ooit kwam.
function werkNiveausBij() {
  if (!niveauRijen.length) return;
  const bezig = !!(spel && spel.loopt);

  // Over alle knoppen van alle rijen: welke rij ze staan doet er niet toe, hun
  // graad staat op de knop zelf.
  niveauKnoppen.forEach((knop) => {
    const i = NIVEAUS.findIndex((niveau) => niveau.id === knop.dataset.niveau);
    const open = i < voortgang.vrij;
    knop.classList.toggle('op-slot', !open);
    knop.setAttribute('aria-pressed', String(i === niveauNr));
    // Tijdens het spelen staat de rij vast, anders speel je met een misklik je
    // eigen beurt weg.
    knop.disabled = !open || bezig;
    // Alleen het getal. Onder de naam van de graad is er niets anders wat het kan
    // zijn, en de balk naast het veld zegt tijdens het spelen 'beste' voluit.
    knop.querySelector('.niveau-beste').innerHTML =
      open ? '<b>' + voortgang.records[NIVEAUS[i].id] + '</b>' : 'op slot';
  });

  if (!niveauUitlegEl) return;
  const nu = huidigNiveau();
  const volgende = NIVEAUS[niveauNr + 1];
  let tekst = nu.naam + ': ' + nu.toelichting + '.';
  if (volgende && voortgang.vrij <= niveauNr + 1) {
    tekst += ' Haal er ' + VRIJSPEEL_NOTEN + ' zonder al je hartjes te verliezen:' +
             ' dan gaat ' + volgende.naam + ' open en laat het patroon los.';
  } else {
    tekst += ' Na ' + VRIJSPEEL_NOTEN + ' noten laat het patroon los en wordt het willekeurig.';
  }
  niveauUitlegEl.textContent = tekst;
}

function kiesNiveau(i) {
  if (i >= voortgang.vrij || i === niveauNr) return;
  niveauNr = i;
  record = laadRecord();
  werkNiveausBij();
  werkBalkBij();
  toonStartkaart();
}

// cijfers is de grote score met de topscore ernaast; op de startkaart blijft dat
// leeg en klapt het blokje vanzelf dicht.
function toonKaart(titel, cijfers, tekst, knop) {
  if (!kaartEl) return;
  kaartEl.querySelector('h3').textContent = titel;
  kaartCijfersEl.innerHTML = cijfers;
  kaartTekstEl.innerHTML = tekst;
  kaartKnopEl.textContent = knop;
  kaartEl.hidden = false;
}

function toonStartkaart() {
  toonKaart('Klaar?', '',
    'Je speelt <b>' + huidigNiveau().naam + '</b>.<br>Je krijgt eerst vier tellen om mee te tellen.',
    'Start');
}

// ============================================================
//  Aanzetten
// ============================================================

if (spelEl) {
  bouwBanen();
  bouwNiveaus();
  werkNiveausBij();
  werkBalkBij();
  toonStartkaart();
  kaartKnopEl.addEventListener('click', start);

  if (wisAllesEl) {
    wisAllesEl.addEventListener('click', () => {
      if (wisTimer) {
        ontwapenWissen();
        wisVoortgang();
        return;
      }
      wisAllesEl.textContent = 'Zeker?';
      wisTimer = setTimeout(ontwapenWissen, 3000);
    });
  }
}
