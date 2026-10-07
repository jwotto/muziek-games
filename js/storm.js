/* Body percussion 3: storm maken

   Vier geluiden die de klas zelf maakt en opneemt: druppels, wind, harde regen
   en donder. Elk geluid wordt een loop die steeds herhaalt, met zijn eigen
   volume, filter en pitch. Samen maak je er een onweersbui van.

   Bovenaan staat de golf van het gekozen geluid. Daarop schuif je twee strepen
   heen en weer: het stuk ertussen is wat er herhaald wordt.

   De opnames blijven bewaard in deze browser (IndexedDB, want een paar
   seconden geluid past niet in localStorage); de stand van de schuifjes staat
   in localStorage. Neem je opnieuw op, dan is het oude geluid weg.

   Een andere les mag deze sampler hergebruiken met eigen geluiden. Die zet
   vóór dit bestand een STORM_LES neer (zie samplebeat.js):

     kanalen      de geluiden, net als STORM_KANALEN hieronder
     soort        'stukjes': elk geluid klinkt één keer als iets het aanslaat,
                  in plaats van als loop door te lopen. Dan speelt een
                  sequencer ze af met speelStormStuk().
     bibliotheek  het adres van een lijst.json met kant-en-klare geluiden. Dan
                  krijgt elk geluid een keuzelijst en een knop om zelf een
                  bestand te uploaden.
     sleutel, db  waar de stand en de opnames bewaard worden, zodat de lessen
                  elkaars opnames niet overschrijven.

   Laden na Tone.js en drumkit.js: master, bijNeer en kleurWaarde komen daar
   vandaan. */

const STORM_ANDERS = typeof STORM_LES !== 'undefined' ? STORM_LES : {};

// Loops die doorlopen (de storm), of losse stukjes voor een sequencer.
const STORM_HERHAALT = STORM_ANDERS.soort !== 'stukjes';
const STORM_BIBLIOTHEEK = STORM_ANDERS.bibliotheek || '';

// ============================================================
//  1. De geluiden
// ============================================================

// kleur: een merkkleur uit wotto.css. Op blauw komt witte tekst, op de rest ink.
// Hoe je elk geluid met je lijf maakt, staat in de uitleg boven het paneel.
const STORM_KANALEN = STORM_ANDERS.kanalen || [
  { id: 'druppels', naam: 'Druppels',    icoon: 'drop',       kleur: 'blauw' },
  { id: 'wind',     naam: 'Wind',        icoon: 'wind',       kleur: 'mint' },
  { id: 'regen',    naam: 'Harde regen', icoon: 'cloud-rain', kleur: 'bubblegum' },
  { id: 'donder',   naam: 'Donder',      icoon: 'lightning',  kleur: 'zon' }
];

const STORM_SCHUIVEN = [
  // Tot 300%: een zachte opname zet je zo achteraf harder. De opname zelf blijft
  // rauw; het volume zit alleen op het afspelen.
  { id: 'volume', label: 'Volume', min: 0,    max: 300, step: 1, waarde: 80 },
  { id: 'filter', label: 'Filter', min: -100, max: 100, step: 1, waarde: 0 },
  { id: 'pitch',  label: 'Pitch',  min: -12,  max: 12,  step: 1, waarde: 0 }
];

// Hoe de loop rondgaat: gewoon vooruit, achteruit, of heen en weer. De knop
// gaat bij elke tik een stap verder in dit rijtje.
const STORM_RICHTINGEN = [
  { id: 'gewoon',     naam: 'Gewoon',       icoon: 'arrow-right' },
  { id: 'achteruit',  naam: 'Achteruit',    icoon: 'arrow-left' },
  { id: 'heenenweer', naam: 'Heen en weer', icoon: 'arrows-left-right' }
];

// Hoe lang het eind van de loop overvloeit in het begin, in seconden. Bij
// losse stukjes is het een fade: zo lang komt het geluid op en zakt het weg.
// Daar begint hij op nul, want een blaf of een klap moet meteen hard zijn.
const STORM_OVERGANG = { min: 0, max: 1, step: 0.01, waarde: STORM_HERHAALT ? 0.08 : 0 };

// Eén effect per geluid. Zweef is een phaser: het geluid golft, alsof het door
// een draaiende buis komt. Mooi op wind.
const STORM_EFFECTEN = [
  { id: 'geen',       naam: 'Geen' },
  { id: 'galm',       naam: 'Galm' },
  { id: 'echo',       naam: 'Echo' },
  { id: 'vervorming', naam: 'Vervorming' },
  { id: 'zweef',      naam: 'Zweef' }
];

// Hoeveel effect je hoort, van niets tot alles.
const STORM_MIX = { min: 0, max: 1, waarde: 0.5 };

const STORM_MAX = 10;        // langer dan dit neemt hij niet op, in seconden
const STORM_KORTSTE = 0.1;   // de kortste loop die je met de strepen kunt maken
const STORM_SLEUTEL = STORM_ANDERS.sleutel || 'wotto-muziekfles-storm';
const STORM_DB = STORM_ANDERS.db || 'muziekfles-storm';

// Zo ver om het midden heen klikt het filter op "uit". Precies op nul komen
// met een vinger op een digibord lukt anders bijna nooit.
const STORM_FILTER_MIDDEN = 6;

// ============================================================
//  2. Wat er bewaard wordt
// ============================================================

const storm = {
  gekozen: STORM_KANALEN[0].id,
  microfoon: '',
  micAan: false,      // de microfoon blijft open, ook tussen de opnames door
  kanalen: {},
  opname: null
};

STORM_KANALEN.forEach((def) => {
  const k = {
    // naam en bron: waar het geluid vandaan komt. Een eigen opname heeft geen
    // naam; een geluid uit de bibliotheek heeft als bron zijn bestand.
    def: def, buffer: null, begin: 0, eind: 0, aan: false, kop: null, pieken: {},
    naam: '', bron: '', laatsteStart: 0,
    richting: 'gewoon', overgang: STORM_OVERGANG.waarde,
    effect: 'geen', mix: STORM_MIX.waarde, effectNode: null
  };
  STORM_SCHUIVEN.forEach((p) => { k[p.id] = p.waarde; });
  storm.kanalen[def.id] = k;
});

function stormKanaal(id) { return storm.kanalen[id]; }

// Elke waarde apart nakijken: een stand van een oudere versie mag de les nooit
// stukmaken. Begin en eind worden pas nagekeken als de opname er is.
function laadStormStand() {
  let bewaard = null;
  try {
    bewaard = JSON.parse(localStorage.getItem(STORM_SLEUTEL));
  } catch (e) {
    return;
  }
  if (!bewaard || typeof bewaard !== 'object') return;
  if (storm.kanalen[bewaard.gekozen]) storm.gekozen = bewaard.gekozen;
  if (typeof bewaard.microfoon === 'string') storm.microfoon = bewaard.microfoon;
  if (typeof bewaard.micAan === 'boolean') storm.micAan = bewaard.micAan;
  const kanalen = bewaard.kanalen || {};
  STORM_KANALEN.forEach((def) => {
    const uit = kanalen[def.id];
    if (!uit || typeof uit !== 'object') return;
    const k = stormKanaal(def.id);
    STORM_SCHUIVEN.forEach((p) => {
      const w = parseFloat(uit[p.id]);
      if (isFinite(w) && w >= p.min && w <= p.max) k[p.id] = w;
    });
    ['begin', 'eind'].forEach((rand) => {
      const w = parseFloat(uit[rand]);
      if (isFinite(w) && w >= 0) k[rand] = w;
    });
    if (STORM_RICHTINGEN.some((r) => r.id === uit.richting)) k.richting = uit.richting;
    const over = parseFloat(uit.overgang);
    if (isFinite(over) && over >= STORM_OVERGANG.min && over <= STORM_OVERGANG.max) k.overgang = over;
    if (STORM_EFFECTEN.some((f) => f.id === uit.effect)) k.effect = uit.effect;
    const mix = parseFloat(uit.mix);
    if (isFinite(mix) && mix >= STORM_MIX.min && mix <= STORM_MIX.max) k.mix = mix;
  });
}

function bewaarStormStand() {
  const kanalen = {};
  STORM_KANALEN.forEach((def) => {
    const k = stormKanaal(def.id);
    kanalen[def.id] = {
      volume: k.volume, filter: k.filter, pitch: k.pitch, begin: k.begin, eind: k.eind,
      richting: k.richting, overgang: k.overgang, effect: k.effect, mix: k.mix
    };
  });
  try {
    localStorage.setItem(STORM_SLEUTEL, JSON.stringify({
      gekozen: storm.gekozen, microfoon: storm.microfoon, micAan: storm.micAan, kanalen: kanalen
    }));
  } catch (e) {
    // Opslag kan uit staan. Dan geldt het alleen zolang de bladzijde open is.
  }
}

// De opnames zelf. Elke opname is een Float32Array met zijn samplerate; tien
// seconden zijn een paar megabyte, dat kan IndexedDB makkelijk aan.
let stormDb = null;

function openStormDb() {
  if (stormDb) return stormDb;
  stormDb = new Promise((klaar, mis) => {
    if (!window.indexedDB) { mis(new Error('geen indexedDB')); return; }
    let vraag;
    try {
      vraag = indexedDB.open(STORM_DB, 1);
    } catch (e) {
      mis(e);
      return;
    }
    vraag.onupgradeneeded = () => vraag.result.createObjectStore('opnames');
    vraag.onsuccess = () => klaar(vraag.result);
    vraag.onerror = () => mis(vraag.error);
  });
  return stormDb;
}

function bewaarStormOpname(id, data, sr, naam, bron) {
  openStormDb().then((db) => {
    db.transaction('opnames', 'readwrite').objectStore('opnames').put(
      { data: data, sr: sr, naam: naam || '', bron: bron || '' }, id);
  }).catch(() => {
    // Geen opslag: de opname blijft staan zolang de bladzijde open is.
  });
}

function wisStormOpnames() {
  openStormDb().then((db) => {
    db.transaction('opnames', 'readwrite').objectStore('opnames').clear();
  }).catch(() => {});
}

function laadStormOpnames() {
  return openStormDb().then((db) => new Promise((klaar) => {
    const gevonden = {};
    const tx = db.transaction('opnames', 'readonly');
    const winkel = tx.objectStore('opnames');
    STORM_KANALEN.forEach((def) => {
      const vraag = winkel.get(def.id);
      vraag.onsuccess = () => { if (vraag.result) gevonden[def.id] = vraag.result; };
    });
    tx.oncomplete = () => klaar(gevonden);
    tx.onerror = () => klaar(gevonden);
  })).catch(() => ({}));
}

// ============================================================
//  3. Het geluid van een kanaal
// ============================================================

