/* De instellingen voor het geluid: het volume, en hoeveel het geluid achterloopt

   Met een bluetooth-koptelefoon of -speaker, en soms met het geluid van een
   digibord, hoor je alles een stukje later dan je het ziet. Voor vinger drummen
   is daar niets aan te doen: je tik gaat pas weg als je tikt. Maar de spellen
   die zelf een ritme afspelen weten van tevoren wanneer iets klinkt, en die
   kunnen hun beeld net zoveel laten wachten. Dan lopen beeld en geluid weer
   samen, en telt het ritmespel je tik ook op het moment dat jij het hoort.

   De juf zet het een keer op de beginpagina, onder het tandwiel. Het blijft
   bewaard in deze browser en elke les leest het hier uit. Laden na Tone.js
   (als de bladzijde geluid heeft) en voor de spellen, want die vragen
   geluidVertraging() op. */

const GELUID_SLEUTEL = 'wotto-muziekfles-geluid';

const GELUID_SCHUIVEN = [
  { id: 'volume',     label: 'Volume',     min: 0, max: 100, step: 5,  waarde: 100, achter: '%' },
  { id: 'vertraging', label: 'Vertraging', min: 0, max: 1000, step: 10, waarde: 0,  achter: 'ms' }
];

const geluidStand = {};

// Voor de test in het menu, onderaan. Hier al, omdat pasVolumeToe() hem ook
// bijstelt.
let testKlok = null;
let testUit = null;
let testLus = 0;
let testTikken = [];
let testVolgende = 0;
let testTel = 0;
GELUID_SCHUIVEN.forEach((p) => { geluidStand[p.id] = p.waarde; });

// Elke waarde apart nakijken: opslag van een oudere versie mag de bladzijde
// nooit stukmaken.
function laadGeluidStand() {
  let bewaard = null;
  try {
    bewaard = JSON.parse(localStorage.getItem(GELUID_SLEUTEL));
  } catch (e) {
    return;
  }
  if (!bewaard || typeof bewaard !== 'object') return;
  GELUID_SCHUIVEN.forEach((p) => {
    const w = parseFloat(bewaard[p.id]);
    if (isFinite(w) && w >= p.min && w <= p.max) geluidStand[p.id] = w;
  });
}

function bewaarGeluidStand() {
  try {
    localStorage.setItem(GELUID_SLEUTEL, JSON.stringify(geluidStand));
  } catch (e) {
    // Opslag kan uit staan. Dan geldt het alleen zolang de bladzijde open is.
  }
}

// In seconden, want zo rekenen de spellen met de audioklok.
function geluidVertraging() {
  return geluidStand.vertraging / 1000;
}

// Het volume in het kwadraat: dan voelt de schuif gelijkmatig aan, net als de
// volumeknop van een versterker. Op nul gaat het echt uit.
function geluidVersterking() {
  const v = geluidStand.volume / 100;
  return v * v;
}

function pasVolumeToe() {
  if (typeof Tone === 'undefined') return;
  const g = geluidVersterking();
  Tone.Destination.mute = g === 0;
  if (g > 0) Tone.Destination.volume.value = Tone.gainToDb(g);
  if (testUit) testUit.gain.value = g;
}

laadGeluidStand();
pasVolumeToe();

// Een andere tab met de beginpagina open? Dan geldt wat daar is gezet ook hier.
window.addEventListener('storage', (e) => {
  if (e.key !== GELUID_SLEUTEL) return;
  laadGeluidStand();
  pasVolumeToe();
  werkGeluidMenuBij();
});

// ============================================================
//  Het menu onder het tandwiel
// ============================================================

const geluidMenuEl = document.querySelector('[data-geluid-menu]');
const geluidKnopEl = document.querySelector('[data-geluid-knop]');

function bouwGeluidMenu() {
  if (!geluidMenuEl) return;
  const schuivenEl = geluidMenuEl.querySelector('[data-geluid-schuiven]');
  schuivenEl.innerHTML = GELUID_SCHUIVEN.map((p) => `
    <div class="klap-schuif">
      <label for="geluid-${p.id}"><span class="klap-schuif-naam">${p.label}</span><b data-toon="${p.id}"></b></label>
      <input type="range" id="geluid-${p.id}" data-geluid="${p.id}"
             min="${p.min}" max="${p.max}" step="${p.step}">
    </div>
  `).join('');
  GELUID_SCHUIVEN.forEach((p) => {
    document.getElementById('geluid-' + p.id).value = geluidStand[p.id];
  });
  werkGeluidMenuBij();

  schuivenEl.addEventListener('input', (e) => {
    const id = e.target.dataset.geluid;
    if (!id) return;
    geluidStand[id] = parseFloat(e.target.value);
    pasVolumeToe();
    werkGeluidMenuBij();
    bewaarGeluidStand();
  });

  geluidKnopEl.addEventListener('click', () => zetGeluidMenu(geluidMenuEl.hidden));
  geluidMenuEl.querySelector('[data-geluid-dicht]').addEventListener('click', () => zetGeluidMenu(false));
  geluidMenuEl.querySelector('[data-geluid-test]').addEventListener('click', wisselTest);

  // Buiten het menu tikken of op Escape drukken doet hem dicht.
  document.addEventListener('pointerdown', (e) => {
    if (geluidMenuEl.hidden) return;
    if (geluidMenuEl.contains(e.target) || geluidKnopEl.contains(e.target)) return;
    zetGeluidMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !geluidMenuEl.hidden) {
      zetGeluidMenu(false);
      geluidKnopEl.focus();
    }
  });
}

