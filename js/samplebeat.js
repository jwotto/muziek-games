/* Ritme 3: samples maken

   Een sequencer zoals in ritmeles 2, maar met vijf rijen: bovenaan twee
   samples die de klas zelf opneemt, daaronder de hihat, de snare en de kick van
   het drumstel. Het drumstel klinkt zoals het begint; alleen de samples kun je
   bewerken.

   Het opnemen en bewerken doet storm.js, dezelfde sampler als bij Storm maken.
   Dit bestand zet daarvoor STORM_LES neer, en moet dus vóór storm.js geladen
   worden. Het bord bouwt pas als alles geladen is (DOMContentLoaded), want het
   heeft speelStormStuk en stormKanaal uit storm.js nodig.

   Laden na Tone.js, drumkit.js en beats.js, en vóór storm.js. */

// ============================================================
//  De samples
// ============================================================

// Wat storm.js met de samples doet. Zie het begin van storm.js.
// vorm: de vorm in een vakje op het bord, zoals de kick rond is. begin: het
// geluid uit snd/samples waarmee het sample begint, voordat er iets is opgenomen.
const STORM_LES = {
  kanalen: [
    { id: 'sample1', naam: 'Sample 1', icoon: 'waveform', kleur: 'bubblegum', vorm: 'ruit',
      begin: { bestand: 'hond.mp3', naam: 'Hond' } },
    { id: 'sample2', naam: 'Sample 2', icoon: 'waveform', kleur: 'mint',      vorm: 'ruit',
      begin: { bestand: 'kat.mp3', naam: 'Kat' } }
  ],
  soort: 'stukjes',
  // Zet geluiden in snd/samples en draai python tools/samples.py: dan staan
  // ze in deze lijst.
  bibliotheek: 'snd/samples/lijst.json',
  sleutel: 'wotto-muziekfles-samples',
  db: 'muziekfles-samples'
};

// Een vorm erbij voor de samples, naast die van het drumstel. Ze zijn allebei
// een ruit; de kleur zegt welk sample het is.
const SB_VORMEN = {
  ruit: '<polygon points="50,6 94,50 50,94 6,50"/>'
};

// ============================================================
//  Het bord
// ============================================================

const SB_STAPPEN = 8;               // acht vakjes: twee tellen, net als in les 2
const SB_PER_TEL = 4;               // vier vakjes in een tel
const SB_VOORUIT = 0.03;            // seconden dat de planner vooruit kijkt
const SB_TIK = 10;                  // milliseconden tussen twee rondjes van de planner
const SB_MAX_PER_RONDJE = 64;       // noodrem, zodat de lus nooit kan blijven hangen
const SB_TEMPO = { min: 60, max: 160, step: 2, waarde: 96 };
const SB_SLEUTEL = 'wotto-muziekfles-samples-bord';

// Van boven naar beneden: de twee samples, dan hihat, snare en kick, net als
// in les 2 het hoge geluid boven en het lage onder.
const SB_RIJEN = STORM_LES.kanalen.map((def) => ({
  id: def.id, naam: def.naam, kleur: def.kleur, vorm: def.vorm, sample: true
})).concat(KIT.slice().reverse().map((inst) => ({
  id: inst.id, naam: inst.naam, kleur: inst.kleur, vorm: inst.vorm, sample: false
})));

const sbStand = { bord: {}, bpm: SB_TEMPO.waarde };
SB_RIJEN.forEach((rij) => { sbStand.bord[rij.id] = new Array(SB_STAPPEN).fill(false); });

// Elke rij apart nakijken: een stand van een oudere versie mag de bladzijde
// nooit stukmaken.
function laadSbStand() {
  let bewaard = null;
  try {
    bewaard = JSON.parse(localStorage.getItem(SB_SLEUTEL));
  } catch (e) {
    return;
  }
  if (!bewaard || typeof bewaard !== 'object') return;
  const bpm = parseFloat(bewaard.bpm);
  if (isFinite(bpm) && bpm >= SB_TEMPO.min && bpm <= SB_TEMPO.max) sbStand.bpm = bpm;
  const bord = bewaard.bord || {};
  SB_RIJEN.forEach((rij) => {
    const strook = bord[rij.id];
    if (typeof strook !== 'string' || strook.length !== SB_STAPPEN || !/^[x.]+$/.test(strook)) return;
    for (let i = 0; i < SB_STAPPEN; i++) sbStand.bord[rij.id][i] = strook[i] === 'x';
  });
}

