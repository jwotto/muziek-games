/* Ritmevierkanten — lees het ritme van het bord

   Vier vierkanten van zestien vakjes, overgenomen van het werkblad
   Ritmevierkanten. Op elke tel licht het volgende vakje op: van links naar
   rechts en dan de volgende regel, net als bij lezen. De klas doet wat er in
   het vakje staat.

   Er klinkt niets behalve de metronoom, en die kan uit. Het geluid maakt de
   klas zelf -- dat is het hele punt van body percussion. Met de metronoom uit
   moeten ze het tempo samen vasthouden, en dat is de volgende stap.

   Laden na Tone.js, drumkit.js en polka.js: de tik komt uit polka. */

// ============================================================
//  De vier vierkanten
// ============================================================

// Zestien vakjes per vierkant, vier regels van vier. In een vakje staat wat je
// op die tel doet: boem is met je vlakke handen op je knieën, klap is klappen.
// Staan er twee in een vakje, dan gaan ze allebei in die ene tel -- twee keer
// zo snel dus.
const VIERKANTEN = [
  {
    id: 'een', naam: 'Vierkant 1', uitleg: 'alles op de tel',
    vakjes: [
      'boem', 'boem', 'boem', 'boem',
      'klap', 'klap', 'klap', 'klap',
      'boem', 'boem', 'klap', 'klap',
      'boem', 'boem', 'klap', 'klap'
    ]
  },
  {
    id: 'twee', naam: 'Vierkant 2', uitleg: 'boem en klap door elkaar',
    vakjes: [
      'boem', 'boem', 'klap', 'klap',
      'boem', 'klap', 'boem', 'klap',
      'boem', 'klap', 'klap', 'boem',
      'boem', 'boem', 'boem', 'klap'
    ]
  },
  {
    id: 'drie', naam: 'Vierkant 3', uitleg: 'twee in een tel',
    vakjes: [
      'boem+boem', 'klap', 'boem+boem', 'klap',
      'boem+boem', 'boem+boem', 'klap+klap', 'klap',
      'boem+boem', 'klap+klap', 'boem+boem', 'klap',
      'boem+boem', 'boem+boem', 'boem+boem', 'klap'
    ]
  },
  {
    id: 'vier', naam: 'Vierkant 4', uitleg: 'de snelle regels door elkaar',
    vakjes: [
      'boem+boem', 'boem+boem', 'boem+boem', 'klap',
      'boem+boem', 'klap+klap', 'boem+boem', 'klap',
      'klap+klap', 'boem+boem', 'boem+boem', 'klap',
      'boem+boem', 'boem+boem', 'klap+klap', 'klap'
    ]
  }
];

// In welke volgorde de vakjes oplichten. Hetzelfde vierkant wordt een heel ander
// ritme als je hem van boven naar beneden leest, dus vier vierkanten zijn er
// eigenlijk zestien.
//
// leesVolgorde geeft terug welk vakje er als eerste komt, als tweede, enzovoort.
// De vakjes zijn genummerd zoals ze in het raster staan: 0 tot en met 3 is de
// bovenste regel, 4 tot en met 7 de tweede.
const VIERKANT_RICHTINGEN = [
  { id: 'rechts', pijl: '\u2192', naam: 'links naar rechts' },
  { id: 'links',  pijl: '\u2190', naam: 'rechts naar links' },
  { id: 'omlaag', pijl: '\u2193', naam: 'boven naar beneden' },
  { id: 'omhoog', pijl: '\u2191', naam: 'beneden naar boven' }
];

function leesVolgorde(id) {
  const uit = [];
  if (id === 'links') {
    for (let r = 0; r < 4; r++) for (let k = 3; k >= 0; k--) uit.push(r * 4 + k);
  } else if (id === 'omlaag') {
    for (let k = 0; k < 4; k++) for (let r = 0; r < 4; r++) uit.push(r * 4 + k);
  } else if (id === 'omhoog') {
    for (let k = 0; k < 4; k++) for (let r = 3; r >= 0; r--) uit.push(r * 4 + k);
  } else {
    for (let i = 0; i < 16; i++) uit.push(i);
  }
  return uit;
}

const VIERKANT_VAKJES = 16;
const VIERKANT_AANLOOP = 4;      // tellen aftellen voordat het eerste vakje komt
const VIERKANT_VOORUIT = 1.2;    // seconden dat een tik van tevoren wordt gepland

const VIERKANT_PLAATJES = {
  boem: { bron: 'img/boem.png', naam: 'boem' },
  klap: { bron: 'img/clap.png', naam: 'klap' }
};