function zetGeluidMenu(open) {
  geluidMenuEl.hidden = !open;
  geluidKnopEl.setAttribute('aria-expanded', String(open));
  if (!open) stopTest();
}

function werkGeluidMenuBij() {
  if (!geluidMenuEl) return;
  GELUID_SCHUIVEN.forEach((p) => {
    const toon = geluidMenuEl.querySelector('[data-toon="' + p.id + '"]');
    if (toon) toon.textContent = geluidStand[p.id] + ' ' + p.achter;
    const schuif = document.getElementById('geluid-' + p.id);
    if (schuif && parseFloat(schuif.value) !== geluidStand[p.id]) schuif.value = geluidStand[p.id];
  });
}

// ============================================================
//  De test: een tik en een stip
// ============================================================
// Om de vertraging op het gehoor goed te zetten. Elke tel klinkt er een
// metronoomtik en knippert de stip, en de stip wacht net zo lang als de spellen hun beeld laten
// wachten. Schuif tot je ze precies tegelijk hoort en ziet. Een eigen kleine
// audiocontext, want op de beginpagina staat de rest van het geluid niet.

const TEST_TEL = 60 / 80;  // seconden tussen twee tikken: 80 bpm
const TEST_VOORUIT = 0.3;  // zo ver vooruit plannen we de tikken

function wisselTest() {
  if (testLus) stopTest();
  else startTest();
}

function startTest() {
  const Klok = window.AudioContext || window.webkitAudioContext;
  if (!Klok) return;
  if (!testKlok) {
    testKlok = new Klok();
    testUit = testKlok.createGain();
    testUit.gain.value = geluidVersterking();
    testUit.connect(testKlok.destination);
  }
  testKlok.resume();
  testTikken = [];
  testTel = 0;
  testVolgende = testKlok.currentTime + 0.1;
  const knop = geluidMenuEl.querySelector('[data-geluid-test]');
  knop.textContent = 'Stop test';
  knop.setAttribute('aria-pressed', 'true');
  testLus = requestAnimationFrame(testStap);
}

function stopTest() {
  if (!testLus) return;
  cancelAnimationFrame(testLus);
  testLus = 0;
  const knop = geluidMenuEl.querySelector('[data-geluid-test]');
  knop.textContent = 'Test';
  knop.setAttribute('aria-pressed', 'false');
  geluidMenuEl.querySelector('[data-geluid-stip]').classList.remove('aan');
}

// Een metronoom: een korte, droge tik, op de eerste tel van de maat hoger,
// zodat je de maat hoort lopen. Een driehoeksgolf die in een paar honderdste
// wegsterft; langer klinkt hij als een piepje in plaats van een tik.
const TEST_MAAT = 4;

function testTik(tijd, eerste) {
  const osc = testKlok.createOscillator();
  const env = testKlok.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(eerste ? 2000 : 1300, tijd);
  env.gain.setValueAtTime(0.0001, tijd);
  env.gain.exponentialRampToValueAtTime(eerste ? 1 : 0.7, tijd + 0.001);
  env.gain.exponentialRampToValueAtTime(0.0001, tijd + 0.035);
  osc.connect(env).connect(testUit);
  osc.start(tijd);
  osc.stop(tijd + 0.05);
}

// De stip klopt mee zoals de stipjes onder de spellen: hij veert even op, op
// de eerste tel van de maat wat meer.
function pulseerStip(stip, eerste) {
  if (!stip.animate) return;
  stip.animate([
    { transform: 'scale(1)', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { transform: 'scale(' + (eerste ? 1.6 : 1.3) + ')', offset: 0.35, easing: 'ease-out' },
    { transform: 'scale(1)' }
  ], { duration: 220 });
}

function testStap() {
  const nu = testKlok.currentTime;
  while (testVolgende < nu + TEST_VOORUIT) {
    const eerste = testTel % TEST_MAAT === 0;
    testTik(testVolgende, eerste);
    testTikken.push({ tijd: testVolgende, eerste: eerste, gezien: false });
    testVolgende += TEST_TEL;
    testTel += 1;
  }

  // De stip gaat aan op de tik plus de vertraging, net als het beeld in de
  // spellen, blijft een tiende seconde aan en veert daarbij op.
  const beeld = nu - geluidVertraging();
  const stip = geluidMenuEl.querySelector('[data-geluid-stip]');
  const tik = testTikken.find((t) => beeld >= t.tijd && beeld < t.tijd + 0.1);
  stip.classList.toggle('aan', !!tik);
  if (tik && !tik.gezien) {
    tik.gezien = true;
    pulseerStip(stip, tik.eerste);
  }
  testTikken = testTikken.filter((t) => t.tijd > beeld - 1);

  testLus = requestAnimationFrame(testStap);
}

bouwGeluidMenu();
