/* Ontdek het drumstel
   Kick, snare en hihat, opgebouwd uit losse onderdelen.

   Eén regel loopt door het hele bestand heen: geen enkele stem wordt per
   aanslag gestart of gestopt. Alle oscillatoren en ruisspelers lopen continu
   door, en een envelope knipt er stukjes uit. Dat is niet alleen simpeler, het
   voorkomt ook dat Tone struikelt als je snel achter elkaar speelt — starten en
   stoppen is een toestandsmachine, envelopes zijn pure automatisering.

   Alles wat je wilt aanpassen (namen, uitleg, welke toets, welke vorm en het
   bereik van elk schuifje) staat in KIT hieronder. */

// ============================================================
//  1. De kit
// ============================================================

const KIT = [
  {
    id: 'kick',
    naam: 'Kick',
    toets: 'a',
    toetsLabel: 'A',
    kleur: 'koraal',
    vorm: 'rond',
    uitleg: 'De grote trommel die op de grond staat en die je met je voet speelt. Hij maakt het diepe boem onder je beat.',
    schuifjes: [
      { id: 'toon', label: 'Toonhoogte', min: 30, max: 120, step: 1, waarde: 55 },
      { id: 'sweep', label: 'Sweep', min: 0.5, max: 3, step: 0.1, waarde: 1.8 },
      { id: 'lengte', label: 'Lengte', min: 0.05, max: 1, step: 0.05, waarde: 0.3 }
    ]
  },

  {
    id: 'snare',
    naam: 'Snare',
    toets: 's',
    toetsLabel: 'S',
    kleur: 'zon',
    vorm: 'vierkant',
    uitleg: 'Een trommel met metalen snaartjes onder het vel. Die ratelen mee als je slaat en maken die scherpe tsjak.',
    schuifjes: [
      // Het spiegelbeeld van stand 12: even ver van de andere kant. De periode is
      // hier zo kort dat de ruis breed uitwaaiert in plaats van op een toon te
      // gaan hangen -- dat scherpe tsjak van een snare met de snaartjes eronder.
      { id: 'ruistoon', label: 'Ruistoon', min: 0, max: 15, step: 1, waarde: 3 },
      { id: 'lengte', label: 'Lengte', min: 0.03, max: 0.5, step: 0.01, waarde: 0.19 },
      { id: 'galm', label: 'Galm', min: 0, max: 1, step: 0.02, waarde: 0 }
    ]
  },

  {
    id: 'hihat',
    naam: 'Hihat',
    toets: 'd',
    toetsLabel: 'D',
    kleur: 'blauw',
    vorm: 'driehoek',
    uitleg: 'Twee bekkens die vlak boven elkaar hangen. Samen maken ze het korte tsss dat je beat in kleine stukjes hakt.',
    schuifjes: [
      { id: 'ruistoon', label: 'Ruistoon', min: 0, max: 15, step: 1, waarde: 3 },
      { id: 'lengte', label: 'Lengte', min: 0.01, max: 0.4, step: 0.01, waarde: 0.14 },
      { id: 'straaljager', label: 'Straaljager', min: 0, max: 1, step: 0.02, waarde: 0 }
    ]
  }
];

// ============================================================
//  2. Het ruiskanaal
// ============================================================

// Zestien snelheden waarop het schuifregister kan tikken, gedeeld uit de
// kloksnelheid van de processor. Klein getal is snel en dus fel, groot getal is
// traag en klinkt als een lage brom.
const NES_PERIODEN = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];
const NES_KLOK = 1789773;

const ruisBuffers = {};

// Een schuifregister van vijftien bits: elke tik schuift alles een plek op en
// het nieuwe bit is de XOR van de onderste twee. Daar komt die typische ruis
// vandaan, en dat is iets heel anders dan willekeurige getallen.
function ruisBuffer(index) {
  if (ruisBuffers[index]) return ruisBuffers[index];

  const rauw = Tone.getContext().rawContext;
  const sr = rauw.sampleRate;
  const lengte = Math.round(sr * 2);
  const buffer = rauw.createBuffer(1, lengte, sr);
  const data = buffer.getChannelData(0);

  const tikkenPerSample = (NES_KLOK / NES_PERIODEN[index]) / sr;
  let schuif = 1;
  let teller = 0;

  for (let i = 0; i < lengte; i++) {
    teller += tikkenPerSample;
    while (teller >= 1) {
      const bit = (schuif ^ (schuif >>> 1)) & 1;
      schuif = (schuif >>> 1) | (bit << 14);
      teller -= 1;
    }
    data[i] = (schuif & 1) ? 0.8 : -0.8;
  }

  ruisBuffers[index] = buffer;
  return buffer;
}