const VIERKANT_INSTELLINGEN = [
  { id: 'bpm', label: 'Tempo', min: 50, max: 160, step: 5, waarde: 80, achter: 'bpm' }
];

// ============================================================
//  Het scherm
// ============================================================

const vkEl = document.getElementById('vierkantspel');
const vkSchuifEl = vkEl && vkEl.querySelector('[data-vierkant-schuifjes]');
const vkKeuzeEl = vkEl && vkEl.querySelector('[data-vierkant-keuze]');
const vkRasterEl = vkEl && vkEl.querySelector('[data-vierkant-raster]');
const vkAftelEl = vkEl && vkEl.querySelector('[data-vierkant-aftellen]');
const vkKnopEl = vkEl && vkEl.querySelector('[data-vierkant-start]');

// ============================================================
//  Wat er is ingesteld
// ============================================================

const VIERKANT_SLEUTEL = 'wotto-muziekfles-vierkant';

const vkStand = { keuze: 'een', richting: 'rechts' };
VIERKANT_INSTELLINGEN.forEach((p) => { vkStand[p.id] = p.waarde; });

// Elke waarde apart nakijken, net als bij de klapoefening: opslag van een oudere
// versie mag de bladzijde nooit stukmaken.
function laadVkStand() {
  let bewaard = null;
  try {
    bewaard = JSON.parse(localStorage.getItem(VIERKANT_SLEUTEL));
  } catch (e) {
    return;
  }
  if (!bewaard || typeof bewaard !== 'object') return;

  VIERKANT_INSTELLINGEN.forEach((p) => {
    const w = parseFloat(bewaard[p.id]);
    if (isFinite(w) && w >= p.min && w <= p.max) vkStand[p.id] = w;
  });
  if (VIERKANTEN.some((v) => v.id === bewaard.keuze)) vkStand.keuze = bewaard.keuze;
  if (VIERKANT_RICHTINGEN.some((r) => r.id === bewaard.richting)) vkStand.richting = bewaard.richting;
}

function bewaarVkStand() {
  try {
    localStorage.setItem(VIERKANT_SLEUTEL, JSON.stringify(vkStand));
  } catch (e) {
    // Privacyvenster of volle opslag: dan onthoudt hij het gewoon niet.
  }
}

function vierkantNu() {
  return VIERKANTEN.find((v) => v.id === vkStand.keuze) || VIERKANTEN[0];
}

function richtingNu() {
  return VIERKANT_RICHTINGEN.find((r) => r.id === vkStand.richting) || VIERKANT_RICHTINGEN[0];
}

// ============================================================
//  Het bord opbouwen
// ============================================================

const vkVakken = [];

// Een vakje is een plaatje of twee. Ze staan als img in de bladzijde en niet als
// achtergrond, zodat een kind ze ook kan aanwijzen en een schermlezer ze noemt.
function bouwVierkantRaster() {
  if (!vkRasterEl) return;

  vkVakken.length = 0;
  vkRasterEl.innerHTML = '';

  vierkantNu().vakjes.forEach((vakje, i) => {
    const soorten = vakje.split('+');
    const vak = document.createElement('div');
    vak.className = 'vierkant-vak' + (soorten.length > 1 ? ' dubbel' : '');
    vak.setAttribute('aria-label', 'tel ' + (i % 4 + 1) + ': ' +
      soorten.map((s) => VIERKANT_PLAATJES[s].naam).join(' en '));
    vak.innerHTML = soorten.map((s) =>
      '<img src="' + VIERKANT_PLAATJES[s].bron + '" alt="" width="320" height="320">'
    ).join('');
    vkRasterEl.appendChild(vak);
    vkVakken.push(vak);
  });
}

function bouwVierkantKnoppen() {
  if (!vkSchuifEl || !vkKeuzeEl) return;

  vkSchuifEl.innerHTML = VIERKANT_INSTELLINGEN.map((p) => `
    <div class="klap-schuif">
      <label for="vk-${p.id}">${p.label}<b data-vk-toon="${p.id}"></b></label>
      <input type="range" id="vk-${p.id}" data-vk="${p.id}"
             min="${p.min}" max="${p.max}" step="${p.step}">
    </div>
  `).join('') + `
    <div class="klap-schuif">
      <label for="vk-richting">Volgorde</label>
      <select class="vierkant-richting" id="vk-richting" data-vierkant-richting>
        ${VIERKANT_RICHTINGEN.map((r) => `<option value="${r.id}">${r.pijl} ${r.naam}</option>`).join('')}
      </select>
    </div>
  `;

  vkKeuzeEl.innerHTML = VIERKANTEN.map((v) => `
    <button class="klap-keus" type="button" data-vierkant="${v.id}">
      <span class="klap-keus-naam">${v.naam}</span>
      <span class="klap-keus-uitleg">${v.uitleg}</span>
    </button>
  `).join('');

  VIERKANT_INSTELLINGEN.forEach((p) => {
    document.getElementById('vk-' + p.id).value = vkStand[p.id];
  });
  werkVierkantKnoppenBij();
}

