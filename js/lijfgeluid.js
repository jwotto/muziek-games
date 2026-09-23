/* De lijfgeluiden: boem en klap

   Boem is met je vlakke handen op je knieën, klap is in je handen klappen. Los
   bestand omdat de body-percussionlessen ze delen: de klapoefening en de
   ritmevierkanten in les 1, en het ritmevierkant dat je zelf maakt in les 2.

   Laden na Tone.js en drumkit.js, want alles hangt aan master uit drumkit.
   lijfGeluid('boem' of 'klap', tijd) laat er een klinken. Roep eerst een keer
   startLijfRuis() aan zodra het geluid mag, anders heeft de ruis niets om uit
   te knippen. */

// De klap is een opname. Hij moet het hele lokaal over, dus hij staat boven
// alles uit.
//
// De opname zit al aan de top van wat in een bestand past, dus die negen decibel
// gaan daar overheen. Wat eronder zit -- het lijf van de klap -- wordt gewoon
// negen decibel harder; alleen de punt van de aanslag loopt de zachte begrenzer
// aan het eind van de keten in en wordt daar afgerond. Bij een klap hoor je dat
// niet als vervorming. Nog veel harder zetten kan wel, maar dan gaat het ten
// koste van de knal aan het begin en dat is nou juist wat een klap een klap
// maakt.
const KLAP_BESTAND = 'snd/klap.wav';
const KLAP_LUID = 9;

// Zoveel klappen kunnen tegelijk klinken. Bij vier klappen per tel op tempo 200
// zit er 75 ms tussen en de opname duurt 180 ms, dus ze lopen over elkaar heen.
// Eén speler zou de vorige dan afkappen.
const KLAP_STEMMEN = 6;

const klapVol = new Tone.Volume(KLAP_LUID).connect(master);

const klapSpelers = [];
for (let i = 0; i < KLAP_STEMMEN; i++) klapSpelers.push(new Tone.Player().connect(klapVol));

let klapBeurt = 0;
let klapOpnameKlaar = false;

const klapOpname = new Tone.ToneAudioBuffer(KLAP_BESTAND, () => {
  klapSpelers.forEach((speler) => { speler.buffer = klapOpname; });
  klapOpnameKlaar = true;
}, () => {
  // Niet geladen: dan blijft de nagebouwde klap hieronder staan. Een oefening
  // zonder klap is erger dan een klap die niet de opname is.
  klapOpnameKlaar = false;
});

// Hieronder het vangnet: een klap nagebouwd uit ruis, voor als de opname niet
// laadt. Een handklap van een enkele ruisstoot klinkt als een snare. Wat er een
// klap van maakt is dat het er eigenlijk drie zijn -- een handklap kaatst na, en
// de 909 bootst dat na met drie hele korte stootjes vlak achter elkaar en daarna
// een langere staart. Dat ratelende begin is het hele verschil.
//
// Elk stootje krijgt zijn eigen envelope. Een envelope drie keer achter elkaar
// aanslaan binnen twintig milliseconden vraagt om gedoe; vier losse envelopes
// zijn goedkoop en doen precies wat er staat.
const KLAP_TIKKEN = [0, 0.009, 0.019];   // de naklappers, in seconden
const KLAP_STAART = 0.027;

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
  if (klapOpnameKlaar) {
    const speler = klapSpelers[klapBeurt];
    klapBeurt = (klapBeurt + 1) % klapSpelers.length;
    speler.start(tijd);
    return;
  }
  KLAP_TIKKEN.forEach((na, i) => klapTikEnvs[i].triggerAttack(tijd + na));
  klapStaartEnv.triggerAttack(tijd + KLAP_STAART);
}

// ============================================================
//  Boem
// ============================================================

// Een doffe klap op je knieën: een lage toon die snel wegzakt, en een kort
// stukje gedempte ruis erbovenop voor je handen op je broek. Geen kick uit het
// drumstel, want die heb je in de drumles misschien heel anders ingesteld.
const boemVol = new Tone.Volume(4).connect(master);
const boemToon = maakToonStem('sine', 70, 0.16, 1, boemVol);

const boemFilter = new Tone.Filter({ type: 'lowpass', frequency: 1200, Q: 0.7 }).connect(boemVol);
const boemHuidEnv = new Tone.AmplitudeEnvelope({
  attack: 0.001, decay: 0.045, sustain: 0, release: 0.01
}).connect(new Tone.Gain(0.55).connect(boemFilter));
const boemRuis = new Tone.Noise('pink');
boemRuis.connect(boemHuidEnv);

function boemNu(tijd) {
  valToon(boemToon, 150, 62, tijd, 0.05);
  boemToon.envelope.triggerAttack(tijd);
  boemHuidEnv.triggerAttack(tijd);
}

// ============================================================
//  Samen
// ============================================================

function startLijfRuis() {
  if (boemRuis.state !== 'started') boemRuis.start();
  startKlapRuis();
}

function lijfGeluid(soort, tijd) {
  if (soort === 'boem') boemNu(tijd);
  else klapNu(tijd);
}