// ============================================================
//  3. De geluiden
// ============================================================

// Tone plant standaard alles 100 ms vooruit zodat sequences strak lopen, maar
// bij live spelen hoor je die 100 ms als traagheid. Wij spelen niets af van de
// Transport, dus dat mag nul.
Tone.getContext().lookAhead = 0;

// Een zachte begrenzer aan het eind vangt op als alles tegelijk wordt geslagen.
// Bewust geen Tone.Limiter: die zit op een compressor, en een compressor in de
// browser kijkt 6 ms vooruit.
const begrenzer = new Tone.WaveShaper((x) => {
  const knie = 0.8;
  if (Math.abs(x) <= knie) return x;
  return Math.sign(x) * (knie + (1 - knie) * Math.tanh((Math.abs(x) - knie) / (1 - knie)));
}, 2048).toDestination();

const master = new Tone.Gain(0.9).connect(begrenzer);

// Een doorlopende oscillator met een envelope erachter. Dit is het patroon voor
// alle getoonde stemmen: de oscillator staat altijd aan, de envelope bepaalt of
// je hem hoort. Geen start en stop per aanslag, dus niets dat kan struikelen.
function maakToonStem(golf, toon, lengte, niveau, uitgang) {
  const oscillator = new Tone.Oscillator({ type: golf, frequency: toon }).start();
  const envelope = new Tone.AmplitudeEnvelope({
    attack: 0.001, decay: lengte, sustain: 0, release: 0.05
  });
  const gain = new Tone.Gain(niveau).connect(uitgang);
  oscillator.chain(envelope, gain);
  return { oscillator, envelope, gain };
}

// Een val in toonhoogte: begin een stuk hoger en zak in een paar honderdste naar
// de grondtoon. Dat is wat van een noot een klap maakt.
function valToon(stem, van, naar, tijd, duur) {
  stem.oscillator.frequency.cancelScheduledValues(tijd);
  stem.oscillator.frequency.setValueAtTime(van, tijd);
  stem.oscillator.frequency.exponentialRampToValueAtTime(naar, tijd + duur);
}

// Kick
const kickVol = new Tone.Volume(0).connect(master);
const kickStem = maakToonStem('triangle', 55, 0.3, 1, kickVol);

// Snare en hihat delen hetzelfde ontwerp: ruis die rondloopt en een envelope die
// er stukjes uit knipt.
function maakRuisStem(volumeDb, ruistoon, lengte) {
  const vol = new Tone.Volume(volumeDb).connect(master);
  const envelope = new Tone.AmplitudeEnvelope({
    attack: 0.001, decay: lengte, sustain: 0, release: 0.01
  });
  const speler = new Tone.Player();
  speler.buffer = new Tone.ToneAudioBuffer(ruisBuffer(ruistoon));
  speler.loop = true;
  speler.connect(envelope);
  return { vol, envelope, speler, ruistoon, gepland: 0 };
}

const snareStem = maakRuisStem(-6, 9, 0.14);
snareStem.envelope.connect(snareStem.vol);

// Een snare is twee dingen tegelijk: het vel met de snaartjes die eronder mee
// ratelen (dat is de ruis hierboven) en de trommel zelf die meeklinkt. Zonder
// die trommel hoor je alleen geritsel en mis je de body.
//
// De trommel krijgt geen eigen schuifje maar hangt aan hetzelfde Lengte-schuifje,
// en loopt via hetzelfde volume, zodat de galm ook over de trommel gaat.
const SNARE_TROMMEL_TOON = 170;
const snareTrommel = maakToonStem('triangle', SNARE_TROMMEL_TOON, 0.12, 0.5, snareStem.vol);

// De trommel klinkt korter uit dan het vel, anders gaat hij boventoon spelen.
const trommelLengte = (lengte) => Math.min(0.18, lengte);

// Galm voor de snare, als aparte tak naast het droge signaal. Zo blijft de klap
// zelf net zo direct als eerst en komt de galm er alleen bovenop.
const galm = new Tone.Freeverb({ roomSize: 0.82, dampening: 2600, wet: 1 }).connect(master);
const galmZend = new Tone.Gain(0).connect(galm);
snareStem.vol.connect(galmZend);

