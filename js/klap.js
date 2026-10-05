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
// De keuzes staan van makkelijk naar moeilijk, en heten net als bij de skater:
// rustig is één klap per tel, normaal één of twee, druk één, twee of vier.
// Hoe vaak een tel leeg blijft verschilt per niveau: bij één klap per tel is de
// rust de enige afwisseling die er is, dus daar mag hij vaker vallen. Zodra er
// ook twee of vier klappen in een tel kunnen, zit de afwisseling in het aantal
// en hoeft de rust niet zo hard te werken.
const KLAPNIVEAUS = [
  { id: 'een',  naam: 'Rustig',  keuzes: [1],       rust: 0.28 },
  { id: 'twee', naam: 'Normaal', keuzes: [1, 2],    rust: 0.16 },
  { id: 'vier', naam: 'Druk',    keuzes: [1, 2, 4], rust: 0.14 }
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
  { id: 'maten', label: 'Maten', min: 4, max: 32, step: 2, waarde: 16, achter: 'maten' }
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

// Wat er nu geldt. Klassikaal is dat wat de juf heeft gezet; alleen speel je
// altijd op 90 bpm en 16 maten, met het patroon van je level (zie alleen.js).
function klapInst() {
  if (klapAlleen && klapAlleen.aan()) {
    return { begin: ALLEEN_BPM, eind: ALLEEN_BPM, maten: ALLEEN_MATEN, patroon: klapAlleen.niveau().id };
  }
  return klapStand;
}

function niveauNu() {
  return KLAPNIVEAUS.find((k) => k.id === klapInst().patroon) || KLAPNIVEAUS[1];
}

// ============================================================
//  De begeleiding op deze bladzijde
// ============================================================

// De klap zelf staat in lijfgeluid.js, want de ritmevierkanten en de tweede
// body-percussionles gebruiken hem ook.
//
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
//
// Behalve als je alleen speelt: dan klinkt de muziek zoals in de drumles, en
// ook je eigen klap zachter. Samen met de muziek hier kwam hij anders ver over de
// begrenzer uit drumkit.js heen, en die drukt dan alles plat wat op dat moment
// klinkt: de synth klonk bij elke klap alsof er een filter dichtging. In de
// drumles gebeurt dat niet, dus daar nemen we de balans van over.
const KLAP_MIX = {
  klas:   { bas: 0,  akk: -2,  tik: -1, klap: KLAP_LUID },
  alleen: { bas: -4, akk: -10, tik: -9, klap: -5 }
};

function zetKlapMix(alleen) {
  const mix = alleen ? KLAP_MIX.alleen : KLAP_MIX.klas;
  basVol.volume.value = mix.bas;
  akkVol.volume.value = mix.akk;
  tikVol.volume.value = mix.tik;
  klapVol.volume.value = mix.klap;
}

zetKlapMix(false);

// ============================================================
//  De oefening
// ============================================================

let klap = null;
let klapLus = 0;

// Het tempo loopt in rechte lijn van het begin- naar het eindtempo, verdeeld
// over het aantal maten. Bij één maat is er niets te verdelen.
function klapBpmVoor(maat) {
  const inst = klapInst();
  const totaal = Math.max(1, inst.maten - 1);
  const deel = Math.min(1, Math.max(0, maat) / totaal);
  return inst.begin + (inst.eind - inst.begin) * deel;
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

  // Op deze bladzijde staan twee oefeningen onder elkaar. Twee tellen door
  // elkaar heen is voor een klas onmogelijk, dus de ander gaat uit. Hij staat
  // hieronder in de bladzijde geladen, vandaar de vraag of hij er al is.
  if (typeof stopVierkant === 'function') stopVierkant();

  if (Tone.getContext().state !== 'running') {
    startGeluid().then(startKlap).catch(() => {});
    return;
  }
  startKlapRuis();

  klapVorigAantal = 0;

  klap = {
    loopt: true,
    alleen: !!(klapAlleen && klapAlleen.aan()),   // vast voor deze beurt
    stapNr: 0,                       // zestienden vanaf het allereerste begin
    stapTijd: Tone.now() + 0.6,
    bpm: klapInst().begin,
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

  // Alleen: de muziek en je klap zoals in de drumles (zie KLAP_MIX).
  zetKlapMix(klap.alleen);

  klapKnopEl.textContent = 'Stop';
  klapZetKnoppen(true);
  if (klapAlleen) klapAlleen.zetBezig(true);
  if (klap.alleen) {
    klapAlleen.nieuweBeurt();
    // Anders staat de focus nog op Start, en dan stopt de spatie het spel.
    if (document.activeElement) document.activeElement.blur();
  }
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
  if (klapDoelEl) klapDoelEl.classList.remove('raak');

  // Wat er nog vooruit gepland stond mag niet doorspelen over een gestopte
  // oefening heen.
  klapSpelers.forEach((speler) => speler.stop(Tone.now()));
  klapTikEnvs.forEach(stilNu);
  stilNu(klapStaartEnv);
  stilNu(basEnv);
  stilNu(akkEnv);
  stilNu(tikEnv);

  wisKlapTellen();
  toonKlapAftellen(0);
  // Weer de klassikale balans, ook voor de ritmevierkanten verderop.
  zetKlapMix(false);
  klapKnopEl.textContent = 'Start';
  klapZetKnoppen(false);
  if (klapAlleen) klapAlleen.zetBezig(false);
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

    const maten = klapInst().maten;
    const bpm = inAanloop ? klapInst().begin : klapBpmVoor(maat);
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

    if (stap % 4 === 0 && (inAanloop || maat < maten)) {
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
    } else if (maat < maten) {
      // De metronoom blijft doortikken, ook als het klappen begonnen is. In de
      // drumles houdt hij na het aftellen op, want daar neemt de beat het over.
      // Hier is er geen beat: een kale tik op elke tel is waar dertig kinderen
      // zich aan vasthouden. De eerste tel van de maat krijgt de hoge tik, zodat
      // je hoort waar de maat begint.
      if (inMaat % 4 === 0) tik(klap.stapTijd, inMaat === 0);

      if (klap.klappen[inMaat] === 'x') {
        // Alleen maak je de klap zelf, met de spatie.
        if (!klap.alleen) klapNu(klap.stapTijd);
        klap.noten.push(maakKlapNoot(klap.stapTijd, klappenInTel(klap.klappen, inMaat)));
        if (!klap.eersteKlap) klap.eersteKlap = klap.stapTijd;
      }
    }

    klap.bpm = bpm;
    klap.stapTijd += stapDuur;
    klap.stapNr += 1;

    // Klaar? Nog even laten uitklinken, dan stoppen.
    if (!inAanloop && maat >= maten && !klap.einde) {
      klap.einde = klap.stapTijd + 0.4;
    }
  }
}

// ============================================================
//  De tel in beeld
// ============================================================

// Op elke tel ademt de hele baan even mee. De eerste tel van de maat krijgt
// meer, zodat je niet alleen hoort maar ook ziet waar een maat begint.
//
// De baan is bijna een meter breed op een digibord. Twee procent daarvan is al
// twee centimeter aan elke kant en dat werd te druk; ruim een procent is genoeg
// om te zien dat het vak ademt zonder dat het gaat wiebelen. Een stipje van
// twintig pixels heeft veel meer nodig om hetzelfde te doen, vandaar twee maten
// in plaats van een.
const KLAP_BAAN_PULS = 1.012;
const KLAP_BAAN_PULS_EEN = 1.022;
const KLAP_STIP_PULS = 1.14;
const KLAP_STIP_PULS_EEN = 1.32;
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
  if (!el) return;
  animeer(el, [
    { transform: 'scale(1)', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { transform: 'scale(' + groei + ')', offset: 0.35, easing: 'ease-out' },
    { transform: 'scale(1)' }
  ], { duration: KLAP_TEL_DUUR });
}

// De baan klopt door op elke tel, ook als er geen klapje op valt. Juist dan: op
// een rust is er verder niets te zien en niets te doen, en dat is precies waar
// een klas de tel kwijtraakt.
//
// De puls zit op de baan zelf, dus op de zwarte lijnen rondom het speelvak. Die
// zie je vanaf de achterste tafel nog; een ring van zestig pixels is van vijf
// meter afstand niets meer.
//
// De ring erin klopt gewoon mee. Hij zit in de baan, dus hij krijgt die twee
// procent er sowieso bij, en zijn eigen puls komt daar bovenop -- daar waar je
// moet klappen mag het het hardst aankomen.
function toonKlapTel(inMaat) {
  klapStippen.forEach((stip, i) => stip.classList.toggle('aan', i === inMaat));
  const eerste = inMaat === 0;
  pulseerKlap(klapBaanEl, eerste ? KLAP_BAAN_PULS_EEN : KLAP_BAAN_PULS);
  pulseerKlap(klapDoelEl, eerste ? KLAP_STIP_PULS_EEN : KLAP_STIP_PULS);
  pulseerKlap(klapStippen[inMaat], eerste ? KLAP_STIP_PULS_EEN : KLAP_STIP_PULS);
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

// De klaphanden (KLAP_HANDEN) staan in lijfgeluid.js, want de ritme skater
// laat ze ook op je af komen.

// Hoeveel klappen er in dezelfde tel zitten als deze. Dat bepaalt de kleur, dus
// je ziet aan een klapje al aankomen of het er eentje is of dat er twee of vier
// achter elkaar komen.
function klappenInTel(stappen, inMaat) {
  const tel = Math.floor(inMaat / 4);
  let aantal = 0;
  for (let i = 0; i < 4; i++) if (stappen[tel * 4 + i] === 'x') aantal += 1;
  return aantal;
}

// Bij de ring flitst de ring in de kleur van het klapje. Het klapje zelf zwelt
// niet op: het komt op zijn gewone maat aan, en de gele kopie groeit vanaf
// precies die maat (zie ruimKlapOp).
function raakKlap(noot) {
  if (noot.geraakt) return;
  noot.geraakt = true;
  flitsKlapDoel(noot.aantal);
}

// Op de tel groeien de handen en vervagen in de ring, met een paar gele
// sterretjes. Meteen, net als bij de ritme skater, zodat het klapje en de klap
// samenvallen; de ring flitst dan al.
const KLAP_WEG_NA = 0;       // seconden na de tel
const KLAP_HANGEN = 220;     // milliseconden dat de gele klap blijft hangen
const KLAP_STERREN = [-70, -35, 0, 35, 70];

function ruimKlapOp(noot) {
  if (noot.weg) return;
  noot.weg = true;

  const vorm = noot.el.querySelector('svg');
  if (!vorm) return;
  // Het klapje zelf is op de tel weg; een gele kopie blijft in de ring hangen,
  // zwelt nog wat op en vervaagt daar. De kopie staat waar het klapje op de tel
  // stond, want de transform gaat mee. De sterretjes springen eruit.
  const kopie = noot.el.cloneNode(true);
  kopie.classList.add('raak');
  klapNotenEl.appendChild(kopie);
  animeer(kopie.querySelector('svg'), [
    { transform: 'scale(1)', opacity: 1, easing: 'ease-out' },
    { transform: 'scale(1.7)', opacity: 0 }
  ], { duration: KLAP_HANGEN, fill: 'forwards' });
  setTimeout(() => kopie.remove(), KLAP_HANGEN + 50);
  vorm.style.visibility = 'hidden';

  KLAP_STERREN.forEach((hoek) => {
    const ster = document.createElement('span');
    ster.className = 'klap-ster';
    kopie.appendChild(ster);
    const beweging = animeer(ster, [
      { transform: 'rotate(' + hoek + 'deg) translateY(0) scaleY(0.4)', opacity: 1, easing: 'ease-out' },
      { transform: 'rotate(' + hoek + 'deg) translateY(-160%) scaleY(1)', opacity: 0 }
    ], { duration: 380, fill: 'forwards' });
    if (beweging) beweging.onfinish = () => ster.remove();
    else ster.remove();
  });
}

// Op de klap krijgt de rand van de ring even de kleur van het klapje. Elke
// klap apart, dus bij twee of vier klappen in een tel flitst hij twee of vier
// keer. Daarom duurt een flits een halve klap lang, anders lopen ze bij een
// hoog tempo in elkaar over.
let klapFlitsKlok = 0;

function flitsKlapDoel(aantal) {
  if (!klapDoelEl) return;
  clearTimeout(klapFlitsKlok);
  klapDoelEl.classList.remove('aantal-1', 'aantal-2', 'aantal-4');
  klapDoelEl.classList.add('raak', 'aantal-' + aantal);
  const duur = 60 / (klap ? klap.bpm : klapInst().begin) / aantal / 2 * 1000;
  klapFlitsKlok = setTimeout(() => klapDoelEl.classList.remove('raak'), duur);
}

function maakKlapNoot(tijd, aantal) {
  const el = document.createElement('span');
  el.className = 'klap-noot aantal-' + aantal;
  el.innerHTML = KLAP_HANDEN;
  klapNotenEl.appendChild(el);
  return { soort: 'klap', tijd: tijd, aantal: aantal, el: el };
}

// ============================================================
//  Alleen: zelf klappen
// ============================================================

function mistKlap(noot) {
  noot.gemist = true;
  noot.el.classList.add('gemist');
  klapAlleen.mis();
}

// Met de spatie, of met een tik op de baan. Je hoort meteen je klap; hoeveel
// punten hij oplevert hangt af van hoe dicht hij bij een klapje zat. Klap je
// ernaast, dan kost dat punten: anders kon je gewoon elke zestiende op de spatie
// blijven rammen.
function klapZelf() {
  if (!klap || !klap.loopt || !klap.alleen) return;
  const nu = Tone.now();
  // Met de voorsprong uit drumkit.js: plan je korter vooruit dan één audioblok,
  // dan begint de opname in het verleden en valt de knal van de klap weg. Dan
  // klinkt hij dof en zacht.
  klapNu(nu + VOORSPRONG);

  const wanneer = nu - geluidVertraging();
  const gevonden = zoekDoel(klap.noten, 'klap', wanneer);
  const noot = gevonden && gevonden.doel;
  if (noot && klapAlleen.raak(gevonden.afstand, alleenSchaal(klap.bpm, noot.aantal))) {
    noot.gehaald = true;
    raakKlap(noot);
    ruimKlapOp(noot);
    return;
  }
  klapAlleen.fout();
  schudKlapDoel();
}

// Ernaast: de ring schudt even nee.
function schudKlapDoel() {
  if (!klapDoelEl) return;
  animeer(klapDoelEl, [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-5px)', offset: 0.25 },
    { transform: 'translateX(5px)', offset: 0.6 },
    { transform: 'translateX(0)' }
  ], { duration: 180 });
}

// De spatie klapt, maar alleen als er alleen gespeeld wordt. Ook de keyup
// tegenhouden: staat de focus op een knop, dan drukt de spatie die anders in.
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || !klap || !klap.loopt || !klap.alleen) return;
  e.preventDefault();
  if (!e.repeat) klapZelf();
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && klap && klap.loopt && klap.alleen) e.preventDefault();
});

