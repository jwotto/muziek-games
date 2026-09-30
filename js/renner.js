/* Ritme skater — een extra les

   Op het digibord, voor de hele klas tegelijk. Een skater rijdt van links naar
   rechts, en van rechts komt van alles op de skater af: een blok op de grond
   (springen), een balk op hoofdhoogte (bukken) en klaphanden. Op de tel is het
   bij de skater, die het voordoet, en de klas doet mee. Er wordt niets
   gemeten: het gaat erom dat je het samen op de maat doet.

   De juf kiest bovenaan wat er langs komt en hoe druk, en zet
   het tempo en het aantal maten. Die instellingen blijven bewaard.

   Het plannen werkt hetzelfde als in klap mee: elke stap wordt RN_VOORUIT
   seconden van tevoren neergezet, en de rAF-lus rekent alleen nog uit waar
   alles op dit moment staat. */

// ============================================================
//  Wat er te kiezen valt
// ============================================================

// Bij klappen, net als bij klap mee: hoeveel klappen er in een tel kunnen (een
// op de tel, twee op de achtsten, vier op de zestienden) en hoe vaak een tel
// leeg blijft.
// Bij springen en bukken: hoeveel maten een blok duurt. Een blok is springen of
// bukken op de een en de drie, zonder rust, en minstens twee maten lang: vier
// keer achter elkaar. Korter is te kort om in te komen.
const RN_DRUKTE = [
  { id: 'rustig', naam: 'Rustig',  keuzes: [1],       rust: 0.28, reeks: [2] },
  { id: 'gewoon', naam: 'Normaal', keuzes: [1, 2],    rust: 0.16, reeks: [2, 3] },
  { id: 'druk',   naam: 'Druk',    keuzes: [1, 2, 4], rust: 0.14, reeks: [2, 3, 4] }
];

// Na een tel met veel klappen vaker een makkelijke, net als bij klap mee: vier
// klappen en dan meteen weer vier is geen afwisseling maar een muur.
const RN_BIJKOM_KANS = 0.5;

// De kleur en de maat zeggen hoeveel klappen er in die ene tel zitten, net als
// bij klap mee: blauw is een, groen twee, rood vier. Vier klappen kruipen tegen
// elkaar aan, dus die zijn kleiner.
const RN_KLAP_MAAT = { 1: 1.15, 2: 1, 4: 0.85 };

const RN_INSTELLINGEN = [
  { id: 'tempo', label: 'Tempo', min: 60, max: 160, step: 5, waarde: 90, achter: 'bpm' },
  { id: 'maten', label: 'Maten', min: 4, max: 32, step: 2, waarde: 16, achter: 'maten' }
];

// Hoe vaak het volgende iets anders wordt dan het vorige. Een halve duw: je
// krijgt afwisseling, maar springen-springen-bukken kan gewoon.
const RN_WISSEL_KANS = 0.5;

// De eerste maten zijn altijd rustig en makkelijk, wat er ook is ingesteld: even
// samen in de maat komen voordat het gaat afwisselen.
const RN_AANLOOPMATEN = 2;

const RN_STAPPEN = 16;     // zestienden in één maat
const RN_VOORUIT = 2.4;    // seconden dat iets van tevoren te zien is
const RN_AFTELLEN = 4;     // tellen aftellen voordat de eerste maat begint

// ============================================================
//  Het beeld
// ============================================================

// De skater staat links, de grond ligt onderin. Alles in delen van het vak.
const RN_POP_X = 0.18;     // waar de skater staat, als deel van de breedte
const RN_GROND = 0.84;     // waar de grond ligt, als deel van de hoogte
const RN_POP_H = 0.52;     // hoe groot de skater is, als deel van de hoogte

// Wat er langs komt, in honderdsten van het vakje van de skater: breedte,
// hoogte, en hoe hoog de onderkant boven de grond hangt. Het blok haalt ze met
// springen makkelijk (ze komt 58 hoog). Rijdend is ze 100 hoog en gebukt 82
// (zie tools/sprites.py), dus de balk op 90 raakt haar alleen als ze niet
// bukt. De handen komen vlak boven haar hoofd langs: daar hangt niets voor,
// dus je ziet ze al van ver aankomen, en je ziet haar eronder klappen.
const RN_MATEN = {
  spring: { b: 22, h: 30, boven: 0 },
  buk:    { b: 40, h: 12, boven: 90 },
  klap:   { b: 28, h: 28, boven: 104 }
};

// De skater staat op een skateboard. Ze komt uit een sprite sheet: zes
// beeldjes naast elkaar in img/renner-sprites.webp, gemaakt met
// tools/sprites.py. Welk beeldje waar staat:
const RN_BEELDJES = {
  rijden: [0, 1],           // twee houdingen, om en om
  spring: [2, 3],           // omhoog met de neus van het board op, omlaag met de neus neer
  buk: 4,
  klap: 5,
  staan: 0                  // als het spel niet loopt
};
const RN_AANTAL_BEELDJES = 6;
const RN_VAK = 0.85;       // een vakje is 255 bij 300

// ============================================================
//  Het scherm
// ============================================================

