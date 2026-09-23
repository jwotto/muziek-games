/* Ontwerp je eigen body percussion -- een ritmevierkant dat je zelf maakt

   In de eerste body-percussionles lees je de ritmevierkanten van het werkblad.
   Hier maak je er zelf een: een bord van vier vakjes breed en twee lang. Boven
   het bord liggen de plaatjes. Sleep er een naar een vakje, of tik eerst op een
   plaatje en dan op een vakje. Een vakje mag leeg blijven: dan is het stil op
   die tel. Met de gum maak je een vakje weer leeg, en een plaatje dat je van het
   bord af sleept is ook weg.

   Druk op afspelen, dan telt hij vier tellen af en speelt hij je vierkant twee
   keer: boem is een doffe klap op je knieën, klap is de opgenomen klap uit de
   eerste les. Het vakje dat klinkt wordt geel, net als bij het lezen, en het
   plaatje dat klinkt wordt even groter. Het hele bord knikt mee op elke tel,
   ook bij een leeg vakje, zodat je de tel blijft zien.

   Onderaan krijg je een code van vier letters voor je ritme. Typ je die later
   (of op een ander scherm, zoals het digibord) weer in, dan staat je ritme er
   weer. Er is geen server: de code is het ritme zelf, zie de deelcode hieronder.

   Slepen loopt via bijNeer uit drumkit.js, net als het verven op de sequencer:
   een digibord stuurt niet altijd een nette pointerdown.

   Laden na Tone.js, drumkit.js, polka.js en lijfgeluid.js. De tik komt uit
   polka.js, boem en klap uit lijfgeluid.js. Alles hier begint met 'ow', omdat al die
   bestanden hun namen delen. */

// ============================================================
//  De plaatjes
// ============================================================

// Wat er in een vakje kan staan. Twee plaatjes in een vakje gaan allebei in die
// ene tel, twee keer zo snel dus -- net als op het werkblad.
const OW_PLAATJES = {
  boem: { bron: 'img/boem.webp', naam: 'boem' },
  klap: { bron: 'img/clap.webp', naam: 'klap' }
};

// Boem-klap en klap-boem in een tel staan er bewust niet bij: twee
// verschillende bewegingen in een halve tel is voor deze groep te moeilijk.
const OW_TEGELS = ['boem', 'klap', 'boem+boem', 'klap+klap'];

// De gum zet niets in een vakje maar maakt het leeg.
const OW_GUM = 'gum';

// Een plaatje, net als boem en klap. Het origineel staat in img/bron/gum.png.
const OW_GUM_TEKEN = '<img src="img/gum.webp" alt="" width="291" height="200" draggable="false">';

// Afspelen en stoppen, ook uitgeschreven.
const OW_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>';
const OW_STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

// Het pijltje terug voor Bord leegmaken op een telefoon, waar de woorden er
// niet meer naast passen. Hetzelfde als bij de sequencer, en dezelfde css.
const OW_LEEG_TEKEN =
  '<svg class="seq-leeg-teken" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"' +
  ' stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';

const OW_BREED = 4;
// Twee regels en niet vier: dan past het hele ritme in een code van vier
// letters. Zie de deelcode hieronder.
const OW_LANG = 2;
const OW_VAKJES = OW_BREED * OW_LANG;
const OW_RONDES = 2;              // zo vaak speelt hij het vierkant na elkaar
const OW_AANLOOP = 4;             // tellen aftellen voordat het eerste vakje komt
const OW_VOORUIT = 0.15;          // seconden dat een tel van tevoren wordt gepland
const OW_SLEEP_VANAF = 8;         // pixels die je moet bewegen voordat het slepen is

const OW_TEMPO = { min: 50, max: 160, step: 5, waarde: 80 };

// De tik op de tellen: hard bij het aftellen, zacht als je ritme speelt. Dan
// hoor je de tel ook bij een leeg vakje, maar blijft jouw ritme het hardst.
const OW_TIK_AFTELLEN = -9;
const OW_TIK_SPELEN = -22;

// ============================================================
//  Het geluid
// ============================================================

// Boem en klap staan in lijfgeluid.js, want de ritmevierkanten in les 1 spelen
// ze ook.

