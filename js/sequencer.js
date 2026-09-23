/* Drumstel-ritme maken -- de sequencer

   Een bord van drie rijen en acht vakjes. Elke rij is een onderdeel van het
   drumstel: kick, snare, hihat. Elk vakje is een stukje tijd, een zestiende:
   vier per tel, twee tellen op het bord. Staat een vakje aan, dan slaat dat
   onderdeel daar. Het lampje loopt van links naar rechts en begint aan het
   eind gewoon opnieuw.

   Twee tellen en niet een hele maat: acht vakjes overzie je in een keer, en
   dat is voor een eerste eigen beat precies genoeg. De beats uit de eerste
   ritmeles zijn zestien vakjes lang; hier staan hun eerste twee tellen.

   Er zijn vier borden: Rock, Afro en Electro, en Mijn beat. Elke kaart boven
   het bord is er een. Je mag ze alle vier veranderen, en wat je verandert
   blijft staan als je naar een andere kaart gaat. Een voorbeeld kun je met
   Reset bord terugzetten zoals hij was; Mijn beat begint leeg en kun je met
   Bord leegmaken weer leegmaken.

   Het afspelen werkt als in beats.js: een korte vooruitblik, zodat meespelen
   op de pads strak blijft. Het lampje kijkt naar de audioklok en niet naar de
   beeldjes, net als het ritmebord bij body percussion.

   Laden na Tone.js, drumkit.js en beats.js. Uit beats.js komen de drie
   patronen, de tekens en het flitsen van de pads; deze bladzijde heeft geen
   [data-beats], dus beats.js bouwt daar zelf niets. */

// ============================================================
//  Het bord
// ============================================================

const SEQ_STAPPEN = 8;              // acht vakjes: twee tellen
const SEQ_PER_TEL = 4;              // vier vakjes in een tel; het bord staat in groepjes van een tel
const SEQ_VOORUIT = 0.03;           // seconden dat de planner vooruit kijkt
const SEQ_TIK = 10;                 // milliseconden tussen twee rondjes van de planner
const SEQ_MAX_PER_RONDJE = 64;      // noodrem, zodat de lus nooit kan blijven hangen

const SEQ_TEMPO = { min: 60, max: 160, step: 2, waarde: 96 };

// De kaart voor je eigen beat, naast de drie uit beats.js.
const SEQ_EIGEN = 'eigen';
const SEQ_EIGEN_NAAM = 'Mijn beat';

// Een pijltje terug voor de knop naast het tempo op een telefoon, waar de
// woorden er niet meer naast passen. Inline getekend en niet uit het
// icoonlettertype, zodat er ook zonder internet iets op de knop staat.
const SEQ_LEEG_TEKEN =
  '<svg class="seq-leeg-teken" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"' +
  ' stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';

// Van boven naar beneden: hihat, snare, kick. Het hoge geluid bovenaan en het
// lage onderaan, zoals op een echt drumstel en in elk muziekprogramma.
const SEQ_RIJEN = KIT.slice().reverse();

// Een rij op het bord is een lijst van acht keer aan of uit. In beats.js staan
// de patronen als strook van x-en en punten; dat lees je makkelijker, maar een
// lijst schakel je makkelijker. Een strook mag langer zijn dan het bord: van
// de beats uit les 1 komen zo alleen de eerste twee tellen mee.
function vanStrook(strook) {
  const uit = [];
  for (let i = 0; i < SEQ_STAPPEN; i++) uit.push(strook[i] === 'x');
  return uit;
}

function naarStrook(rij) {
  return rij.map((aan) => (aan ? 'x' : '.')).join('');
}

function leegBord() {
  const bord = {};
  KIT.forEach((inst) => { bord[inst.id] = new Array(SEQ_STAPPEN).fill(false); });
  return bord;
}

function bordVanBeat(beat) {
  const bord = {};
  KIT.forEach((inst) => { bord[inst.id] = vanStrook(beat.patroon[inst.id] || ''); });
  return bord;
}

function beatMet(id) {
  return BEATS.find((beat) => beat.id === id);
}

// Hoe een kaart begint: een voorbeeld met zijn patroon, Mijn beat leeg.
function beginBord(id) {
  const beat = beatMet(id);
  return beat ? bordVanBeat(beat) : leegBord();
}