const hihatStem = maakRuisStem(-12, 3, 0.14);
hihatStem.envelope.connect(hihatStem.vol);

// Straaljager is twee dingen op één schuifje. De eerste helft zit in de envelope
// zelf: die verschuift van wegsterven naar aanzwellen, zie pasToe. De tweede is
// deze piepkorte vertraging die heen en weer schuift, oftewel een flanger, en
// ruis is daar ideaal materiaal voor. Ook als aparte tak, zodat de tik zelf even
// direct blijft.
const straal = new Tone.FeedbackDelay({ delayTime: 0.004, feedback: 0.72, wet: 1 }).connect(master);
const straalLfo = new Tone.LFO({ frequency: 0.25, min: 0.0006, max: 0.009 }).start();
straalLfo.connect(straal.delayTime);
const straalZend = new Tone.Gain(0).connect(straal);
hihatStem.vol.connect(straalZend);

// Van ruistoon wisselen betekent een andere buffer, en een lopende speler pakt
// die pas op als hij opnieuw begint. Stoppen en starten op precies dezelfde klok
// laat Tone struikelen, dus we houden per stem bij tot wanneer er al iets
// gepland staat en schuiven er altijd net voorbij.
function zetRuistoon(stem, index) {
  if (stem.ruistoon === index) return;
  stem.ruistoon = index;
  stem.speler.buffer.set(ruisBuffer(index));
  if (stem.speler.state !== 'started') return;

  const t = Math.max(Tone.now(), stem.gepland) + 0.005;
  stem.speler.stop(t);
  stem.speler.start(t + 0.001);
  stem.gepland = t + 0.001;
}

function startRuis() {
  [snareStem, hihatStem].forEach((stem) => {
    if (stem.speler.state === 'started') return;
    // Staat er al een herstart klaar, dan is er niets aan de hand en moeten we
    // er vooral niks vóór plannen: net van ruistoon wisselen zet een stop en een
    // start in de toekomst, en daar zou een start op nu dwars doorheen gaan.
    if (stem.gepland > Tone.now()) return;
    stem.speler.start();
    stem.gepland = Tone.now();
  });
}

// ============================================================
//  4. Stand van de schuifjes
// ============================================================

// Wat je instelt blijft bewaard in deze browser, zodat je beat er de volgende
// keer nog precies zo staat.
const BEWAARSLEUTEL = 'wotto-muziekgames-les1';

const stand = {};

function bruikbaar(waarde, p) {
  return typeof waarde === 'number' && isFinite(waarde) && waarde >= p.min && waarde <= p.max;
}

function laadStand() {
  let bewaard = {};
  try {
    bewaard = JSON.parse(localStorage.getItem(BEWAARSLEUTEL)) || {};
  } catch (e) {
    bewaard = {}; // geen opslag, of onleesbaar: gewoon met de beginstand starten
  }

  KIT.forEach((inst) => {
    stand[inst.id] = {};
    inst.schuifjes.forEach((p) => {
      // Bewust schuifje voor schuifje controleren. Verander ik later een bereik
      // of haal ik er een weg, dan mag oude opslag de les niet slopen.
      const opgeslagen = bewaard[inst.id] ? bewaard[inst.id][p.id] : undefined;
      stand[inst.id][p.id] = bruikbaar(opgeslagen, p) ? opgeslagen : p.waarde;
    });
  });
}

function bewaarStand() {
  try {
    localStorage.setItem(BEWAARSLEUTEL, JSON.stringify(stand));
  } catch (e) {
    // Opslag kan uit staan of vol zijn. Dan werkt alles gewoon door, alleen
    // zonder onthouden.
  }
}

laadStand();

function pasToe(id) {
  const s = stand[id];

  if (id === 'kick') {
    kickStem.envelope.decay = s.lengte;
  }

  if (id === 'snare' || id === 'hihat') {
    const stem = (id === 'snare') ? snareStem : hihatStem;
    zetRuistoon(stem, Math.round(s.ruistoon));
    stem.envelope.decay = s.lengte;
  }

  if (id === 'snare') {
    snareTrommel.envelope.decay = trommelLengte(s.lengte);
    // Halve schaal: op vol was de galm net zo luid als de klap zelf, en dat is
    // voor een beat te veel van het goede.
    galmZend.gain.value = s.galm * 0.5;
    galm.set({ roomSize: 0.6 + s.galm * 0.25 });
  }

  if (id === 'hihat') {
    // Straaljager verdeelt de lengte tussen aanzwellen en wegsterven, en zet
    // tegelijk de flanger open.
    hihatStem.envelope.attack = Math.max(0.001, s.straaljager * s.lengte);
    hihatStem.envelope.decay = Math.max(0.005, (1 - s.straaljager) * s.lengte);
    straalZend.gain.value = s.straaljager * 0.8;
  }
}

