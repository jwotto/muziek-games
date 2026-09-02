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
// De keuzes staan van makkelijk naar moeilijk. Hoe vaak een tel leeg blijft
// verschilt per niveau: bij één klap per tel is de rust de enige afwisseling die
// er is, dus daar mag hij vaker vallen. Zodra er ook twee of vier klappen in een
// tel kunnen, zit de afwisseling in het aantal en hoeft de rust niet zo hard te
// werken.
const KLAPNIVEAUS = [
  { id: 'een',  naam: '1 klap per tel',
    uitleg: 'op elke tel een klap, soms een rust', keuzes: [1], rust: 0.28 },
  { id: 'twee', naam: '1 of 2 per tel',
    uitleg: 'een klap of twee, soms een rust', keuzes: [1, 2], rust: 0.16 },
  { id: 'vier', naam: '1, 2 of 4 per tel',
    uitleg: 'een, twee of vier klappen, soms een rust', keuzes: [1, 2, 4], rust: 0.14 }
];

// De eerste tel van een maat blijft altijd staan: daar hangt de hele klas aan,
// en een gat op de een raak je met zijn dertigen niet meer terug.

// Hoe vaak een tel iets anders wordt dan de vorige. Zonder deze duw komen
// dezelfde tellen zomaar drie keer achter elkaar, en dan valt er niets af te
// wisselen. Met een halve duw hoor je afwisseling zonder dat het een vast
// om-en-om wordt -- dat laatste hoor je na twee maten niet meer.
const KLAP_WISSEL_KANS = 0.55;

// Na een moeilijke tel vaker een makkelijke. Vier klappen achter elkaar en dan
// meteen weer vier is voor groep 3 geen afwisseling maar een muur.
const KLAP_BIJKOM_KANS = 0.5;

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
const klapTellenEl = klapEl && klapEl.querySelector('[data-klap-tellen]');
const klapDoelEl = klapEl && klapEl.querySelector('.klap-doel');
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

// De begeleiding uit polka.js staat in de drumles onder een kick, een snare en
// een hihat: daar moet hij ruimte laten. Hier is er geen drumstel, dus die
// ruimte is over en gaat naar de muziek zelf. Het zijn dezelfde noten, alleen
// harder gezet.
//
// Dit raakt alleen deze bladzijde: elke bladzijde bouwt zijn eigen stemmen op,
// dus in de drumles blijft de balans zoals hij was.
//
// De bas komt niet verder dan nul: een driehoeksgolf staat dan al tegen het
// plafond, en een bas die de begrenzer in loopt gaat brommen. Bij het akkoord en
// de tik is er meer ruimte, die kunnen verder omhoog.
basVol.volume.value = 0;    // was -4
akkVol.volume.value = -2;   // was -10
tikVol.volume.value = -1;   // was -9

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

// Wat er op de vorige tel stond, zodat de volgende daarop kan reageren. Loopt
// door over de maatstreep heen: de tel na een maatstreep is gewoon de volgende
// tel, en die hoort net zo goed af te wisselen. Nul betekent een rust.
let klapVorigAantal = 0;

// Hoeveel klappen er op deze tel komen. Niet zomaar een greep uit de keuzes:
// dan komt hetzelfde aantal te vaak achter elkaar. Na een moeilijke tel is er
// een flinke kans op de makkelijkste, en verder gaat de voorkeur naar iets
// anders dan de vorige tel. Allebei kansen en geen regels -- een vast om-en-om
// hoor je na twee maten niet meer.
function kiesAantal(keuzes, vorig) {
  const makkelijkst = keuzes[0];
  if (vorig > makkelijkst && Math.random() < KLAP_BIJKOM_KANS) return makkelijkst;

  const anders = keuzes.filter((k) => k !== vorig);
  if (anders.length && Math.random() < KLAP_WISSEL_KANS) {
    return anders[Math.floor(Math.random() * anders.length)];
  }
  return keuzes[Math.floor(Math.random() * keuzes.length)];
}