const SEQ_KAARTEN = BEATS.map((beat) => beat.id).concat([SEQ_EIGEN]);

// ============================================================
//  Wat er is ingesteld, en het onthouden
// ============================================================

// Vier borden, een per kaart, en welke er nu voor staat. Het bord dat speelt
// ís het bord van die kaart -- hetzelfde lijstje, dus elke wijziging zit er
// meteen in en blijft staan als je even naar een andere kaart kijkt.
const SEQ_SLEUTEL = 'wotto-muziekgames-les2';

const seqStand = {
  bron: SEQ_EIGEN,
  borden: {},
  bpm: SEQ_TEMPO.waarde
};
SEQ_KAARTEN.forEach((id) => { seqStand.borden[id] = beginBord(id); });

let bord = seqStand.borden[seqStand.bron];   // wat er nu op het bord staat en wat er speelt

// Elke waarde apart nakijken, net als bij de schuifjes van de kit: opslag van
// een oudere versie mag de bladzijde nooit stukmaken.
function laadSeqStand() {
  let bewaard = null;
  try {
    bewaard = JSON.parse(localStorage.getItem(SEQ_SLEUTEL));
  } catch (e) {
    return;
  }
  if (!bewaard || typeof bewaard !== 'object') return;

  const bpm = parseFloat(bewaard.bpm);
  if (isFinite(bpm) && bpm >= SEQ_TEMPO.min && bpm <= SEQ_TEMPO.max) seqStand.bpm = bpm;

  if (bewaard.borden && typeof bewaard.borden === 'object') {
    SEQ_KAARTEN.forEach((id) => {
      const rijen = bewaard.borden[id];
      if (!rijen || typeof rijen !== 'object') return;
      KIT.forEach((inst) => {
        const strook = rijen[inst.id];
        if (typeof strook === 'string' && strook.length === SEQ_STAPPEN && /^[x.]+$/.test(strook)) {
          seqStand.borden[id][inst.id] = vanStrook(strook);
        }
      });
    });
  }

  if (SEQ_KAARTEN.indexOf(bewaard.bron) >= 0) seqStand.bron = bewaard.bron;
  bord = seqStand.borden[seqStand.bron];
}

function bewaarSeqStand() {
  const borden = {};
  SEQ_KAARTEN.forEach((id) => {
    borden[id] = {};
    KIT.forEach((inst) => { borden[id][inst.id] = naarStrook(seqStand.borden[id][inst.id]); });
  });
  try {
    localStorage.setItem(SEQ_SLEUTEL, JSON.stringify({
      bron: seqStand.bron, borden: borden, bpm: seqStand.bpm
    }));
  } catch (e) {
    // Opslag kan uit staan of vol zijn. Het bord werkt gewoon door, alleen
    // zonder onthouden.
  }
}

// ============================================================
//  Het scherm
// ============================================================

const seqEl = document.getElementById('seq');
const seqKnoppenEl = document.querySelector('[data-seq-knoppen]');
const seqBordEl = seqEl && seqEl.querySelector('[data-seq-bord]');
const seqKaartenEl = document.querySelector('[data-seq-kaarten]');
// Mijn beat mag in een eigen vak staan, verderop in de zin. Is dat er niet,
// dan komt hij gewoon achter de andere drie.
const seqEigenEl = document.querySelector('[data-seq-eigen]') || seqKaartenEl;
const seqWisEl = document.querySelector('[data-wis-alles]');

// Deze staan er pas na het bouwen.
let seqStartEl = null;
let seqTempoEl = null;
let seqBpmEl = null;
let seqLeegEl = null;

const cellen = {};      // per geluid de acht vakjes
const seqKaarten = {};  // de vier kaarten onder het bord