function bewaarSbStand() {
  const bord = {};
  SB_RIJEN.forEach((rij) => {
    bord[rij.id] = sbStand.bord[rij.id].map((aan) => (aan ? 'x' : '.')).join('');
  });
  try {
    localStorage.setItem(SB_SLEUTEL, JSON.stringify({ bord: bord, bpm: sbStand.bpm }));
  } catch (e) {
    // Opslag kan uit staan. Dan werkt het bord gewoon, alleen zonder onthouden.
  }
}

// ============================================================
//  Het scherm
// ============================================================

const sbKnoppenEl = document.querySelector('[data-sb-knoppen]');
const sbBordEl = document.querySelector('[data-sb-bord]');
let sbStartEl = null;
let sbTempoEl = null;
let sbBpmEl = null;

const sbCellen = {};   // per rij de zestien vakjes
const sbNamen = {};    // per rij het naamknopje

// Hetzelfde pijltje terug als in les 2, voor op een telefoon.
const SEQ_LEEG_TEKEN_SB =
  '<svg class="seq-leeg-teken" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"' +
  ' stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';

function bouwSbKnoppen() {
  sbKnoppenEl.innerHTML = `
    <button class="speelknop" type="button" data-sb-start aria-label="Speel de beat af">${BEAT_START}</button>
    <div class="klap-schuif">
      <label for="sb-bpm">Tempo<b data-sb-bpm></b></label>
      <input type="range" id="sb-bpm" data-sb-tempo
             min="${SB_TEMPO.min}" max="${SB_TEMPO.max}" step="${SB_TEMPO.step}">
    </div>
    <button class="knop klein seq-leeg" type="button" data-sb-reset aria-label="Reset alles">
      ${SEQ_LEEG_TEKEN_SB}<span class="seq-leeg-tekst sb-wissel"><span>Reset alles</span><span>Zeker?</span></span>
    </button>
  `;
  sbStartEl = sbKnoppenEl.querySelector('[data-sb-start]');
  sbTempoEl = sbKnoppenEl.querySelector('[data-sb-tempo]');
  sbBpmEl = sbKnoppenEl.querySelector('[data-sb-bpm]');
  zetSbTempo(sbStand.bpm);
}

// Het bord, net als in les 2: een raster met links het naamknopje en daarnaast
// de vakjes in groepjes van een tel. Een tik op een naamknopje zet dat
// geluid bovenaan (zie tikSbNaam).
function bouwSbBord() {
  const raster = document.createElement('div');
  raster.className = 'seq-raster';

  SB_RIJEN.forEach((rij) => {
    const el = document.createElement('div');
    el.className = 'seq-rij';
    el.style.setProperty('--kleur', 'var(--' + rij.kleur + ')');
    el.style.setProperty('--op-kleur', rij.kleur === 'blauw' ? 'var(--wit)' : 'var(--ink)');

    const naam = document.createElement('button');
    naam.className = 'deel-titel';
    naam.type = 'button';
    // Geen data-id op de drums: dan speelt drumkit.js ze niet vanzelf af, en
    // beslist deze les of je ze hoort (zie tikSbNaam).
    if (rij.sample) naam.dataset.sample = rij.id;
    else naam.dataset.drum = rij.id;
    naam.setAttribute('aria-label', 'Speel ' + rij.naam);
    naam.textContent = rij.naam;
    el.appendChild(naam);
    meldPad(rij.id, naam);
    sbNamen[rij.id] = naam;

    const vorm = SB_VORMEN[rij.vorm] || VORMEN[rij.vorm];
    sbCellen[rij.id] = [];
    for (let t = 0; t < SB_STAPPEN / SB_PER_TEL; t++) {
      const tel = document.createElement('div');
      tel.className = 'seq-tel';
      for (let s = 0; s < SB_PER_TEL; s++) {
        const i = t * SB_PER_TEL + s;
        const cel = document.createElement('button');
        cel.className = 'stap';
        cel.type = 'button';
        cel.dataset.rij = rij.id;
        cel.dataset.stap = i;
        cel.setAttribute('aria-label', rij.naam + ', tel ' + (t + 1) + ', vakje ' + (s + 1));
        cel.innerHTML = '<svg class="vorm" viewBox="0 0 100 100" aria-hidden="true">' + vorm + '</svg>';
        tel.appendChild(cel);
        sbCellen[rij.id].push(cel);
      }
      el.appendChild(tel);
    }
    raster.appendChild(el);
  });

  sbBordEl.appendChild(raster);
  toonSbBord();
}