// Speler, dan het filter, dan het volume. Het filter zijn er eigenlijk twee
// achter elkaar: links op de knop zakt de lowpass (dof, alsof je de regen door
// het raam hoort), rechts klimt de highpass (dun en scherp). In het midden
// staan ze allebei zo ver open dat je niets hoort.
STORM_KANALEN.forEach((def) => {
  const k = stormKanaal(def.id);
  k.gain = new Tone.Gain(0).connect(master);
  k.hoog = new Tone.Filter({ type: 'highpass', frequency: 20, rolloff: -24, Q: 0.7 }).connect(k.gain);
  k.laag = new Tone.Filter({ type: 'lowpass', frequency: 20000, rolloff: -24, Q: 0.7 }).connect(k.hoog);
  // Een korte fade bij starten en stoppen, anders tikt het als een loop
  // midden in een geluid begint of ophoudt. Een los stukje begint zonder fade:
  // dat is vaak een klap of een tik, en die moet meteen hard zijn.
  k.speler = new Tone.Player({
    loop: STORM_HERHAALT, fadeIn: STORM_HERHAALT ? 0.01 : 0, fadeOut: 0.04
  }).connect(k.laag);
});

// Het effect zit tussen het filter en het volume. Wisselen is het oude
// weghalen en het nieuwe ertussen zetten; bij geen gaat het filter er
// rechtstreeks in.
function maakStormEffect(id) {
  if (id === 'galm') return new Tone.Freeverb({ roomSize: 0.86, dampening: 3000 });
  if (id === 'echo') return new Tone.FeedbackDelay({ delayTime: 0.28, feedback: 0.45 });
  if (id === 'vervorming') return new Tone.Distortion({ distortion: 0.8, oversample: '2x' });
  if (id === 'zweef') return new Tone.Phaser({ frequency: 0.4, octaves: 4, baseFrequency: 300, Q: 8 });
  return null;
}

function zetStormEffect(k) {
  k.hoog.disconnect();
  if (k.effectNode) {
    k.effectNode.disconnect();
    k.effectNode.dispose();
    k.effectNode = null;
  }
  let nieuw = null;
  try {
    nieuw = maakStormEffect(k.effect);
  } catch (e) {
    nieuw = null; // kent de browser dit effect niet, dan maar zonder
  }
  if (nieuw) {
    nieuw.wet.value = k.mix;
    k.hoog.connect(nieuw);
    nieuw.connect(k.gain);
    k.effectNode = nieuw;
  } else {
    k.hoog.connect(k.gain);
  }
}

function stormSnelheid(k) {
  return Math.pow(2, k.pitch / 12);
}

// Het volume in het kwadraat, net als de volumeknop onder het tandwiel: dan
// voelt de schuif gelijkmatig aan.
function pasStormGeluidToe(k) {
  const v = k.volume / 100;
  k.gain.gain.rampTo(v * v, 0.05);

  const f = k.filter / 100;
  const laag = f < 0 ? 20000 * Math.pow(200 / 20000, -f) : 20000;
  const hoog = f > 0 ? 20 * Math.pow(4000 / 20, f) : 20;
  k.laag.frequency.rampTo(laag, 0.05);
  k.hoog.frequency.rampTo(hoog, 0.05);

  // Waar de afspeelstreep staat, rekent mee met de snelheid. Verandert die,
  // dan eerst vastleggen hoe ver hij nu is.
  if (k.kop) {
    k.kop.pos = stormKopPositie(k);
    k.kop.tijd = Tone.now();
  }
  k.speler.playbackRate = stormSnelheid(k);
}

// De loop als eigen stukje geluid. Springt een loop van het eind terug naar
// het begin, dan hoor je daar een tik, want de golf maakt een sprong. Daarom
// vloeit het eind over in het begin: het staartje zakt weg terwijl het begin
// al opkomt. Hoe lang dat duurt stel je in met de overgang. Geen gewone fade,
// want bij ruis als regen en wind hoor je dan een dipje in het volume; zo
// blijft het even hard.
//
// Die overvloei zit aan het EIND van het stukje. Eerst zat hij aan het begin,
// en dan hoorde je bij het aanzetten als eerste het staartje van de opname
// (vaak stilte met geruis) en pas daarna het echte begin: een zzz en dan
// ineens goed. Nu begint het geluid de eerste keer precies bij het begin,
// zoals het is opgenomen. Aan het eind komt het begin er al overheen, en
// daarna gaat de speler verder vanaf lusBegin: net na het stuk dat al in de
// overvloei zat. Zo loopt het naadloos rond zonder iets dubbel te spelen.
//
// Heen en weer heeft geen overgang nodig: daar draait het geluid om op
// precies dezelfde plek, dus er valt niets te verbloemen.
function maakStormLus(k) {
  const sr = k.buffer.sampleRate;
  const bron = k.buffer.getChannelData(0);
  const van = Math.floor(k.begin * sr);
  const tot = Math.max(van + 2, Math.min(bron.length, Math.floor(k.eind * sr)));
  let stuk = bron.slice(van, tot);

  if (k.richting === 'achteruit') {
    stuk.reverse();
  } else if (k.richting === 'heenenweer') {
    const terug = stuk.slice(1, Math.max(1, stuk.length - 1)).reverse();
    const samen = new Float32Array(stuk.length + terug.length);
    samen.set(stuk);
    samen.set(terug, stuk.length);
    stuk = samen;
  }

  const lengte = stuk.length;
  const over = (!STORM_HERHAALT || k.richting === 'heenenweer') ? 0
    : Math.min(Math.round(k.overgang * sr), Math.floor(lengte / 2));

  const lus = Tone.getContext().createBuffer(1, Math.max(2, lengte), sr);
  const doel = lus.getChannelData(0);
  doel.set(stuk);
  for (let i = 0; i < over; i++) {
    const t = (i / over) * Math.PI / 2;
    doel[lengte - over + i] = stuk[lengte - over + i] * Math.cos(t) + stuk[i] * Math.sin(t);
  }
  // Een los stukje herhaalt niet, dus er valt niets over te vloeien. Daar is
  // de overgang een fade aan beide kanten.
  if (!STORM_HERHAALT) stormRandjes(doel, sr, k.overgang);
  k.lusDuur = lus.duration;
  k.lusBegin = over / sr;
  return lus;
}

// Een fade in en uit van fade seconden. Altijd minstens twee milliseconden in
// en tien uit: te kort om een klap zachter te maken, lang genoeg om de tik weg
// te halen die je hoort als de strepen midden in een geluid knippen.
function stormRandjes(data, sr, fade) {
  const half = Math.floor(data.length / 2);
  const inN = Math.min(Math.round(Math.max(0.002, fade) * sr), half);
  const uitN = Math.min(Math.round(Math.max(0.01, fade) * sr), half);
  for (let i = 0; i < inN; i++) data[i] *= i / inN;
  for (let i = 0; i < uitN; i++) data[data.length - 1 - i] *= i / uitN;
}

function zetStormLus(k) {
  if (!k.buffer) return;
  // Speelt hij al, dan opnieuw starten: een lopende loop houdt anders zijn oude
  // stukje tot je hem stopt. Op dezelfde plek in de loop, zodat je tijdens het
  // draaien of schuiven gewoon verder hoort spelen in plaats van steeds het
  // begin.
  const plek = k.aan ? stormKopPositie(k) : 0;
  k.speler.buffer = maakStormLus(k);
  k.speler.loopStart = k.lusBegin;
  k.speler.loopEnd = k.lusDuur;
  if (k.aan) {
    const verder = plek < k.lusDuur ? plek : k.lusBegin;
    k.speler.start(Tone.now(), verder);
    k.kop = { tijd: Tone.now(), pos: verder };
  }
}

// Tijdens het draaien of schuiven hoor je het meteen. Niet bij elke beweging
// een nieuwe loop, maar hooguit een paar keer per seconde: vaker hoor je toch
// niet, en elke keer opnieuw starten geeft een klein naadje.
function stormLusLive(k) {
  if (k.liveWacht) return;
  k.liveWacht = setTimeout(() => {
    k.liveWacht = 0;
    zetStormLus(k);
  }, 80);
}

function zetStormAan(k, aan) {
  if (aan && !k.buffer) return;
  // Losse stukjes staan nooit "aan": spelen is het stukje één keer horen.
  if (!STORM_HERHAALT) {
    if (aan) {
      Tone.start();
      speelStormStuk(k);
    }
    return;
  }
  if (k.aan === aan) return;
  k.aan = aan;
  if (aan) {
    Tone.start();
    k.speler.start();
    k.kop = { tijd: Tone.now(), pos: 0 };
  } else {
    k.speler.stop();
    k.kop = null;
  }
  werkStormKanaalBij(k);
  werkStormKopBij();
}

// Een los stukje één keer afspelen: nu, of op een tijd van de audioklok (de
// sequencer plant een paar honderdste vooruit). Tone weigert een start die
// vóór de vorige ligt; tikt iemand op het naamknopje terwijl de sequencer er
// net een heeft klaargezet, dan komt deze er vlak achter. Hij kapt het vorige
// stukje af, net als op een echte sampler.
function speelStormStuk(k, wanneer) {
  if (!k.buffer || storm.opname) return;
  let t = wanneer === undefined ? Tone.now() + 0.012 : wanneer;
  if (t <= k.laatsteStart) t = k.laatsteStart + 0.001;
  k.laatsteStart = t;
  k.speler.start(t);
  k.kop = { tijd: t, pos: 0 };
  stormLus();
}

// Speelt dit geluid nu, zodat de streep over de golf moet lopen?
function stormKopBezig(k) {
  if (!k.kop || !k.lusDuur) return false;
  if (STORM_HERHAALT) return k.aan;
  return Tone.now() - k.kop.tijd < k.lusDuur / stormSnelheid(k);
}

// Waar in de opname de loop nu is, voor de streep over de golf.
function stormKopTijd(k) {
  const pos = stormKopPositie(k);
  if (k.richting === 'achteruit') return k.eind - pos;
  if (k.richting === 'heenenweer') {
    const stuk = k.eind - k.begin;
    return pos <= stuk ? k.begin + pos : k.eind - (pos - stuk);
  }
  return k.begin + pos;
}

// Hoe ver de loop is, in seconden van het stukje zelf.
// De eerste ronde loopt van 0, daarna steeds van lusBegin tot het eind.
function stormKopPositie(k) {
  if (!k.kop || !k.lusDuur) return 0;
  const verder = k.kop.pos + Math.max(0, Tone.now() - k.kop.tijd) * stormSnelheid(k);
  if (verder < k.lusDuur) return verder;
  if (!STORM_HERHAALT) return k.lusDuur;
  const rond = k.lusDuur - (k.lusBegin || 0);
  if (rond <= 0) return 0;
  return (k.lusBegin || 0) + ((verder - (k.lusBegin || 0)) % rond);
}

// ============================================================
//  4. Opnemen
// ============================================================