// Een vakje in een keer laten horen, zoals het in een tel klinkt. Voor als je
// een plaatje neerlegt of aantikt terwijl het bord stilstaat.
function owLaatHoren(inhoud) {
  if (!inhoud || inhoud === OW_GUM) return;
  const speel = () => {
    startLijfRuis();
    const t = Tone.now() + VOORSPRONG;
    const halve = 30 / owStand.bpm;
    inhoud.split('+').forEach((soort, i) => lijfGeluid(soort, t + i * halve));
  };
  if (Tone.getContext().state === 'running') speel();
  else startGeluid().then(speel).catch(() => { /* volgende tik weer */ });
}

// ============================================================
//  Wat er op het bord staat, en het onthouden
// ============================================================

const OW_SLEUTEL = 'wotto-muziekfles-ontwerp';

// Een vakje is een lege tekst of een van de tegels hierboven.
const owStand = { bpm: OW_TEMPO.waarde, vakjes: new Array(OW_VAKJES).fill('') };

function owLaad() {
  let bewaard = null;
  try {
    bewaard = JSON.parse(localStorage.getItem(OW_SLEUTEL));
  } catch (e) {
    return;
  }
  if (!bewaard || typeof bewaard !== 'object') return;

  const bpm = parseFloat(bewaard.bpm);
  if (isFinite(bpm) && bpm >= OW_TEMPO.min && bpm <= OW_TEMPO.max) owStand.bpm = bpm;

  // Elk vakje apart: wat geen tegel is wordt gewoon leeg.
  if (Array.isArray(bewaard.vakjes)) {
    for (let i = 0; i < OW_VAKJES; i++) {
      const v = bewaard.vakjes[i];
      owStand.vakjes[i] = OW_TEGELS.indexOf(v) >= 0 ? v : '';
    }
  }
}

function owBewaar() {
  try {
    localStorage.setItem(OW_SLEUTEL, JSON.stringify(owStand));
  } catch (e) {
    // Privacyvenster of volle opslag: dan onthoudt hij het gewoon niet.
  }
}

// ============================================================
//  Het scherm
// ============================================================

const owEl = document.getElementById('ontwerp');
const owKnoppenEl = owEl && owEl.querySelector('[data-ow-knoppen]');
// De knoppen om te slepen staan boven het vak, niet erin. Samen met het vak
// zitten ze in de werkplek, en daar luistert het slepen op.
const owWerkplekEl = document.querySelector('[data-ow-werkplek]') || owEl;
const owTegelsEl = document.querySelector('[data-ow-tegels]');
const owRasterEl = owEl && owEl.querySelector('[data-ow-raster]');
const owAftelEl = owEl && owEl.querySelector('[data-ow-aftellen]');
// Het delen staat onder het vak met het bord, niet erin.
const owDeelKnopEl = document.querySelector('[data-ow-deel]');
const owCodeEl = document.querySelector('[data-ow-code]');
const owLaadEl = document.querySelector('[data-ow-laad]');
const owCodeInEl = document.querySelector('[data-ow-code-in]');
const owLaadMeldingEl = document.querySelector('[data-ow-laadmelding]');

let owStartEl = null;
let owTempoEl = null;
let owBpmEl = null;

const owVakken = [];
const owTegelKnoppen = {};

// De plaatjes van een vakje of een tegel. Ze staan als img in de bladzijde, net
// als bij het lezen, zodat een schermlezer ze kan noemen.
function owPlaatjes(inhoud) {
  return inhoud.split('+').map((s) =>
    '<img src="' + OW_PLAATJES[s].bron + '" alt="" width="320" height="320" draggable="false">'
  ).join('');
}

function owNaam(inhoud) {
  if (inhoud === OW_GUM) return 'gum';
  if (!inhoud) return 'leeg';
  return inhoud.split('+').map((s) => OW_PLAATJES[s].naam).join(' en ');
}

function owBouwKnoppen() {
  owKnoppenEl.innerHTML = `
    <button class="speelknop" type="button" data-ow-start aria-label="Speel je ritme af">${OW_PLAY}</button>
    <div class="klap-schuif">
      <label for="ow-bpm">Tempo<b data-ow-bpm></b></label>
      <input type="range" id="ow-bpm" data-ow-tempo
             min="${OW_TEMPO.min}" max="${OW_TEMPO.max}" step="${OW_TEMPO.step}">
    </div>
    <button class="knop klein seq-leeg" type="button" data-ow-leeg aria-label="Bord leegmaken">
      ${OW_LEEG_TEKEN}<span class="seq-leeg-tekst">Bord leegmaken</span>
    </button>
  `;
  owStartEl = owKnoppenEl.querySelector('[data-ow-start]');
  owTempoEl = owKnoppenEl.querySelector('[data-ow-tempo]');
  owBpmEl = owKnoppenEl.querySelector('[data-ow-bpm]');
  owZetTempo(owStand.bpm);
}