// Afspeelknop, tempo en de terugzetknop in een regel. Het tempo komt uit
// SEQ_TEMPO, zodat het bereik maar op een plek staat.
function bouwSeqKnoppen() {
  seqKnoppenEl.innerHTML = `
    <button class="speelknop" type="button" data-seq-start aria-label="Speel de beat af">${BEAT_START}</button>
    <div class="klap-schuif">
      <label for="seq-bpm">Tempo<b data-seq-bpm></b></label>
      <input type="range" id="seq-bpm" data-seq-tempo
             min="${SEQ_TEMPO.min}" max="${SEQ_TEMPO.max}" step="${SEQ_TEMPO.step}">
    </div>
    <button class="knop klein seq-leeg" type="button" data-seq-leeg>
      ${SEQ_LEEG_TEKEN}<span class="seq-leeg-tekst"></span>
    </button>
  `;
  seqStartEl = seqKnoppenEl.querySelector('[data-seq-start]');
  seqTempoEl = seqKnoppenEl.querySelector('[data-seq-tempo]');
  seqBpmEl = seqKnoppenEl.querySelector('[data-seq-bpm]');
  seqLeegEl = seqKnoppenEl.querySelector('[data-seq-leeg]');
  zetTempo(seqStand.bpm);
  toonSpeelknop(false);
}

// Het bord: per geluid een rij, en de vakjes in groepjes van een tel. Er staan
// bewust geen telnummers boven: het gaat om wat je hoort en ziet lopen, niet
// om tellen. Alle rijen staan in een raster, dus de vakjes staan vanzelf recht
// onder elkaar.
function bouwBord() {
  const raster = document.createElement('div');
  raster.className = 'seq-raster';

  SEQ_RIJEN.forEach((inst) => {
    const rij = document.createElement('div');
    rij.className = 'seq-rij';
    rij.style.setProperty('--kleur', 'var(--' + inst.kleur + ')');
    rij.style.setProperty('--op-kleur', inst.kleur === 'blauw' ? 'var(--wit)' : 'var(--ink)');

    // Het naampilletje is hetzelfde als in les 1, en doet ook hetzelfde: erop
    // tikken speelt het geluid, en het licht mee op als dat geluid klinkt.
    const naam = document.createElement('button');
    naam.className = 'deel-titel';
    naam.type = 'button';
    naam.dataset.id = inst.id;
    naam.setAttribute('aria-label', 'Speel ' + inst.naam);
    naam.textContent = inst.naam;
    rij.appendChild(naam);
    meldPad(inst.id, naam);

    cellen[inst.id] = [];
    for (let t = 0; t < SEQ_STAPPEN / SEQ_PER_TEL; t++) {
      const tel = document.createElement('div');
      tel.className = 'seq-tel';
      for (let s = 0; s < SEQ_PER_TEL; s++) {
        const i = t * SEQ_PER_TEL + s;
        const cel = document.createElement('button');
        cel.className = 'stap';
        cel.type = 'button';
        cel.dataset.rij = inst.id;
        cel.dataset.stap = i;
        cel.setAttribute('aria-label', inst.naam + ', tel ' + (t + 1) + ', vakje ' + (s + 1));
        // Dezelfde vorm als op het pad en in de game van les 1, zodat je hem
        // overal herkent: rond is de kick, vierkant de snare, driehoek de hihat.
        cel.innerHTML = '<svg class="vorm" viewBox="0 0 100 100" aria-hidden="true">' + VORMEN[inst.vorm] + '</svg>';
        tel.appendChild(cel);
        cellen[inst.id].push(cel);
      }
      rij.appendChild(tel);
    }
    raster.appendChild(rij);
  });

  seqBordEl.appendChild(raster);
  toonBord();
}

function toonVakje(id, i) {
  cellen[id][i].setAttribute('aria-pressed', String(bord[id][i]));
}

function toonBord() {
  KIT.forEach((inst) => {
    for (let i = 0; i < SEQ_STAPPEN; i++) toonVakje(inst.id, i);
  });
}

// De vier kaarten, klein in een zin onder het bord. De kaart die op het bord
// staat is geel. Een kaart zet alleen het bord om; afspelen doe je met de
// speelknop, en loopt hij al, dan loopt hij gewoon door met het nieuwe bord.
function bouwKaarten() {
  SEQ_KAARTEN.forEach((id) => {
    const beat = beatMet(id);
    const knop = document.createElement('button');
    knop.className = 'beat';
    knop.type = 'button';
    knop.dataset.kaart = id;
    knop.innerHTML = '<span class="beat-naam">' + (beat ? beat.naam : SEQ_EIGEN_NAAM) + '</span>';
    knop.addEventListener('click', () => tikKaart(id));
    (beat ? seqKaartenEl : seqEigenEl).appendChild(knop);
    seqKaarten[id] = knop;
  });
}