// Een maat wordt tel voor tel opgebouwd. Elke tel krijgt een van de aantallen
// van het gekozen niveau, verdeeld over de tel: één klap valt op de tel zelf,
// twee klappen op de achtsten, vier op de zestienden.
function klappenVoor(maat) {
  const stappen = new Array(KLAP_STAPPEN).fill('.');
  const niveau = niveauNu();
  const rustig = maat < KLAP_AANLOOPMATEN;

  for (let tel = 0; tel < 4; tel++) {
    // De eerste tel van de maat blijft altijd staan.
    if (!rustig && tel > 0 && Math.random() < niveau.rust) {
      klapVorigAantal = 0;
      continue;
    }

    const aantal = rustig ? 1 : kiesAantal(niveau.keuzes, klapVorigAantal);
    klapVorigAantal = aantal;
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

  klapVorigAantal = 0;

  klap = {
    loopt: true,
    stapNr: 0,                       // zestienden vanaf het allereerste begin
    stapTijd: Tone.now() + 0.6,
    bpm: klapStand.begin,
    maat: 0,
    klappen: klappenVoor(0),
    noten: [],
    aanloop: [],
    tellen: [],       // de tijden van de tellen, voor de stipjes en de ring
    telAan: -1,
    aftelGetal: 0,
    aftelKlaar: false,
    eersteKlap: 0,
    einde: 0
  };

  klapKnopEl.textContent = 'Stop';
  klapZetKnoppen(true);
  wisKlapTellen();
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
  klapSpelers.forEach((speler) => speler.stop(Tone.now()));
  klapTikEnvs.forEach((env) => env.cancel(Tone.now()));
  klapStaartEnv.cancel(Tone.now());
  basEnv.cancel(Tone.now());
  akkEnv.cancel(Tone.now());
  tikEnv.cancel(Tone.now());

  wisKlapTellen();
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

    // De polka is precies dezelfde als in het ritmespel van de drumles, tot en
    // met het aftellen: oom op elke tel, pah op de helft ertussen, en op de
    // oneven tellen wordt die pah verdubbeld tot twee zestienden. 1 en, 2 en-ne,
    // 3 en, 4 en-ne -- dat is wat er huppelt. Speel je alleen de eerste pah, dan
    // is het dezelfde muziek maar niet dezelfde gang.
    //
    // Hij loopt vanaf de eerste tel, dus ook onder het aftellen. Zo heb je de
    // muziek al in je voordat het eerste klapje valt.
    const tellengte = 60 / bpm;
    if (stap % 4 === 0) klap.tellen.push({ nr: tel, tijd: klap.stapTijd });

    if (stap % 4 === 0 && (inAanloop || maat < klapStand.maten)) {
      const akkoord = akkoordVoor(tel);
      basNoot(klap.stapTijd, akkoord, tellengte, tel % 4);
      akkoordStoot(klap.stapTijd + tellengte / 2, akkoord, tellengte);
      if (tel % 2 === 1) akkoordStoot(klap.stapTijd + tellengte * 0.75, akkoord, tellengte);
    }

    if (inAanloop) {
      if (stap % 4 === 0) {
        tik(klap.stapTijd, stap === KLAP_AANLOOP_STAPPEN - 4);
        klap.aanloop.push(klap.stapTijd);
      }
    } else if (maat < klapStand.maten) {
      // De metronoom blijft doortikken, ook als het klappen begonnen is. In de
      // drumles houdt hij na het aftellen op, want daar neemt de beat het over.
      // Hier is er geen beat: een kale tik op elke tel is waar dertig kinderen
      // zich aan vasthouden. De eerste tel van de maat krijgt de hoge tik, zodat
      // je hoort waar de maat begint.
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

// ============================================================
//  De tel in beeld
// ============================================================

// Hoe ver de ring opzwelt op de tel. De eerste tel van de maat krijgt meer,
// zodat je niet alleen hoort maar ook ziet waar een maat begint.
const KLAP_TEL_PULS = 1.14;
const KLAP_TEL_PULS_EEN = 1.32;
const KLAP_TEL_DUUR = 220;

const klapStippen = [];

function bouwKlapTellen() {
  if (!klapTellenEl) return;
  for (let i = 0; i < 4; i++) {
    const stip = document.createElement('span');
    stip.className = 'klap-tel' + (i === 0 ? ' eerste' : '');
    klapTellenEl.appendChild(stip);
    klapStippen.push(stip);
  }
}

// Een korte puls via de animatie-API en niet via een class: dan begint hij
// opnieuw ook als hij midden in een vorige valt. Alleen transform, want dat
// draait op de grafische kaart -- op een traag digibord is dat het verschil
// tussen een puls en een hik. De veer zit alleen op het eerste stuk: over het
// geheel schiet hij bij het eerste beeldje al door zijn eindstand heen.
function pulseerKlap(el, groei) {
  if (!el || !el.animate || minderBeweging.matches) return;
  el.animate([
    { transform: 'scale(1)', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { transform: 'scale(' + groei + ')', offset: 0.35, easing: 'ease-out' },
    { transform: 'scale(1)' }
  ], { duration: KLAP_TEL_DUUR });
}

// De ring klopt door op elke tel, ook als er geen klapje op valt. Juist dan:
// op een rust is er verder niets te zien, en dat is precies waar een klas de
// tel kwijtraakt.
function toonKlapTel(inMaat) {
  klapStippen.forEach((stip, i) => stip.classList.toggle('aan', i === inMaat));
  const groei = inMaat === 0 ? KLAP_TEL_PULS_EEN : KLAP_TEL_PULS;
  pulseerKlap(klapStippen[inMaat], groei);
  pulseerKlap(klapDoelEl, groei);
}

function wisKlapTellen() {
  klapStippen.forEach((stip) => stip.classList.remove('aan'));
}

// Welke tel er nu klinkt. Hij kijkt naar de audioklok en niet naar hoeveel
// beeldjes er voorbij zijn: op een traag digibord vallen er beeldjes weg en dan
// zou de puls langzaam achter de muziek aan gaan lopen. Hij pakt de nieuwste tel
// die al geweest is, dus als er een beeldje overgeslagen wordt springt hij naar
// de goede in plaats van er een achter te blijven.
function werkKlapTelBij(nu) {
  let nieuw = null;
  for (let i = 0; i < klap.tellen.length; i++) {
    const t = klap.tellen[i];
    if (nu >= t.tijd && (!nieuw || t.nr > nieuw.nr)) nieuw = t;
  }
  if (!nieuw || nieuw.nr === klap.telAan) return;

  klap.telAan = nieuw.nr;
  toonKlapTel(nieuw.nr % 4);

  // Wat geweest is hoeft niet elk beeldje opnieuw langsgelopen te worden.
  klap.tellen = klap.tellen.filter((t) => t.tijd > nu - 0.5);
}

function klapDoelX() {
  if (!klapBaanEl) return KLAP_DOEL;
  const uit = parseFloat(getComputedStyle(klapBaanEl).getPropertyValue('--doel-x'));
  return isFinite(uit) ? uit : KLAP_DOEL;
}

// Dezelfde klaphanden als op de kaart van deze les op de voorpagina: een zwarte
// lijntekening met de binnenkant ingekleurd.
//
// Dat zijn twee vormen. Bovenop de lijntekening zelf, in het inkt. Daaronder
// het silhouet dat de kleur draagt: de omtrek van de handen met de gaten
// ertussen dichtgemaakt. Die staat niet in de iconenset -- ook de gevulde versie
// is daar een lijntekening, met een holle handpalm -- dus hij is uitgerekend
// door de gevulde vorm op een raster te zetten, alles wat niet van buitenaf te
// bereiken is op te vullen en de rand daarvan weer na te lopen.
//
// De vormen staan hier uitgeschreven in plaats van als icoon uit het lettertype:
// dat komt van buiten, en een klapje dat niet laadt is een klapje dat je niet
// ziet aankomen.
const KLAP_HANDEN =
  '<svg viewBox="0 0 256 256" aria-hidden="true">' +
  '<path class="vlak" d="M166.5,0.0L171.3,0.5L174.3,2.8L175.8,5.5L176.0,25.3L174.3,29.0L171.3,31.3L166.8,31.8L163.5,30.5L160.3,25.5L160.3,6.3L161.5,3.3L164.0,1.0L166.3,0.3ZM207.0,13.0L211.3,13.5L214.5,16.0L216.0,19.3L216.0,22.5L206.3,39.3L202.3,41.8L197.3,41.5L194.5,39.8L192.8,37.3L192.3,32.5L202.3,15.5L206.8,13.3ZM115.0,32.0L120.5,32.0L124.0,33.0L131.0,37.8L155.8,79.8L155.3,71.3L156.3,67.5L158.8,63.0L163.3,58.8L169.3,56.3L176.0,56.0L180.8,57.5L185.0,60.3L189.0,65.3L209.3,100.3L215.0,112.3L218.0,122.5L219.5,134.3L219.3,144.5L217.8,153.5L213.3,167.0L208.0,176.5L206.8,191.0L203.3,203.5L196.5,217.5L187.8,229.3L178.3,238.3L168.0,245.3L155.8,251.0L144.5,254.3L133.8,255.8L117.3,255.3L106.5,253.0L94.3,248.5L85.5,243.8L77.5,238.0L68.5,229.5L63.3,223.0L21.5,151.0L20.0,144.8L20.0,139.0L23.3,129.0L26.5,124.5L31.8,120.0L36.0,117.8L42.5,116.0L37.8,107.0L36.3,100.8L36.5,93.3L40.3,83.8L44.5,78.8L51.8,74.0L59.8,72.0L68.3,72.3L64.0,64.8L62.8,60.3L63.3,53.3L66.3,47.0L69.8,43.5L74.3,41.0L78.0,40.0L85.5,40.5L90.5,42.8L94.3,46.0L100.3,55.8L99.8,47.3L102.5,40.0L107.8,34.8L114.8,32.3ZM234.8,48.0L237.3,48.0L240.3,49.3L243.0,52.3L243.8,57.3L242.3,60.8L238.5,63.5L222.0,68.8L218.5,68.5L214.0,65.0L212.8,60.3L215.3,55.0L218.0,53.3L234.5,48.3Z"/>' +
  '<path class="lijn" d="M160.22,24V8a8,8,0,0,1,16,0V24a8,8,0,0,1-16,0ZM196.1,41a7.91,7.91,0,0,0,4.17,1.17,8,8,0,0,0,6.84-3.83l8-13.11a8,8,0,0,0-13.68-8.33l-8,13.1A8,8,0,0,0,196.1,41Zm47.51,12.59a8,8,0,0,0-10.08-5.16l-15.06,4.85a8,8,0,0,0,2.46,15.62,8.15,8.15,0,0,0,2.46-.39l15.05-4.85A8,8,0,0,0,243.61,53.55ZM217,97.58a80.22,80.22,0,0,1-10.22,94c-.34,1.73-.72,3.46-1.19,5.18A80.17,80.17,0,0,1,58.77,216L23.5,155a26,26,0,0,1,19.24-38.79l-3-5.2a26,26,0,0,1,19.2-38.78L58.24,71A26,26,0,0,1,95.47,36.53,26.06,26.06,0,0,1,140.3,37l12.26,21.2A26.07,26.07,0,0,1,195.81,61ZM109.07,55l0,0h0l25,43.17a26,26,0,0,1,17.33-10L126.42,45a10,10,0,1,0-17.35,10ZM72.12,63l6.46,11.17a26.05,26.05,0,0,1,17.32-10L89.45,53A10,10,0,1,0,72.12,63Zm111.54,81-20.22-35a10,10,0,0,0-17.74,9.25L158.3,140a8,8,0,0,1-13.87,8l-36.5-63A10,10,0,1,0,90.58,95l26.05,45a8,8,0,0,1-13.87,8L71,93h0l0,0a10,10,0,0,0-17.33,10l35.22,61A8,8,0,0,1,75,172L54.72,137a10,10,0,0,0-17.34,10l35.27,61a64.12,64.12,0,0,0,117.42-15.44A63.52,63.52,0,0,0,183.66,144Zm19.41-38.42L181.93,69A10,10,0,0,0,164.55,79l33,57.05A80.2,80.2,0,0,1,207,161.51,64.23,64.23,0,0,0,203.07,105.58Z"/>' +
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

// Bij de ring zwelt het klapje even op. De span zelf schuift elk beeld op met
// een transform, dus de puls gaat op de tekening erbinnen: anders overschrijven
// die twee elkaar en staat het klapje stil.
//
// De veer zit alleen op het eerste stuk van de animatie. Zet je hem over het
// geheel, dan schiet hij al bij het eerste beeldje door zijn eindstand heen en
// is de puls voorbij voordat je hem ziet.
function zwelKlapOp(noot) {
  if (noot.gezwollen) return;
  noot.gezwollen = true;
  if (minderBeweging.matches) return;

  const vorm = noot.el.querySelector('svg');
  if (!vorm || !vorm.animate) return;
  vorm.animate([
    { transform: 'scale(1)', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { transform: 'scale(1.5)', offset: 0.3, easing: 'ease-out' },
    { transform: 'scale(1)' }
  ], { duration: 300 });
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
  werkKlapTelBij(nu);

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
    const raak = Math.abs(noot.tijd - nu) < 0.08;
    noot.el.classList.toggle('raak', raak);
    if (raak) zwelKlapOp(noot);
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
  bouwKlapTellen();
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