function owBouwTegels() {
  OW_TEGELS.concat([OW_GUM]).forEach((inhoud) => {
    const tegel = document.createElement('button');
    tegel.type = 'button';
    tegel.className = 'ow-tegel' + (inhoud.indexOf('+') > 0 ? ' dubbel' : '') + (inhoud === OW_GUM ? ' gum' : '');
    tegel.dataset.inhoud = inhoud;
    tegel.setAttribute('aria-label', inhoud === OW_GUM ? 'Gum: maak een vakje leeg' : owNaam(inhoud));
    tegel.setAttribute('aria-pressed', 'false');
    tegel.innerHTML = inhoud === OW_GUM ? OW_GUM_TEKEN : owPlaatjes(inhoud);
    owTegelsEl.appendChild(tegel);
    owTegelKnoppen[inhoud] = tegel;
  });
}

function owBouwRaster() {
  for (let i = 0; i < OW_VAKJES; i++) {
    const vak = document.createElement('button');
    vak.type = 'button';
    vak.className = 'vierkant-vak ow-vak';
    vak.dataset.vak = i;
    owRasterEl.appendChild(vak);
    owVakken.push(vak);
    owToonVak(i);
  }
}

function owToonVak(i) {
  const vak = owVakken[i];
  const inhoud = owStand.vakjes[i];
  vak.classList.toggle('dubbel', inhoud.indexOf('+') > 0);
  vak.classList.toggle('leeg', !inhoud);
  vak.innerHTML = inhoud ? owPlaatjes(inhoud) : '';
  vak.setAttribute('aria-label', 'regel ' + (Math.floor(i / OW_BREED) + 1) + ', tel ' +
    (i % OW_BREED + 1) + ': ' + owNaam(inhoud));
}

function owZetTempo(bpm) {
  owStand.bpm = bpm;
  if (owTempoEl) owTempoEl.value = bpm;
  if (owBpmEl) owBpmEl.textContent = Math.round(bpm) + ' bpm';
}

function owToonSpeelknop(loopt) {
  if (!owStartEl) return;
  owStartEl.innerHTML = loopt ? OW_STOP : OW_PLAY;
  owStartEl.setAttribute('aria-label', loopt ? 'Stop je ritme' : 'Speel je ritme af');
  owStartEl.classList.toggle('loopt', loopt);
}

// ============================================================
//  Het bord veranderen
// ============================================================

// Een tegel neerleggen in een vakje. De gum maakt hem leeg. Staat het bord
// stil, dan hoor je meteen wat je neerlegt; loopt het, dan komt het vanzelf
// langs.
function owLeg(i, inhoud) {
  const nieuw = inhoud === OW_GUM ? '' : inhoud;
  if (owStand.vakjes[i] === nieuw) return;
  owStand.vakjes[i] = nieuw;
  owBewaar();
  owToonVak(i);
  owVeer(owVakken[i], 1.08);
  owToonCode();
  if (!owSpel) owLaatHoren(nieuw);
}

function owMaakLeeg() {
  for (let i = 0; i < OW_VAKJES; i++) {
    owStand.vakjes[i] = '';
    owToonVak(i);
  }
  owBewaar();
  owToonCode();
}

// ============================================================
//  De deelcode
// ============================================================