function werkKaartenBij() {
  SEQ_KAARTEN.forEach((id) => {
    const knop = seqKaarten[id];
    const opBord = seqStand.bron === id;
    knop.classList.toggle('aan', opBord);
    knop.setAttribute('aria-pressed', String(opBord));
  });

  // Dezelfde knop doet bij een voorbeeld iets anders dan bij je eigen beat:
  // een voorbeeld zet je terug zoals hij was, je eigen beat maak je leeg.
  if (seqLeegEl) {
    const tekst = beatMet(seqStand.bron) ? 'Reset bord' : 'Bord leegmaken';
    seqLeegEl.querySelector('.seq-leeg-tekst').textContent = tekst;
    seqLeegEl.setAttribute('aria-label', tekst);
  }
}

function toonSpeelknop(loopt) {
  if (!seqStartEl) return;
  seqStartEl.innerHTML = loopt ? BEAT_STOP : BEAT_START;
  seqStartEl.setAttribute('aria-label', loopt ? 'Stop de beat' : 'Speel de beat af');
  seqStartEl.classList.toggle('loopt', loopt);
}

function zetTempo(bpm) {
  seqStand.bpm = bpm;
  if (seqTempoEl) seqTempoEl.value = bpm;
  if (seqBpmEl) seqBpmEl.textContent = Math.round(bpm) + ' bpm';
}

// ============================================================
//  Meeluisteren
// ============================================================

// De game onderaan (beatspel.js) hangt hier zijn oren aan, net als het spel in
// les 1 aan bijAanslag en bijSchuifje. Dit bestand weet niets van die game; het
// zegt alleen wat er gebeurt.
//
// bijVakje(id, i): een vakje is aangetikt of er is overheen geverfd, aan of
// uit maakt niet uit. bijBeatVerandert(): wat er klinkt is anders dan net, door
// een vakje, een kaart, een reset of het tempo. bijWissen(): de knop Wis
// voortgang is gebruikt.
let bijVakje = null;
let bijBeatVerandert = null;
let bijWissen = null;

function meldVerandering() { if (bijBeatVerandert) bijBeatVerandert(); }

// ============================================================
//  Het bord veranderen
// ============================================================

// Een vakje aan of uit, op het bord van de kaart die nu voor staat.
function zetVakje(id, i, aan) {
  if (bord[id][i] === aan) return;

  bord[id][i] = aan;
  bewaarSeqStand();
  toonVakje(id, i);
  meldVerandering();

  // Staat het bord stil, dan hoor je meteen wat je neerzet. Loopt hij, dan komt
  // het vanzelf langs bij de volgende ronde -- er nu nog een klap tussendoor
  // gooien zou uit de maat zijn.
  if (aan && !seq) raak(id);
  if (aan) puls(cellen[id][i], 1.15);
}

// Terug naar hoe deze kaart begon: een voorbeeld krijgt zijn patroon terug,
// Mijn beat wordt leeg. Het bord blijft hetzelfde lijstje, dus het afspelen
// merkt er niets van.
function zetBordTerug() {
  const begin = beginBord(seqStand.bron);
  KIT.forEach((inst) => {
    for (let i = 0; i < SEQ_STAPPEN; i++) bord[inst.id][i] = begin[inst.id][i];
  });
  bewaarSeqStand();
  toonBord();
  meldVerandering();
}

// Een kaart: zet dat bord voor. Staat het bord stil, dan blijft het stil; loopt
// het, dan hoor je bij de volgende stap meteen het nieuwe bord.
function tikKaart(id) {
  if (seqStand.bron === id) return;

  const beat = beatMet(id);
  seqStand.bron = id;
  bord = seqStand.borden[id];
  if (beat) zetTempo(beat.bpm);
  bewaarSeqStand();
  toonBord();
  werkKaartenBij();
  meldVerandering();
}

// ============================================================
//  Afspelen
// ============================================================

let seq = null;     // { stap, tijd, tikTimer, komend }
let seqLus = 0;