function toonSbVakje(id, i) {
  sbCellen[id][i].setAttribute('aria-pressed', String(sbStand.bord[id][i]));
}

function toonSbBord() {
  SB_RIJEN.forEach((rij) => {
    for (let i = 0; i < SB_STAPPEN; i++) toonSbVakje(rij.id, i);
  });
}

function toonSbSpeelknop(loopt) {
  sbStartEl.innerHTML = loopt ? BEAT_STOP : BEAT_START;
  sbStartEl.setAttribute('aria-label', loopt ? 'Stop de beat' : 'Speel de beat af');
  sbStartEl.classList.toggle('loopt', loopt);
}

function zetSbTempo(bpm) {
  sbStand.bpm = bpm;
  sbTempoEl.value = bpm;
  sbBpmEl.textContent = Math.round(bpm) + ' bpm';
}

// Het naamknopje van een sample heet zoals zijn geluid (Hond, Kat), en bij
// een eigen opname Sample 1. Zonder geluid is hij gestippeld, net als de golf
// bovenaan; de vakjes kun je wel al aanzetten. Het sample dat je bovenaan
// bewerkt heeft een rand eromheen.
function werkSbSampleBij(k) {
  const naam = sbNamen[k.def.id];
  if (!naam) return;
  const tekst = (k.buffer && k.naam) || k.def.naam;
  if (naam.textContent !== tekst) {
    naam.textContent = tekst;
    naam.setAttribute('aria-label', 'Speel en bewerk ' + tekst);
  }
  naam.classList.toggle('leeg', !k.buffer);
  naam.classList.toggle('gekozen', !sbDrum && storm.gekozen === k.def.id);
}

// ============================================================
//  Een geluid laten horen
// ============================================================

// Een drumgeluid via drumkit.js, een sample via storm.js. wanneer is een tijd
// op de audioklok, of niets voor nu.
function speelSb(rij, wanneer) {
  if (rij.sample) speelStormStuk(stormKanaal(rij.id), wanneer);
  else speel(rij.id, wanneer);
}

// Een sample laten horen.
function raakSample(id) {
  const k = stormKanaal(id);
  if (Tone.getContext().state !== 'running') {
    startGeluid().then(() => speelStormStuk(k)).catch(() => {});
  } else {
    speelStormStuk(k);
  }
  flits(id);
}

// ============================================================
//  Het bord veranderen
// ============================================================

function zetSbVakje(id, i, aan) {
  if (sbStand.bord[id][i] === aan) return;
  sbStand.bord[id][i] = aan;
  bewaarSbStand();
  toonSbVakje(id, i);
  // Staat het bord stil, dan hoor je meteen wat je neerzet.
  if (aan && !sbLoopt) {
    const rij = SB_RIJEN.find((r) => r.id === id);
    if (rij.sample) raakSample(id); else raak(id);
  }
  if (aan) sbPuls(sbCellen[id][i], 1.15);
}