// ============================================================
//  5. Spelen
// ============================================================

// Elk geluid is één kanaal: sla je opnieuw aan, dan neemt de nieuwe tik het over
// van de vorige. Twee aanslagen op precies dezelfde klok schuiven we een
// millisecond uit elkaar, want currentTime verspringt per audiobuffer en alles
// wat je binnen zo'n stapje speelt zou anders hetzelfde tijdstip krijgen.
//
// Er wordt hier nooit een aanslag weggegooid.
// Een klein beetje voorsprong. Tone.now() is de tijd van het laatst afgeronde
// audioblok, en de geluidskaart is daar op dat moment al voorbij. Plan je precies
// daarop, dan begint een envelope in het verleden: de aanzet is dan al gebeurd
// voordat je hem hoort, en bij een korte tik is de hele noot al voorbij. Dat is
// de haperende tik waarbij je de pad wel ziet indrukken.
//
// Twaalf milliseconden is genoeg om voorbij één audioblok te komen en blijft ver
// onder wat je als vertraging hoort. Voelt het traag, dan is dit de knop.
const VOORSPRONG = 0.012;

const gepland = { kick: 0, snare: 0, hihat: 0 };

// wanneer is optioneel: laat je hem weg, dan is het nu. De beats hierboven geven
// hem wel mee, want die plannen een paar honderdste vooruit.
function tijdstip(id, wanneer) {
  const nu = (wanneer === undefined) ? Tone.now() + VOORSPRONG : wanneer;
  const t = (nu > gepland[id]) ? nu : gepland[id] + 0.001;
  gepland[id] = t;
  return t;
}

// Alleen aanslaan, nooit loslaten. Omdat sustain nul is sterft elke envelope uit
// zichzelf uit na zijn decay, dus een release voegt niets toe aan het geluid --
// hij zet alleen een tweede moment in de agenda dat de eerste kan verstoren.
// Eén gepland moment per aanslag is er precies één.
function speel(id, wanneer) {
  const s = stand[id];
  const t = tijdstip(id, wanneer);

  if (id === 'kick') {
    valToon(kickStem, s.toon * Math.pow(2, s.sweep), s.toon, t, 0.03);
    kickStem.envelope.triggerAttack(t);
  }

  if (id === 'snare') {
    snareStem.envelope.triggerAttack(t);
    valToon(snareTrommel, SNARE_TROMMEL_TOON * 2.3, SNARE_TROMMEL_TOON, t, 0.02);
    snareTrommel.envelope.triggerAttack(t);
  }

  if (id === 'hihat') {
    hihatStem.envelope.triggerAttack(t);
  }
}

// ============================================================
//  6. Het scherm bouwen
// ============================================================

const VORMEN = {
  rond: '<circle cx="50" cy="50" r="41"/>',
  vierkant: '<rect x="11" y="11" width="78" height="78" rx="10"/>',
  driehoek: '<polygon points="50,9 90,86 10,86"/>'
};

const kitEl = document.getElementById('kit');

// Per geluid een lijst met pads, want een geluid kan meer dan één knop op de
// pagina hebben: het spelletje onderaan zet er nog drie neer. Vooraf onthouden
// scheelt zoeken bij elke aanslag.
const pads = {};
const vormen = {};

// Wat er bij een aanslag mag opveren: op een pad is dat de vorm, op een foto het
// plaatje zelf. Vindt hij niets, dan blijft het bij het oplichten; flits kan
// tegen een lege plek.
function meldPad(id, padEl) {
  if (!pads[id]) { pads[id] = []; vormen[id] = []; }
  pads[id].push(padEl);
  vormen[id].push(padEl.querySelector('.vorm, .puls'));
}

const stijl = getComputedStyle(document.documentElement);
const kleurWaarde = (naam) => stijl.getPropertyValue('--' + naam).trim() || '#1A2233';