function startSeq() {
  if (seq) return;

  // Dezelfde volgorde als bij een pad: eerst zorgen dat er geluid uit mag komen.
  if (Tone.getContext().state !== 'running') {
    startGeluid().then(startSeq).catch(() => { /* volgende tik weer */ });
    return;
  }
  startRuis();

  // Een kleine aanloop, zodat de eerste stap niet al voorbij is voordat de
  // planner voor het eerst rondgaat.
  seq = { stap: 0, tijd: Tone.now() + 0.12, tikTimer: 0, komend: [] };
  seq.tikTimer = setInterval(planSeq, SEQ_TIK);
  planSeq();
  seqLus = requestAnimationFrame(seqBeeld);

  toonSpeelknop(true);
  werkKaartenBij();
}

function stopSeq() {
  if (!seq) return;
  clearInterval(seq.tikTimer);
  cancelAnimationFrame(seqLus);
  seq = null;
  wisFlitsen();
  wisLampje();
  toonSpeelknop(false);
  werkKaartenBij();
}

// Plant alles wat binnen de vooruitblik valt, en niet meer dan dat. Hij leest
// elke stap opnieuw van het bord, dus wat je aanzet terwijl hij loopt hoor je
// bij de volgende ronde meteen. Het tempo ook: dat wordt per stap uitgerekend.
function planSeq() {
  if (!seq) return;

  const stapDuur = 15 / seqStand.bpm;   // 60 / bpm / 4 zestienden

  // Is de tab even weg geweest, dan loopt de agenda achter. Niet inhalen, want
  // dan komt er een lawine van klappen tegelijk: gewoon weer aansluiten bij nu.
  if (seq.tijd < Tone.now()) seq.tijd = Tone.now() + 0.02;

  let veilig = 0;
  while (seq.tijd < Tone.now() + SEQ_VOORUIT && veilig < SEQ_MAX_PER_RONDJE) {
    const i = seq.stap % SEQ_STAPPEN;

    KIT.forEach((inst) => {
      if (!bord[inst.id][i]) return;
      speel(inst.id, seq.tijd);
      flitsStraks(inst.id, seq.tijd);
    });

    seq.komend.push({ stap: i, tijd: seq.tijd });
    seq.stap += 1;
    seq.tijd += stapDuur;
    veilig += 1;
  }
}

// Het lampje hoort bij het geluid en niet bij het plannen. Hij pakt de nieuwste
// stap die al geweest is, dus na een haperend beeldje staat hij meteen weer
// goed in plaats van achter de klank aan te lopen.
function seqBeeld() {
  if (!seq) return;
  const nu = Tone.now();

  let nieuw = null;
  seq.komend.forEach((k) => {
    if (nu >= k.tijd && (!nieuw || k.tijd > nieuw.tijd)) nieuw = k;
  });
  if (nieuw && nieuw.stap !== lampjeStap) toonLampje(nieuw.stap);
  seq.komend = seq.komend.filter((k) => k.tijd > nu);

  seqLus = requestAnimationFrame(seqBeeld);
}

// ============================================================
//  Het lampje
// ============================================================

let lampjeStap = -1;

// De hele kolom wordt groen (zie .stap.nu in de css). Een vol vakje veert
// daarbij op, en de vorm erin nog iets meer: dezelfde puls als op het pad, zo
// zie je aan het bord welke noot je hoort.
function toonLampje(stap) {
  wisLampje();
  lampjeStap = stap;
  KIT.forEach((inst) => {
    const cel = cellen[inst.id][stap];
    cel.classList.add('nu');
    if (!bord[inst.id][stap]) return;
    puls(cel, 1.12);
    puls(cel.querySelector('.vorm'), 1.35);
  });
}

function wisLampje() {
  if (lampjeStap < 0) return;
  KIT.forEach((inst) => cellen[inst.id][lampjeStap].classList.remove('nu'));
  lampjeStap = -1;
}

