/* Extra: de Carnaval der Dieren

   Een luisterspel. Je hoort een stukje uit de Carnaval der Dieren van
   Camille Saint-Saëns en tikt op het dier dat erbij hoort. Fout: dat dier
   schudt, wordt grijs en krijgt een kruisje, en je mag nog een keer. Goed:
   het dier danst mee en je ziet welk instrument er speelt. Bij het volgende
   stukje verdwijnt het, zodat er steeds minder dieren over zijn.

   De tekening bestaat uit losse stukjes (img/carnaval/), zodat elk dier zijn
   eigen dansje kan doen. De muziek staat in snd/carnaval/: fragmenten van
   dertig seconden uit een vrije opname (zie de bron onderaan de les).

   Laden na Tone.js en drumkit.js: master, bijNeer en animeer komen daar
   vandaan. Het afspelen gaat via Tone, zodat het volume onder het tandwiel
   meedoet en de muziek stilstaat als je de bladzijde wegklikt. */

// ============================================================
//  De dieren
// ============================================================

// Wat er op de kaart komt als je het goed hebt ("Ja! Het is de olifant.") en
// wat er speelt.
const CARNAVAL_DIEREN = [
  { id: 'kangoeroe', naam: 'Kangoeroes',   zin: 'Het zijn de kangoeroes', instrument: "Twee piano's",
    uitleg: 'De piano springt omhoog en omlaag. Hup, hup, hup, net als een kangoeroe door het gras.' },
  { id: 'schildpad', naam: 'Schildpadden', zin: 'Het zijn de schildpadden', instrument: 'Strijkers',
    uitleg: 'Een heel snel dansje, de cancan. Maar dan super langzaam gespeeld. Zo langzaam als een schildpad.' },
  { id: 'olifant',   naam: 'Olifant',      zin: 'Het is de olifant', instrument: 'Contrabas',
    uitleg: 'De laagste strijker speelt een wals. Zwaar en sloom, net als een olifant die gaat dansen.' },
  { id: 'koekoek',   naam: 'Koekoek',      zin: 'Het is de koekoek', instrument: 'Klarinet',
    uitleg: 'De klarinet roept steeds twee tonen. Koe koek! Hoe vaak hoor je hem roepen?' },
  { id: 'aquarium',  naam: 'Aquarium',     zin: 'Het is het aquarium', instrument: "Piano's en strijkers",
    uitleg: 'Hoge tonen die glinsteren als water. De vissen zwemmen rustig rond.' },
  { id: 'leeuw',     naam: 'Leeuw',        zin: 'Het is de leeuw', instrument: "Piano's en strijkers",
    uitleg: 'Een stoere mars voor de koning van de dieren. Hoor je hem brullen? Dat zijn de snelle lage tonen.' },
  { id: 'zwaan',     naam: 'Zwaan',        zin: 'Het is de zwaan', instrument: 'Cello',
    uitleg: 'De cello speelt een lange zachte melodie. Daaronder kabbelt de piano als water.' }
];

// De stukjes van de tekening, in de volgorde waarin ze over elkaar liggen.
// Per stukje: het plaatje, waar het staat (links en boven in procenten van de
// breedte en de hoogte van de tekening) en hoe breed het is (in procenten van
// de breedte). Het hoofd is waar je op tikt; de rest beweegt alleen mee.
//
// De tekening is breed (half zo hoog als breed), net als de baan van de ritme
// skater: dan past hij over de hele breedte op het scherm, met de kaart
// eronder. De dieren uit de oorspronkelijke tekening (3 op 2) zijn
// daarvoor even veel kleiner gemaakt en staan op dezelfde plek in de breedte.
const CARNAVAL_STUKKEN = [
  ['kangoeroe', 'hoofd', 'kangoeroe', 4.647, 2.930, 15.772],
  ['schildpad', 'hoofd', 'schildpad', 28.149, 22.266, 17.725],
  ['olifant',   'hoofd', 'olifant',   51.034, 9.668, 22.216],
  ['koekoek',   'noot',  'noot1',     88.420, 9.766, 2.490],
  ['koekoek',   'noot',  'noot2',     91.203, 12.988, 2.588],
  ['koekoek',   'noot',  'noot3',     92.765, 19.434, 1.660],
  ['koekoek',   'hoofd', 'koekoek',   80.510, 16.992, 15.088],
  ['aquarium',  'vis',   'vis2',      18.172, 64.453, 9.277],
  ['aquarium',  'vis',   'vis3',      9.579, 71.875, 9.961],
  ['aquarium',  'wier',  'wier1',     5.428, 63.867, 9.521],
  ['aquarium',  'wier',  'wier2',     15.633, 79.980, 10.889],
  ['aquarium',  'bel',   'bel1',      20.174, 52.344, 1.758],
  ['aquarium',  'bel',   'bel2',      22.127, 56.836, 1.513],
  ['aquarium',  'bel',   'bel3',      21.151, 60.840, 1.074],
  ['aquarium',  'bel',   'bel4',      9.871, 67.383, 1.025],
  ['aquarium',  'bel',   'bel5',      10.018, 70.605, 1.465],
  ['aquarium',  'hoofd', 'vis1',      8.748, 53.125, 11.084],
  ['leeuw',     'hoofd', 'leeuw',     36.898, 51.562, 22.949],
  ['zwaan',     'riet',  'riet',      67.814, 68.164, 5.420],
  ['zwaan',     'hoofd', 'zwaan',     69.474, 51.758, 24.365]
];