function zetStormOpname(k, data, sr) {
  const buffer = Tone.getContext().createBuffer(1, data.length, sr);
  buffer.getChannelData(0).set(data);
  k.buffer = buffer;
  k.pieken = {};
  let piek = 0;
  for (let i = 0; i < data.length; i++) piek = Math.max(piek, Math.abs(data[i]));
  k.piek = piek;
}

// Stiller dan dit tekenen we niet groter: anders wordt stilte één grote ruis.
const STORM_TEKEN_MIN = 0.02;

function kanStormOpnemen() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
    (window.AudioContext || window.webkitAudioContext));
}

// Zonder echo-onderdrukking en ruisfilter: die zijn gemaakt voor praten, en
// zouden de regen en de wind er juist als ruis uithalen.
function vraagStormMicrofoon() {
  const basis = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
  const gevraagd = Object.assign({}, basis);
  if (storm.microfoon) gevraagd.deviceId = { exact: storm.microfoon };
  return navigator.mediaDevices.getUserMedia({ audio: gevraagd }).catch((fout) => {
    if (!storm.microfoon || fout.name === 'NotAllowedError' || fout.name === 'SecurityError') throw fout;
    // De gekozen microfoon zit er niet meer in: dan de standaard.
    storm.microfoon = '';
    bewaarStormStand();
    return navigator.mediaDevices.getUserMedia({ audio: basis });
  });
}

// ------------------------------------------------------------
//  De microfoon staat aan
// ------------------------------------------------------------

// Staat de schakelaar aan, dan loopt de microfoon continu door één eigen
// opvanger, met de meter en de opname erachter. Druk je op opnemen, dan wordt vanaf dat moment bewaard. Er hoeft
// dan niets meer op te starten, dus het begin valt er niet af.
//
// Eerst namen we per opname op, met een eigen klok of met de MediaRecorder
// van de browser. Die hadden allebei even nodig om op gang te komen (de
// MediaRecorder bijna een seconde), en dat stuk miste je aan het begin.
//
// Na het aanzetten wachten we ook nog even (STORM_OPWARMEN) voordat er
// opgenomen kan worden. Een laptopmicrofoon (zoals een Realtek Microphone
// Array) heeft in Windows vaak eigen ruisonderdrukking, die zich aanpast als de
// microfoon opengaat: eerst ruis, dan even bijna niets, dan pas het gewone
// geluid. Dat valt zo buiten je opnames.
const STORM_OPWARMEN = 2000; // in milliseconden

// Het opvangen doet een AudioWorklet, op de geluidsdraad van de browser, los
// van de bladzijde. Hij stuurt het geluid in stukjes door. Bij 'flush' stuurt
// hij wat hij nog heeft liggen meteen mee, zodat ook het laatste geluid van een
// opname erbij zit, en loopt dan gewoon door.
const STORM_WORKLET = `
class StormOpname extends AudioWorkletProcessor {
  constructor() {
    super();
    this.stuk = new Float32Array(2048);
    this.plek = 0;
    this.port.onmessage = () => {
      this.port.postMessage({ laatste: this.stuk.slice(0, this.plek) });
      this.plek = 0;
    };
  }
  process(ingangen) {
    const kanaal = ingangen[0] && ingangen[0][0];
    if (!kanaal) return true;
    for (let i = 0; i < kanaal.length; i++) {
      this.stuk[this.plek++] = kanaal[i];
      if (this.plek === this.stuk.length) {
        this.port.postMessage({ stuk: this.stuk }, [this.stuk.buffer]);
        this.stuk = new Float32Array(2048);
        this.plek = 0;
      }
    }
    return true;
  }
}
registerProcessor('storm-opname', StormOpname);
`;

// Opsporen: open de les met ?debug achter het adres. Dan slaat hij na elke
// opname een testbestand op in Downloads, met de opname en de gegevens van de
// microfoon. Zo kun je nagaan wat er op een computer binnenkomt.
const STORM_DEBUG = /[?&]debug\b/.test(location.search);
const STORM_VERSIE = 'storm-2026-10-05-e';

function haalStormMicrofoon() {
  const open = storm.micStroom && storm.micStroom.getAudioTracks().some((t) => t.readyState === 'live');
  if (open) return Promise.resolve(storm.micStroom);
  if (storm.micVraag) return storm.micVraag;
  storm.micVraag = vraagStormMicrofoon().then((stroom) => {
    storm.micVraag = null;
    storm.micStroom = stroom;
    storm.micWarm = performance.now() + STORM_OPWARMEN;
    storm.micAan = true;
    bewaarStormStand();
    vulStormMicrofoons();
    startStormMic(stroom);
    werkStormMicBij();
    // Na het opwarmen mogen de opnameknoppen aan.
    setTimeout(werkStormMicBij, STORM_OPWARMEN + 50);
    return stroom;
  }, (fout) => {
    storm.micVraag = null;
    throw fout;
  });
  return storm.micVraag;
}

function sluitStormMicrofoon() {
  if (storm.opname) return;
  stopStormMic();
  if (storm.micStroom) storm.micStroom.getTracks().forEach((t) => t.stop());
  storm.micStroom = null;
  werkStormMicBij();
}

// Een eigen klok voor de microfoon, op precies dezelfde samplerate als de
// microfoon zelf: dan hoeft er onderweg niets te worden omgerekend. Firefox
// eist dat zelfs. Kent de browser de samplerate niet, dan de gewone klok.
function maakStormMicKlok(stroom) {
  const Klok = window.AudioContext || window.webkitAudioContext;
  const spoor = stroom.getAudioTracks()[0];
  const instelling = spoor && spoor.getSettings ? spoor.getSettings() : {};
  if (instelling.sampleRate) {
    try {
      return new Klok({ sampleRate: instelling.sampleRate });
    } catch (e) {
      // deze samplerate mag niet: dan de gewone klok
    }
  }
  return new Klok();
}

function startStormMic(stroom) {
  stopStormMic();
  const klok = maakStormMicKlok(stroom);
  const mic = {
    klok: klok,
    bron: klok.createMediaStreamSource(stroom),
    meter: klok.createAnalyser(),
    stil: klok.createGain(),
    stand: 0,
    clipTot: 0
  };
  mic.meter.fftSize = 1024;
  mic.data = new Float32Array(mic.meter.fftSize);
  // Een knoop doet alleen zeker iets als hij ergens op uitkomt. Via een stille
  // gain, anders hoor je jezelf door de speakers.
  mic.stil.gain.value = 0;
  mic.bron.connect(mic.meter);
  mic.meter.connect(mic.stil);
  mic.stil.connect(klok.destination);
  storm.mic = mic;

  mic.klaar = startStormOpvang(mic);

  // Een klok die zonder tik is gemaakt, staat soms stil tot de eerste tik.
  if (klok.state !== 'running') {
    const wek = () => { if (storm.mic === mic) klok.resume(); };
    window.addEventListener('pointerdown', wek, { once: true, capture: true });
    klok.resume().catch(() => {});
  }
  requestAnimationFrame(function stap() {
    if (storm.mic !== mic) return;
    tekenStormMeter();
    requestAnimationFrame(stap);
  });
}

// De opvanger. Kent de browser geen worklets, dan een
// ScriptProcessor als reserve; die draait mee op de bladzijde, en is die even
// druk, dan kan daar wat wegvallen.
function startStormOpvang(mic) {
  if (mic.klok.audioWorklet && window.AudioWorkletNode && window.Blob && window.URL) {
    const adres = URL.createObjectURL(new Blob([STORM_WORKLET], { type: 'application/javascript' }));
    return mic.klok.audioWorklet.addModule(adres).then(() => {
      URL.revokeObjectURL(adres);
      if (storm.mic !== mic) return;
      mic.worklet = new AudioWorkletNode(mic.klok, 'storm-opname', {
        numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: 'explicit'
      });
      mic.worklet.port.onmessage = (e) => {
        const op = storm.opname;
        if (e.data.stuk) neemStormStukOp(e.data.stuk);
        if (e.data.laatste && op && op.stoppen) {
          neemStormStukOp(e.data.laatste);
          rondStormOpnameAf(op);
        }
      };
      mic.bron.connect(mic.worklet);
      mic.worklet.connect(mic.stil);
    }).catch(() => {
      URL.revokeObjectURL(adres);
      startStormScriptProcessor(mic);
    });
  }
  startStormScriptProcessor(mic);
  return Promise.resolve();
}

function startStormScriptProcessor(mic) {
  if (storm.mic !== mic) return;
  mic.proces = mic.klok.createScriptProcessor(4096, 1, 1);
  mic.proces.onaudioprocess = (e) => neemStormStukOp(new Float32Array(e.inputBuffer.getChannelData(0)));
  mic.bron.connect(mic.proces);
  mic.proces.connect(mic.stil);
}

function stopStormMic() {
  const mic = storm.mic;
  if (!mic) return;
  storm.mic = null;
  if (mic.worklet) mic.worklet.port.onmessage = null;
  if (mic.proces) mic.proces.onaudioprocess = null;
  mic.bron.disconnect();
  const dicht = mic.klok.close ? mic.klok.close() : null;
  if (dicht && dicht.catch) dicht.catch(() => {});
  if (stormMeterEl) {
    stormMeterEl.firstElementChild.style.width = '0%';
    stormMeterEl.classList.remove('clip');
  }
}

// Een stukje geluid van de microfoon. Alleen bewaren als er wordt opgenomen.
function neemStormStukOp(stuk) {
  const op = storm.opname;
  if (op && op.bezig && !op.afronden) voegStormOpnameToe(op, stuk);
}

function voegStormOpnameToe(op, binnen) {
  const n = Math.min(binnen.length, op.max - op.lengte);
  if (n <= 0) return;
  const stuk = n === binnen.length ? binnen : binnen.slice(0, n);
  op.stukken.push(stuk);
  op.lengte += n;
  // Voor de golf tijdens het opnemen: het hardste per blokje van 512.
  for (let i = 0; i < n; i += 512) {
    let piek = 0;
    for (let j = i; j < Math.min(n, i + 512); j++) piek = Math.max(piek, Math.abs(stuk[j]));
    op.blokken.push(piek);
  }
  if (op.lengte >= op.max) rondStormOpnameAf(op);
}

// ------------------------------------------------------------
//  De meter
// ------------------------------------------------------------

// De meter laat zien hoe hard de microfoon binnenkomt. In decibel, zoals een
// echte meter: dan bewegen zachte geluiden ook. Groen is goed, geel is hard,
// rood is bijna te hard. Komt het geluid tegen de top, dan gaat het lampje
// ernaast rood en blijft het even branden: dan is de opname daar vervormd, en
// moet het zachter of verder van de microfoon af. Te zacht is niet erg: dat
// zet je achteraf harder met het volume van het geluid.
const STORM_METER_DB = 48;     // zoveel decibel past er in de balk
const STORM_CLIP_BLIJFT = 1200; // zo lang blijft het lampje rood, in ms