// Via de animatie-API en niet via een class, want dan begint de puls opnieuw
// ook als de vorige nog bezig is. De bounce zit alleen op het uitzetten.
function puls(el, groei) {
  if (!el || !el.animate || minderBeweging.matches) return;
  el.animate([
    { transform: 'scale(1)', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    { transform: 'scale(' + groei + ')', offset: 0.35, easing: 'ease-out' },
    { transform: 'scale(1)' }
  ], { duration: 240 });
}

// ============================================================
//  Alles wissen
// ============================================================

// Terug naar het begin: alle vier de borden zoals ze begonnen, het tempo terug
// en de geluiden zoals ze waren. Handig als de volgende klas achter dezelfde
// computer gaat zitten.
function wisAlles() {
  stopSeq();
  SEQ_KAARTEN.forEach((id) => { seqStand.borden[id] = beginBord(id); });
  seqStand.bron = SEQ_EIGEN;
  bord = seqStand.borden[SEQ_EIGEN];
  zetTempo(SEQ_TEMPO.waarde);
  bewaarSeqStand();

  if (typeof zetTerug === 'function') KIT.forEach((inst) => zetTerug(inst.id));

  toonBord();
  werkKaartenBij();
  if (bijWissen) bijWissen();
}

// Wissen vraagt eerst even door, net als in les 1: twee keer tikken, en geen
// vensterknopje van de browser, want dat legt de audio stil.
let wisTimer = 0;

function ontwapenWissen() {
  clearTimeout(wisTimer);
  wisTimer = 0;
  if (seqWisEl) seqWisEl.textContent = 'Wis voortgang';
}

// ============================================================
//  Klikken, tikken en verven
// ============================================================

// Je kunt een vakje aantikken, maar ook met je vinger of de muis over een rij
// heen strijken: het eerste vakje bepaalt of je aan het aanzetten of uitzetten
// bent, en de rest volgt. Bij aanraken blijft de aanwijzer aan het eerste
// vakje hangen, dus we kijken zelf wat er onder de vinger zit.
let verf = null;

function celVan(el) {
  const cel = el && el.closest ? el.closest('.stap') : null;
  return cel && seqBordEl.contains(cel) ? cel : null;
}

function schakel(cel, aan) {
  const i = parseInt(cel.dataset.stap, 10);
  if (bijVakje) bijVakje(cel.dataset.rij, i);
  zetVakje(cel.dataset.rij, i, aan);
}

function isAan(cel) {
  return bord[cel.dataset.rij][parseInt(cel.dataset.stap, 10)];
}

// ============================================================
//  Aanzetten
// ============================================================

if (seqEl && seqKnoppenEl && seqBordEl && seqKaartenEl) {
  laadSeqStand();

  bouwSeqKnoppen();
  bouwBord();
  bouwKaarten();
  werkKaartenBij();

  // Indrukken zet het vakje om, en wie doorsleept verft de vakjes waar hij
  // overheen komt in dezelfde stand. bijNeer (drumkit.js) vangt op dat een
  // digibord of een oude browser geen nette pointerdown stuurt.
  bijNeer(seqBordEl, celVan, (cel, e) => {
    // Geen slepen en selecteren. De focus mag weg: met het toetsenbord kom je
    // er via Tab gewoon weer bij.
    if (e.cancelable) e.preventDefault();
    verf = !isAan(cel);
    schakel(cel, verf);
    // Een click heeft geen loslaten meer na zich, dus daar valt niets te slepen.
    if (e.type === 'click') verf = null;
  }, (x, y) => {
    if (verf === null) return;
    const cel = celVan(document.elementFromPoint(x, y));
    if (cel) schakel(cel, verf);
  }, () => { verf = null; });

  // Enter of spatie op een vakje. Zo'n klik komt zonder aanwijzer binnen
  // (detail 0); een klik met aanwijzer is hierboven al afgehandeld.
  seqBordEl.addEventListener('click', (e) => {
    if (e.detail !== 0) return;
    const cel = celVan(e.target);
    if (cel) schakel(cel, !isAan(cel));
  });

  seqKnoppenEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-seq-start]')) {
      if (seq) stopSeq(); else startSeq();
    } else if (e.target.closest('[data-seq-leeg]')) {
      zetBordTerug();
    }
  });

  seqKnoppenEl.addEventListener('input', (e) => {
    if (!e.target.matches('[data-seq-tempo]')) return;
    zetTempo(parseFloat(e.target.value));
    meldVerandering();
  });

  // Loslaten: dan pas bewaren, niet tientallen keren per seconde.
  seqKnoppenEl.addEventListener('change', (e) => {
    if (e.target.matches('[data-seq-tempo]')) bewaarSeqStand();
  });

  if (seqWisEl) {
    seqWisEl.addEventListener('click', () => {
      if (wisTimer) {
        ontwapenWissen();
        wisAlles();
        return;
      }
      seqWisEl.textContent = 'Zeker?';
      wisTimer = setTimeout(ontwapenWissen, 3000);
    });
  }
}