const rnEl = document.getElementById('renner');
const rnBaanEl = rnEl && rnEl.querySelector('[data-rn-baan]');
const rnDingenEl = rnEl && rnEl.querySelector('[data-rn-dingen]');
const rnPopEl = rnEl && rnEl.querySelector('[data-rn-pop]');
const rnDoelEl = rnEl && rnEl.querySelector('[data-rn-doel]');
const rnPopBeeldEl = rnPopEl && rnPopEl.querySelector('[data-rn-pop-beeld]');
const rnAftelEl = rnEl && rnEl.querySelector('[data-rn-aftellen]');
const rnTellenEl = rnEl && rnEl.querySelector('[data-rn-tellen]');
const rnKnopEl = rnEl && rnEl.querySelector('[data-rn-start]');
const rnBpmEl = rnEl && rnEl.querySelector('[data-rn-bpm]');
const rnMaatEl = rnEl && rnEl.querySelector('[data-rn-maat]');
const rnTotaalEl = rnEl && rnEl.querySelector('[data-rn-totaal]');
const rnSchuifEl = rnEl && rnEl.querySelector('[data-rn-schuifjes]');
const rnKeuzeEls = rnEl ? Array.from(rnEl.querySelectorAll('[data-rn-keuze]')) : [];

// ============================================================
//  De instellingen, en ze onthouden
// ============================================================

const RN_SLEUTEL = 'wotto-muziekfles-renner';

const RN_KEUZES = { druk: RN_DRUKTE };

const rnStand = { druk: 'gewoon' };
RN_INSTELLINGEN.forEach((p) => { rnStand[p.id] = p.waarde; });

// Elke waarde apart nakijken: opslag van een oudere versie mag de bladzijde
// nooit stukmaken.
function laadRnStand() {
  let bewaard = null;
  try {
    bewaard = JSON.parse(localStorage.getItem(RN_SLEUTEL));
  } catch (e) {
    return;
  }
  if (!bewaard || typeof bewaard !== 'object') return;

  RN_INSTELLINGEN.forEach((p) => {
    const w = parseFloat(bewaard[p.id]);
    if (isFinite(w) && w >= p.min && w <= p.max) rnStand[p.id] = w;
  });
  Object.keys(RN_KEUZES).forEach((groep) => {
    if (RN_KEUZES[groep].some((k) => k.id === bewaard[groep])) rnStand[groep] = bewaard[groep];
  });
}

function bewaarRnStand() {
  try {
    localStorage.setItem(RN_SLEUTEL, JSON.stringify(rnStand));
  } catch (e) {
    // Opslag kan uit staan. Het spel werkt gewoon door.
  }
}

const rnKeuze = (groep) => RN_KEUZES[groep].find((k) => k.id === rnStand[groep]) || RN_KEUZES[groep][0];

// ============================================================
//  Wat er in een maat komt
// ============================================================

// Wat er het laatst was, zodat het volgende daarop kan reageren. Loopt door
// over de maatstreep heen.
// nogMaten: hoeveel maten het lopende blok springen of bukken nog duurt.
// nogZelfde: hoe vaak de beweging nog hetzelfde blijft voor hij wisselt.
// aantal: hoeveel klappen er in de vorige tel zaten.
const rnVorig = { beweging: 'spring', soort: 'klappen', nogMaten: 0, nogZelfde: 0, aantal: 0 };

// Hoe ver we in het liedje zijn, van 0 aan het begin tot 1 in de laatste maat.
// Springen en bukken wordt daarmee steeds moeilijker.
const rnVoortgang = (maat) => (rnStand.maten > 1 ? Math.min(1, maat / (rnStand.maten - 1)) : 0);

// Hoe vaak dezelfde beweging achter elkaar komt. Aan het begin vier keer,
// halverwege twee keer (springen, springen, bukken, bukken), en aan het eind
// wisselt het soms bij elke tel.
function zelfdeLengte(voortgang) {
  if (voortgang < 0.35) return 4;
  if (voortgang < 0.7) return 2;
  return Math.random() < 0.5 ? 1 : 2;
}

// Vanaf hier mogen er klappen tussen het springen en bukken door, op de twee
// en de vier: vanaf de helft van het liedje.
const RN_KLAP_TUSSENDOOR = 0.5;
const RN_KLAP_TUSSENDOOR_KANS = 0.5;

// Een greep uit de lijst, met een duw naar iets anders dan de vorige keer. Een
// kans en geen regel: een vast om-en-om heb je na twee maten door.
function kiesAnders(lijst, vorig) {
  const anders = lijst.filter((x) => x !== vorig);
  const uit = anders.length && Math.random() < RN_WISSEL_KANS ? anders : lijst;
  return uit[Math.floor(Math.random() * uit.length)];
}

// Het gaat per maat: maten springen of bukken, maten klappen. Per tel door
// elkaar is voor een klas niet te volgen. Een blok springen of bukken maakt hij
// altijd af. De aanloop begint met een maat klappen en dan springen, zodat je
// allebei gezien hebt voordat het gaat afwisselen.
function soortVanMaat(maat) {
  if (rnVorig.nogMaten > 0) return 'bewegen';
  if (maat === 0) return 'klappen';
  if (maat === 1) return 'bewegen';
  return kiesAnders(['bewegen', 'klappen'], rnVorig.soort);
}