function carnavalDier(id) {
  return CARNAVAL_DIEREN.find((d) => d.id === id);
}

// ============================================================
//  De stand van het spel
// ============================================================

const carnaval = {
  over: [],          // de dieren die nog niet geraden zijn
  nu: null,          // het dier dat nu speelt, of null tussen twee stukjes
  geraden: false,    // is het dier van nu al gevonden?
  vorige: null,      // het dier van de vorige ronde, zodat het niet meteen terugkomt
  klinkt: null       // wat er nu hoort te klinken: een dier, finale, of niets
};

// ============================================================
//  Het scherm
// ============================================================

const carnavalEl = document.querySelector('[data-carnaval-veld]');
const carnavalSceneEl = carnavalEl && carnavalEl.querySelector('[data-carnaval-scene]');
const carnavalKaartEl = document.querySelector('[data-carnaval-kaart]');
const carnavalPlekEl = document.querySelector('[data-carnaval-plek]');
const carnavalDierEls = {};

function carnavalTekst(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function bouwCarnaval() {
  CARNAVAL_DIEREN.forEach((d) => {
    const el = document.createElement('div');
    el.className = 'dier';
    el.dataset.dier = d.id;
    carnavalSceneEl.appendChild(el);
    carnavalDierEls[d.id] = el;
  });

  CARNAVAL_STUKKEN.forEach((s) => {
    const dier = carnavalDier(s[0]);
    const stuk = document.createElement('div');
    stuk.className = 'stuk ' + s[1] + ' s-' + s[2];
    stuk.style.left = s[3] + '%';
    stuk.style.top = s[4] + '%';
    stuk.style.width = s[5] + '%';
    if (s[1] === 'hoofd') {
      stuk.setAttribute('role', 'button');
      stuk.tabIndex = 0;
      stuk.setAttribute('aria-label', dier.naam);
      // Het kruisje bij fout en het vinkje bij goed.
      stuk.innerHTML = '<img src="img/carnaval/' + s[2] + '.webp" alt="" draggable="false">' +
        '<span class="dier-teken" aria-hidden="true"></span>';
    } else {
      stuk.setAttribute('aria-hidden', 'true');
      stuk.innerHTML = '<img src="img/carnaval/' + s[2] + '.webp" alt="" draggable="false">';
    }
    carnavalDierEls[s[0]].appendChild(stuk);
  });
}

// De kaart onder de tekening: wat er nu gebeurt, en de knoppen. Los van het
// tonen, zodat maatCarnaval() alle kaarten vooraf kan meten. dier: het dier
// van nu, nog: hoeveel er nog niet geraden zijn.
function carnavalKaartInhoud(soort, dier, nog, geraden) {
  let kop = '';
  let tekst = '';
  let instrument = '';
  let knoppen = '';

  if (soort === 'begin') {
    kop = 'Welk dier hoor je?';
    tekst = 'Druk op Start en luister goed. Tik dan op het dier dat bij de muziek hoort.';
    knoppen = '<button class="knop" type="button" data-carnaval-knop="start">Start</button>';
  } else if (soort === 'luister' || soort === 'fout') {
    kop = soort === 'fout' ? 'Nee, dat is het niet' : 'Luister goed…';
    tekst = soort === 'fout'
      ? 'Luister nog eens goed. Is het hoog of laag? Snel of langzaam?'
      : 'Welk dier hoor je? Tik erop.';
    knoppen = '<button class="knop" type="button" data-carnaval-knop="opnieuw">Nog een keer horen</button>';
  } else if (soort === 'goed') {
    const d = carnavalDier(dier);
    kop = 'Ja! ' + d.zin + '.';
    tekst = d.uitleg;
    instrument = '<span class="carnaval-instrument">' + carnavalTekst(d.instrument) + '</span>';
    knoppen = '<button class="knop" type="button" data-carnaval-knop="volgende">' +
      (nog > 0 ? 'Volgend stukje' : 'Klaar!') + '</button>';
  } else if (soort === 'klaar') {
    kop = 'Alle dieren gevonden!';
    tekst = 'Goed geluisterd! Alle dieren komen terug voor het slot: de finale.';
    knoppen = '<button class="knop" type="button" data-carnaval-knop="start">Nog een keer spelen</button>';
  }

  const teller = (soort === 'begin' || soort === 'klaar') ? ''
    : '<span class="carnaval-teller">Dier ' + (CARNAVAL_DIEREN.length - nog + (geraden ? 0 : 1)) +
      ' van de ' + CARNAVAL_DIEREN.length + '</span>';

  return {
    klasse: 'carnaval-kaart' + (soort === 'goed' || soort === 'klaar' ? ' goed' : '') + (soort === 'fout' ? ' fout' : ''),
    html: '<div class="carnaval-tekst">' + teller + '<h2>' + carnavalTekst(kop) + '</h2>' + instrument +
      '<p>' + carnavalTekst(tekst) + '</p></div><div class="carnaval-knoppen">' + knoppen + '</div>'
  };
}

function toonCarnavalKaart(soort) {
  const inhoud = carnavalKaartInhoud(soort, carnaval.nu, carnaval.over.length, carnaval.geraden);
  carnavalKaartEl.className = inhoud.klasse;
  carnavalKaartEl.innerHTML = inhoud.html;
}

// De kaart is altijd even hoog, wat er ook op staat, zodat de tekening niet
// verspringt. Hoe hoog hangt af van hoe breed hij is (de tekst loopt over meer
// regels), dus meten we alle kaarten die kunnen komen, in een onzichtbare kopie
// van precies dezelfde breedte, en nemen de hoogste.
//
function hoogsteCarnavalKaart() {
  const proef = document.createElement('div');
  proef.setAttribute('aria-hidden', 'true');
  carnavalPlekEl.appendChild(proef);
  const soorten = [['begin'], ['luister'], ['fout'], ['klaar']];
  CARNAVAL_DIEREN.forEach((d) => soorten.push(['goed', d.id]));
  let hoogste = 0;
  soorten.forEach((s) => {
    // De langste teller en de langste knop: dier 7 van de 7, Volgend stukje.
    const inhoud = carnavalKaartInhoud(s[0], s[1], 1, s[0] !== 'luister' && s[0] !== 'fout');
    proef.className = inhoud.klasse + ' proef';
    proef.innerHTML = inhoud.html;
    hoogste = Math.max(hoogste, proef.offsetHeight);
  });
  proef.remove();
  return Math.ceil(hoogste);
}

function maatCarnaval() {
  carnavalPlekEl.style.setProperty('--kaart-h', hoogsteCarnavalKaart() + 'px');
}

// ============================================================
//  De muziek
// ============================================================

// Eén speler voor alle stukjes. Laden kost even (een stukje is een paar
// honderd kilobyte), dus de knop zegt intussen dat hij laadt.
const carnavalSpeler = new Tone.Player({ fadeIn: 0.05, fadeOut: 0.4 }).connect(master);
let carnavalGeladen = '';

// id: een dier, of finale. Laadt hij nog terwijl er al iets anders moet
// klinken, dan begint hij niet alsnog.
function speelCarnaval(id) {
  const url = 'snd/carnaval/' + id + '.mp3';
  carnaval.klinkt = id;
  const start = () => {
    if (carnaval.klinkt !== id) return;
    carnavalSpeler.stop();
    carnavalSpeler.start();
    carnavalEl.classList.remove('laadt');
  };
  Tone.start();
  if (carnavalGeladen === url) {
    start();
    return;
  }
  carnavalEl.classList.add('laadt');
  carnavalSpeler.load(url).then(() => {
    carnavalGeladen = url;
    start();
  }).catch(() => {
    carnavalEl.classList.remove('laadt');
    meldCarnaval('Dit stukje kon niet geladen worden. Staat de internetverbinding aan?');
  });
}

function stopCarnaval() {
  carnaval.klinkt = null;
  if (carnavalSpeler.state === 'started') carnavalSpeler.stop();
}

function meldCarnaval(tekst) {
  const p = carnavalKaartEl.querySelector('p');
  if (p) p.textContent = tekst;
}

// ============================================================
//  Het spel
// ============================================================

function begin() {
  stopCarnaval();
  carnaval.nu = null;
  carnaval.over = CARNAVAL_DIEREN.map((d) => d.id);
  carnaval.vorige = null;
  CARNAVAL_DIEREN.forEach((d) => carnavalDierEls[d.id].classList.remove('weg', 'fout', 'goed', 'speelt'));
  volgende();
}

// Een nieuw stukje uit de dieren die over zijn, nooit twee keer hetzelfde
// achter elkaar.
function volgende() {
  stopCarnaval();
  // Het dier van net verdwijnt, en de kruisjes van deze ronde gaan weg.
  if (carnaval.nu && carnaval.geraden) carnavalDierEls[carnaval.nu].classList.add('weg');
  CARNAVAL_DIEREN.forEach((d) => carnavalDierEls[d.id].classList.remove('fout', 'goed', 'speelt'));

  if (!carnaval.over.length) {
    beloning();
    return;
  }
  let keus = carnaval.over.filter((id) => id !== carnaval.vorige);
  if (!keus.length) keus = carnaval.over;
  carnaval.nu = keus[Math.floor(Math.random() * keus.length)];
  carnaval.vorige = carnaval.nu;
  carnaval.geraden = false;
  toonCarnavalKaart('luister');
  speelCarnaval(carnaval.nu);
}

// Alles gevonden: alle dieren komen terug en dansen samen op de finale, het
// laatste stuk van de Carnaval der Dieren, met confetti (melding.js).
function beloning() {
  carnaval.nu = null;
  toonCarnavalKaart('klaar');
  CARNAVAL_DIEREN.forEach((d, i) => {
    const el = carnavalDierEls[d.id];
    setTimeout(() => {
      el.classList.remove('weg');
      el.classList.add('speelt');
    }, 150 * i);
  });
  if (typeof confetti === 'function') confetti(70, carnavalEl);
  speelCarnaval('finale');
}

function tikDier(id) {
  const el = carnavalDierEls[id];
  if (!el || el.classList.contains('weg')) return;
  const hoofd = el.querySelector('.hoofd');

  // Geen ronde bezig, of al geraden: alleen een tikje, er gebeurt verder niets.
  if (!carnaval.nu || carnaval.geraden) {
    veer(hoofd);
    return;
  }

  if (id === carnaval.nu) {
    carnaval.geraden = true;
    carnaval.over = carnaval.over.filter((d) => d !== id);
    CARNAVAL_DIEREN.forEach((d) => carnavalDierEls[d.id].classList.remove('fout'));
    el.classList.add('goed', 'speelt');
    veer(hoofd);
    toonCarnavalKaart('goed');
  } else {
    el.classList.add('fout');
    schud(hoofd);
    toonCarnavalKaart('fout');
  }
}

function veer(el) {
  animeer(el, [
    { transform: 'scale(0.9)', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { transform: 'scale(1.06)', offset: 0.6 },
    { transform: 'scale(1)' }
  ], { duration: 450 });
}

function schud(el) {
  animeer(el, [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-6%)', offset: 0.2 },
    { transform: 'translateX(6%)', offset: 0.4 },
    { transform: 'translateX(-4%)', offset: 0.6 },
    { transform: 'translateX(4%)', offset: 0.8 },
    { transform: 'translateX(0)' }
  ], { duration: 420 });
}

// ============================================================
//  Aanzetten
// ============================================================

// Bij Start schuift de tekening met de kaart in beeld, als die er nog niet
// helemaal in stond: dan zie je alle dieren en de knoppen tegelijk.
function zetCarnavalInBeeld() {
  const plek = carnavalPlekEl.getBoundingClientRect();
  if (plek.top >= 0 && plek.bottom <= window.innerHeight) return;
  carnavalPlekEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

if (carnavalEl && carnavalSceneEl && carnavalKaartEl && carnavalPlekEl) {
  bouwCarnaval();
  toonCarnavalKaart('begin');
  maatCarnaval();
  // Opnieuw als de letters er zijn (die maken de tekst langer of korter) en
  // als het scherm verandert.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(maatCarnaval);
  let maatWacht = 0;
  window.addEventListener('resize', () => {
    clearTimeout(maatWacht);
    maatWacht = setTimeout(maatCarnaval, 150);
  });

  // Een dier aantikken, ook op een digibord (zie bijNeer in drumkit.js).
  const zoekDier = (el) => {
    const stuk = el && el.closest ? el.closest('[data-dier]') : null;
    return stuk && carnavalSceneEl.contains(stuk) ? stuk : null;
  };
  bijNeer(carnavalSceneEl, zoekDier, (dier, e) => {
    if (e.cancelable && e.type !== 'touchstart') e.preventDefault();
    tikDier(dier.dataset.dier);
  });

  // Met het toetsenbord: Enter of spatie op een dier.
  carnavalSceneEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const dier = zoekDier(e.target);
    if (!dier) return;
    e.preventDefault();
    tikDier(dier.dataset.dier);
  });

  carnavalKaartEl.addEventListener('click', (e) => {
    const knop = e.target.closest('[data-carnaval-knop]');
    if (!knop) return;
    const wat = knop.dataset.carnavalKnop;
    if (wat === 'start') {
      begin();
      zetCarnavalInBeeld();
    }
    else if (wat === 'volgende') volgende();
    else if (wat === 'opnieuw' && carnaval.nu) speelCarnaval(carnaval.nu);
  });
}