function tekenStormMeter() {
  const mic = storm.mic;
  mic.meter.getFloatTimeDomainData(mic.data);
  let piek = 0;
  for (let i = 0; i < mic.data.length; i++) piek = Math.max(piek, Math.abs(mic.data[i]));
  const db = piek > 0 ? 20 * Math.log10(piek) : -STORM_METER_DB;
  const doel = Math.max(0, Math.min(1, (db + STORM_METER_DB) / STORM_METER_DB));
  // Snel omhoog, rustig weer omlaag.
  mic.stand = doel > mic.stand ? doel : mic.stand * 0.9 + doel * 0.1;
  const vul = stormMeterEl.firstElementChild;
  vul.style.width = (mic.stand * 100).toFixed(1) + '%';
  const kleur = db > -2 ? 'koraal' : (db > -9 ? 'zon' : 'mint');
  if (vul.dataset.kleur !== kleur) {
    vul.dataset.kleur = kleur;
    vul.style.background = 'var(--' + kleur + ')';
  }
  const nu = performance.now();
  if (piek >= 0.99) mic.clipTot = nu + STORM_CLIP_BLIJFT;
  stormMeterEl.classList.toggle('clip', nu < mic.clipTot);
}

function werkStormMicBij() {
  if (!stormMicAanEl) return;
  const open = !!storm.micStroom;
  stormMicAanEl.checked = open;
  stormMicEl.closest('[data-storm-mic]').classList.toggle('aan', open);
  // De opnameknoppen gaan mee aan en uit met de microfoon.
  if (stormEl && STORM_KANALEN.every((def) => stormKanaal(def.id).el)) werkStormBij();
}

// Opnemen kan als de microfoon aanstaat en is opgewarmd.
function stormMicKlaar() {
  return !!storm.micStroom && !!storm.mic && performance.now() >= (storm.micWarm || 0);
}

// ------------------------------------------------------------
//  Een opname
// ------------------------------------------------------------

// Een les die er zelf geluid bij maakt (de sequencer van samplebeat.js) hangt
// hier aan, en zet dat stil voordat de microfoon het meeneemt.
let bijStormOpname = null;

// En hier, om mee te kijken als een geluid verandert: een nieuwe opname, een
// ander geluid uit de lijst, of alles gewist.
let bijStormKanaal = null;

// Opnemen terwijl de microfoon uit staat: zeggen wat je moet doen, en de
// schakelaar even laten opspringen zodat je ziet waar hij zit.
function vraagStormMicAan() {
  meldStorm(storm.micStroom
    ? 'De microfoon gaat aan, nog heel even. Druk dan nog een keer op Opnemen.'
    : 'Zet eerst de microfoon aan, bovenaan bij de schakelaar. Daarna kun je opnemen.');
  const schakel = stormMicAanEl && stormMicAanEl.closest('.schakel');
  if (schakel) {
    animeer(schakel, [
      { transform: 'scale(1)', easing: 'ease-out' },
      { transform: 'scale(1.3)', offset: 0.2, easing: 'ease-in' },
      { transform: 'scale(1)', offset: 0.45, easing: 'ease-out' },
      { transform: 'scale(1.3)', offset: 0.65, easing: 'ease-in' },
      { transform: 'scale(1)' }
    ], { duration: 900 });
  }
}

function startStormOpname(k) {
  if (storm.opname) return;
  if (!stormMicKlaar()) {
    vraagStormMicAan();
    return;
  }
  meldStorm('');
  kiesStorm(k.def.id);
  if (bijStormOpname) bijStormOpname();

  const sr = storm.mic.klok.sampleRate;
  const op = {
    k: k, sr: sr, max: Math.round(STORM_MAX * sr), stukken: [], blokken: [], lengte: 0,
    bezig: false, stoppen: false, afronden: false, klaar: false, wasAan: []
  };
  storm.opname = op;

  // De andere geluiden even stil, anders neemt de microfoon ze mee op.
  STORM_KANALEN.forEach((def) => {
    const ander = stormKanaal(def.id);
    if (ander.aan) {
      op.wasAan.push(ander);
      zetStormAan(ander, false);
    }
  });

  storm.mic.klaar.then(() => {
    if (op.klaar) return;
    op.bezig = true;
    werkStormBij();
    stormLus();
  });
  werkStormBij();
}

function ruimStormOpnameOp(op) {
  op.klaar = true;
  clearTimeout(op.wachtOpLaatste);
  if (storm.opname === op) storm.opname = null;
  op.wasAan.forEach((ander) => zetStormAan(ander, true));
  werkStormBij();
}

// Stoppen. De worklet heeft nog een half stukje liggen; dat vragen we eerst
// op, zodat ook het allerlaatste geluid erbij zit. Komt het niet, dan na een
// kwart seconde toch afronden.
function stopStormOpname() {
  const op = storm.opname;
  if (!op || op.klaar || op.afronden || op.stoppen) return;
  if (op.bezig && storm.mic && storm.mic.worklet) {
    op.stoppen = true;
    op.wachtOpLaatste = setTimeout(() => rondStormOpnameAf(op), 250);
    storm.mic.worklet.port.postMessage('flush');
    return;
  }
  rondStormOpnameAf(op);
}

function rondStormOpnameAf(op) {
  if (op.klaar || op.afronden) return;
  op.afronden = true;
  clearTimeout(op.wachtOpLaatste);
  const k = op.k;
  const sr = op.sr;

  // Te kort om iets mee te doen: dan blijft het oude geluid gewoon staan.
  if (op.lengte < sr * 0.2) {
    ruimStormOpnameOp(op);
    if (op.bezig) meldStorm('Dat was te kort. Houd de knop niet in, maar druk één keer en maak dan het geluid.');
    return;
  }

  // De opname precies zoals de microfoon hem gaf: niet harder gezet en niets
  // afgeknipt. Harder of zachter doe je daarna met het volume.
  const data = new Float32Array(op.lengte);
  let plek = 0;
  op.stukken.forEach((stuk) => { data.set(stuk, plek); plek += stuk.length; });
  if (STORM_DEBUG) bewaarStormDebug(op, data);

  zetStormGeluid(k, data, sr, '', '');
  ruimStormOpnameOp(op);
  // Meteen laten horen wat je hebt opgenomen.
  zetStormAan(k, true);
}

// Een nieuw geluid in een kanaal: opgenomen, uit de lijst of geüpload. Het
// oude is dan weg.
function zetStormGeluid(k, data, sr, naam, bron) {
  if (k.aan) zetStormAan(k, false);
  zetStormOpname(k, data, sr);
  // Een nieuw geluid begint helemaal: de strepen helemaal links en op het
  // eind. Inkorten doe je daarna zelf.
  k.begin = 0;
  k.eind = k.buffer.duration;
  k.naam = naam;
  k.bron = bron;
  // Bij losse samples begint een nieuw geluid ook met alle knoppen gewoon:
  // een pitch of echo die bij de hond paste, hoort niet vanzelf bij de kat.
  // Bij de storm blijven ze staan, zodat je opnieuw kunt opnemen met dezelfde
  // klank.
  if (!STORM_HERHAALT && k.el) zetStormKnoppenTerug(k);
  bewaarStormOpname(k.def.id, data, sr, naam, bron);
  bewaarStormStand();
  zetStormLus(k);
}

// ------------------------------------------------------------
//  Een geluid uit de lijst, of een eigen bestand
// ------------------------------------------------------------

// Werkt de microfoon niet, dan kun je toch verder: met een geluid uit de map
// (STORM_BIBLIOTHEEK, gemaakt door tools/samples.py) of een eigen bestand.
// Langer dan tien seconden wordt afgeknipt, net als een opname.
storm.bibliotheek = [];

function laadStormBibliotheek() {
  if (!STORM_BIBLIOTHEEK || !window.fetch) return;
  fetch(STORM_BIBLIOTHEEK).then((r) => (r.ok ? r.json() : [])).then((lijst) => {
    storm.bibliotheek = (Array.isArray(lijst) ? lijst : []).filter((g) =>
      g && typeof g.bestand === 'string' && typeof g.naam === 'string');
    vulStormBibliotheek();
  }).catch(() => {});
}

function stormBibliotheekAdres(bestand) {
  return STORM_BIBLIOTHEEK.replace(/[^/]*$/, '') + encodeURIComponent(bestand);
}

// Van een bestand naar geluid. Oude browsers kennen alleen de versie met
// terugroepers, nieuwe geven een belofte terug; zo werken ze allebei.
function ontcijferStormBestand(ruw) {
  const klok = Tone.getContext().rawContext;
  return new Promise((klaar, mis) => {
    const belofte = klok.decodeAudioData(ruw, klaar, mis);
    if (belofte && belofte.then) belofte.then(klaar, mis);
  });
}

// Alle sporen bij elkaar tot één, want de sampler werkt met één spoor, en
// hooguit tien seconden.
function stormMono(buffer) {
  const lengte = Math.min(buffer.length, Math.round(STORM_MAX * buffer.sampleRate));
  const data = new Float32Array(lengte);
  const sporen = buffer.numberOfChannels;
  for (let s = 0; s < sporen; s++) {
    const spoor = buffer.getChannelData(s);
    for (let i = 0; i < lengte; i++) data[i] += spoor[i] / sporen;
  }
  return data;
}

// stil: alleen erin zetten, zonder het te laten horen of bovenaan te zetten.
// Zo komen de geluiden waarmee een les begint erin (zie zetStormBeginGeluiden).
function laadStormBestand(k, ruw, naam, bron, stil) {
  return ontcijferStormBestand(ruw).then((buffer) => {
    if (storm.opname) return;
    zetStormGeluid(k, stormMono(buffer), buffer.sampleRate, naam, bron);
    if (stil) {
      werkStormBij();
      return;
    }
    kiesStorm(k.def.id);
    werkStormBij();
    zetStormAan(k, true);
    if (buffer.duration > STORM_MAX + 0.05) {
      meldStorm('Dat geluid was langer dan tien seconden. Alleen het begin is erin gezet.');
    }
  }, () => {
    meldStorm('Dit geluid kan de computer niet openen. Probeer een wav- of mp3-bestand.');
  });
}

// Een kanaal mag met een geluid uit de map beginnen: begin in STORM_LES,
// bijvoorbeeld { bestand: 'hond.mp3', naam: 'Hond' }. Dat staat erin zolang er
// niets anders is opgenomen of gekozen, en komt terug na Reset.
function zetStormBeginGeluiden() {
  if (!STORM_BIBLIOTHEEK || !window.fetch) return;
  STORM_KANALEN.forEach((def) => {
    const k = stormKanaal(def.id);
    if (!def.begin || k.buffer) return;
    fetch(stormBibliotheekAdres(def.begin.bestand))
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((ruw) => { if (!k.buffer) return laadStormBestand(k, ruw, def.begin.naam, def.begin.bestand, true); })
      .catch(() => {});
  });
}