// De knop van een schuifje krijgt dezelfde vorm als het pad erboven. Dat kan
// niet met border-radius alleen, want een driehoek met een rand eromheen bestaat
// niet in CSS. Dus tekenen we hem als klein plaatje.
function vormKnop(vorm, kleurNaam) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<g fill="' + kleurWaarde(kleurNaam) + '" stroke="' + kleurWaarde('ink') +
    '" stroke-width="14" stroke-linejoin="round">' + VORMEN[vorm] + '</g></svg>';
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
}

function schuifjeMarkup(instId, p) {
  const naam = instId + '-' + p.id;
  return `
      <div class="slider">
        <label for="${naam}">${p.label}</label>
        <input type="range" id="${naam}"
               data-id="${instId}" data-param="${p.id}"
               min="${p.min}" max="${p.max}" step="${p.step}" value="${stand[instId][p.id]}">
      </div>`;
}

KIT.forEach((inst) => {
  const paneel = document.createElement('section');
  paneel.className = 'paneel';
  paneel.style.setProperty('--kleur', 'var(--' + inst.kleur + ')');
  paneel.style.setProperty('--knop', vormKnop(inst.vorm, inst.kleur));
  // Ink op blauw haalt maar 2.4 contrast, dus daar moet de tekst wit worden.
  // Op koraal, zon en mint is ink juist het best leesbaar.
  paneel.style.setProperty('--op-kleur', inst.kleur === 'blauw' ? 'var(--wit)' : 'var(--ink)');

  paneel.innerHTML = `
    <button class="pad" type="button" data-id="${inst.id}" aria-label="Speel ${inst.naam}">
      <svg class="vorm" viewBox="0 0 100 100" aria-hidden="true">${VORMEN[inst.vorm]}</svg>
      <span class="pad-naam">${inst.naam}</span>
      <span class="pad-toets">${inst.toetsLabel}</span>
    </button>
    <div class="schuifjes">${inst.schuifjes.map((p) => schuifjeMarkup(inst.id, p)).join('')}</div>
    <button class="knop klein" type="button" data-reset="${inst.id}">Reset</button>
  `;

  // Een bladzijde zonder schuifjes (de body-percussieles bijvoorbeeld) gebruikt
  // alleen de geluiden. Dan is er geen kit om panelen in te hangen, maar de
  // stemmen moeten wel op de bewaarde stand gezet worden.
  if (kitEl) {
    kitEl.appendChild(paneel);
    meldPad(inst.id, paneel.querySelector('.pad'));
  }
  pasToe(inst.id);
});

// De foto's boven aan de les doen mee als pad: erop tikken speelt het geluid en
// laat dat onderdeel even opveren. Ze hebben geen .vorm om te laten pulseren, en
// flits kan daartegen.
// De uitleg over een onderdeel staat onder zijn foto, waar je hem leest voordat
// je hem hoort. De tekst komt uit KIT hierboven, zodat hij maar op een plek staat.
document.querySelectorAll('.deel[data-id]').forEach((deel) => meldPad(deel.dataset.id, deel));

// De uitleg staat boven het vak met de foto's. Voor de tekst staat een pilletje
// met de vorm en de naam van het onderdeel, in zijn eigen kleur -- dezelfde vorm
// die straks op het pad staat en in het spel naar beneden valt, zodat je hem
// overal herkent. Alles komt uit KIT hierboven.
KIT.forEach((inst) => {
  const vak = document.querySelector('[data-uitleg="' + inst.id + '"]');
  if (!vak) return;

  vak.style.setProperty('--kleur', 'var(--' + inst.kleur + ')');
  vak.style.setProperty('--op-kleur', inst.kleur === 'blauw' ? 'var(--wit)' : 'var(--ink)');
  vak.innerHTML =
    '<button class="deel-titel" type="button" data-id="' + inst.id +
    '" aria-label="Speel ' + inst.naam + '">' + inst.naam + '</button> ' + inst.uitleg;

  // Het naampilletje doet mee als pad: erop tikken speelt het geluid, en het
  // licht mee op als de foto of het pad geraakt wordt.
  meldPad(inst.id, vak.querySelector('.deel-titel'));
});

// ============================================================
//  7. Geluid aanzetten
// ============================================================