// Een vakje kan vijf dingen zijn, en er zijn acht vakjes: dat zijn 5 tot de
// macht 8 = 390.625 ritmes. Vier letters van A tot Z geven 26 tot de macht 4 =
// 456.976 codes, dus elk ritme past in precies een code, zonder server. Het
// tempo zit er niet in: dan waren het vijf letters geworden.
//
// Het bord wordt een getal in het vijftallig stelsel (het eerste vakje is het
// grootste cijfer) en dat getal schrijven we in letters, A = 0 tot Z = 25. Een
// leeg bord is dus AAAA. Alleen hoofdletters en geen cijfers: op een digibord
// is een O of een 0, een I of een 1, snel verkeerd overgetypt.
//
// Verander je deze lijst of het aantal vakjes, dan kloppen alle codes die er al
// zijn niet meer. Er iets bij zetten kan ook niet: dan past het niet meer in
// vier letters.
const OW_CODE_SOORTEN = ['', 'boem', 'klap', 'boem+boem', 'klap+klap'];
const OW_CODE_LETTERS = 4;
const OW_CODE_ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function owNaarCode(vakjes) {
  let getal = 0;
  vakjes.forEach((v) => { getal = getal * OW_CODE_SOORTEN.length + Math.max(0, OW_CODE_SOORTEN.indexOf(v)); });
  let code = '';
  for (let i = 0; i < OW_CODE_LETTERS; i++) {
    code = OW_CODE_ABC[getal % OW_CODE_ABC.length] + code;
    getal = Math.floor(getal / OW_CODE_ABC.length);
  }
  return code;
}

// Geeft de acht vakjes terug, of null als het geen code is. Niet elke vier
// letters zijn een ritme: boven de 390.625 houdt het op.
function owVanCode(tekst) {
  const code = String(tekst).toUpperCase().replace(/[^A-Z]/g, '');
  if (code.length !== OW_CODE_LETTERS) return null;
  let getal = 0;
  for (let i = 0; i < code.length; i++) getal = getal * OW_CODE_ABC.length + OW_CODE_ABC.indexOf(code[i]);
  if (getal >= Math.pow(OW_CODE_SOORTEN.length, OW_VAKJES)) return null;

  const vakjes = [];
  for (let i = 0; i < OW_VAKJES; i++) {
    vakjes.unshift(OW_CODE_SOORTEN[getal % OW_CODE_SOORTEN.length]);
    getal = Math.floor(getal / OW_CODE_SOORTEN.length);
  }
  return vakjes;
}

// De code staat pas in beeld als je op Deel je ritme hebt gedrukt. Daarna loopt
// hij mee met wat je verandert, zodat hij altijd bij het bord hoort.
let owCodeZichtbaar = false;

function owToonCode() {
  if (!owCodeEl) return;
  owCodeEl.hidden = !owCodeZichtbaar;
  if (!owCodeZichtbaar) return;
  const code = owNaarCode(owStand.vakjes);
  owCodeEl.querySelector('b').textContent = code;
  owCodeEl.setAttribute('aria-label', 'Jouw code: ' + code.split('').join(' '));
}

function owLaadCode() {
  const vakjes = owVanCode(owCodeInEl.value);
  if (!vakjes) {
    owLaadMeldingEl.textContent = 'Die code ken ik niet. Kijk hem nog eens na: vier letters.';
    return;
  }
  vakjes.forEach((v, i) => {
    owStand.vakjes[i] = v;
    owToonVak(i);
  });
  owBewaar();
  owToonCode();
  owVeer(owRasterEl, 1.04);
  owCodeInEl.value = '';
  owLaadMeldingEl.textContent = 'Het ritme staat op het bord!';
}

// Welke tegel je in je hand hebt als je met tikken werkt in plaats van slepen.
let owGekozen = null;

function owKies(inhoud) {
  owGekozen = owGekozen === inhoud ? null : inhoud;
  Object.keys(owTegelKnoppen).forEach((id) => {
    const aan = id === owGekozen;
    owTegelKnoppen[id].classList.toggle('gekozen', aan);
    owTegelKnoppen[id].setAttribute('aria-pressed', String(aan));
  });
  owRasterEl.classList.toggle('kiezen', !!owGekozen);
}

// Tikken zonder te slepen. Een tegel pak je op (of leg je weer terug), een
// vakje krijgt de tegel die je vasthoudt. Heb je niets vast, dan laat een vol
// vakje horen wat erin staat.
function owTik(doel) {
  if (doel.classList.contains('ow-tegel')) {
    owKies(doel.dataset.inhoud);
    if (owGekozen && !owSpel) owLaatHoren(owGekozen);
    return;
  }
  const i = parseInt(doel.dataset.vak, 10);
  if (owGekozen) owLeg(i, owGekozen);
  else if (!owSpel) owLaatHoren(owStand.vakjes[i]);
}