function kiesStormUitLijst(k, bestand) {
  const gevonden = storm.bibliotheek.find((g) => g.bestand === bestand);
  if (!gevonden || storm.opname) return;
  meldStorm('');
  fetch(stormBibliotheekAdres(bestand))
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then((ruw) => laadStormBestand(k, ruw, gevonden.naam, bestand))
    .catch(() => {
      meldStorm('Dit geluid kon niet geladen worden. Staat de internetverbinding aan?');
      werkStormBij();
    });
}

// Met FileReader en niet met file.arrayBuffer(): die kent een oudere browser
// niet.
function uploadStormBestand(k, bestand) {
  if (!bestand || storm.opname) return;
  meldStorm('');
  const lezer = new FileReader();
  lezer.onload = () => laadStormBestand(k, lezer.result, bestand.name.replace(/\.[^.]+$/, ''), '');
  lezer.onerror = () => meldStorm('Dit bestand kon niet gelezen worden.');
  lezer.readAsArrayBuffer(bestand);
}

// Eén keuzelijst bovenaan in de balk ([data-storm-lijst] in de bladzijde),
// voor het geluid dat gekozen is.
function vulStormBibliotheek() {
  if (!stormLijstEl) return;
  stormLijstEl.innerHTML =
    storm.bibliotheek.map((g) =>
      '<option value="' + stormTekst(g.bestand) + '">' + stormTekst(g.naam) + '</option>'
    ).join('');
  werkStormBij();
}

// ------------------------------------------------------------
//  Opsporen (alleen met ?debug)
// ------------------------------------------------------------

function stormBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let tekst = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    tekst += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(tekst);
}

function bewaarStormDebug(op, data) {
  const spoor = storm.micStroom && storm.micStroom.getAudioTracks()[0];
  const k = op.k;
  const info = {
    versie: STORM_VERSIE,
    browser: navigator.userAgent,
    spoor: spoor ? { label: spoor.label, instellingen: spoor.getSettings ? spoor.getSettings() : null } : null,
    opnameKlok: op.sr,
    toneKlok: Tone.getContext().sampleRate,
    kanaal: k.def.id,
    stand: { volume: k.volume, filter: k.filter, pitch: k.pitch, effect: k.effect, mix: k.mix, richting: k.richting, overgang: k.overgang },
    opvang: storm.mic && storm.mic.worklet ? 'worklet' : 'scriptprocessor',
    opname: { sr: op.sr, lengte: data.length, data: stormBase64(data.slice().buffer) },
    meter: op.blokken.slice()
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(info)], { type: 'application/json' }));
  a.download = 'storm-debug-' + k.def.id + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ============================================================
//  5. Het scherm
// ============================================================

const stormEl = document.querySelector('[data-storm]');
const stormMicEl = stormEl && stormEl.querySelector('[data-storm-microfoon]');
const stormMicAanEl = stormEl && stormEl.querySelector('[data-storm-mic-aan]');
const stormMeterEl = stormEl && stormEl.querySelector('[data-storm-meter]');
const stormMeldEl = stormEl && stormEl.querySelector('[data-storm-melding]');
const stormKanalenEl = stormEl && stormEl.querySelector('[data-storm-kanalen]');
const stormGolfEl = stormEl && stormEl.querySelector('[data-storm-golf]');
const stormVlakEl = stormEl && stormEl.querySelector('[data-storm-vlak]');
const stormCanvas = stormEl && stormEl.querySelector('[data-storm-canvas]');
const stormKopEl = stormEl && stormEl.querySelector('[data-storm-kop]');
const stormLeegEl = stormEl && stormEl.querySelector('[data-storm-leeg]');
const stormNaamEl = stormEl && stormEl.querySelector('[data-storm-golf-naam]');
const stormTijdEl = stormEl && stormEl.querySelector('[data-storm-golf-tijd]');
const stormLijstEl = stormEl && stormEl.querySelector('[data-storm-lijst]');
const stormKopKnoppenEl = stormEl && stormEl.querySelector('[data-storm-kop-knoppen]');
const stormGrepen = {};