// De browser wil een gebaar van de gebruiker voordat er geluid uit mag komen,
// en welk gebaar meetelt verschilt per invoersoort. Bij een muis en het
// toetsenbord telt het indrukken al mee, maar bij aanraken telt pointerdown
// níet: daar geeft pas het loslaten toestemming. Luister je alleen op
// pointerdown, dan blijft de audiocontext bij touch dus dicht, terwijl de pads
// gewoon oplichten. Vandaar dat we op allebei luisteren.
//
// De luisteraars blijven staan tot het geluid echt loopt, want een poging kan
// mislukken en dan moet de volgende aanraking het gewoon opnieuw proberen.
let geluidAan = false;

const STARTGEBAREN = ['pointerdown', 'pointerup', 'touchend', 'keydown'];

function startGeluid() {
  return Tone.start().then(() => {
    geluidAan = true;
    startRuis();
  });
}

function probeerStarten() {
  startGeluid().then(() => {
    if (Tone.getContext().state !== 'running') return;
    STARTGEBAREN.forEach((soort) => window.removeEventListener(soort, probeerStarten, true));
  }).catch(() => { /* volgende gebaar probeert het opnieuw */ });
}

STARTGEBAREN.forEach((soort) => window.addEventListener(soort, probeerStarten, { capture: true }));

// ============================================================
//  8. Klikken, tikken en toetsen
// ============================================================

const flitsers = {};
const minderBeweging = window.matchMedia('(prefers-reduced-motion: reduce)');

function flits(id) {
  const lijst = pads[id];
  if (!lijst) return;

  lijst.forEach((pad) => pad.classList.add('aan'));
  clearTimeout(flitsers[id]);
  flitsers[id] = setTimeout(() => lijst.forEach((pad) => pad.classList.remove('aan')), 120);

  if (minderBeweging.matches) return;

  // Via de animatie-API en niet via een class, want dan begint de puls opnieuw
  // ook als je hem midden in een vorige aanslag weer raakt.
  vormen[id].forEach((vorm) => {
    if (!vorm || !vorm.animate) return;
    // Hoe ver hij uitzet mag per element verschillen. Een vorm op een pad is
    // klein en heeft ruimte om zich heen; een foto van driehonderd pixels breed
    // staat tegen de rand van de bladzijde aan en zou er met 32% overheen
    // steken. Dan groeit de bladzijde mee, verschijnt er een schuifbalk en
    // verspringt de hele opmaak.
    const groei = vorm.dataset.puls || '1.32';

    // De bounce hoort op het uitzetten, niet over de hele animatie. Stond hij op
    // het geheel, dan schoot de overshoot al voorbij de laatste keyframe en was
    // de puls na een goede honderd milliseconden alweer voorbij.
    vorm.animate([
      { transform: 'scale(1)', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      { transform: 'scale(' + groei + ')', offset: 0.35, easing: 'ease-out' },
      { transform: 'scale(1)' }
    ], { duration: 280 });
  });
}

// Het spelletje onderaan de pagina luistert hier mee. Zo hoeft dit bestand niets
// van het spel te weten, en werkt het spel vanzelf met álle manieren van spelen:
// toetsenbord, muis en aanraken lopen allemaal via raak.
let bijAanslag = null;

// En hier hangt het spel zijn slot aan op: pas als er aan alle schuifjes is
// gedraaid mag je spelen. Dit bestand houdt dat niet zelf bij; het geeft alleen
// door wat er beweegt.
let bijSchuifje = null;

function raak(id) {
  // Zo vroeg mogelijk klokken, want hier hangt de score van het spel aan vast.
  const wanneer = Tone.now();

  // We kijken naar de context zelf en niet naar een eigen vlaggetje. Een browser
  // mag hem onderweg stilzetten, bijvoorbeeld als je wegklikt of het systeem van
  // geluidsuitgang wisselt, en dan blijft het scherm gewoon werken terwijl er
  // niets meer uit komt. Zo zet elke aanslag hem vanzelf weer aan.
  const draait = Tone.getContext().state === 'running';

  // Eerst het geluid, dan pas het plaatje. Andersom staat het tekenen tussen
  // jouw toets en wat je hoort in.
  if (draait) {
    startRuis(); // doet niets als ze al lopen, en vangt het op als er een uitviel
    speel(id);
  } else {
    startGeluid().then(() => speel(id)).catch(() => { /* volgende tik weer */ });
  }

  flits(id);

  if (bijAanslag) bijAanslag(id, wanneer);
}

// Pads: pointerdown speelt meteen, zonder te wachten op het loslaten.
document.addEventListener('pointerdown', (e) => {
  // Alleen de linkerknop. pointerdown vuurt ook bij rechts- en middenklik, en
  // dan zou je een geluid krijgen mét een contextmenu erbij. Bij aanraken is
  // button altijd 0, dus touch loopt hier gewoon doorheen -- en we filteren
  // bewust niet op isPrimary, want een tweede vinger moet ook gewoon spelen.
  if (e.button !== 0) return;

  const pad = e.target.closest('.pad, .deel, .deel-titel');
  if (!pad) return;

  // preventDefault houdt het slepen en selecteren tegen, maar neemt ook de focus
  // weg. Die zetten we er zelf op, zodat je na een klik gewoon de spatiebalk kunt
  // gebruiken. Zonder scrollen, anders springt de pagina op een klein scherm.
  //
  // Alleen op de pads. Op de foto's boven aan de les hield je er anders een
  // blauwe rand aan over die je met de muis niet gevraagd hebt. Loop je er met
  // het toetsenbord langs, dan komt die rand er via :focus-visible gewoon bij.
  e.preventDefault();
  if (pad.classList.contains('pad')) pad.focus({ preventScroll: true });

  raak(pad.dataset.id);
});

document.addEventListener('click', (e) => {
  const reset = e.target.closest('[data-reset]');
  if (reset) herstel(reset.dataset.reset);
});

// Een pad met de spatiebalk of enter. Bewust via keydown en niet via click: na
// een tik op een aanraakscherm stuurt de browser óók nog een click, en dan zou
// het geluid een tweede keer starten en zichzelf afkappen.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const pad = e.target.closest && e.target.closest('.pad, .deel, .deel-titel');
  if (!pad) return;
  e.preventDefault();
  raak(pad.dataset.id);
});