// De maat als zestien stappen. De eerste tel blijft altijd staan: daar hangt de
// hele klas aan, en een gat op de een raak je met zijn dertigen niet meer terug.
function dingenVoor(maat) {
  const stappen = new Array(RN_STAPPEN).fill(null);
  const soort = soortVanMaat(maat);
  rnVorig.soort = soort;

  const drukte = rnKeuze('druk');
  const aanloop = maat < RN_AANLOOPMATEN;

  // Springen of bukken: op de een en de drie, zonder rust. Is het vorige blok
  // om, dan begint er een nieuw; in de aanloop is dat altijd vier keer springen.
  // Binnen het blok wisselt de beweging steeds vaker naarmate het liedje vordert,
  // en aan het eind komen er klappen tussendoor.
  if (soort === 'bewegen') {
    const voortgang = aanloop ? 0 : rnVoortgang(maat);
    let nieuwBlok = false;
    if (rnVorig.nogMaten <= 0) {
      nieuwBlok = true;
      rnVorig.nogMaten = aanloop ? 2 : drukte.reeks[Math.floor(Math.random() * drukte.reeks.length)];
      rnVorig.nogZelfde = 0;
      if (aanloop) {
        rnVorig.beweging = 'spring';
        rnVorig.nogZelfde = 4;
      }
    }
    rnVorig.nogMaten -= 1;

    [0, 2].forEach((tel) => {
      if (rnVorig.nogZelfde <= 0) {
        // Een nieuw blok mag met allebei beginnen; binnen een blok wisselt hij
        // echt, anders klinken twee keer twee als een keer vier.
        rnVorig.beweging = nieuwBlok
          ? kiesAnders(['spring', 'buk'], rnVorig.beweging)
          : (rnVorig.beweging === 'spring' ? 'buk' : 'spring');
        rnVorig.nogZelfde = zelfdeLengte(voortgang);
      }
      nieuwBlok = false;
      stappen[tel * 4] = rnVorig.beweging;
      rnVorig.nogZelfde -= 1;
    });

    if (!aanloop && voortgang >= RN_KLAP_TUSSENDOOR) {
      [1, 3].forEach((tel) => {
        if (Math.random() < RN_KLAP_TUSSENDOOR_KANS) stappen[tel * 4] = 'klap';
      });
    }
    return stappen;
  }

  // De aanloop: klappen op elke tel.
  if (aanloop) {
    [0, 1, 2, 3].forEach((tel) => { stappen[tel * 4] = 'klap'; });
    return stappen;
  }

  // Klappen: per tel een, twee of vier, of een rust. Nooit een rust op de een.
  [0, 1, 2, 3].forEach((tel) => {
    if (tel > 0 && Math.random() < drukte.rust) {
      rnVorig.aantal = 0;
      return;
    }
    const aantal = rnVorig.aantal > drukte.keuzes[0] && Math.random() < RN_BIJKOM_KANS
      ? drukte.keuzes[0]
      : kiesAnders(drukte.keuzes, rnVorig.aantal);
    rnVorig.aantal = aantal;
    for (let i = 0; i < aantal; i++) stappen[tel * 4 + i * (4 / aantal)] = 'klap';
  });
  return stappen;
}

// Hoeveel klappen er in dezelfde tel zitten als deze stap.
function klappenInTel(stappen, stap) {
  const begin = Math.floor(stap / 4) * 4;
  let aantal = 0;
  for (let i = 0; i < 4; i++) if (stappen[begin + i] === 'klap') aantal += 1;
  return aantal;
}

// ============================================================
//  Het spel
// ============================================================

let rn = null;
let rnLus = 0;

function startRenner() {
  if (!rnEl) return;
  cancelAnimationFrame(rnLus);

  if (Tone.getContext().state !== 'running') {
    startGeluid().then(startRenner).catch(() => {});
    return;
  }
  startHiphop();
  startKlapRuis();

  rnVorig.soort = 'klappen';
  rnVorig.nogMaten = 0;
  rnVorig.nogZelfde = 0;
  rnVorig.aantal = 0;

  const nu = Tone.now();
  rn = {
    loopt: true,
    stapNr: 0,                      // zestienden vanaf het allereerste begin
    stapTijd: nu + 0.6,
    bpm: rnStand.tempo,
    maat: 0,
    dingen: dingenVoor(0),
    beeld: [],                      // alles wat er nu in beeld is
    aanloop: [],
    tellen: [],
    telAan: -1,
    aftelGetal: 0,
    aftelKlaar: false,
    eerste: 0,
    einde: 0,
    renFase: 0,                     // hoe ver de benen zijn, in achtsten
    vorigNu: nu - geluidVertraging()
  };

  rnKnopEl.textContent = 'Stop';
  rnZetKnoppen(true);
  wisRnTellen();
  toonRnAftellen(0);
  werkRnBalkBij();

  vulRnAan(nu);
  rnLus = requestAnimationFrame(rnStap);
}