function stormTekst(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

// Seconden zoals een kind ze leest: 4,5 s.
function stormSeconden(t) {
  return t.toFixed(1).replace('.', ',') + ' s';
}

function meldStorm(tekst) {
  stormMeldEl.textContent = tekst;
  stormMeldEl.hidden = !tekst;
}

// Eén effect per geluid, met naast de keuze het knopje voor hoeveel.
function stormEffectKeuze(id) {
  return `
        <div class="storm-effect">
          <label class="storm-effect-kies">
            <span>Effect</span>
            <select data-storm-effect="${id}">
              ${STORM_EFFECTEN.map((f) => '<option value="' + f.id + '">' + f.naam + '</option>').join('')}
            </select>
          </label>
          ${stormDraaiKnop(id, 'mix')}
        </div>`;
}

// Opnemen, spelen, de richting, de overgang en (met een bibliotheek) uploaden.
function stormKnoppen(id) {
  return `
          <button class="storm-ikoon storm-op" type="button" data-storm-op="${id}">
            <i class="ph-bold ph-record" aria-hidden="true"></i>
          </button>
          <button class="storm-ikoon storm-speel" type="button" data-storm-speel="${id}" aria-pressed="false">
            <i class="ph-bold ph-play" aria-hidden="true"></i>
          </button>
          <button class="storm-ikoon storm-richting" type="button" data-storm-richting="${id}">
            <i class="ph-bold ph-arrow-right" aria-hidden="true"></i>
          </button>
          ${stormDraaiKnop(id, 'overgang')}
          ${STORM_BIBLIOTHEEK ? `
          <button class="storm-ikoon" type="button" data-storm-upload="${id}" title="Upload een eigen geluid" aria-label="Upload een eigen geluid">
            <i class="ph-bold ph-upload-simple" aria-hidden="true"></i>
          </button>
          <input type="file" accept="audio/*" hidden data-storm-bestand="${id}">` : ''}`;
}

// Zoekt een knop van een geluid: in zijn eigen vak, of in de kop van de golf
// als de bladzijde daar plek voor heeft ([data-storm-kop-knoppen]). Dan staan
// de knoppen van het gekozen geluid rechtsboven in de golf.
function stormDeel(k, kiezer) {
  return k.el.querySelector(kiezer) || (k.kopKnoppen ? k.kopKnoppen.querySelector(kiezer) : null);
}

function bouwStormKanalen() {
  const inKop = !!stormKopKnoppenEl;
  stormKanalenEl.innerHTML = STORM_KANALEN.map((def) => `
    <article class="storm-kanaal${def.kleur === 'blauw' ? ' op-blauw' : ''}" style="--kleur: var(--${def.kleur})" data-kanaal="${def.id}">
      <button class="storm-kies" type="button" data-storm-kies="${def.id}" aria-pressed="false">
        <i class="ph-bold ph-${def.icoon}" aria-hidden="true"></i>
        <span>${def.naam}</span>
      </button>
      <div class="storm-binnen">
        <canvas class="storm-mini" data-storm-mini aria-hidden="true"></canvas>
        ${inKop ? '' : '<div class="storm-knoppen">' + stormKnoppen(def.id) + '</div>'}
        ${STORM_SCHUIVEN.map((p) => `
        <div class="klap-schuif storm-schuif">
          <label for="storm-${def.id}-${p.id}"><span class="klap-schuif-naam">${p.label}</span><b data-storm-toon="${p.id}"></b></label>
          <input type="range" id="storm-${def.id}-${p.id}" data-storm-schuif="${p.id}"
                 min="${p.min}" max="${p.max}" step="${p.step}">
        </div>`).join('')}
        ${stormEffectKeuze(def.id)}
      </div>
    </article>
  `).join('');

  if (inKop) {
    stormKopKnoppenEl.innerHTML = STORM_KANALEN.map((def) =>
      '<div class="storm-knoppen" data-kop-kanaal="' + def.id + '">' + stormKnoppen(def.id) + '</div>'
    ).join('');
  }

  STORM_KANALEN.forEach((def) => {
    const k = stormKanaal(def.id);
    k.el = stormKanalenEl.querySelector('[data-kanaal="' + def.id + '"]');
    // Niet k.kop: dat is de streep die tijdens het spelen over de golf loopt.
    k.kopKnoppen = inKop ? stormKopKnoppenEl.querySelector('[data-kop-kanaal="' + def.id + '"]') : null;
    k.mini = k.el.querySelector('[data-storm-mini]');
    k.el.querySelector('[data-storm-effect]').value = k.effect;
    STORM_SCHUIVEN.forEach((p) => {
      k.el.querySelector('[data-storm-schuif="' + p.id + '"]').value = k[p.id];
    });
    werkStormKanaalBij(k);
  });
}

function stormNoem(knop, naam) {
  if (knop.title === naam) return;
  knop.title = naam;
  knop.setAttribute('aria-label', naam);
}

function stormSchuifWaarde(p, w) {
  if (p.id === 'volume') return Math.round(w) + '%';
  if (p.id === 'filter') return w === 0 ? 'uit' : (w < 0 ? 'dof ' : 'scherp ') + Math.abs(w);
  return w > 0 ? '+' + w : (w < 0 ? '−' + Math.abs(w) : '0');
}

function werkStormKanaalBij(k) {
  if (!k.el) return;
  const op = storm.opname;
  const neemtOp = !!op && op.k === k;

  k.el.classList.toggle('leeg', !k.buffer);
  k.el.classList.toggle('gekozen', storm.gekozen === k.def.id);
  k.el.classList.toggle('neemt-op', neemtOp);
  if (k.kopKnoppen) {
    k.kopKnoppen.hidden = storm.gekozen !== k.def.id;
    k.kopKnoppen.classList.toggle('neemt-op', neemtOp);
  }
  k.el.querySelector('[data-storm-kies]').setAttribute('aria-pressed', String(storm.gekozen === k.def.id));

  // Alleen icoontjes, dus wat een knop doet staat in title (voor de muis) en
  // aria-label (voor een schermlezer).
  // Opnemen kan pas als de microfoon aanstaat (de schakelaar bovenaan); de
  // knop is dan gestippeld.
  const opKnop = stormDeel(k, '[data-storm-op]');
  const micUit = !stormMicKlaar();
  // Ook met de microfoon uit te klikken: dan zegt hij dat die eerst aan moet.
  opKnop.disabled = !!op && !neemtOp;
  opKnop.classList.toggle('mic-uit', micUit && !op);
  stormNoem(opKnop, neemtOp ? 'Stop met opnemen' : (micUit ? 'Zet eerst de microfoon aan' : 'Opnemen'));
  opKnop.querySelector('i').className = 'ph-bold ' + (neemtOp ? 'ph-stop' : 'ph-record');

  const speel = stormDeel(k, '[data-storm-speel]');
  speel.disabled = !k.buffer || !!op;
  speel.setAttribute('aria-pressed', String(k.aan));
  speel.querySelector('i').className = 'ph-bold ' + (k.aan ? 'ph-stop' : 'ph-play');
  stormNoem(speel, k.aan ? 'Stop' : 'Speel');

  const richting = STORM_RICHTINGEN.find((r) => r.id === k.richting);
  const richtingKnop = stormDeel(k, '[data-storm-richting]');
  richtingKnop.disabled = !k.buffer || !!op;
  richtingKnop.querySelector('i').className = 'ph-bold ph-' + richting.icoon;
  stormNoem(richtingKnop, (STORM_HERHAALT ? 'Loop: ' : 'Afspelen: ') + richting.naam.toLowerCase());

  const heenEnWeer = STORM_HERHAALT && k.richting === 'heenenweer';
  werkStormDraaiBij(k, 'overgang', !k.buffer || !!op || heenEnWeer, heenEnWeer ? 'niet nodig bij heen en weer' : '');
  werkStormDraaiBij(k, 'mix', k.effect === 'geen', k.effect === 'geen' ? 'kies eerst een effect' : '');

  const upload = stormDeel(k, '[data-storm-upload]');
  if (upload) upload.disabled = !!op;

  STORM_SCHUIVEN.forEach((p) => {
    k.el.querySelector('[data-storm-toon="' + p.id + '"]').textContent = stormSchuifWaarde(p, k[p.id]);
  });

  tekenStormOp(k.mini, k);
  if (bijStormKanaal) bijStormKanaal(k);
}

function werkStormBij() {
  STORM_KANALEN.forEach((def) => werkStormKanaalBij(stormKanaal(def.id)));
  stormEl.querySelectorAll('[data-storm-alles]').forEach((knop) => { knop.disabled = !!storm.opname; });
  if (stormLijstEl) {
    const gekozen = stormKanaal(storm.gekozen);
    const bron = gekozen.bron;
    stormLijstEl.disabled = !!storm.opname || !storm.bibliotheek.length;
    // Een eigen opname of upload staat niet in de lijst: dan komt die er
    // bovenaan bij. Verder geen lege regel, want een sample heeft altijd een
    // geluid.
    const eigen = !!gekozen.buffer && !bron;
    const nodig = eigen || !storm.bibliotheek.length;
    let leeg = stormLijstEl.querySelector('option[value=""]');
    if (nodig && !leeg) {
      leeg = document.createElement('option');
      leeg.value = '';
      stormLijstEl.insertBefore(leeg, stormLijstEl.firstChild);
    } else if (!nodig && leeg) {
      leeg.remove();
      leeg = null;
    }
    const tekst = eigen ? (gekozen.naam || 'Eigen opname') : 'Nog geen geluiden';
    if (leeg && leeg.textContent !== tekst) leeg.textContent = tekst;
    if (stormLijstEl.value !== bron) stormLijstEl.value = bron;
    if (stormLijstEl.value !== bron) stormLijstEl.value = '';
  }
  werkStormGolfBij();
}

function kiesStorm(id) {
  if (!storm.kanalen[id] || storm.gekozen === id) return;
  storm.gekozen = id;
  bewaarStormStand();
  werkStormBij();
  stormLus();
}

// ------------------------------------------------------------
//  De golf bovenaan
// ------------------------------------------------------------

// Het hoogste en laagste punt per kolom van een canvas. Dat rekenen is het
// zware werk, dus het blijft per breedte bewaard tot er een nieuwe opname is.
function stormPieken(k, kolommen) {
  if (k.pieken[kolommen]) return k.pieken[kolommen];
  const data = k.buffer.getChannelData(0);
  const per = data.length / kolommen;
  const laag = new Float32Array(kolommen);
  const hoog = new Float32Array(kolommen);
  for (let x = 0; x < kolommen; x++) {
    let min = 0;
    let max = 0;
    const tot = Math.min(data.length, Math.floor((x + 1) * per));
    for (let i = Math.floor(x * per); i < tot; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    laag[x] = min;
    hoog[x] = max;
  }
  k.pieken[kolommen] = { laag: laag, hoog: hoog };
  return k.pieken[kolommen];
}

// Tekent de golf van een kanaal op een canvas: de grote bovenaan en de kleine
// in elk kanaal gaan allebei hierdoor.
function tekenStormOp(canvas, k, metOvergang) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const b = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== b) canvas.width = b;
  if (canvas.height !== h) canvas.height = h;

  const c = canvas.getContext('2d');
  c.clearRect(0, 0, b, h);
  const ink = kleurWaarde('ink');
  const midden = h / 2;
  const lijn = Math.max(1, Math.round(dpr));

  const op = storm.opname;
  if (op && op.k === k) {
    // Tijdens het opnemen zie je wat er binnenkomt. Het stuk dat al is
    // opgenomen kleurt rood en groeit naar rechts, over de hele tien seconden:
    // zo zie je ook hoeveel tijd er nog is.
    const blokken = STORM_MAX * op.sr / 512;
    const perBlok = b / blokken;
    c.fillStyle = kleurWaarde('koraal');
    c.fillRect(0, 0, op.blokken.length * perBlok, h);
    c.fillStyle = ink;
    // Net als na het opnemen: zo groot als de hardste piek tot nu toe.
    let hardst = STORM_TEKEN_MIN;
    op.blokken.forEach((piek) => { if (piek > hardst) hardst = piek; });
    op.blokken.forEach((piek, i) => {
      const y = Math.max(lijn, (piek / hardst) * midden * 0.9);
      c.fillRect(i * perBlok, midden - y, Math.max(lijn, perBlok), y * 2);
    });
    c.fillRect(0, midden - lijn / 2, b, lijn);
    return;
  }

  if (!k.buffer) return;

  // Het stuk dat herhaald wordt, in de kleur van het geluid.
  const duur = k.buffer.duration;
  const x1 = Math.round((k.begin / duur) * b);
  const x2 = Math.round((k.eind / duur) * b);
  c.fillStyle = kleurWaarde(k.def.kleur);
  c.fillRect(x1, 0, x2 - x1, h);

  // De golf zo groot als het geluid klinkt: het volume schaalt mee. Een zachte
  // opname tekenen we groter, zodat je hem goed ziet; alleen de tekening, het
  // geluid blijft zoals het is opgenomen.
  const groot = midden * 0.9 * (k.volume / 100) / Math.max(STORM_TEKEN_MIN, k.piek || 1);
  const pieken = stormPieken(k, b);
  c.fillStyle = ink;
  for (let x = 0; x < b; x++) {
    const boven = midden - pieken.hoog[x] * groot;
    const onder = midden - pieken.laag[x] * groot;
    c.fillRect(x, boven, 1, Math.max(lijn, onder - boven));
  }

  // De overgang als schuine lijn aan beide kanten van de loop: aan het begin
  // komt het geluid op, aan het eind zakt het weg, en die twee lopen over
  // elkaar heen. Hoe langer de overgang, hoe flauwer de helling. Achteruit
  // ziet het er net zo uit; heen en weer heeft geen overgang.
  if (!metOvergang || (STORM_HERHAALT && k.richting === 'heenenweer')) return;
  const over = Math.min(k.overgang, (k.eind - k.begin) / 2);
  if (over <= 0) return;
  const breedte = (over / duur) * b;
  const rand = Math.max(2, Math.round(3 * dpr));
  c.strokeStyle = ink;
  c.lineWidth = rand;
  c.lineJoin = 'round';
  c.setLineDash([rand * 2, rand * 1.5]);
  c.beginPath();
  c.moveTo(x1, h - rand);
  c.lineTo(x1 + breedte, rand);
  c.moveTo(x2 - breedte, rand);
  c.lineTo(x2, h - rand);
  c.stroke();
  c.setLineDash([]);
}

function werkStormGolfBij() {
  const k = stormKanaal(storm.gekozen);
  const op = storm.opname;
  const neemtOp = !!op && op.k === k;

  // Met de naam van het geluid erachter, als het uit de lijst of een bestand
  // komt: Sample 1 · Koe.
  // Staat er een keuzelijst in de kop, dan staat de naam van het geluid daarin.
  const kopNaam = k.def.naam + (k.naam && k.buffer && !stormLijstEl ? ' · ' + k.naam : '');
  if (stormNaamEl.dataset.naam !== kopNaam) {
    stormNaamEl.dataset.naam = kopNaam;
    stormNaamEl.innerHTML = '<i class="ph-bold ph-' + k.def.icoon + '" aria-hidden="true"></i> ' + stormTekst(kopNaam);
    stormGolfEl.style.setProperty('--kleur', 'var(--' + k.def.kleur + ')');
    stormGolfEl.classList.toggle('op-blauw', k.def.kleur === 'blauw');
  }
  stormGolfEl.classList.toggle('leeg', !k.buffer && !neemtOp);

  let tijd = '';
  let leeg = '';
  if (neemtOp) {
    tijd = op.bezig ? 'Opnemen… ' + stormSeconden(op.lengte / op.sr) : '';
    leeg = op.bezig ? '' : 'De microfoon gaat aan…';
  } else if (k.buffer && stormDraait && stormDraait.k === k) {
    const soort = STORM_DRAAIEN[stormDraait.soort];
    tijd = soort.naam + ' ' + soort.toon(k[stormDraait.soort]);
  } else if (k.buffer) {
    tijd = (STORM_HERHAALT ? 'Herhaalt ' : 'Speelt ') + stormSeconden(k.begin).replace(' s', '') + ' tot ' + stormSeconden(k.eind);
  } else if (!storm.micStroom) {
    leeg = STORM_BIBLIOTHEEK
      ? 'Zet de microfoon aan en druk hieronder op Opnemen. Of kies een geluid uit de lijst.'
      : 'Zet eerst de microfoon aan, bovenaan. Druk dan bij ' + k.def.naam + ' op Opnemen.';
  } else if (!stormMicKlaar()) {
    leeg = 'De microfoon gaat aan…';
  } else {
    leeg = 'Nog niets opgenomen. Druk bij ' + k.def.naam + ' op Opnemen.';
  }
  if (stormTijdEl.textContent !== tijd) stormTijdEl.textContent = tijd;
  stormLeegEl.textContent = leeg;
  stormLeegEl.hidden = !leeg;

  const grepenZichtbaar = !!k.buffer && !neemtOp;
  ['begin', 'eind'].forEach((rand) => {
    const greep = stormGrepen[rand];
    greep.hidden = !grepenZichtbaar;
    if (!grepenZichtbaar) return;
    const duur = k.buffer.duration;
    greep.style.left = (k[rand] / duur * 100) + '%';
    greep.setAttribute('aria-valuemin', '0');
    greep.setAttribute('aria-valuemax', duur.toFixed(1));
    greep.setAttribute('aria-valuenow', k[rand].toFixed(1));
    greep.setAttribute('aria-valuetext', stormSeconden(k[rand]).replace(' s', ' seconden'));
  });

  tekenStormOp(stormCanvas, k, true);
  werkStormKopBij();
}