// ============================================================
//  9. De foto uitvergroten
// ============================================================

// Voor op het digibord: klik de foto groot en laat de klas raden hoe de
// onderdelen heten. Het is een dialog, dus Escape, de achtergrond en de focus
// zijn al geregeld; hier hoeft alleen open en dicht bij.
const grootbeeld = document.querySelector('[data-grootbeeld]');

document.addEventListener('click', (e) => {
  if (!grootbeeld || !grootbeeld.showModal) return;

  if (e.target.closest('[data-vergroot]')) {
    if (!grootbeeld.open) grootbeeld.showModal();
    return;
  }

  // Staat hij open, dan doet de volgende klik hem weer dicht: op de grote foto
  // zelf of ernaast. Er staat geen sluitknop in beeld, want die zou over de foto
  // heen liggen; met het toetsenbord doet Escape hetzelfde, en dat kan de dialog
  // uit zichzelf al.
  if (grootbeeld.open) grootbeeld.close();
});

// Schuifjes
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.type !== 'range') return;
  stand[el.dataset.id][el.dataset.param] = parseFloat(el.value);
  pasToe(el.dataset.id);
  if (bijSchuifje) bijSchuifje(el.dataset.id, el.dataset.param);
});

// Loslaten: je hoort meteen wat je gedraaid hebt, en het wordt bewaard. Bewust
// hier en niet bij elke beweging tijdens het slepen: dan zou er tientallen keren
// per seconde naar de opslag geschreven worden.
document.addEventListener('change', (e) => {
  if (e.target.type !== 'range') return;
  bewaarStand();
  raak(e.target.dataset.id);
});

// Toetsenbord
const toetsen = {};
KIT.forEach((inst) => { toetsen[inst.toets] = inst.id; });

window.addEventListener('keydown', (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const id = toetsen[e.key.toLowerCase()];
  if (!id) return;
  e.preventDefault();
  raak(id);
});

// ============================================================
//  9. Terug naar de beginstand
// ============================================================

// Alleen terugzetten, zonder geluid. Wis voortgang zet zo alle drie de geluiden
// tegelijk terug, en drie klappen door elkaar is geen bevestiging maar schrikken.
function zetTerug(id) {
  const inst = KIT.find((i) => i.id === id);
  inst.schuifjes.forEach((p) => {
    stand[id][p.id] = p.waarde;
    const schuif = document.getElementById(id + '-' + p.id);
    if (schuif) schuif.value = p.waarde;
  });
  pasToe(id);
  bewaarStand();
}

// De Reset-knop op een paneel: terugzetten en meteen laten horen wat dat doet.
function herstel(id) {
  zetTerug(id);
  raak(id);
}
