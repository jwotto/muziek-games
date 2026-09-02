/* Les 1 — drie beats om naar te luisteren

   Met dezelfde drie geluiden kun je heel verschillende muziek maken. Dat hoor je
   pas als je het naast elkaar zet, dus staan hier drie beats klaar.

   Ze blijven rondgaan tot je ze zelf stopt of tot je aan de game begint. Zo kun
   je erop meespelen met de pads en de foto's hierboven.

   Ze spelen door dezelfde stemmen als de pads, met dezelfde instellingen. Dat is
   met opzet: wat je hier hoort is precies wat je zelf ook kunt maken.

   Het plannen gaat met een korte vooruitblik en niet in één keer. Zou je een hele
   maat vooruit inplannen, dan staat de agenda van een stem seconden vol en komt
   een aanslag van jou daar pas achteraan -- precies de vertraging die we overal
   anders juist hebben weggehaald. Nu loopt de agenda hooguit dertig milliseconden
   voor, en blijft meespelen strak. */

// ============================================================
//  De beats
// ============================================================

// Zestien stappen is één maat van vier tellen, elke stap een zestiende noot.
// Een x is een klap, een punt is niets. Zo staat het patroon er als een strook
// die je kunt lezen en aanpassen zonder ergens anders iets te veranderen.
const BEATS = [
  // Recht op de tel: kick op 1 en 3, snare op 2 en 4. Dit is de beat onder bijna
  // elk popnummer, en de maat waar de andere twee van afwijken.
  {
    id: 'rock',
    naam: 'Rock',
    bpm: 96,
    patroon: {
      kick:  'x.......x.x.....',
      snare: '....x.......x...',
      hihat: 'x.x.x.x.x.x.x.x.'
    }
  },

  // De dembow, het ritme onder reggaeton. De snare staat juist níet op 2 en 4
  // maar ertussenin, terwijl de kick er gewoon op 1 en 3 onder blijft staan. Dat
  // trekken tussen die twee is wat hem laat dansen.
  {
    id: 'afro',
    naam: 'Afro',
    bpm: 94,
    patroon: {
      kick:  'x.......x.......',
      snare: '...x..x....x..x.',
      hihat: 'x.x.x.x.x.x.x.x.'
    }
  },

  // Een kick op elke tel en een hihat die alle kanten op stuitert.
  {
    id: 'electro',
    naam: 'Electro',
    bpm: 128,
    patroon: {
      kick:  'x...x...x...x.x.',
      snare: '....x.......x.xx',
      hihat: '..x.x.x.x.x.xxxx'
    }
  }
];

const BEAT_STAPPEN = 16;         // zestienden in één maat
const BEAT_VOORUIT = 0.03;       // seconden dat de planner vooruit kijkt
const BEAT_TIK = 10;             // milliseconden tussen twee rondjes van de planner
const BEAT_MAX_PER_RONDJE = 64;  // noodrem, zodat de lus nooit kan blijven hangen

// Een driehoekje om te beginnen, een blokje om te stoppen. Inline getekend en
// niet uit het icoonlettertype: dat komt van buiten, en zonder internet zou er
// dan niets staan waar juist iets moet staan.
const BEAT_START =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="7,4 20,12 7,20"/></svg>';
const BEAT_STOP =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

// ============================================================
//  De knoppen
// ============================================================

const beatsEl = document.querySelector('[data-beats]');
const beatKnoppen = {};

function bouwBeats() {
  if (!beatsEl) return;

  BEATS.forEach((beat) => {
    const knop = document.createElement('button');
    knop.className = 'beat';
    knop.type = 'button';
    knop.dataset.beat = beat.id;

    // Alleen de naam en het teken. Het patroon uittekenen bewaren we voor een
    // latere les: hier gaat het erom dat je het verschil hóórt.
    knop.innerHTML =
      '<span class="beat-naam">' + beat.naam + '</span>' +
      '<span class="beat-teken"></span>';

    knop.addEventListener('click', () => tikBeat(beat));
    beatsEl.appendChild(knop);
    beatKnoppen[beat.id] = knop;
  });
}