function werkVierkantKnoppenBij() {
  VIERKANT_INSTELLINGEN.forEach((p) => {
    const toon = vkSchuifEl.querySelector('[data-vk-toon="' + p.id + '"]');
    if (toon) toon.textContent = vkStand[p.id] + ' ' + p.achter;
  });
  vkKeuzeEl.querySelectorAll('.klap-keus').forEach((knop) => {
    knop.setAttribute('aria-pressed', String(knop.dataset.vierkant === vkStand.keuze));
  });
  const richting = vkSchuifEl.querySelector('[data-vierkant-richting]');
  if (richting) richting.value = vkStand.richting;
}

// Tijdens een beurt staan de instellingen vast: halverwege van vierkant of tempo
// wisselen laat een klas struikelen. De metronoom mag wel aan en uit, want juist
// dat wil je onder het lopen kunnen proberen.
function vierkantZetKnoppen(vast) {
  if (!vkEl) return;
  vkEl.querySelectorAll('[data-vierkant], [data-vierkant-richting], input[type="range"]').forEach((el) => {
    el.disabled = vast;
  });
}

// ============================================================
//  De beurt
// ============================================================

let vierkant = null;
let vierkantLus = 0;

function startVierkant() {
  if (!vkEl) return;
  cancelAnimationFrame(vierkantLus);

  if (Tone.getContext().state !== 'running') {
    startGeluid().then(startVierkant).catch(() => {});
    return;
  }

  vierkant = {
    loopt: true,
    telNr: 0,
    telTijd: Tone.now() + 0.6,
    aanloop: [],
    tellen: [],
    volgorde: leesVolgorde(vkStand.richting),
    vakAan: -1,
    aftelGetal: 0,
    aftelKlaar: false,
    eersteVak: 0,
    einde: 0
  };

  vkKnopEl.textContent = 'Stop';
  vierkantZetKnoppen(true);
  wisVierkantVak();
  toonVierkantAftellen(0);

  vulVierkantAan(Tone.now());
  vierkantLus = requestAnimationFrame(vierkantStap);
}

function stopVierkant() {
  if (!vierkant) return;
  vierkant.loopt = false;
  cancelAnimationFrame(vierkantLus);

  // Wat er nog vooruit gepland stond mag niet doortikken over een gestopte
  // oefening heen.
  tikEnv.cancel(Tone.now());

  wisVierkantVak();
  toonVierkantAftellen(0);
  vkKnopEl.textContent = 'Start';
  vierkantZetKnoppen(false);
}

// De tikken vooruit plannen. Een beurt is precies een keer het vierkant door:
// zestien tellen en dan is hij klaar. Wil je hem nog eens, dan druk je opnieuw op
// start -- met het aftellen ervoor, zodat de klas er weer samen in komt.
function vulVierkantAan(nu) {
  while (vierkant.telTijd < nu + VIERKANT_VOORUIT) {
    const tel = vierkant.telNr;
    const inAanloop = tel < VIERKANT_AANLOOP;
    const nr = tel - VIERKANT_AANLOOP;
    if (nr >= VIERKANT_VAKJES) return;

    // Hoog op de laatste tel van het aftellen en daarna op elke eerste tel van
    // een regel: dan hoor je waar een nieuwe regel begint.
    tik(vierkant.telTijd, inAanloop ? tel === VIERKANT_AANLOOP - 1 : nr % 4 === 0);

    if (inAanloop) {
      vierkant.aanloop.push(vierkant.telTijd);
    } else {
      if (!vierkant.eersteVak) vierkant.eersteVak = vierkant.telTijd;
      vierkant.tellen.push({ nr: nr, tijd: vierkant.telTijd });
    }

    vierkant.telTijd += 60 / vkStand.bpm;
    vierkant.telNr += 1;

    // Het laatste vakje mag zijn hele tel uitzitten voordat het bord uitgaat.
    if (nr === VIERKANT_VAKJES - 1) vierkant.einde = vierkant.telTijd;
  }
}