function stormOvergang(t) {
  return t === 0 ? 'geen' : t.toFixed(2).replace('.', ',') + ' s';
}

// De streep die laat zien waar de loop nu is.
function werkStormKopBij() {
  const k = stormKanaal(storm.gekozen);
  const zichtbaar = stormKopBezig(k) && !!k.buffer && !storm.opname;
  stormKopEl.hidden = !zichtbaar;
  if (!zichtbaar) return;
  const t = Math.max(k.begin, Math.min(k.eind, stormKopTijd(k)));
  stormKopEl.style.left = (t / k.buffer.duration * 100) + '%';
}

// Alleen bezig zolang er iets te tekenen valt: tijdens het opnemen, en zolang
// het gekozen geluid speelt.
let stormLusLoopt = false;

function stormLus() {
  if (stormLusLoopt) return;
  stormLusLoopt = true;
  requestAnimationFrame(function stap() {
    const op = storm.opname;
    if (op && op.bezig) {
      werkStormKanaalBij(op.k);
      if (op.k.def.id === storm.gekozen) werkStormGolfBij();
    }
    werkStormKopBij();
    if (op || stormKopBezig(stormKanaal(storm.gekozen))) {
      requestAnimationFrame(stap);
    } else {
      stormLusLoopt = false;
    }
  });
}

// ------------------------------------------------------------
//  De twee strepen verschuiven
// ------------------------------------------------------------

let stormSleept = null;
let stormVanaf = null;

function zetStormGreep(rand, t) {
  const k = stormKanaal(storm.gekozen);
  const duur = k.buffer.duration;
  if (rand === 'begin') k.begin = Math.max(0, Math.min(t, k.eind - STORM_KORTSTE));
  else k.eind = Math.min(duur, Math.max(t, k.begin + STORM_KORTSTE));
  stormLusLive(k);
  werkStormGolfBij();
}

// De hele loop opschuiven: even lang, alleen een ander stuk van de opname.
// vanaf is waar je neerkwam en waar begin en eind toen stonden.
function schuifStormLus(vanaf, t) {
  const k = stormKanaal(storm.gekozen);
  const lengte = vanaf.eind - vanaf.begin;
  const begin = Math.max(0, Math.min(k.buffer.duration - lengte, vanaf.begin + t - vanaf.t));
  k.begin = begin;
  k.eind = begin + lengte;
  stormLusLive(k);
  werkStormGolfBij();
}

// Zo dicht bij een streep pak je de streep, ook als je er net naast drukt.
const STORM_GREEP_MARGE = 24;

function stormTijdBij(x) {
  const k = stormKanaal(storm.gekozen);
  const vlak = stormVlakEl.getBoundingClientRect();
  return Math.max(0, Math.min(1, (x - vlak.left) / vlak.width)) * k.buffer.duration;
}

function legStormLusVast(k) {
  if (!k) k = stormKanaal(storm.gekozen);
  zetStormLus(k);
  bewaarStormStand();
  werkStormKanaalBij(k);
  werkStormGolfBij();
}

// ------------------------------------------------------------
//  De draaiknopjes: de overgang, en hoeveel effect
// ------------------------------------------------------------

// Draaien doe je door te slepen: omhoog of naar rechts is meer. Een echte
// draaibeweging met je vinger om zo'n klein knopje heen lukt op een bord niet.
let stormDraait = null;
const STORM_DRAAI_PIXELS = 160; // zo ver slepen is van helemaal links naar rechts

const STORM_DRAAIEN = {
  overgang: { naam: STORM_HERHAALT ? 'Overgang' : 'Fade', min: STORM_OVERGANG.min, max: STORM_OVERGANG.max, toon: (w) => stormOvergang(w) },
  mix:      { naam: 'Effect',   min: STORM_MIX.min,      max: STORM_MIX.max,      toon: (w) => Math.round(w * 100) + '%' }
};

function stormDraaiKnop(id, soort) {
  const d = STORM_DRAAIEN[soort];
  return '<button class="storm-ikoon storm-draai" type="button" role="slider" data-storm-draai="' + id +
    '" data-soort="' + soort + '" aria-label="' + d.naam + '" aria-valuemin="' + d.min + '" aria-valuemax="' + d.max + '">' +
    '<span class="storm-draai-wijzer" aria-hidden="true"></span></button>';
}

function werkStormDraaiBij(k, soort, uit, waarom) {
  const d = STORM_DRAAIEN[soort];
  const knop = stormDeel(k, '[data-storm-draai][data-soort="' + soort + '"]');
  knop.disabled = uit;
  knop.style.setProperty('--draai', (-135 + 270 * (k[soort] - d.min) / (d.max - d.min)) + 'deg');
  knop.setAttribute('aria-valuenow', k[soort].toFixed(2));
  knop.setAttribute('aria-valuetext', waarom || d.toon(k[soort]));
  knop.title = d.naam + ': ' + (waarom || d.toon(k[soort]));
}

function zetStormDraai(k, soort, t) {
  const d = STORM_DRAAIEN[soort];
  k[soort] = Math.round(Math.max(d.min, Math.min(d.max, t)) * 100) / 100;
  // Je hoort het meteen mee veranderen terwijl je draait.
  if (soort === 'mix' && k.effectNode) k.effectNode.wet.rampTo(k.mix, 0.05);
  if (soort === 'overgang') stormLusLive(k);
  werkStormKanaalBij(k);
  werkStormGolfBij();
}

function legStormDraaiVast(k, soort) {
  if (soort === 'overgang') legStormLusVast(k);
  else bewaarStormStand();
}

function stormX(e) {
  if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0].clientX;
  return e.clientX;
}

// ------------------------------------------------------------
//  Opnieuw beginnen
// ------------------------------------------------------------

// Alles wissen voor de volgende klas: de opnames en alle knoppen terug naar
// het begin. Alleen de microfoon blijft staan, want die hoort bij het bord en
// niet bij de les.
// Alle knoppen van een geluid terug naar het begin: volume, filter, pitch,
// de richting, de overgang en het effect.
function zetStormKnoppenTerug(k) {
  STORM_SCHUIVEN.forEach((p) => {
    k[p.id] = p.waarde;
    k.el.querySelector('[data-storm-schuif="' + p.id + '"]').value = p.waarde;
  });
  k.richting = 'gewoon';
  k.overgang = STORM_OVERGANG.waarde;
  k.effect = 'geen';
  k.mix = STORM_MIX.waarde;
  k.el.querySelector('[data-storm-effect]').value = 'geen';
  pasStormGeluidToe(k);
  zetStormEffect(k);
}

function resetStorm() {
  if (storm.opname) ruimStormOpnameOp(storm.opname);
  STORM_KANALEN.forEach((def) => {
    const k = stormKanaal(def.id);
    zetStormAan(k, false);
    clearTimeout(k.liveWacht);
    k.liveWacht = 0;
    k.buffer = null;
    k.pieken = {};
    k.begin = 0;
    k.eind = 0;
    k.naam = '';
    k.bron = '';
    k.kop = null;
    zetStormKnoppenTerug(k);
  });
  storm.gekozen = STORM_KANALEN[0].id;
  wisStormOpnames();
  bewaarStormStand();
  meldStorm('');
  werkStormBij();
  zetStormBeginGeluiden();
}

// ============================================================
//  6. Aanzetten
// ============================================================

