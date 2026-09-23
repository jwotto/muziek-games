/* Ritmevierkanten — lees het ritme van het bord

   Vier vierkanten van zestien vakjes, overgenomen van het werkblad
   Ritmevierkanten. Op elke tel licht het volgende vakje op: van links naar
   rechts en dan de volgende regel, net als bij lezen. De klas doet wat er in
   het vakje staat.

   Het bord speelt het ritme ook voor: bij boem hoor je een doffe klap op je
   knieen, bij klap een klap. Zo hoor je hoe het moet klinken en kan de klas
   meedoen. Het plaatje dat klinkt wordt even groter -- staan er twee in een
   vakje, dan het tweede een halve tel later -- en het hele bord knikt mee op
   elke tel, ook tijdens het aftellen. Hetzelfde als bij het ritmevierkant dat
   je zelf maakt in les 2.

   Laden na Tone.js, drumkit.js, polka.js en lijfgeluid.js: de tik komt uit
   polka, boem en klap uit lijfgeluid. */

// ============================================================
//  De vier vierkanten
// ============================================================

// Zestien vakjes per vierkant, vier regels van vier. In een vakje staat wat je
// op die tel doet: boem is met je vlakke handen op je knieën, klap is klappen.
// Staan er twee in een vakje, dan gaan ze allebei in die ene tel -- twee keer
// zo snel dus.
const VIERKANTEN = [
  {
    id: 'een', naam: 'Vierkant 1', uitleg: 'op de tel',
    vakjes: [
      'boem', 'boem', 'boem', 'boem',
      'klap', 'klap', 'klap', 'klap',
      'boem', 'boem', 'klap', 'klap',
      'boem', 'boem', 'klap', 'klap'
    ]
  },
  {
    id: 'twee', naam: 'Vierkant 2', uitleg: 'om en om',
    vakjes: [
      'boem', 'boem', 'klap', 'klap',
      'boem', 'klap', 'boem', 'klap',
      'boem', 'klap', 'klap', 'boem',
      'boem', 'boem', 'boem', 'klap'
    ]
  },
  {
    id: 'drie', naam: 'Vierkant 3', uitleg: 'twee per tel',
    vakjes: [
      'boem+boem', 'klap', 'boem+boem', 'klap',
      'boem+boem', 'boem+boem', 'klap+klap', 'klap',
      'boem+boem', 'klap+klap', 'boem+boem', 'klap',
      'boem+boem', 'boem+boem', 'boem+boem', 'klap'
    ]
  },
  {
    id: 'vier', naam: 'Vierkant 4', uitleg: 'veel dubbel',
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
// Seconden dat een tel van tevoren wordt gepland. Kort, want nu klinken ook
// boem en klap: wat er al gepland staat speelt anders nog door als je stopt.
const VIERKANT_VOORUIT = 0.15;

// De tik gaat zachter zodra het eerste vakje klinkt: dan is het ritme de muziek
// en houdt de tik alleen nog de maat vast.
const VIERKANT_TIK_SPELEN = -16;

const VIERKANT_PLAATJES = {
  boem: { bron: 'img/boem.webp', naam: 'boem' },
  klap: { bron: 'img/clap.webp', naam: 'klap' }
};

const VIERKANT_INSTELLINGEN = [
  { id: 'bpm', label: 'Tempo', min: 50, max: 160, step: 5, waarde: 80, achter: 'bpm' }
];

// ============================================================
//  Het scherm
// ============================================================

const vkEl = document.getElementById('vierkantspel');
const vkSchuifEl = vkEl && vkEl.querySelector('[data-vierkant-schuifjes]');
const vkRasterEl = vkEl && vkEl.querySelector('[data-vierkant-raster]');
const vkAftelEl = vkEl && vkEl.querySelector('[data-vierkant-aftellen]');

// De afspeelknop staat in dezelfde regel als de instellingen en wordt daar mee
// opgebouwd, dus hij is er pas na bouwVierkantKnoppen.
let vkKnopEl = null;

// Een driehoekje en een blokje, uitgeschreven in de code: een knop waarvan het
// pictogram niet laadt is geen knop meer.
const VK_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>';
const VK_STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

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

// Alles in een regel: de afspeelknop vooraan, dan het tempo op de halve breedte
// en daarnaast de twee menu's. Een schuif heeft die ruimte nodig om nauwkeurig te
// zijn; een menu niet.
function bouwVierkantKnoppen() {
  if (!vkSchuifEl) return;

  vkSchuifEl.innerHTML = `
    <button class="speelknop" type="button" data-vierkant-start aria-label="Speel het ritme af">
      ${VK_PLAY}
    </button>
  ` + VIERKANT_INSTELLINGEN.map((p) => `
    <div class="klap-schuif">
      <label for="vk-${p.id}">${p.label}<b data-vk-toon="${p.id}"></b></label>
      <input type="range" id="vk-${p.id}" data-vk="${p.id}"
             min="${p.min}" max="${p.max}" step="${p.step}">
    </div>
  `).join('') + `
    <div class="klap-schuif">
      <label for="vk-vierkant">Ritme</label>
      <select class="vierkant-menu" id="vk-vierkant" data-vierkant>
        ${VIERKANTEN.map((v) => `<option value="${v.id}">${v.naam} &middot; ${v.uitleg}</option>`).join('')}
      </select>
    </div>
    <div class="klap-schuif">
      <label for="vk-richting">Volgorde</label>
      <select class="vierkant-menu" id="vk-richting" data-vierkant-richting>
        ${VIERKANT_RICHTINGEN.map((r) => `<option value="${r.id}">${r.pijl} ${r.naam}</option>`).join('')}
      </select>
    </div>
  `;

  vkKnopEl = vkSchuifEl.querySelector('[data-vierkant-start]');
  VIERKANT_INSTELLINGEN.forEach((p) => {
    document.getElementById('vk-' + p.id).value = vkStand[p.id];
  });
  toonVierkantPlay(false);
  werkVierkantKnoppenBij();
}

// Loopt hij, dan wordt het driehoekje een blokje: dezelfde knop stopt hem ook.
function toonVierkantPlay(loopt) {
  if (!vkKnopEl) return;
  vkKnopEl.innerHTML = loopt ? VK_STOP : VK_PLAY;
  vkKnopEl.setAttribute('aria-label', loopt ? 'Stop het ritme' : 'Speel het ritme af');
  vkKnopEl.classList.toggle('loopt', loopt);
}

function werkVierkantKnoppenBij() {
  VIERKANT_INSTELLINGEN.forEach((p) => {
    const toon = vkSchuifEl.querySelector('[data-vk-toon="' + p.id + '"]');
    if (toon) toon.textContent = vkStand[p.id] + ' ' + p.achter;
  });
  const keuze = vkSchuifEl.querySelector('[data-vierkant]');
  if (keuze) keuze.value = vkStand.keuze;
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

  // Loopt de klapoefening hierboven nog, dan gaat die uit: twee tellen door
  // elkaar heen is voor een klas onmogelijk.
  if (typeof stopKlap === 'function') stopKlap();

  if (Tone.getContext().state !== 'running') {
    startGeluid().then(startVierkant).catch(() => {});
    return;
  }
  startLijfRuis();

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
    einde: 0,
    momenten: [],     // wat er op een bepaald moment moet bewegen: { tijd, doe }
    tikWas: tikVol.volume.value
  };

  toonVierkantPlay(true);
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
  // oefening heen. De tik weer zo hard als hij op deze bladzijde hoort.
  tikEnv.cancel(Tone.now());
  tikVol.volume.cancelScheduledValues(Tone.now());
  tikVol.volume.value = vierkant.tikWas;

  wisVierkantVak();
  toonVierkantAftellen(0);
  toonVierkantPlay(false);
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
    const hoog = inAanloop ? tel === VIERKANT_AANLOOP - 1 : nr % 4 === 0;
    tik(vierkant.telTijd, hoog);
    vierkantOpMoment(vierkant.telTijd, () => knikVierkant(hoog));

    const telDuur = 60 / vkStand.bpm;
    if (inAanloop) {
      vierkant.aanloop.push(vierkant.telTijd);
    } else {
      if (!vierkant.eersteVak) {
        vierkant.eersteVak = vierkant.telTijd;
        tikVol.volume.setValueAtTime(VIERKANT_TIK_SPELEN, vierkant.telTijd - 0.01);
      }
      vierkant.tellen.push({ nr: nr, tijd: vierkant.telTijd });

      // Wat er in het vakje staat, klinkt ook. Twee in een vakje: de tweede een
      // halve tel later.
      const vak = vierkant.volgorde[nr];
      vierkantNu().vakjes[vak].split('+').forEach((soort, k) => {
        const wanneer = vierkant.telTijd + k * telDuur / 2;
        lijfGeluid(soort, wanneer);
        vierkantOpMoment(wanneer, () => groeiVierkant(vak, k, telDuur));
      });
    }

    vierkant.telTijd += telDuur;
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

  // Wat er nu moet bewegen. Is een moment al lang voorbij (de tab was even
  // weg), dan slaan we hem over: alles tegelijk inhalen helpt niemand.
  const later = [];
  vierkant.momenten.forEach((m) => {
    if (nu < m.tijd) later.push(m);
    else if (nu - m.tijd < 0.15) m.doe();
  });
  vierkant.momenten = later;

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

// Het vakje dat aan de beurt is wordt geel. Het opveren zit niet meer op het
// vakje maar op het bord en op de plaatjes, zie hieronder.
function toonVierkantVak(nr) {
  vkVakken.forEach((vak, i) => vak.classList.toggle('aan', i === nr));
}

// Bewegen hoort bij het geluid en niet bij het plannen: de planner kijkt een
// stukje vooruit, dus wat er moet bewegen wacht tot de audioklok zover is.
function vierkantOpMoment(tijd, doe) {
  vierkant.momenten.push({ tijd: tijd, doe: doe });
}

// De veer alleen op het eerste stuk: over het geheel schiet hij bij het eerste
// beeldje al door zijn eindstand heen en zie je er niets van. Alleen transform,
// want dat draait op de grafische kaart.
function veerVierkant(el, groei, duur) {
  if (!el || !el.animate || minderBeweging.matches) return;
  el.animate([
    { transform: 'scale(1)', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { transform: 'scale(' + groei + ')', offset: 0.35, easing: 'ease-out' },
    { transform: 'scale(1)' }
  ], { duration: duur });
}

// Het hele bord knikt mee op elke tel, ook bij het aftellen. Op de eerste tel
// van een regel (en de laatste van het aftellen) iets harder.
function knikVierkant(sterk) {
  veerVierkant(vkRasterEl, sterk ? 1.035 : 1.018, 220);
}

// Het plaatje dat klinkt wordt even groter. De groei past in een halve tel,
// anders loopt hij op een hoog tempo door de volgende heen.
function groeiVierkant(vak, k, telDuur) {
  const img = vkVakken[vak] && vkVakken[vak].querySelectorAll('img')[k];
  veerVierkant(img, 1.35, Math.min(280, telDuur * 500 * 0.9));
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

  vkSchuifEl.addEventListener('click', (e) => {
    if (!e.target.closest('[data-vierkant-start]')) return;
    if (vierkant && vierkant.loopt) stopVierkant();
    else startVierkant();
  });

  vkSchuifEl.addEventListener('input', (e) => {
    if (e.target.type !== 'range') return;
    vkStand[e.target.dataset.vk] = parseFloat(e.target.value);
    werkVierkantKnoppenBij();
    bewaarVkStand();
  });

  vkSchuifEl.addEventListener('change', (e) => {
    const menu = e.target;

    if (menu.matches('[data-vierkant-richting]')) {
      if (!VIERKANT_RICHTINGEN.some((r) => r.id === menu.value)) return;
      vkStand.richting = menu.value;
    } else if (menu.matches('[data-vierkant]')) {
      if (!VIERKANTEN.some((v) => v.id === menu.value)) return;
      vkStand.keuze = menu.value;
      bouwVierkantRaster();
    } else {
      return;
    }

    werkVierkantKnoppenBij();
    bewaarVkStand();
  });
}