// uitklinken: aan het eind van de ronde mag het slotakkoord blijven hangen.
// Met de stopknop gaat alles meteen uit.
function stopRenner(uitklinken) {
  if (!rn) return;
  rn.loopt = false;
  cancelAnimationFrame(rnLus);
  rn.beeld.forEach((ding) => ding.el.remove());
  rn.beeld = [];
  if (rnDoelEl) rnDoelEl.classList.remove('aan', 'raak');

  if (!uitklinken) {
    stopHiphop();
    klapSpelers.forEach((speler) => speler.stop(Tone.now()));
    klapTikEnvs.forEach(stilNu);
    stilNu(klapStaartEnv);
  }

  zetRnPop(RN_BEELDJES.staan, 0);
  wisRnTellen();
  toonRnAftellen(0);
  rnKnopEl.textContent = 'Start';
  rnZetKnoppen(false);
  werkRnBalkBij();
}

const RN_AFTEL_STAPPEN = RN_AFTELLEN * 4;

function vulRnAan(nu) {
  while (rn.stapTijd < nu + RN_VOORUIT && !rn.einde) {
    const stap = rn.stapNr;
    const inAanloop = stap < RN_AFTEL_STAPPEN;
    const maat = Math.floor((stap - RN_AFTEL_STAPPEN) / RN_STAPPEN);
    const inMaat = ((stap - RN_AFTEL_STAPPEN) % RN_STAPPEN + RN_STAPPEN) % RN_STAPPEN;

    // Eén tempo, het hele liedje door. Moeilijker wordt het door wat er langs
    // komt, niet door sneller te gaan.
    const bpm = rnStand.tempo;
    const stapDuur = 15 / bpm;             // 60 / bpm / 4 zestienden
    const tel = Math.floor(stap / 4);

    // Klaar: nog een slotakkoord op de een na de laatste maat, en dan stoppen
    // als hij een beetje uitgeklonken is.
    if (!inAanloop && maat >= rnStand.maten) {
      speelHiphopSlot(rn.stapTijd, stapDuur);
      rn.einde = rn.stapTijd + 1.2;
      break;
    }

    if (!inAanloop && inMaat === 0) {
      rn.maat = maat;
      rn.dingen = dingenVoor(maat);
    }

    // De beat loopt vanaf de eerste tel, ook onder het aftellen: dan heb je de
    // groove al te pakken voordat er iets aankomt.
    speelHiphopStap(rn.stapTijd, inMaat, inAanloop ? -1 : maat, stapDuur);

    if (stap % 4 === 0) rn.tellen.push({ nr: tel, tijd: rn.stapTijd });

    if (inAanloop) {
      if (stap % 4 === 0) {
        hhTikNu(rn.stapTijd, stap === RN_AFTEL_STAPPEN - 4);
        rn.aanloop.push(rn.stapTijd);
      }
    } else {
      // Bij alles een geluidje, precies op de tel: een klap, of een toon die
      // omhoog schiet (springen) of omlaag zakt (bukken).
      const ding = rn.dingen[inMaat];
      if (ding) {
        if (ding === 'klap') klapNu(rn.stapTijd);
        else hhSeintje(rn.stapTijd, ding === 'spring');
        rn.beeld.push(maakRnDing(ding, rn.stapTijd, ding === 'klap' ? klappenInTel(rn.dingen, inMaat) : 0));
        if (!rn.eerste) rn.eerste = rn.stapTijd;
      }
    }

    rn.bpm = bpm;
    rn.stapTijd += stapDuur;
    rn.stapNr += 1;
  }
}

// ============================================================
//  Wat er in beeld komt
// ============================================================

// De maten van het vak zoals het nu op het scherm staat, en hoeveel pixels een
// honderdste van het vakje van de skater is.
function rnBaanMaat() {
  const b = rnBaanEl ? rnBaanEl.clientWidth : 900;
  const h = rnBaanEl ? rnBaanEl.clientHeight : 360;
  return { b: b, h: h, popX: b * RN_POP_X, grond: h * RN_GROND, eenheid: h * RN_POP_H / 100 };
}

// aantal: bij een klap hoeveel er in dezelfde tel zitten, voor de kleur en de
// maat.
function maakRnDing(soort, tijd, aantal) {
  const el = document.createElement('div');
  el.className = 'rn-ding rn-' + soort + (aantal ? ' aantal-' + aantal : '');
  const vorm = document.createElement('div');
  vorm.className = 'rn-vorm';
  if (soort === 'klap') vorm.innerHTML = KLAP_HANDEN;
  el.appendChild(vorm);

  // De maat nu, in pixels. Daarna gaat het alleen nog met transform, zodat een
  // traag digibord niet elk beeldje de opmaak opnieuw hoeft te doen.
  // Een kleinere klap blijft op dezelfde hoogte hangen: hij krimpt naar zijn
  // midden toe.
  const basis = RN_MATEN[soort];
  const f = RN_KLAP_MAAT[aantal] || 1;
  const m = { b: basis.b * f, h: basis.h * f, boven: basis.boven + basis.h * (1 - f) / 2 };
  const eenheid = rnBaanMaat().eenheid;
  el.style.width = (m.b * eenheid) + 'px';
  el.style.height = (m.h * eenheid) + 'px';
  rnDingenEl.appendChild(el);

  return { soort: soort, tijd: tijd, aantal: aantal, el: el, vorm: vorm, maat: m, eenheid: eenheid, gezwollen: false };
}