if (stormEl) {
  laadStormStand();
  bouwStormKanalen();
  laadStormBibliotheek();
  stormGrepen.begin = stormEl.querySelector('[data-storm-greep="begin"]');
  stormGrepen.eind = stormEl.querySelector('[data-storm-greep="eind"]');
  STORM_KANALEN.forEach((def) => {
    const k = stormKanaal(def.id);
    pasStormGeluidToe(k);
    zetStormEffect(k);
  });

  laadStormOpnames().then((gevonden) => {
    STORM_KANALEN.forEach((def) => {
      const opname = gevonden[def.id];
      if (!opname || !opname.data || !opname.data.length || !opname.sr) return;
      const k = stormKanaal(def.id);
      zetStormOpname(k, opname.data, opname.sr);
      k.naam = typeof opname.naam === 'string' ? opname.naam : '';
      k.bron = typeof opname.bron === 'string' ? opname.bron : '';
      // Past de bewaarde loop niet (meer) in de opname, dan de hele opname.
      const duur = k.buffer.duration;
      if (!(k.eind > k.begin + STORM_KORTSTE / 2 && k.eind <= duur + 0.001)) {
        k.begin = 0;
        k.eind = duur;
      }
      zetStormLus(k);
    });
    werkStormBij();
    zetStormBeginGeluiden();
  });

  if (!kanStormOpnemen()) {
    stormMicEl.closest('[data-storm-mic]').hidden = true;
    meldStorm('Opnemen kan in deze browser niet. Open de les in Chrome of Edge, via https://muziekfles.nl.');
  }
  vulStormMicrofoons();
  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', vulStormMicrofoons);
  }

  stormMicEl.addEventListener('change', () => {
    storm.microfoon = stormMicEl.value;
    bewaarStormStand();
    // Een andere microfoon: de oude dicht, en stond hij aan, meteen de nieuwe.
    if (storm.opname) return;
    const wasOpen = !!storm.micStroom;
    sluitStormMicrofoon();
    if (wasOpen) zetStormMicAan();
  });


  stormMicAanEl.addEventListener('change', () => {
    if (stormMicAanEl.checked) {
      zetStormMicAan();
    } else {
      storm.micAan = false;
      bewaarStormStand();
      sluitStormMicrofoon();
      werkStormMicBij();
    }
  });


  werkStormMicBij();
  // Stond de microfoon aan, en mag dat zonder te vragen, dan meteen weer aan.
  if (storm.micAan && kanStormOpnemen() && navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'microphone' }).then((toestemming) => {
      if (toestemming.state === 'granted') zetStormMicAan();
    }).catch(() => {});
  }

  // Knoppen via click: dat komt op een digibord altijd binnen.
  stormEl.addEventListener('click', (e) => {
    const kies = e.target.closest('[data-storm-kies]');
    if (kies) { kiesStorm(kies.dataset.stormKies); return; }

    const opKnop = e.target.closest('[data-storm-op]');
    if (opKnop) {
      const k = stormKanaal(opKnop.dataset.stormOp);
      if (storm.opname && storm.opname.k === k) stopStormOpname();
      else startStormOpname(k);
      return;
    }

    const speel = e.target.closest('[data-storm-speel]');
    if (speel) {
      const k = stormKanaal(speel.dataset.stormSpeel);
      kiesStorm(k.def.id);
      zetStormAan(k, !k.aan);
      stormLus();
      return;
    }

    const upload = e.target.closest('[data-storm-upload]');
    if (upload) {
      kiesStorm(upload.dataset.stormUpload);
      stormEl.querySelector('[data-storm-bestand="' + upload.dataset.stormUpload + '"]').click();
      return;
    }

    const richting = e.target.closest('[data-storm-richting]');
    if (richting) {
      const k = stormKanaal(richting.dataset.stormRichting);
      const nu = STORM_RICHTINGEN.findIndex((r) => r.id === k.richting);
      k.richting = STORM_RICHTINGEN[(nu + 1) % STORM_RICHTINGEN.length].id;
      kiesStorm(k.def.id);
      legStormLusVast(k);
      return;
    }

    const alles = e.target.closest('[data-storm-alles]');
    if (alles) {
      STORM_KANALEN.forEach((def) => zetStormAan(stormKanaal(def.id), alles.dataset.stormAlles === 'aan'));
      stormLus();
      return;
    }

    if (e.target.closest('[data-storm-reset]')) {
      if (window.confirm('Weet je het zeker? Alle opnames zijn dan weg, en alle knoppen gaan terug naar het begin.')) {
        resetStorm();
      }
    }
  });

  stormKanalenEl.addEventListener('input', (e) => {
    const el = e.target;
    const id = el.dataset.stormSchuif;
    if (!id) return;
    const k = stormKanaal(el.closest('[data-kanaal]').dataset.kanaal);
    let w = parseFloat(el.value);
    if (id === 'filter' && Math.abs(w) <= STORM_FILTER_MIDDEN) {
      w = 0;
      el.value = 0;
    }
    k[id] = w;
    pasStormGeluidToe(k);
    werkStormKanaalBij(k);
    if (id === 'volume' && k.def.id === storm.gekozen) tekenStormOp(stormCanvas, k, true);
  });

  // Bewaren bij loslaten, niet bij elke beweging tijdens het slepen.
  stormKanalenEl.addEventListener('change', (e) => {
    if (e.target.dataset.stormSchuif) bewaarStormStand();
  });

  // De draaiknopjes. Je hoort het al tijdens het draaien (zie zetStormDraai);
  // bij loslaten wordt het bewaard.
  bijNeer(stormEl, (el) => (el && el.closest ? el.closest('[data-storm-draai]') : null), (knop, e) => {
    if (knop.disabled) return;
    const k = stormKanaal(knop.dataset.stormDraai);
    const soort = knop.dataset.soort;
    const d = STORM_DRAAIEN[soort];
    // Komt er op een bord alleen een click door, dan is slepen er niet bij:
    // dan gaat elke tik een stapje verder, en na het meeste weer naar niets.
    if (e.type === 'click') {
      kiesStorm(k.def.id);
      zetStormDraai(k, soort, k[soort] >= d.max - 0.001 ? d.min : k[soort] + (d.max - d.min) / 10);
      legStormDraaiVast(k, soort);
      return;
    }
    if (e.cancelable) e.preventDefault();
    const punt = e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : e;
    kiesStorm(k.def.id);
    knop.focus({ preventScroll: true });
    stormDraait = { k: k, soort: soort, x: punt.clientX, y: punt.clientY, van: k[soort] };
    werkStormGolfBij();
  }, (x, y) => {
    if (!stormDraait) return;
    const d = STORM_DRAAIEN[stormDraait.soort];
    const verschuif = (x - stormDraait.x) - (y - stormDraait.y);
    zetStormDraai(stormDraait.k, stormDraait.soort, stormDraait.van + verschuif / STORM_DRAAI_PIXELS * (d.max - d.min));
  }, () => {
    if (!stormDraait) return;
    const k = stormDraait.k;
    const soort = stormDraait.soort;
    stormDraait = null;
    legStormDraaiVast(k, soort);
    werkStormGolfBij();
  });

  stormEl.addEventListener('keydown', (e) => {
    const knop = e.target.closest && e.target.closest('[data-storm-draai]');
    if (!knop || knop.disabled) return;
    const k = stormKanaal(knop.dataset.stormDraai);
    const soort = knop.dataset.soort;
    const d = STORM_DRAAIEN[soort];
    const stap = (d.max - d.min) / 20;
    let t = k[soort];
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') t += stap;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') t -= stap;
    else if (e.key === 'Home') t = d.min;
    else if (e.key === 'End') t = d.max;
    else return;
    e.preventDefault();
    zetStormDraai(k, soort, t);
    legStormDraaiVast(k, soort);
  });

  // Een eigen bestand.
  stormEl.addEventListener('change', (e) => {
    const bestand = e.target.dataset.stormBestand;
    if (bestand) {
      uploadStormBestand(stormKanaal(bestand), e.target.files && e.target.files[0]);
      // Leeg, zodat hetzelfde bestand nog een keer kiezen ook weer werkt.
      e.target.value = '';
    }
  });

  if (stormLijstEl) {
    stormLijstEl.addEventListener('change', () => {
      if (stormLijstEl.value) kiesStormUitLijst(stormKanaal(storm.gekozen), stormLijstEl.value);
    });
  }

  // Een ander effect kiezen.
  stormKanalenEl.addEventListener('change', (e) => {
    const id = e.target.dataset.stormEffect;
    if (!id) return;
    const k = stormKanaal(id);
    k.effect = e.target.value;
    zetStormEffect(k);
    bewaarStormStand();
    werkStormKanaalBij(k);
  });

  // Slepen over de golf. Neerkomen pakt de streep die het dichtstbij is en zet
  // hem meteen op die plek; dat is op een groot bord makkelijker dan precies
  // een dun streepje raken.
  bijNeer(stormVlakEl, (el) => (el && el.closest ? el.closest('[data-storm-vlak]') : null), (vlak, e) => {
    const k = stormKanaal(storm.gekozen);
    if (!k.buffer || storm.opname) return;
    if (e.cancelable) e.preventDefault();
    const t = stormTijdBij(stormX(e));
    const greep = e.target.closest && e.target.closest('[data-storm-greep]');

    // Midden in de loop, niet vlak bij een streep: dan schuif je de hele loop.
    const perSeconde = stormVlakEl.getBoundingClientRect().width / k.buffer.duration;
    const ver = Math.min(Math.abs(t - k.begin), Math.abs(t - k.eind)) * perSeconde;
    if (!greep && t > k.begin && t < k.eind && ver > STORM_GREEP_MARGE) {
      if (e.type === 'click') return; // een losse tik verschuift niets
      stormSleept = 'geheel';
      stormVanaf = { t: t, begin: k.begin, eind: k.eind };
      stormVlakEl.classList.add('schuift');
      return;
    }

    stormSleept = greep ? greep.dataset.stormGreep
      : (Math.abs(t - k.begin) <= Math.abs(t - k.eind) ? 'begin' : 'eind');
    if (greep) greep.focus({ preventScroll: true });
    zetStormGreep(stormSleept, t);
    // Een click is het laatste vangnet en heeft geen loslaten meer achter zich.
    if (e.type === 'click') {
      stormSleept = null;
      legStormLusVast();
    }
  }, (x) => {
    if (!stormSleept) return;
    if (stormSleept === 'geheel') schuifStormLus(stormVanaf, stormTijdBij(x));
    else zetStormGreep(stormSleept, stormTijdBij(x));
  }, () => {
    if (!stormSleept) return;
    stormSleept = null;
    stormVlakEl.classList.remove('schuift');
    legStormLusVast();
  });

  // Met de muis zie je aan de aanwijzer wat je pakt: een handje midden in de
  // loop, pijltjes bij een streep.
  stormVlakEl.addEventListener('mousemove', (e) => {
    const k = stormKanaal(storm.gekozen);
    if (!k.buffer || stormSleept) return;
    const t = stormTijdBij(e.clientX);
    const perSeconde = stormVlakEl.getBoundingClientRect().width / k.buffer.duration;
    const ver = Math.min(Math.abs(t - k.begin), Math.abs(t - k.eind)) * perSeconde;
    stormVlakEl.classList.toggle('midden', t > k.begin && t < k.eind && ver > STORM_GREEP_MARGE);
  });

  // Met het toetsenbord: pijltjes een twintigste seconde, met shift een halve.
  ['begin', 'eind'].forEach((rand) => {
    stormGrepen[rand].addEventListener('keydown', (e) => {
      const k = stormKanaal(storm.gekozen);
      if (!k.buffer) return;
      const stap = e.shiftKey ? 0.5 : 0.05;
      let t = k[rand];
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') t -= stap;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') t += stap;
      else if (e.key === 'Home') t = 0;
      else if (e.key === 'End') t = k.buffer.duration;
      else return;
      e.preventDefault();
      zetStormGreep(rand, t);
      legStormLusVast();
    });
  });

  window.addEventListener('resize', () => {
    STORM_KANALEN.forEach((def) => {
      const k = stormKanaal(def.id);
      k.pieken = {};
      tekenStormOp(k.mini, k);
    });
    tekenStormOp(stormCanvas, stormKanaal(storm.gekozen), true);
  });

  // Klik je de bladzijde weg tijdens het opnemen, dan stopt de opname netjes
  // met wat er al is.
  // Weg van de bladzijde gaat de microfoon dicht; terug, en stond hij aan,
  // dan gaat hij weer open.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (storm.micAan && !storm.micStroom) zetStormMicAan();
      return;
    }
    if (storm.opname) stopStormOpname();
    else sluitStormMicrofoon();
  });

  werkStormBij();
}

function zetStormMicAan() {
  if (!kanStormOpnemen()) return;
  haalStormMicrofoon().catch((fout) => {
    storm.micAan = false;
    bewaarStormStand();
    werkStormMicBij();
    meldStorm(fout && fout.name === 'NotAllowedError'
      ? 'De microfoon mag niet aan. Klik op het slotje links van het adres en zet de microfoon op toestaan.'
      : 'De microfoon gaat niet aan. Zit hij goed in de computer?');
  });
}

// De microfoons in de lijst. Hun namen geeft de browser pas als je een keer
// toestemming hebt gegeven; daarvoor staat er alleen de standaard.
function vulStormMicrofoons() {
  if (!stormMicEl || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  navigator.mediaDevices.enumerateDevices().then((lijst) => {
    const mics = lijst.filter((d) => d.kind === 'audioinput' && d.deviceId &&
      d.deviceId !== 'default' && d.deviceId !== 'communications');
    stormMicEl.innerHTML = '<option value="">Standaard</option>' + mics.map((d, i) =>
      '<option value="' + stormTekst(d.deviceId) + '">' + stormTekst(d.label || 'Microfoon ' + (i + 1)) + '</option>'
    ).join('');
    stormMicEl.value = storm.microfoon;
    if (stormMicEl.value !== storm.microfoon) stormMicEl.value = '';
  }).catch(() => {});
}