// Het enige wat een knop laat zien is of hij nu speelt. Dit bestand houdt geen
// voortgang bij; het speelt af en zegt wanneer er een ronde klaar is.
function werkBeatsBij() {
  BEATS.forEach((beat) => {
    const knop = beatKnoppen[beat.id];
    if (!knop) return;
    const speelt = !!(loopt && loopt.beat === beat);
    knop.classList.toggle('speelt', speelt);
    knop.querySelector('.beat-teken').innerHTML = speelt ? BEAT_STOP : BEAT_START;
    knop.setAttribute('aria-label', (speelt ? 'Stop ' : 'Speel ') + beat.naam);
  });
}

// ============================================================
//  Afspelen
// ============================================================

// Hier hangt de les zijn slot aan op: pas als je alle drie de beats hebt
// aangezet mag je zelf aan de geluiden. Aanzetten is genoeg -- hoe lang je
// luistert bepaal je zelf, en een kind laten wachten tot een teller vol is
// voelt als straf in plaats van als les.
let bijBeat = null;

let loopt = null;   // { beat, stap, tijd, tikTimer }

function tikBeat(beat) {
  if (loopt && loopt.beat === beat) {
    stopBeat();
    return;
  }

  // Dezelfde volgorde als bij een pad: eerst zorgen dat er geluid uit mag komen.
  if (Tone.getContext().state === 'running') {
    startRuis();
    beginBeat(beat);
    return;
  }
  startGeluid().then(() => beginBeat(beat)).catch(() => {});
}

function beginBeat(beat) {
  stopBeat();

  // Een kleine aanloop, zodat de eerste stap niet al voorbij is voordat de
  // planner voor het eerst rondgaat.
  loopt = { beat: beat, stap: 0, tijd: Tone.now() + 0.12, tikTimer: 0 };
  loopt.tikTimer = setInterval(planBeat, BEAT_TIK);

  werkBeatsBij();
  if (bijBeat) bijBeat(beat.id);
  planBeat();
}

function stopBeat() {
  if (!loopt) return;
  clearInterval(loopt.tikTimer);
  loopt = null;
  wisFlitsen();
  werkBeatsBij();
}

// Plant alles wat binnen de vooruitblik valt, en niet meer dan dat. De beat gaat
// rond tot je hem stopt.
function planBeat() {
  if (!loopt) return;

  const stapDuur = 15 / loopt.beat.bpm;   // 60 / bpm / 4 zestienden

  // Is de tab even weg geweest, dan loopt de agenda achter. Niet inhalen, want
  // dan komt er een lawine van klappen tegelijk: gewoon weer aansluiten bij nu.
  if (loopt.tijd < Tone.now()) loopt.tijd = Tone.now() + 0.02;

  let veilig = 0;
  while (loopt.tijd < Tone.now() + BEAT_VOORUIT && veilig < BEAT_MAX_PER_RONDJE) {
    const i = loopt.stap % BEAT_STAPPEN;

    KIT.forEach((inst) => {
      if (loopt.beat.patroon[inst.id][i] !== 'x') return;
      speel(inst.id, loopt.tijd);
      flitsStraks(inst.id, loopt.tijd);
    });

    loopt.stap += 1;
    loopt.tijd += stapDuur;
    veilig += 1;
  }
}

// Het beeld hoort bij het geluid en niet bij het plannen. De planner loopt
// hooguit dertig milliseconden voor, dus een timer op precies dat moment valt
// samen met wat je hoort. Zo zie je aan de foto's welk onderdeel er klinkt.
//
// Eigen naam en niet flitsers: die bestaat al in drumkit.js, en twee keer
// dezelfde const boven in een script is meteen een syntaxfout.
let beatFlitsers = [];

function flitsStraks(id, tijd) {
  const wacht = Math.max(0, (tijd - Tone.now()) * 1000);
  beatFlitsers.push(setTimeout(() => flits(id), wacht));
}

function wisFlitsen() {
  beatFlitsers.forEach(clearTimeout);
  beatFlitsers = [];
}

// ============================================================
//  Aanzetten
// ============================================================

if (beatsEl) {
  bouwBeats();
  werkBeatsBij();
}