function vierkantStap() {
  if (!vierkant || !vierkant.loopt) return;
  const nu = Tone.now();

  vulVierkantAan(nu);
  werkVierkantAftellenBij(nu);
  werkVierkantVakBij(nu);

  if (vierkant.einde && nu >= vierkant.einde) {
    stopVierkant();
    return;
  }

  vierkantLus = requestAnimationFrame(vierkantStap);
}

// Welk vakje er nu aan de beurt is. Hij kijkt naar de audioklok en niet naar
// hoeveel beeldjes er voorbij zijn: op een traag digibord vallen er beeldjes weg
// en dan zou het vakje achter de tik aan gaan lopen. Hij pakt de nieuwste tel die
// al geweest is, dus na een haperingetje staat hij meteen weer goed.
function werkVierkantVakBij(nu) {
  let nieuw = null;
  for (let i = 0; i < vierkant.tellen.length; i++) {
    const t = vierkant.tellen[i];
    if (nu >= t.tijd && (!nieuw || t.nr > nieuw.nr)) nieuw = t;
  }
  if (!nieuw || nieuw.nr === vierkant.vakAan) return;

  vierkant.vakAan = nieuw.nr;
  toonVierkantVak(vierkant.volgorde[nieuw.nr]);

  vierkant.tellen = vierkant.tellen.filter((t) => t.tijd > nu - 0.5);
}

function toonVierkantVak(nr) {
  vkVakken.forEach((vak, i) => vak.classList.toggle('aan', i === nr));

  const vak = vkVakken[nr];
  if (!vak || !vak.animate || minderBeweging.matches) return;
  // De veer alleen op het eerste stuk: over het geheel schiet hij bij het eerste
  // beeldje al door zijn eindstand heen en zie je er niets van. Alleen transform,
  // want dat draait op de grafische kaart.
  vak.animate([
    { transform: 'scale(1)', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { transform: 'scale(1.06)', offset: 0.35, easing: 'ease-out' },
    { transform: 'scale(1)' }
  ], { duration: 220 });
}

function wisVierkantVak() {
  vkVakken.forEach((vak) => vak.classList.remove('aan'));
}

// Het aftellen: 1, 2, 3, 4 in de maat mee, en weg zodra het eerste vakje komt.
function werkVierkantAftellenBij(nu) {
  if (!vkAftelEl || vierkant.aftelKlaar) return;

  if (vierkant.eersteVak && nu >= vierkant.eersteVak) {
    vierkant.aftelKlaar = true;
    toonVierkantAftellen(0);
    return;
  }

  let getal = 0;
  for (let i = 0; i < vierkant.aanloop.length; i++) if (nu >= vierkant.aanloop[i]) getal = i + 1;
  if (getal !== vierkant.aftelGetal) {
    vierkant.aftelGetal = getal;
    toonVierkantAftellen(getal);
  }
}

function toonVierkantAftellen(getal) {
  if (!vkAftelEl) return;
  vkAftelEl.textContent = getal ? String(getal) : '';
  if (!getal || minderBeweging.matches || !vkAftelEl.animate) return;
  vkAftelEl.animate(
    [{ transform: 'scale(0.6)' }, { transform: 'scale(1)' }],
    { duration: 240, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
  );
}

// ============================================================
//  Aanzetten
// ============================================================

if (vkEl) {
  laadVkStand();
  bouwVierkantKnoppen();
  bouwVierkantRaster();

  vkKnopEl.addEventListener('click', () => {
    if (vierkant && vierkant.loopt) stopVierkant();
    else startVierkant();
  });

  vkSchuifEl.addEventListener('input', (e) => {
    if (e.target.type !== 'range') return;
    vkStand[e.target.dataset.vk] = parseFloat(e.target.value);
    werkVierkantKnoppenBij();
    bewaarVkStand();
  });

  vkKeuzeEl.addEventListener('click', (e) => {
    const knop = e.target.closest('[data-vierkant]');
    if (!knop || knop.disabled) return;
    vkStand.keuze = knop.dataset.vierkant;
    werkVierkantKnoppenBij();
    bouwVierkantRaster();
    bewaarVkStand();
  });

  vkSchuifEl.addEventListener('change', (e) => {
    const keuze = e.target.closest('[data-vierkant-richting]');
    if (!keuze) return;
    if (!VIERKANT_RICHTINGEN.some((r) => r.id === keuze.value)) return;
    vkStand.richting = keuze.value;
    werkVierkantKnoppenBij();
    bewaarVkStand();
  });
}