// Alles terug naar het begin, voor de volgende klas: een leeg bord, het
// tempo, de samples weer de hond en de kat met hun knoppen in de beginstand,
// en het drumstel zoals het begint. Alleen de microfoon blijft staan.
function resetSbAlles() {
  stopSb();
  SB_RIJEN.forEach((rij) => sbStand.bord[rij.id].fill(false));
  zetSbTempo(SB_TEMPO.waarde);
  bewaarSbStand();
  toonSbBord();
  resetStorm();
  KIT.forEach((inst) => {
    inst.schuifjes.forEach((p) => { stand[inst.id][p.id] = p.waarde; });
    pasToe(inst.id);
  });
  bewaarSbDrumstel();
  zetSbDrumSchuiven();
  kiesSbSample(STORM_LES.kanalen[0].id);
}

// Twee keer tikken, net als Wis voortgang in les 2: geen vensterknopje van de
// browser, want dat legt de audio stil. Na de eerste tik staat er Zeker?; de
// knop blijft even breed, want beide woorden staan er altijd in (zie de css).
let sbResetTimer = 0;

function ontwapenSbReset() {
  clearTimeout(sbResetTimer);
  sbResetTimer = 0;
  const knop = sbKnoppenEl.querySelector('[data-sb-reset]');
  knop.classList.remove('zeker');
}

function tikSbReset() {
  if (sbResetTimer) {
    ontwapenSbReset();
    resetSbAlles();
    return;
  }
  const knop = sbKnoppenEl.querySelector('[data-sb-reset]');
  knop.classList.add('zeker');
  sbResetTimer = setTimeout(ontwapenSbReset, 3000);
}

// ============================================================
//  Afspelen
// ============================================================

// Net als in les 2: een korte vooruitblik op de audioklok, zodat het strak
// blijft, en het lampje kijkt naar wat er al geklonken heeft.
let sbLoopt = null;   // { stap, tijd, tikTimer, komend }
let sbLus = 0;

function startSb() {
  if (sbLoopt || storm.opname) return;
  if (Tone.getContext().state !== 'running') {
    startGeluid().then(startSb).catch(() => {});
    return;
  }
  startRuis();
  sbLoopt = { stap: 0, tijd: Tone.now() + 0.12, tikTimer: 0, komend: [] };
  sbLoopt.tikTimer = setInterval(planSb, SB_TIK);
  planSb();
  sbLus = requestAnimationFrame(sbBeeld);
  toonSbSpeelknop(true);
}

function stopSb() {
  if (!sbLoopt) return;
  clearInterval(sbLoopt.tikTimer);
  cancelAnimationFrame(sbLus);
  sbLoopt = null;
  wisFlitsen();
  wisSbLampje();
  toonSbSpeelknop(false);
}

function planSb() {
  if (!sbLoopt) return;
  const stapDuur = 15 / sbStand.bpm;   // 60 / bpm / 4 zestienden
  // Is de tab even weg geweest, dan niet inhalen maar aansluiten bij nu.
  if (sbLoopt.tijd < Tone.now()) sbLoopt.tijd = Tone.now() + 0.02;

  let veilig = 0;
  while (sbLoopt.tijd < Tone.now() + SB_VOORUIT && veilig < SB_MAX_PER_RONDJE) {
    const i = sbLoopt.stap % SB_STAPPEN;
    SB_RIJEN.forEach((rij) => {
      if (!sbStand.bord[rij.id][i]) return;
      speelSb(rij, sbLoopt.tijd);
      flitsStraks(rij.id, sbLoopt.tijd);
    });
    sbLoopt.komend.push({ stap: i, tijd: sbLoopt.tijd });
    sbLoopt.stap += 1;
    sbLoopt.tijd += stapDuur;
    veilig += 1;
  }
}

function sbBeeld() {
  if (!sbLoopt) return;
  const nu = Tone.now() - geluidVertraging();
  let nieuw = null;
  sbLoopt.komend.forEach((k) => {
    if (nu >= k.tijd && (!nieuw || k.tijd > nieuw.tijd)) nieuw = k;
  });
  if (nieuw && nieuw.stap !== sbLampje) toonSbLampje(nieuw.stap);
  sbLoopt.komend = sbLoopt.komend.filter((k) => k.tijd > nu);
  sbLus = requestAnimationFrame(sbBeeld);
}