function owVeer(el, groei) {
  if (!el || !el.animate || minderBeweging.matches) return;
  el.animate([
    { transform: 'scale(1)', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { transform: 'scale(' + groei + ')', offset: 0.35, easing: 'ease-out' },
    { transform: 'scale(1)' }
  ], { duration: 220 });
}

// ============================================================
//  Slepen
// ============================================================

// Je pakt een tegel boven het bord of een vol vakje op het bord. Pas als je een
// stukje beweegt wordt het slepen; laat je los zonder te bewegen, dan was het
// een tik. Onder je vinger hangt een kopie van wat je vasthoudt.
//
// Van een tegel naar een vakje: neerleggen. Van een vakje naar een ander vakje:
// verplaatsen. Van een vakje naast het bord: weg.
let owPak = null;   // { doel, inhoud, vanVak, sx, sy, x, y, sleept, spook, boven }

function owZoek(el) {
  const doel = el && el.closest ? el.closest('.ow-tegel, .ow-vak') : null;
  return doel && owWerkplekEl.contains(doel) ? doel : null;
}

function owPunt(e) {
  const t = e.changedTouches && e.changedTouches[0];
  return t ? { x: t.clientX, y: t.clientY } : { x: e.clientX, y: e.clientY };
}

function owVakOnder(x, y) {
  const el = document.elementFromPoint(x, y);
  const vak = el && el.closest ? el.closest('.ow-vak') : null;
  return vak && owRasterEl.contains(vak) ? vak : null;
}

function owNeer(doel, e) {
  if (e.cancelable) e.preventDefault();

  // Een click komt zonder loslaten achteraan: daar valt niets te slepen.
  if (e.type === 'click') { owTik(doel); return; }

  const tegel = doel.classList.contains('ow-tegel');
  const p = owPunt(e);
  owPak = {
    doel: doel,
    inhoud: tegel ? doel.dataset.inhoud : owStand.vakjes[parseInt(doel.dataset.vak, 10)],
    vanVak: tegel ? -1 : parseInt(doel.dataset.vak, 10),
    sx: p.x, sy: p.y, x: p.x, y: p.y, sleept: false, spook: null, boven: null
  };
}

function owBeweeg(x, y) {
  if (!owPak) return;
  owPak.x = x;
  owPak.y = y;

  if (!owPak.sleept) {
    // Een leeg vakje valt niets van te slepen; daar blijft het een tik.
    if (!owPak.inhoud) return;
    if (Math.abs(x - owPak.sx) < OW_SLEEP_VANAF && Math.abs(y - owPak.sy) < OW_SLEEP_VANAF) return;
    owPak.sleept = true;
    owPak.spook = document.createElement('div');
    owPak.spook.className = 'ow-spook' + (owPak.inhoud.indexOf('+') > 0 ? ' dubbel' : '') +
      (owPak.inhoud === OW_GUM ? ' gum' : '');
    owPak.spook.innerHTML = owPak.inhoud === OW_GUM ? OW_GUM_TEKEN : owPlaatjes(owPak.inhoud);
    document.body.appendChild(owPak.spook);
    if (owPak.vanVak >= 0) owPak.doel.classList.add('weg');
  }

  owPak.spook.style.transform = 'translate(' + x + 'px, ' + y + 'px)';

  const vak = owVakOnder(x, y);
  if (vak !== owPak.boven) {
    if (owPak.boven) owPak.boven.classList.remove('boven');
    if (vak) vak.classList.add('boven');
    owPak.boven = vak;
  }
}

function owLos() {
  const pak = owPak;
  owPak = null;
  if (!pak) return;

  if (!pak.sleept) { owTik(pak.doel); return; }

  pak.spook.remove();
  pak.doel.classList.remove('weg');
  if (pak.boven) pak.boven.classList.remove('boven');

  const naar = owVakOnder(pak.x, pak.y);
  const naarNr = naar ? parseInt(naar.dataset.vak, 10) : -1;

  if (pak.vanVak < 0) {
    if (naar) owLeg(naarNr, pak.inhoud);
  } else if (naarNr !== pak.vanVak) {
    owLeg(pak.vanVak, '');
    if (naar) owLeg(naarNr, pak.inhoud);
  }
}

// ============================================================
//  Afspelen
// ============================================================

let owSpel = null;   // { telNr, telTijd, tellen, aanloop, aftelGetal, einde, vakAan }
let owLus = 0;

function owStart() {
  if (owSpel) return;
  if (Tone.getContext().state !== 'running') {
    startGeluid().then(owStart).catch(() => { /* volgende tik weer */ });
    return;
  }
  startLijfRuis();

  owSpel = {
    telNr: 0,
    telTijd: Tone.now() + 0.4,
    tellen: [],
    momenten: [],     // wat er op een bepaald moment moet bewegen: { tijd, doe }
    aanloop: [],
    aftelGetal: 0,
    eersteVak: 0,
    einde: 0,
    vakAan: -1
  };

  tikVol.volume.cancelScheduledValues(Tone.now());
  tikVol.volume.value = OW_TIK_AFTELLEN;

  owToonSpeelknop(true);
  owEl.querySelector('[data-ow-tempo]').disabled = true;
  owVulAan(Tone.now());
  owLus = requestAnimationFrame(owStap);
}

function owStop() {
  if (!owSpel) return;
  owSpel = null;
  cancelAnimationFrame(owLus);
  tikEnv.cancel(Tone.now());
  tikVol.volume.cancelScheduledValues(Tone.now());
  tikVol.volume.value = OW_TIK_AFTELLEN;
  owVakken.forEach((vak) => vak.classList.remove('aan'));
  owToonAftellen(0);
  owToonSpeelknop(false);
  owEl.querySelector('[data-ow-tempo]').disabled = false;
}

// Plant de tellen die binnen de vooruitblik vallen. Het vakje wordt pas hier
// gelezen, dus wat je verandert terwijl hij speelt hoor je bij de volgende keer
// dat dat vakje langskomt.
function owVulAan(nu) {
  const tel = 60 / owStand.bpm;
  const totaal = OW_AANLOOP + OW_VAKJES * OW_RONDES;

  while (owSpel.telNr < totaal && owSpel.telTijd < nu + OW_VOORUIT) {
    const nr = owSpel.telNr;
    const t = owSpel.telTijd;

    if (nr < OW_AANLOOP) {
      tik(t, nr === OW_AANLOOP - 1);
      owSpel.aanloop.push(t);
      owOpMoment(t, () => owKnik(nr === OW_AANLOOP - 1));
      // Na het aftellen gaat de tik zachter: dan is jouw ritme de muziek.
      if (nr === OW_AANLOOP - 1) tikVol.volume.setValueAtTime(OW_TIK_SPELEN, t + tel - 0.01);
    } else {
      const vak = (nr - OW_AANLOOP) % OW_VAKJES;
      if (!owSpel.eersteVak) owSpel.eersteVak = t;
      // Een hoge tik op het begin van elke regel, net als bij het lezen.
      tik(t, vak % OW_BREED === 0);
      owOpMoment(t, () => owKnik(vak % OW_BREED === 0));
      const inhoud = owStand.vakjes[vak];
      if (inhoud) {
        inhoud.split('+').forEach((soort, k) => {
          const wanneer = t + k * tel / 2;
          lijfGeluid(soort, wanneer);
          owOpMoment(wanneer, () => owGroei(vak, k, tel));
        });
      }
      owSpel.tellen.push({ vak: vak, tijd: t });
    }

    owSpel.telTijd += tel;
    owSpel.telNr += 1;
    if (owSpel.telNr === totaal) owSpel.einde = owSpel.telTijd;
  }
}

// Bewegen hoort bij het geluid en niet bij het plannen: de planner kijkt een
// stukje vooruit, dus wat er moet bewegen wacht tot de audioklok zover is.
function owOpMoment(tijd, doe) {
  owSpel.momenten.push({ tijd: tijd, doe: doe });
}

// Het bord knikt mee op elke tel, ook bij een leeg vakje en tijdens het
// aftellen. Juist bij een stille tel raak je hem anders kwijt. Op de eerste tel
// van een regel (en de laatste van het aftellen) knikt hij iets harder.
function owKnik(sterk) {
  owVeer(owRasterEl, sterk ? 1.035 : 1.018);
}

// Het plaatje dat klinkt wordt even groter. Staan er twee in een vakje, dan
// groeit het tweede een halve tel na het eerste: zo zie je de twee slagen.
// De groei past in een halve tel, anders loopt hij op een hoog tempo door de
// volgende heen.
function owGroei(vak, k, tel) {
  const img = owVakken[vak].querySelectorAll('img')[k];
  if (!img || !img.animate || minderBeweging.matches) return;
  img.animate([
    { transform: 'scale(1)', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { transform: 'scale(1.35)', offset: 0.35, easing: 'ease-out' },
    { transform: 'scale(1)' }
  ], { duration: Math.min(280, tel * 500 * 0.9) });
}

function owStap() {
  if (!owSpel) return;
  const nu = Tone.now();

  owVulAan(nu);
  owWerkAftellenBij(nu);

  // Het vakje dat nu klinkt: de nieuwste tel die al geweest is, zodat hij na een
  // haperend beeldje meteen weer goed staat.
  let nieuw = null;
  owSpel.tellen.forEach((t) => { if (nu >= t.tijd && (!nieuw || t.tijd > nieuw.tijd)) nieuw = t; });
  owSpel.tellen = owSpel.tellen.filter((t) => t.tijd > nu - 0.5);
  if (nieuw && nieuw.tijd !== owSpel.vakAan) {
    owSpel.vakAan = nieuw.tijd;
    owVakken.forEach((vak, i) => vak.classList.toggle('aan', i === nieuw.vak));
  }

  // Wat er nu moet bewegen. Is een moment al lang voorbij (de tab was even
  // weg), dan slaan we hem over: een hele rij bewegingen tegelijk inhalen helpt
  // niemand de tel te vinden.
  const later = [];
  owSpel.momenten.forEach((m) => {
    if (nu < m.tijd) later.push(m);
    else if (nu - m.tijd < 0.15) m.doe();
  });
  owSpel.momenten = later;

  if (owSpel.einde && nu >= owSpel.einde) {
    owStop();
    return;
  }
  owLus = requestAnimationFrame(owStap);
}

function owWerkAftellenBij(nu) {
  if (owSpel.eersteVak && nu >= owSpel.eersteVak) {
    if (owSpel.aftelGetal) { owSpel.aftelGetal = 0; owToonAftellen(0); }
    return;
  }
  let getal = 0;
  owSpel.aanloop.forEach((t, i) => { if (nu >= t) getal = i + 1; });
  if (getal !== owSpel.aftelGetal) {
    owSpel.aftelGetal = getal;
    owToonAftellen(getal);
  }
}

function owToonAftellen(getal) {
  if (!owAftelEl) return;
  owAftelEl.textContent = getal ? String(getal) : '';
  if (!getal || minderBeweging.matches || !owAftelEl.animate) return;
  owAftelEl.animate(
    [{ transform: 'scale(0.6)' }, { transform: 'scale(1)' }],
    { duration: 240, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
  );
}

// ============================================================
//  Aanzetten
// ============================================================

if (owEl && owKnoppenEl && owTegelsEl && owRasterEl) {
  owLaad();
  owBouwKnoppen();
  owBouwTegels();
  owBouwRaster();

  bijNeer(owWerkplekEl, owZoek, owNeer, owBeweeg, owLos);

  // Enter of spatie op een tegel of vakje: dat is een tik. Zo'n klik komt
  // zonder aanwijzer binnen (detail 0); de rest heeft bijNeer al gedaan.
  owWerkplekEl.addEventListener('click', (e) => {
    if (e.detail !== 0) return;
    const doel = owZoek(e.target);
    if (doel) owTik(doel);
  });

  owKnoppenEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-ow-start]')) {
      if (owSpel) owStop(); else owStart();
    } else if (e.target.closest('[data-ow-leeg]')) {
      owMaakLeeg();
    }
  });

  if (owDeelKnopEl && owLaadEl) {
    owDeelKnopEl.addEventListener('click', () => {
      owCodeZichtbaar = true;
      owToonCode();
      owVeer(owCodeEl.querySelector('b'), 1.1);
    });

    owLaadEl.addEventListener('submit', (e) => {
      e.preventDefault();
      owLaadCode();
    });

    // Meteen in hoofdletters, en alleen letters: dan zie je wat je typt zoals
    // het bij de ander op het scherm staat.
    owCodeInEl.addEventListener('input', () => {
      owCodeInEl.value = owCodeInEl.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, OW_CODE_LETTERS);
      owLaadMeldingEl.textContent = '';
    });
  }

  owKnoppenEl.addEventListener('input', (e) => {
    if (e.target.matches('[data-ow-tempo]')) owZetTempo(parseFloat(e.target.value));
  });
  owKnoppenEl.addEventListener('change', (e) => {
    if (e.target.matches('[data-ow-tempo]')) owBewaar();
  });

  // Escape legt de tegel die je vasthoudt weer neer.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && owGekozen) owKies(owGekozen);
  });
}