// Bij de skater zwelt het even op. Op de vorm erbinnen, want het ding zelf
// schuift elk beeld op met een transform en die twee zouden elkaar
// overschrijven.
function zwelRnOp(ding) {
  if (ding.gezwollen) return;
  ding.gezwollen = true;
  // Een klap zwelt niet op: hij komt op zijn gewone maat aan, en de gele kopie
  // groeit vanaf precies die maat (zie laatKlapHangen).
  if (ding.soort === 'klap') {
    flitsRnDoel(ding.aantal);
    return;
  }
  if (minderBeweging.matches) return;
  animeer(ding.vorm, [
    { transform: 'scale(1)', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { transform: 'scale(1.12)', offset: 0.3, easing: 'ease-out' },
    { transform: 'scale(1)' }
  ], { duration: 300 });
}

// Op de klap is het rondje even helemaal te zien, met de rand in de kleur van
// het klapje. Elke klap apart, dus bij twee of vier klappen in een tel flitst
// hij twee of vier keer. Daarom duurt een flits een halve klap lang, anders
// lopen ze bij een hoog tempo in elkaar over.
let rnFlitsKlok = 0;

function flitsRnDoel(aantal) {
  if (!rnDoelEl) return;
  clearTimeout(rnFlitsKlok);
  rnDoelEl.classList.remove('aantal-1', 'aantal-2', 'aantal-4');
  rnDoelEl.classList.add('raak', 'aantal-' + aantal);
  const duur = 60 / rnStand.tempo / aantal / 2 * 1000;
  rnFlitsKlok = setTimeout(() => rnDoelEl.classList.remove('raak'), duur);
}

// Van rechts naar links. Op zijn moment staat het midden bij de skater;
// RN_VOORUIT seconden daarvoor komt hij net rechts het beeld in.
function zetRnDingen(nu, m) {
  const afstand = m.b - m.popX + 40 * m.eenheid;
  const over = [];

  rn.beeld.forEach((ding) => {
    const x = m.popX + (ding.tijd - nu) / RN_VOORUIT * afstand;
    const maat = ding.maat;
    const breed = maat.b * m.eenheid;

    if (x < -breed) {
      ding.el.remove();
      return;
    }
    const y = m.grond - (maat.boven + maat.h) * m.eenheid;
    const schaal = m.eenheid / ding.eenheid;
    ding.el.style.transform = 'translate(' + (x - breed / 2) + 'px,' + y + 'px) scale(' + schaal + ')';

    const raak = Math.abs(ding.tijd - nu) < 0.09;
    ding.el.classList.toggle('raak', raak);
    if (raak) zwelRnOp(ding);
    if (nu - ding.tijd > (ding.soort === 'spring' ? RN_WEG_NA : 0)) ruimRnOp(ding, y);
    over.push(ding);
  });

  rn.beeld = over;

  // Het rondje boven haar hoofd is er alleen als er een klap vlak bij haar is:
  // minder dan één skater van haar af. In afstand en niet in tijd, zodat het er
  // bij een langzaam en een snel tempo op dezelfde plek bij komt.
  const vlakbij = RN_DOEL_AFSTAND * 100 * RN_VAK * m.eenheid;
  const klapKomt = over.some((ding) => ding.soort === 'klap' &&
    (ding.tijd - nu) / RN_VOORUIT * afstand < vlakbij && nu - ding.tijd < RN_WEG_NA);
  if (rnDoelEl) rnDoelEl.classList.toggle('aan', klapKomt);
}

// Wat ze gehaald heeft, gaat met een effectje weg, net als de noten in het
// ritmespel. Het blok tuimelt weg, de balk zwaait na aan zijn touw, en de
// klaphanden zwellen op en vervagen, met een paar sterretjes. Het blok net
// nadat het bij haar was, zodat de puls op de tel eerst te zien is. De balk en
// de handen gaan al op de tel: de balk zwaait alsof ze hem net raakt, en de
// handen zijn meteen weg, zodat het klapje en de klap samenvallen. Het rondje
// flitst dan al.
const RN_WEG_NA = 0.12;    // seconden na de tel
const RN_DOEL_AFSTAND = 1;  // hoeveel skaters voor haar het rondje verschijnt

function ruimRnOp(ding, y) {
  if (ding.weg) return;
  ding.weg = true;
  if (minderBeweging.matches) return;

  if (ding.soort === 'spring') {
    animeer(ding.vorm, [
      { transform: 'translate(0, 0) rotate(0deg)', opacity: 1, easing: 'ease-out' },
      { transform: 'translate(-40%, -90%) rotate(-40deg)', opacity: 1, offset: 0.45, easing: 'ease-in' },
      { transform: 'translate(-80%, 30%) rotate(-90deg)', opacity: 0 }
    ], { duration: 520, fill: 'forwards' });
    return;
  }

  if (ding.soort === 'buk') {
    // Draaien om het bovenste stuk van het touw, net boven de rand van het vak.
    ding.vorm.style.transformOrigin = '50% ' + (-y) + 'px';
    animeer(ding.vorm, [
      { transform: 'rotate(0deg)', easing: 'ease-out' },
      { transform: 'rotate(7deg)', offset: 0.25, easing: 'ease-in-out' },
      { transform: 'rotate(-4deg)', offset: 0.55, easing: 'ease-in-out' },
      { transform: 'rotate(2deg)', offset: 0.8, easing: 'ease-in-out' },
      { transform: 'rotate(0deg)' }
    ], { duration: 1100 });
    return;
  }

  // Het klapje zelf is op de tel weg; een gele kopie blijft in het rondje
  // hangen, zwelt nog wat op en vervaagt daar, met de sterretjes.
  sterretjesRn(laatKlapHangen(ding.el, rnDingenEl));
  ding.vorm.style.visibility = 'hidden';
}

// De kopie staat waar het klapje op de tel stond, want de transform gaat mee.
const RN_HANGEN = 220;     // milliseconden dat de gele klap blijft hangen

function laatKlapHangen(el, bak) {
  const kopie = el.cloneNode(true);
  kopie.classList.add('raak');
  bak.appendChild(kopie);
  animeer(kopie.querySelector('.rn-vorm'), [
    { transform: 'scale(1)', opacity: 1, easing: 'ease-out' },
    { transform: 'scale(1.7)', opacity: 0 }
  ], { duration: RN_HANGEN, fill: 'forwards' });
  setTimeout(() => kopie.remove(), RN_HANGEN + 50);
  return kopie;
}

// Een paar gele streepjes die uit de klap wegspringen, zoals de sterretjes om
// haar handen op het plaatje. Ze ruimen zichzelf op.
const RN_STERREN = [-70, -35, 0, 35, 70];

function sterretjesRn(el) {
  RN_STERREN.forEach((hoek) => {
    const ster = document.createElement('span');
    ster.className = 'klap-ster';
    el.appendChild(ster);
    const beweging = animeer(ster, [
      { transform: 'rotate(' + hoek + 'deg) translateY(0) scaleY(0.4)', opacity: 1, easing: 'ease-out' },
      { transform: 'rotate(' + hoek + 'deg) translateY(-160%) scaleY(1)', opacity: 0 }
    ], { duration: 380, fill: 'forwards' });
    if (beweging) beweging.onfinish = () => ster.remove();
    else ster.remove();
  });
}

// ============================================================
//  De skater
// ============================================================

let rnBeeldje = -1;

// beeldje: welke van de acht. hoog: hoe ver ze boven de grond is, in
// honderdsten van haar vakje.
function zetRnPop(beeldje, hoog) {
  if (!rnPopEl) return;
  if (beeldje !== rnBeeldje) {
    rnBeeldje = beeldje;
    rnPopBeeldEl.style.backgroundPosition = (beeldje * 100 / (RN_AANTAL_BEELDJES - 1)) + '% 0';
  }
  const m = rnBaanMaat();
  const h = 100 * m.eenheid;
  const b = h * RN_VAK;
  rnPopEl.style.width = b + 'px';
  rnPopEl.style.height = h + 'px';
  rnPopEl.style.transform = 'translate(' + (m.popX - b / 2) + 'px,' + (m.grond - h - hoog * m.eenheid) + 'px)';
}

// Welk beeldje uit een reeks, bij hoe ver ze in de beweging is (van -1 tot 1,
// met 0 precies op de tel). grenzen: waar het volgende beeldje begint.
function beeldjeBij(reeks, deel, grenzen) {
  let i = 0;
  while (i < grenzen.length && deel >= grenzen[i]) i++;
  return reeks[i];
}

// Wat de skater nu doet. Ze kijkt naar het ding dat het dichtst bij zijn
// moment is. Een sprong begint net voor de tel en is op de tel het hoogst, zodat
// ze precies boven het blok hangt als het onder haar door gaat. Bukken duurt
// net zo lang; een klap is kort.
const RN_SPRONG = 58;      // hoe hoog ze springt, in honderdsten van haar vakje
const RN_KLAP_HOUDING = 0.13; // seconden voor en na een klap dat ze klapt, op zijn langst

function werkRnPopBij(nu) {
  const tel = 60 / rn.bpm;
  const venster = Math.min(0.32, tel * 0.45);

  let bezig = null;
  let dichtst = Infinity;
  rn.beeld.forEach((ding) => {
    const dt = nu - ding.tijd;
    // Een klap is kort: hooguit een kwart van de tijd tot de volgende klap aan
    // weerskanten, dus de helft van de tijd klappen en de helft los. Anders
    // lopen twee of vier snelle klappen in elkaar over en blijft ze met haar
    // handen tegen elkaar hangen.
    const breed = ding.soort === 'klap'
      ? Math.min(RN_KLAP_HOUDING, tel / (ding.aantal || 1) * 0.25)
      : venster;
    if (Math.abs(dt) < breed && Math.abs(dt) < dichtst) {
      dichtst = Math.abs(dt);
      bezig = { ding: ding, dt: dt, breed: breed };
    }
  });

  const deel = bezig ? bezig.dt / bezig.breed : 0;
  if (bezig && bezig.ding.soort === 'spring') {
    // Met board en al de lucht in over het blok heen: op weg omhoog de neus van
    // het board op, na het hoogste punt de neus neer om te landen.
    const sp = RN_BEELDJES.spring;
    zetRnPop(beeldjeBij(sp, deel, [0]), RN_SPRONG * (1 - deel * deel));
    return;
  }
  if (bezig && bezig.ding.soort === 'buk') {
    zetRnPop(RN_BEELDJES.buk, 0);
    return;
  }
  if (bezig) {
    zetRnPop(RN_BEELDJES.klap, 0);
    return;
  }

  // Anders rijdt ze, en wisselt ze op de achtsten van houding. Zo gaat ze mee
  // op de beat, ook tijdens het aftellen.
  rn.renFase += Math.max(0, nu - rn.vorigNu) * rn.bpm / 30;
  zetRnPop(RN_BEELDJES.rijden[Math.floor(rn.renFase) % 2], 0);
}

function rnStap() {
  if (!rn || !rn.loopt) return;
  const nu = Tone.now();
  const m = rnBaanMaat();
  vulRnAan(nu);

  // Het beeld loopt net zoveel achter als het geluid, zodat je ziet wat je
  // hoort (zie instellingen.js). Plannen gaat gewoon op de audioklok.
  const beeld = nu - geluidVertraging();
  werkRnAftellenBij(beeld);
  werkRnTelBij(beeld);
  zetRnDingen(beeld, m);
  werkRnPopBij(beeld);
  rn.vorigNu = beeld;
  werkRnBalkBij();

  if (rn.einde && beeld > rn.einde) {
    stopRenner(true);
    meld('Klaar!', 'Goed gedaan, allemaal');
    return;
  }
  if (rn.loopt) rnLus = requestAnimationFrame(rnStap);
}

// ============================================================
//  De tel in beeld
// ============================================================

const RN_STIP_PULS = 1.14;
const RN_STIP_PULS_EEN = 1.32;
const RN_TEL_DUUR = 220;

const rnStippen = [];

function bouwRnTellen() {
  if (!rnTellenEl) return;
  for (let i = 0; i < 4; i++) {
    const stip = document.createElement('span');
    stip.className = 'klap-tel' + (i === 0 ? ' eerste' : '');
    rnTellenEl.appendChild(stip);
    rnStippen.push(stip);
  }
}

function pulseerRn(el, groei) {
  if (!el || minderBeweging.matches) return;
  animeer(el, [
    { transform: 'scale(1)', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { transform: 'scale(' + groei + ')', offset: 0.35, easing: 'ease-out' },
    { transform: 'scale(1)' }
  ], { duration: RN_TEL_DUUR });
}

// Op elke tel ademt het hele vak een beetje mee, op de een iets meer, net als
// de baan bij klap mee. En zolang ze gewoon rijdt, zakt ze op elke tel even door
// haar knieën en veert terug. Bij springen, bukken of klappen niet: dan doet ze
// al iets op de tel.
const RN_BAAN_PULS = 1.01;
const RN_BAAN_PULS_EEN = 1.02;

function toonRnTel(inMaat) {
  const eerste = inMaat === 0;
  rnStippen.forEach((stip, i) => stip.classList.toggle('aan', i === inMaat));
  pulseerRn(rnStippen[inMaat], eerste ? RN_STIP_PULS_EEN : RN_STIP_PULS);
  pulseerRn(rnBaanEl, eerste ? RN_BAAN_PULS_EEN : RN_BAAN_PULS);
  if (RN_BEELDJES.rijden.indexOf(rnBeeldje) >= 0) veerRn(eerste);
}

function veerRn(sterk) {
  if (!rnPopBeeldEl || minderBeweging.matches) return;
  const zak = sterk ? 0.9 : 0.94;
  animeer(rnPopBeeldEl, [
    { transform: 'scale(1, 1)', easing: 'ease-out' },
    { transform: 'scale(' + (2 - zak) + ', ' + zak + ')', offset: 0.3, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { transform: 'scale(1, 1)' }
  ], { duration: 260 });
}

function wisRnTellen() {
  rnStippen.forEach((stip) => stip.classList.remove('aan'));
}

// Welke tel er nu klinkt, volgens de audioklok en niet volgens het aantal
// beeldjes: op een traag digibord vallen er beeldjes weg.
function werkRnTelBij(nu) {
  let nieuw = null;
  for (let i = 0; i < rn.tellen.length; i++) {
    const t = rn.tellen[i];
    if (nu >= t.tijd && (!nieuw || t.nr > nieuw.nr)) nieuw = t;
  }
  if (!nieuw || nieuw.nr === rn.telAan) return;

  rn.telAan = nieuw.nr;
  toonRnTel(nieuw.nr % 4);
  rn.tellen = rn.tellen.filter((t) => t.tijd > nu - 0.5);
}

function werkRnAftellenBij(nu) {
  if (!rnAftelEl || rn.aftelKlaar) return;

  if (rn.eerste && nu >= rn.eerste) {
    rn.aftelKlaar = true;
    toonRnAftellen(0);
    return;
  }
  let getal = 0;
  for (let i = 0; i < rn.aanloop.length; i++) if (nu >= rn.aanloop[i]) getal = i + 1;
  if (getal !== rn.aftelGetal) {
    rn.aftelGetal = getal;
    toonRnAftellen(getal);
  }
}

function toonRnAftellen(getal) {
  if (!rnAftelEl) return;
  rnAftelEl.textContent = getal ? String(getal) : '';
  if (!getal || minderBeweging.matches) return;
  animeer(rnAftelEl,
    [{ transform: 'scale(0.6)' }, { transform: 'scale(1)' }],
    { duration: 240, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
  );
}

function werkRnBalkBij() {
  if (!rnEl) return;
  rnBpmEl.textContent = Math.round(rnStand.tempo);
  rnMaatEl.textContent = rn && rn.loopt ? Math.min(rnStand.maten, rn.maat + 1) : 0;
  rnTotaalEl.textContent = rnStand.maten;
}

// ============================================================
//  De knoppen van de juf
// ============================================================

// Dezelfde knoppen als bij klap mee: de juf zet het een keer goed, en daarna
// gaat het om het spel.
function bouwRnKnoppen() {
  if (!rnSchuifEl) return;

  rnSchuifEl.innerHTML = RN_INSTELLINGEN.map((p) => `
    <div class="klap-schuif">
      <label for="rn-${p.id}"><span class="klap-schuif-naam">${p.label}</span><b data-toon="${p.id}"></b></label>
      <input type="range" id="rn-${p.id}" data-rn="${p.id}"
             min="${p.min}" max="${p.max}" step="${p.step}">
    </div>
  `).join('');

  rnKeuzeEls.forEach((vak) => {
    const groep = vak.dataset.rnKeuze;
    vak.innerHTML = RN_KEUZES[groep].map((k) => `
      <button class="klap-keus" type="button" data-groep="${groep}" data-keus="${k.id}">
        <span class="klap-keus-naam">${k.naam}</span>
      </button>
    `).join('');
  });

  RN_INSTELLINGEN.forEach((p) => {
    document.getElementById('rn-' + p.id).value = rnStand[p.id];
  });
  werkRnKnoppenBij();
}

function werkRnKnoppenBij() {
  RN_INSTELLINGEN.forEach((p) => {
    const toon = rnSchuifEl.querySelector('[data-toon="' + p.id + '"]');
    // De eenheid apart, zodat een telefoon hem kan weglaten (zie site.css).
    if (toon) toon.innerHTML = rnStand[p.id] + (p.achter ? '<span class="eenheid"> ' + p.achter + '</span>' : '');
  });
  rnEl.querySelectorAll('.klap-keus').forEach((knop) => {
    knop.setAttribute('aria-pressed', String(rnStand[knop.dataset.groep] === knop.dataset.keus));
  });
  rnZetKnoppen(!!(rn && rn.loopt));
  werkRnBalkBij();
}

// Tijdens het spelen staan de instellingen vast: halverwege het tempo omgooien
// haalt de klas uit de maat.
function rnZetKnoppen(bezig) {
  if (rnSchuifEl) rnSchuifEl.querySelectorAll('input').forEach((el) => { el.disabled = bezig; });
  rnKeuzeEls.forEach((vak) => {
    vak.querySelectorAll('button').forEach((el) => { el.disabled = bezig; });
  });
}

// ============================================================
//  Aanzetten
// ============================================================

if (rnEl) {
  laadRnStand();
  bouwRnKnoppen();
  bouwRnTellen();
  zetRnPop(RN_BEELDJES.staan, 0);
  werkRnBalkBij();

  // Wordt het venster groter of kleiner, dan moet de skater mee.
  window.addEventListener('resize', () => {
    if (!rn || !rn.loopt) zetRnPop(RN_BEELDJES.staan, 0);
  });

  rnKnopEl.addEventListener('click', () => {
    if (rn && rn.loopt) stopRenner(false);
    else startRenner();
  });

  rnSchuifEl.addEventListener('input', (e) => {
    if (e.target.type !== 'range') return;
    rnStand[e.target.dataset.rn] = parseFloat(e.target.value);
    werkRnKnoppenBij();
  });

  rnSchuifEl.addEventListener('change', (e) => {
    if (e.target.type === 'range') bewaarRnStand();
  });

  rnEl.addEventListener('click', (e) => {
    const knop = e.target.closest('.klap-keus');
    if (!knop || knop.disabled) return;
    rnStand[knop.dataset.groep] = knop.dataset.keus;
    werkRnKnoppenBij();
    bewaarRnStand();
  });
}