// ============================================================
//  Het lampje
// ============================================================

let sbLampje = -1;

function toonSbLampje(stap) {
  wisSbLampje();
  sbLampje = stap;
  SB_RIJEN.forEach((rij) => {
    const cel = sbCellen[rij.id][stap];
    cel.classList.add('nu');
    if (!sbStand.bord[rij.id][stap]) return;
    sbPuls(cel, 1.12);
    sbPuls(cel.querySelector('.vorm'), 1.35);
  });
}

function wisSbLampje() {
  if (sbLampje < 0) return;
  SB_RIJEN.forEach((rij) => sbCellen[rij.id][sbLampje].classList.remove('nu'));
  sbLampje = -1;
}

function sbPuls(el, groei) {
  if (!el) return;
  animeer(el, [
    { transform: 'scale(1)', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { transform: 'scale(' + groei + ')', offset: 0.35, easing: 'ease-out' },
    { transform: 'scale(1)' }
  ], { duration: 240 });
}

// ============================================================
//  Aanzetten
// ============================================================


// ------------------------------------------------------------
//  Wat er bovenaan staat: een sample of een drumgeluid
// ------------------------------------------------------------

// Tik je op de kick, de snare of de hihat, dan staan bovenaan zijn schuifjes,
// dezelfde als in les 2, in plaats van de golf van een sample. Ze worden voor
// deze les apart bewaard: wat je hier draait verandert niets in les 1 en 2, en
// andersom. Zonder bewaarde stand klinkt het drumstel zoals het begint.
const SB_DRUM_SLEUTEL = 'wotto-muziekfles-samples-drumstel';
const sbDrumEl = document.querySelector('[data-sb-drum]');
const sbSamplerEl = document.querySelector('[data-storm]');
let sbDrum = null;   // het drumgeluid dat bovenaan staat, of null voor een sample

function laadSbDrumstel() {
  let bewaard = {};
  try {
    bewaard = JSON.parse(localStorage.getItem(SB_DRUM_SLEUTEL)) || {};
  } catch (e) {
    bewaard = {};
  }
  KIT.forEach((inst) => {
    inst.schuifjes.forEach((p) => {
      const w = bewaard[inst.id] ? bewaard[inst.id][p.id] : undefined;
      stand[inst.id][p.id] = bruikbaar(w, p) ? w : p.waarde;
    });
    pasToe(inst.id);
  });
}

function bewaarSbDrumstel() {
  try {
    localStorage.setItem(SB_DRUM_SLEUTEL, JSON.stringify(stand));
  } catch (e) {
    // Geen opslag: het geldt zolang de bladzijde open is.
  }
}

// Het vak van een drumgeluid is even hoog als dat van een sample, zodat het
// bord eronder niet verspringt als je wisselt. Erin staat hetzelfde als bij
// de geluiden in les 1 en 2: links het pad in de kleur van het geluid, met
// zijn vorm (tikken speelt hem, en hij veert mee met de beat), rechts de
// schuifjes, met dezelfde vorm als knop. De drie panelen worden
// één keer gebouwd; kiezen zet er een in beeld.
function bouwSbDrumPanelen() {
  sbDrumEl.innerHTML = KIT.map((inst) => `
    <div class="sb-drum-paneel" data-sb-paneel="${inst.id}" hidden
         style="--kleur: var(--${inst.kleur}); --op-kleur: ${inst.kleur === 'blauw' ? 'var(--wit)' : 'var(--ink)'}">
      <button class="pad" type="button" data-id="${inst.id}" aria-label="Speel ${inst.naam}">
        <svg class="vorm" viewBox="0 0 100 100" aria-hidden="true">${VORMEN[inst.vorm]}</svg>
        <span class="pad-naam">${inst.naam}</span>
      </button>
      <button class="knop klein sb-drum-reset" type="button" data-sb-drum-reset="${inst.id}">Reset</button>
      <div class="sb-drum-rechts">
        <div class="schuifjes">
          ${inst.schuifjes.map((p) => `
          <div class="slider">
            <label for="sb-${inst.id}-${p.id}">${p.label}</label>
            <input type="range" id="sb-${inst.id}-${p.id}" data-sb-drum="${inst.id}" data-sb-param="${p.id}"
                   min="${p.min}" max="${p.max}" step="${p.step}">
          </div>`).join('')}
        </div>
      </div>
    </div>
  `).join('');
  // De knop van de schuifjes is een plaatje met aanhalingstekens erin; dat
  // past niet in het style-attribuut hierboven.
  KIT.forEach((inst) => {
    const paneel = sbDrumEl.querySelector('[data-sb-paneel="' + inst.id + '"]');
    paneel.style.setProperty('--knop', vormKnop(inst.vorm, inst.kleur));
    meldPad(inst.id, paneel.querySelector('.pad'));
  });
  zetSbDrumSchuiven();
}

// De schuifjes zoals de stand nu is: na laden en na een reset.
function zetSbDrumSchuiven() {
  KIT.forEach((inst) => {
    inst.schuifjes.forEach((p) => {
      sbDrumEl.querySelector('[data-sb-drum="' + inst.id + '"][data-sb-param="' + p.id + '"]').value = stand[inst.id][p.id];
    });
  });
}

function kiesSbDrum(id) {
  if (!KIT.some((i) => i.id === id)) return;
  // Zo hoog als de golf met de knoppen eronder, gemeten zolang die er staan.
  if (!sbDrum) {
    const golf = sbSamplerEl.querySelector('[data-storm-golf]').getBoundingClientRect();
    const kanalen = sbSamplerEl.querySelector('[data-storm-kanalen]').getBoundingClientRect();
    if (kanalen.bottom > golf.top) sbDrumEl.style.minHeight = Math.round(kanalen.bottom - golf.top) + 'px';
  }
  sbDrum = id;
  sbDrumEl.querySelectorAll('[data-sb-paneel]').forEach((paneel) => {
    paneel.hidden = paneel.dataset.sbPaneel !== id;
  });
  werkSbKeuzeBij();
}

// Een tik op een naam zet dat geluid bovenaan. Je hoort het alleen als de
// beat stilstaat: loopt hij, dan zou het er dwars doorheen klinken.
function tikSbNaam(naam) {
  const id = naam.dataset.sample || naam.dataset.drum;
  if (naam.dataset.sample) {
    kiesSbSample(id);
    if (!sbLoopt) raakSample(id);
  } else {
    kiesSbDrum(id);
    if (!sbLoopt) raak(id);
  }
}

// Een vakje aantikken zet zijn rij bovenaan, net als een tik op de naam, maar
// zonder het geluid nog eens te laten horen. Bouwt niets opnieuw als die rij
// er al staat.
function kiesSbRij(id) {
  const rij = SB_RIJEN.find((r) => r.id === id);
  if (rij.sample) {
    if (sbDrum || storm.gekozen !== id) kiesSbSample(id);
  } else if (sbDrum !== id) {
    kiesSbDrum(id);
  }
}

function kiesSbSample(id) {
  sbDrum = null;
  kiesStorm(id);
  werkSbKeuzeBij();
}

// Bovenaan het een of het ander, en in het bord een rand om de naam ervan.
function werkSbKeuzeBij() {
  sbSamplerEl.classList.toggle('drum-gekozen', !!sbDrum);
  sbDrumEl.hidden = !sbDrum;
  KIT.forEach((inst) => sbNamen[inst.id].classList.toggle('gekozen', sbDrum === inst.id));
  STORM_LES.kanalen.forEach((def) => werkSbSampleBij(stormKanaal(def.id)));
}

let sbVerf = null;

function sbCelVan(el) {
  const cel = el && el.closest ? el.closest('.stap') : null;
  return cel && sbBordEl.contains(cel) ? cel : null;
}

function schakelSb(cel, aan) {
  zetSbVakje(cel.dataset.rij, parseInt(cel.dataset.stap, 10), aan);
}

function isSbAan(cel) {
  return sbStand.bord[cel.dataset.rij][parseInt(cel.dataset.stap, 10)];
}

document.addEventListener('DOMContentLoaded', () => {
  if (!sbKnoppenEl || !sbBordEl || typeof speelStormStuk !== 'function') return;

  laadSbDrumstel();
  bouwSbDrumPanelen();
  laadSbStand();
  bouwSbKnoppen();
  bouwSbBord();
  toonSbSpeelknop(false);

  // De schuifjes van een sample krijgen een ruitje als knop, in de kleur van
  // dat sample, zoals de schuifjes van de drums hun eigen vorm hebben.
  VORMEN.ruit = SB_VORMEN.ruit;
  STORM_LES.kanalen.forEach((def) => {
    stormKanaal(def.id).el.style.setProperty('--knop', vormKnop(def.vorm, def.kleur));
  });

  // Opnemen: eerst de beat stil, anders neemt de microfoon hem mee op.
  bijStormOpname = stopSb;
  bijStormKanaal = werkSbSampleBij;
  STORM_LES.kanalen.forEach((def) => werkSbSampleBij(stormKanaal(def.id)));

  // Vakjes aantikken of eroverheen verven, net als in les 2.
  bijNeer(sbBordEl, sbCelVan, (cel, e) => {
    if (e.cancelable) e.preventDefault();
    sbVerf = !isSbAan(cel);
    schakelSb(cel, sbVerf);
    kiesSbRij(cel.dataset.rij);
    if (e.type === 'click') sbVerf = null;
  }, (x, y) => {
    if (sbVerf === null) return;
    const cel = sbCelVan(document.elementFromPoint(x, y));
    if (cel) schakelSb(cel, sbVerf);
  }, () => { sbVerf = null; });

  // Een naamknopje: dat geluid komt bovenaan om te bewerken.
  bijNeer(sbBordEl, (el) => (el && el.closest ? el.closest('[data-sample], [data-drum]') : null), (naam, e) => {
    if (e.cancelable) e.preventDefault();
    tikSbNaam(naam);
  });

  sbDrumEl.addEventListener('input', (e) => {
    const id = e.target.dataset.sbDrum;
    if (!id) return;
    stand[id][e.target.dataset.sbParam] = parseFloat(e.target.value);
    pasToe(id);
  });

  // Loslaten: bewaren, en meteen horen wat je gedraaid hebt.
  sbDrumEl.addEventListener('change', (e) => {
    const id = e.target.dataset.sbDrum;
    if (!id) return;
    bewaarSbDrumstel();
    raak(id);
  });

  sbDrumEl.addEventListener('click', (e) => {
    const knop = e.target.closest('[data-sb-drum-reset]');
    if (!knop) return;
    const id = knop.dataset.sbDrumReset;
    const inst = KIT.find((i) => i.id === id);
    inst.schuifjes.forEach((p) => { stand[id][p.id] = p.waarde; });
    pasToe(id);
    bewaarSbDrumstel();
    zetSbDrumSchuiven();
    raak(id);
  });

  // Enter of spatie op een vakje of op een naam.
  sbBordEl.addEventListener('click', (e) => {
    if (e.detail !== 0) return;
    const cel = sbCelVan(e.target);
    if (cel) {
      schakelSb(cel, !isSbAan(cel));
      kiesSbRij(cel.dataset.rij);
    }
    const naam = e.target.closest && e.target.closest('[data-sample], [data-drum]');
    if (naam) tikSbNaam(naam);
  });

  sbKnoppenEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-sb-start]')) {
      if (sbLoopt) stopSb(); else startSb();
    } else if (e.target.closest('[data-sb-reset]')) {
      tikSbReset();
    }
  });

  sbKnoppenEl.addEventListener('input', (e) => {
    if (e.target.matches('[data-sb-tempo]')) zetSbTempo(parseFloat(e.target.value));
  });

  sbKnoppenEl.addEventListener('change', (e) => {
    if (e.target.matches('[data-sb-tempo]')) bewaarSbStand();
  });
});