// ============================================================
//  Het beeld
// ============================================================

function klapStap() {
  if (!klap || !klap.loopt) return;
  const nu = Tone.now();
  vulKlapAan(nu);

  // Het beeld loopt net zoveel achter als het geluid, zodat je ziet wat je
  // hoort (zie instellingen.js). Plannen gaat gewoon op de audioklok.
  const beeld = nu - geluidVertraging();
  werkKlapAftellenBij(beeld);
  werkKlapTelBij(beeld);

  // Van rechts naar links. Op zijn moment staat een klapje op het doelvak;
  // KLAP_VOORUIT seconden daarvoor staat hij tegen de rechterrand.
  const breedte = klapBaanEl ? klapBaanEl.clientWidth : 0;
  const doelX = klapDoelX();
  const over = [];

  klap.noten.forEach((noot) => {
    const deel = (noot.tijd - beeld) / KLAP_VOORUIT;
    const x = doelX + deel * (breedte - doelX);

    // Voorbij het doel mag hij nog even doorlopen, dan is hij weg. Klassikaal
    // is hij na zijn gele klap in de ring meteen klaar.
    const klaar = !klap.alleen && beeld - noot.tijd > KLAP_WEG_NA + KLAP_HANGEN / 1000;
    if (x < -60 || klaar) {
      noot.el.remove();
      return;
    }
    noot.el.style.transform = 'translateX(' + x + 'px)';

    if (klap.alleen) {
      // Alleen: wat je niet op tijd raakt, schuift grijs door.
      const venster = ALLEEN_VENSTER * alleenSchaal(klap.bpm, noot.aantal);
      if (!noot.gehaald && !noot.gemist && beeld - noot.tijd > venster) mistKlap(noot);
    } else {
      const raak = Math.abs(noot.tijd - beeld) < 0.08;
      noot.el.classList.toggle('raak', raak);
      if (raak) raakKlap(noot);
      if (beeld - noot.tijd > KLAP_WEG_NA) ruimKlapOp(noot);
    }
    over.push(noot);
  });

  klap.noten = over;
  werkKlapBalkBij();

  if (klap.einde && beeld > klap.einde) {
    // Helemaal uitgespeeld: alleen krijg je dan je uitslag.
    if (klap.alleen) {
      klap.noten.forEach((noot) => { if (!noot.gehaald && !noot.gemist) mistKlap(noot); });
      klapAlleen.klaar();
    }
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
  if (!getal) return;
  animeer(klapAftelEl,
    [{ transform: 'scale(0.6)' }, { transform: 'scale(1)' }],
    { duration: 240, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
  );
}

function werkKlapBalkBij() {
  if (!klapEl) return;
  const inst = klapInst();
  klapBpmEl.textContent = Math.round(klap ? klap.bpm : inst.begin);
  klapMaatEl.textContent = klap ? Math.min(inst.maten, klap.maat + 1) : 0;
  klapTotaalEl.textContent = inst.maten;
}

// ============================================================
//  De knoppen van de juf
// ============================================================

function bouwKlapKnoppen() {
  if (!klapSchuifEl || !klapKeuzeEl) return;

  klapSchuifEl.innerHTML = KLAP_INSTELLINGEN.map((p) => `
    <div class="klap-schuif">
      <label for="klap-${p.id}"><span class="klap-schuif-naam">${p.label}</span><b data-toon="${p.id}"></b></label>
      <input type="range" id="klap-${p.id}" data-klap="${p.id}"
             min="${p.min}" max="${p.max}" step="${p.step}">
    </div>
  `).join('');

  klapKeuzeEl.innerHTML = KLAPNIVEAUS.map((k) => `
    <button class="klap-keus" type="button" data-patroon="${k.id}">
      <span class="klap-keus-naam">${k.naam}</span>
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
    // De eenheid apart, zodat een telefoon hem kan weglaten (zie site.css).
    if (toon) toon.innerHTML = klapStand[p.id] + '<span class="eenheid"> ' + p.achter + '</span>';
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

// Klassikaal of alleen (zie alleen.js). Moet er zijn voordat de knoppen gebouwd
// worden, want de balk vraagt al wat er geldt.
const klapAlleen = klapEl ? maakAlleen(klapEl, {
  sleutel: 'wotto-muziekfles-klap-alleen',
  niveaus: [
    { id: 'een',  uitleg: 'één klap per tel' },
    { id: 'twee', uitleg: 'één of twee klappen per tel' },
    { id: 'vier', uitleg: 'één, twee of vier klappen per tel' }
  ],
  toetsen: 'Druk op de spatie als een klapje in de ring staat, of tik op de baan.',
  bijWissel: () => werkKlapBalkBij(),
  bijNiveau: () => werkKlapBalkBij()
}) : null;

if (klapEl) {
  laadKlapStand();
  bouwKlapKnoppen();
  bouwKlapTellen();
  werkKlapBalkBij();

  klapKnopEl.addEventListener('click', () => {
    if (klap && klap.loopt) stopKlap();
    else startKlap();
  });

  // Wis voortgang, rechtsboven: de levels en hiscores van het alleen spelen.
  // Eerst even doorvragen, net als in de drumles: per ongeluk je hiscores
  // kwijtraken is zuur, en een venster van de browser legt de audio stil.
  const wisEl = document.querySelector('[data-wis-alles]');
  let wisTimer = 0;
  const ontwapen = () => {
    clearTimeout(wisTimer);
    wisTimer = 0;
    wisEl.textContent = 'Wis voortgang';
  };
  if (wisEl) {
    wisEl.addEventListener('click', () => {
      if (!wisTimer) {
        wisEl.textContent = 'Zeker?';
        wisTimer = setTimeout(ontwapen, 3000);
        return;
      }
      ontwapen();
      // Loopt er een beurt, dan die eerst stoppen: anders schrijft hij zijn
      // score er aan het eind alsnog in.
      if (klap && klap.loopt) stopKlap();
      klapAlleen.wis();
      werkKlapBalkBij();
    });
  }

  // Op een tablet tik je op de baan in plaats van de spatie.
  klapBaanEl.addEventListener('pointerdown', (e) => {
    if (!klap || !klap.loopt || !klap.alleen) return;
    e.preventDefault();
    klapZelf();
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
