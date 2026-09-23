/* Speel je eigen beat -- de game onderaan de tweede ritmeles

   Dezelfde game als in les 1: er vallen vormen naar beneden, en je raakt ze
   als ze op de lege vorm onderaan staan. Maar nu valt er precies wat jij op het
   bord hebt gezet, vier maten lang en op het tempo van het bord. Het bord is
   twee tellen, dus in vier maten komt hij acht keer langs.

   Je score is hoeveel noten je raakt. Hoe strak je zat zie je aan het oordeel
   (Perfect, Goed, Net), maar voor de score telt alleen raak. Je beste score hoort
   bij de beat waarmee je hem haalde: verander je de beat -- een vakje, een
   kaart, een reset of het tempo -- dan begint hij weer bij nul. De geluiden
   veranderen mag wel, want dan speel je nog steeds hetzelfde ritme.

   Hoeveel hartjes je krijgt kies je zelf, van 1 tot 10.

   De game zit op slot tot je elk vakje op het bord en elk schuifje van de
   geluiden een keer hebt aangeraakt. Tot die tijd staat hij er niet, net als
   de game in les 1.

   Het spel speelt zelf geen drums, alleen een tik op elke tel. Jouw aanslag
   maakt het geluid, via bijAanslag in drumkit.js, dus toetsenbord, muis en
   aanraken werken alle drie vanzelf mee.

   Laden na Tone.js, drumkit.js, polka.js, beats.js, melding.js en
   sequencer.js. Van polka.js gebruiken we alleen de tik. Alles hier heeft een
   eigen naam met 'eb' ervoor, omdat al die bestanden hun namen delen: twee keer
   dezelfde const is een syntaxfout en dan doet de hele les niets meer. */

// ============================================================
//  Regels van het spel
// ============================================================

const EB_MATEN = 4;
const EB_TELLEN = 4;            // tellen in een maat
const EB_AANLOOP = 4;           // een maat meetellen voordat de eerste noot komt
const EB_VOORUIT = 2.5;         // seconden dat een noot van tevoren te zien is, als het kan
const EB_VOORUIT_MIN = 0.7;     // en nooit korter dan dit, anders zie je hem niet aankomen
const EB_DOEL_ONDER = 48;       // hoogte van de doelvorm, in pixels vanaf de onderkant

// Hoe dicht je erbij moet zitten. Dezelfde grenzen als in les 1, maar hier
// levert elke raak een punt op: de naam zegt alleen hoe strak het was.
const EB_VENSTERS = [
  { grens: 0.045, naam: 'Perfect' },
  { grens: 0.090, naam: 'Goed' },
  { grens: 0.150, naam: 'Net' }
];
const EB_MIS_NA = 0.15;         // daarna telt de noot als gemist

// De tik op de tellen: hard bij het aftellen, zachter als je speelt. Dan hoor
// je het tempo wel, maar blijft jouw beat het hardst.
const EB_TIK_AFTELLEN = -9;
const EB_TIK_SPELEN = -20;

const EB_HARTJES = { min: 1, max: 10, waarde: 3 };

// Staan er meer hartjes dan dit, dan worden ze kleiner en gaan ze in twee
// rijtjes: tien onder elkaar is hoger dan het veld.
const EB_VEEL_HARTJES = 5;

// Wat je allemaal een keer aangeraakt moet hebben: elk vakje op het bord
// (vakje.kick.0 tot en met vakje.hihat.7, via bijVakje in sequencer.js) en elk
// schuifje van de geluiden (kick.toon enzovoort, via bijSchuifje in drumkit.js).
// Aan of uit maakt niet uit, en op welke kaart ook niet: je hebt hem geprobeerd.
const EB_PROBEREN = [];
KIT.forEach((inst) => {
  for (let i = 0; i < SEQ_STAPPEN; i++) EB_PROBEREN.push('vakje.' + inst.id + '.' + i);
  inst.schuifjes.forEach((s) => EB_PROBEREN.push(inst.id + '.' + s.id));
});

// ============================================================
//  Onthouden
// ============================================================

// Wat je hebt geprobeerd, hoeveel hartjes je wilt, en je beste score met de
// beat waar hij bij hoort.
const EB_SLEUTEL = 'wotto-muziekgames-les2-spel';

function ebLegeStand() {
  return { geprobeerd: [], hartjes: EB_HARTJES.waarde, beat: '', record: 0 };
}

// Elke waarde apart nakijken, net als overal: opslag van een oudere versie mag
// de bladzijde nooit stukmaken.
function ebLaad() {
  const stand = ebLegeStand();
  let bewaard = null;
  try {
    bewaard = JSON.parse(localStorage.getItem(EB_SLEUTEL));
  } catch (e) {
    return stand;
  }
  if (!bewaard || typeof bewaard !== 'object') return stand;

  if (Array.isArray(bewaard.geprobeerd)) {
    bewaard.geprobeerd.forEach((naam) => {
      if (EB_PROBEREN.indexOf(naam) >= 0 && stand.geprobeerd.indexOf(naam) < 0) stand.geprobeerd.push(naam);
    });
  }

  const hartjes = parseInt(bewaard.hartjes, 10);
  if (isFinite(hartjes) && hartjes >= EB_HARTJES.min && hartjes <= EB_HARTJES.max) stand.hartjes = hartjes;

  const record = parseInt(bewaard.record, 10);
  if (typeof bewaard.beat === 'string' && isFinite(record) && record >= 0) {
    stand.beat = bewaard.beat;
    stand.record = record;
  }
  return stand;
}

function ebBewaar() {
  try {
    localStorage.setItem(EB_SLEUTEL, JSON.stringify(ebStand));
  } catch (e) {
    // Opslag kan uit staan of vol zijn. Het spel werkt gewoon door.
  }
}

let ebStand = ebLaad();

// Wat er nu klinkt, als een regel tekst: de drie rijen van het bord en het
// tempo. Is die anders dan de beat bij je record, dan is je beat veranderd.
function ebBeatNu() {
  return KIT.map((inst) => naarStrook(bord[inst.id])).join('|') + '@' + seqStand.bpm;
}

// Je record hoort bij een beat. Zodra wat er klinkt niet meer die beat is, gaat
// hij terug naar nul. Terugzetten brengt hem niet terug: het is een nieuwe beat.
function ebKijkBeat() {
  const nu = ebBeatNu();
  if (ebStand.beat === nu) return;
  ebStand.beat = nu;
  ebStand.record = 0;
  ebBewaar();
}

// ============================================================
//  Het scherm
// ============================================================

const ebEl = document.getElementById('beatspel');
const ebBlokEl = document.querySelector('[data-spelblok]');
const ebBanenEl = ebEl && ebEl.querySelector('[data-banen]');
const ebKnoppenEl = ebEl && ebEl.querySelector('[data-knoppen]');
const ebVeldEl = ebEl && ebEl.querySelector('.spel-veld');
const ebScoreEl = ebEl && ebEl.querySelector('[data-score]');
const ebTotaalEl = ebEl && ebEl.querySelector('[data-totaal]');
const ebRecordEl = ebEl && ebEl.querySelector('[data-record]');
const ebBpmEl = ebEl && ebEl.querySelector('[data-bpm]');
const ebHartjesEl = ebEl && ebEl.querySelector('[data-hartjes]');
const ebOordeelEl = ebEl && ebEl.querySelector('[data-oordeel]');
const ebAftelEl = ebEl && ebEl.querySelector('[data-aftellen]');
const ebKaartEl = ebEl && ebEl.querySelector('[data-kaart]');
const ebKaartCijfersEl = ebEl && ebEl.querySelector('[data-kaart-cijfers]');
const ebKaartTekstEl = ebEl && ebEl.querySelector('[data-kaart-tekst]');
const ebKaartKnopEl = ebEl && ebEl.querySelector('[data-kaart-knop]');
const ebLevensEl = ebEl && ebEl.querySelector('[data-levens]');
const ebLevensGetalEl = ebEl && ebEl.querySelector('[data-levens-getal]');

const ebBanen = {};

// Drie banen met een knop eronder, precies zoals in les 1: dezelfde vormen,
// dezelfde kleuren en dezelfde toetsen.
function ebBouwBanen() {
  KIT.forEach((inst) => {
    const kleuren = (el) => {
      el.style.setProperty('--kleur', 'var(--' + inst.kleur + ')');
      el.style.setProperty('--op-kleur', inst.kleur === 'blauw' ? 'var(--wit)' : 'var(--ink)');
    };

    const baan = document.createElement('div');
    baan.className = 'baan';
    kleuren(baan);
    baan.innerHTML =
      '<span class="baan-doel"><svg viewBox="0 0 100 100" aria-hidden="true">' + VORMEN[inst.vorm] + '</svg></span>' +
      '<div class="baan-noten"></div>';
    ebBanenEl.appendChild(baan);
    ebBanen[inst.id] = { el: baan, noten: baan.querySelector('.baan-noten'), vorm: inst.vorm };

    const knop = document.createElement('button');
    knop.className = 'pad spel-knop';
    knop.type = 'button';
    knop.dataset.id = inst.id;
    knop.setAttribute('aria-label', 'Speel ' + inst.naam);
    kleuren(knop);
    knop.innerHTML =
      '<svg class="vorm" viewBox="0 0 100 100" aria-hidden="true">' + VORMEN[inst.vorm] + '</svg>' +
      '<span class="pad-toets">' + inst.toetsLabel + '</span>';
    ebKnoppenEl.appendChild(knop);
    meldPad(inst.id, knop);
  });
}

// ============================================================
//  Het slot
// ============================================================

function ebOpen() { return ebStand.geprobeerd.length >= EB_PROBEREN.length; }

function ebWerkSlotBij() {
  if (ebBlokEl) ebBlokEl.hidden = !ebOpen();
}

// Elk ding telt een keer. Is het het laatste, dan gaat de game open, groot in
// beeld, want je bent dan ergens bovenaan de bladzijde bezig.
function ebGeprobeerd(naam) {
  if (EB_PROBEREN.indexOf(naam) < 0) return;
  if (ebStand.geprobeerd.indexOf(naam) >= 0) return;

  ebStand.geprobeerd.push(naam);
  ebBewaar();

  if (ebOpen()) {
    ebWerkSlotBij();
    ebToonStartkaart();
    meld('Game vrijgespeeld!', 'Helemaal onderaan: speel je eigen beat.');
  }
}

// ============================================================
//  De noten van jouw beat
// ============================================================

// Het bord vier maten lang uitgeschreven. Elke noot krijgt zijn eigen venster:
// staan er in een baan twee noten vlak na elkaar (een hihat op elk vakje op een
// hoog tempo), dan mogen hun vensters niet over elkaar heen vallen, anders weet
// je niet meer welke je raakte. Dan knijpt het venster tot net onder de helft.
function ebNotenVanBord(begin, stapDuur) {
  const noten = [];
  const stappen = EB_MATEN * EB_TELLEN * SEQ_PER_TEL;
  for (let s = 0; s < stappen; s++) {
    const i = s % SEQ_STAPPEN;
    KIT.forEach((inst) => {
      if (bord[inst.id][i]) noten.push({ id: inst.id, tijd: begin + s * stapDuur, grens: EB_MIS_NA });
    });
  }

  KIT.forEach((inst) => {
    const baan = noten.filter((n) => n.id === inst.id);
    baan.forEach((n, k) => {
      const voor = k > 0 ? n.tijd - baan[k - 1].tijd : Infinity;
      const na = k < baan.length - 1 ? baan[k + 1].tijd - n.tijd : Infinity;
      n.grens = Math.min(EB_MIS_NA, Math.min(voor, na) * 0.45);
    });
  });
  return noten;
}

// Hoe lang een noot in beeld is. In les 1 valt er een per tel, maar jouw beat
// kan een hihat op elk vakje hebben, en dan liggen de vormen met 2,5 seconden
// over elkaar heen. Dan vallen ze sneller: zo snel dat er tussen de twee
// dichtste noten in een baan altijd iets meer dan een vorm ruimte zit.
function ebVooruit(plan) {
  let kleinste = Infinity;
  KIT.forEach((inst) => {
    const baan = plan.filter((n) => n.id === inst.id);
    for (let k = 1; k < baan.length; k++) kleinste = Math.min(kleinste, baan[k].tijd - baan[k - 1].tijd);
  });
  const doel = ebBanenEl.querySelector('.baan-doel');
  const vorm = doel ? doel.clientWidth : 52;
  const val = ebBanenEl.firstElementChild ? ebBanenEl.firstElementChild.clientHeight - EB_DOEL_ONDER : 0;
  if (!isFinite(kleinste) || !val) return EB_VOORUIT;
  return Math.max(EB_VOORUIT_MIN, Math.min(EB_VOORUIT, kleinste * val / (vorm * 1.2)));
}

// Hoeveel noten er vallen als je nu op start drukt.
function ebAantalNoten() {
  let perRonde = 0;
  KIT.forEach((inst) => bord[inst.id].forEach((aan) => { if (aan) perRonde += 1; }));
  return perRonde * (EB_MATEN * EB_TELLEN * SEQ_PER_TEL / SEQ_STAPPEN);
}

// ============================================================
//  Verloop
// ============================================================

let ebSpel = null;
let ebLus = 0;

function ebStart() {
  if (!ebEl || !ebOpen() || !ebAantalNoten()) return;
  cancelAnimationFrame(ebLus);

  // Eerst zorgen dat er geluid uit mag komen, net als bij het bord.
  if (Tone.getContext().state !== 'running') {
    startGeluid().then(ebStart).catch(() => { /* volgende tik weer */ });
    return;
  }

  // Het bord mag niet door je beurt heen blijven spelen: dan speel je niet zelf.
  stopSeq();
  ebKijkBeat();

  const tel = 60 / seqStand.bpm;
  const begin = Tone.now() + 0.6;
  const eersteNoot = begin + EB_AANLOOP * tel;
  const plan = ebNotenVanBord(eersteNoot, tel / SEQ_PER_TEL);

  ebSpel = {
    loopt: true,
    beat: ebBeatNu(),
    tel: tel,
    begin: begin,
    eersteNoot: eersteNoot,
    // Na de laatste tel nog even, zodat de laatste noot zijn venster uit kan.
    eind: eersteNoot + EB_MATEN * EB_TELLEN * tel + EB_MIS_NA,
    tikNr: 0,
    plan: plan,
    vooruit: ebVooruit(plan),
    volgende: 0,      // de eerste noot uit plan die nog niet in beeld staat
    noten: [],        // wat er nu valt
    totaal: plan.length,
    geraakt: 0,
    gemist: 0,
    hartjes: ebStand.hartjes,
    maxHartjes: ebStand.hartjes,
    aftelGetal: 0,
    aftelKlaar: false,
    recordBijStart: ebStand.record
  };

  tikVol.volume.cancelScheduledValues(Tone.now());
  tikVol.volume.value = EB_TIK_AFTELLEN;
  tikVol.volume.setValueAtTime(EB_TIK_SPELEN, eersteNoot - 0.01);

  ebKaartEl.hidden = true;
  ebLevensEl.disabled = true;
  ebToonAftellen(0);
  ebToonOordeel('');
  ebWerkBalkBij();
  ebLus = requestAnimationFrame(ebStap);
}

// Het einde van een beurt. uitkomst is 'klaar' (alle vier de maten gespeeld),
// 'op' (geen hartjes meer) of 'anders' (de beat is onder je handen veranderd).
function ebStop(uitkomst) {
  if (!ebSpel || !ebSpel.loopt) return;
  ebSpel.loopt = false;
  cancelAnimationFrame(ebLus);
  ebSpel.noten.forEach((noot) => noot.el.remove());
  ebSpel.noten = [];
  ebToonAftellen(0);
  ebLevensEl.disabled = false;

  // De tikken staan al vooruit gepland; die zouden anders doorlopen.
  tikEnv.cancel(Tone.now());
  tikVol.volume.cancelScheduledValues(Tone.now());
  tikVol.volume.value = EB_TIK_AFTELLEN;

  if (uitkomst === 'anders') {
    ebWerkBalkBij();
    ebToonKaart('Je beat is veranderd',
      '',
      'Dus je beste score begint weer bij nul.<br>Speel je nieuwe beat!',
      'Start');
    return;
  }

  const nieuwRecord = ebSpel.geraakt > ebSpel.recordBijStart;
  if (nieuwRecord) {
    ebStand.record = ebSpel.geraakt;
    ebBewaar();
  }
  ebWerkBalkBij();

  let titel = 'Klaar!';
  if (uitkomst === 'op') titel = 'Game over';
  else if (ebSpel.geraakt === ebSpel.totaal) titel = 'Alles raak!';
  else if (nieuwRecord) titel = 'Nieuw record!';

  let tekst = 'Je raakte ' + ebSpel.geraakt + ' van de ' + ebSpel.totaal + ' noten.';
  if (uitkomst === 'op') tekst += '<br>Je hartjes waren op. Neem er meer, of probeer het nog eens.';

  ebToonKaart(titel,
    '<div class="cijfer"><span>jouw score</span><b>' + ebSpel.geraakt + '</b></div>' +
    '<div class="cijfer beste"><span>beste met deze beat</span><b>' + ebStand.record + '</b></div>',
    tekst,
    'Nog een keer');

  if (uitkomst === 'klaar' && (nieuwRecord || ebSpel.geraakt === ebSpel.totaal)) confetti(44, ebVeldEl);
}

// De tik op elke tel, en een hogere op de eerste tel van elke maat: dan hoor je
// waar de maat begint. Bij het aftellen gaat de hoge juist op de laatste tel,
// net als in les 1: daarna val je in.
function ebPlanTikken(nu) {
  const tellen = EB_AANLOOP + EB_MATEN * EB_TELLEN;
  while (ebSpel.tikNr < tellen && ebSpel.begin + ebSpel.tikNr * ebSpel.tel < nu + 0.1) {
    const nr = ebSpel.tikNr;
    const hoog = nr < EB_AANLOOP ? nr === EB_AANLOOP - 1 : (nr - EB_AANLOOP) % EB_TELLEN === 0;
    tik(ebSpel.begin + nr * ebSpel.tel, hoog);
    ebSpel.tikNr += 1;
  }
}

function ebMaakNoot(noot) {
  const el = document.createElement('span');
  el.className = 'noot';
  el.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true">' + VORMEN[ebBanen[noot.id].vorm] + '</svg>';
  ebBanen[noot.id].noten.appendChild(el);
  noot.el = el;
  noot.gehaald = false;
  return noot;
}

function ebWerkAftellenBij(nu) {
  if (ebSpel.aftelKlaar || !ebAftelEl) return;
  if (nu >= ebSpel.eersteNoot) {
    ebSpel.aftelKlaar = true;
    ebToonAftellen(0);
    return;
  }
  const getal = nu >= ebSpel.begin ? Math.min(EB_AANLOOP, Math.floor((nu - ebSpel.begin) / ebSpel.tel) + 1) : 0;
  if (getal !== ebSpel.aftelGetal) {
    ebSpel.aftelGetal = getal;
    ebToonAftellen(getal);
  }
}

function ebToonAftellen(getal) {
  if (!ebAftelEl) return;
  ebAftelEl.textContent = getal ? String(getal) : '';
  if (!getal || minderBeweging.matches || !ebAftelEl.animate) return;
  ebAftelEl.animate(
    [{ transform: 'scale(0.6)' }, { transform: 'scale(1)' }],
    { duration: 240, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
  );
}

function ebStap() {
  if (!ebSpel || !ebSpel.loopt) return;
  const nu = Tone.now();

  ebPlanTikken(nu);
  ebWerkAftellenBij(nu);

  while (ebSpel.volgende < ebSpel.plan.length && ebSpel.plan[ebSpel.volgende].tijd < nu + ebSpel.vooruit) {
    ebSpel.noten.push(ebMaakNoot(ebSpel.plan[ebSpel.volgende]));
    ebSpel.volgende += 1;
  }

  // Van boven naar beneden, precies als in les 1: op het moment dat een noot aan
  // de beurt is staat hij op de doelvorm.
  const hoogte = ebBanenEl.firstElementChild ? ebBanenEl.firstElementChild.clientHeight : 0;
  const doelY = hoogte - EB_DOEL_ONDER;
  const over = [];

  ebSpel.noten.forEach((noot) => {
    if (!ebSpel.loopt) return;
    if (noot.tijd + noot.grens < nu) {
      noot.el.remove();
      ebMis(noot.betaald);
      return;
    }
    const deel = (noot.tijd - nu) / ebSpel.vooruit;
    noot.el.style.transform = 'translateY(' + (doelY - deel * doelY) + 'px)';
    over.push(noot);
  });
  if (!ebSpel.loopt) return;
  ebSpel.noten = over;

  if (nu >= ebSpel.eind && ebSpel.volgende >= ebSpel.plan.length && !ebSpel.noten.length) {
    ebStop('klaar');
    return;
  }

  ebLus = requestAnimationFrame(ebStap);
}

// betaald: je hebt er net al een hartje voor ingeleverd met een misklik, zie
// ebBeoordeel. De mis telt dan nog wel, maar kost geen tweede hartje.
function ebMis(betaald) {
  ebSpel.gemist += 1;
  if (!betaald) ebSpel.hartjes -= 1;
  ebToonOordeel('Mis');
  ebWerkBalkBij();
  if (ebSpel.hartjes <= 0) ebStop('op');
}

// ============================================================
//  Meeluisteren met de aanslagen
// ============================================================

function ebDichtstbij(id, wanneer) {
  let beste = null;
  ebSpel.noten.forEach((noot) => {
    if (noot.id !== id || noot.gehaald) return;
    if (!beste || Math.abs(noot.tijd - wanneer) < Math.abs(beste.tijd - wanneer)) beste = noot;
  });
  return beste;
}

function ebBeoordeel(id, wanneer) {
  if (!ebSpel || !ebSpel.loopt) return null;

  // Tijdens het aftellen mag je vrij op de pads tikken.
  if (wanneer < ebSpel.eersteNoot - EB_MIS_NA) return null;

  const noot = ebDichtstbij(id, wanneer);
  const afwijking = noot ? Math.abs(noot.tijd - wanneer) : Infinity;

  if (!noot || afwijking > noot.grens) {
    // Slaan waar geen noot is kost een hartje, net als in les 1: anders kun je
    // gewoon alle drie de toetsen blijven rammen. Maar een fout is een hartje,
    // geen twee: de noot waar je net naast sloeg kost straks niets meer.
    if (noot && afwijking < ebSpel.tel) noot.betaald = true;
    ebSpel.hartjes -= 1;
    ebToonOordeel('Naast');
    ebWerkBalkBij();
    if (ebSpel.hartjes <= 0) ebStop('op');
    return 'Naast';
  }

  // Het venster van deze noot kan smaller zijn dan normaal; de drie oordelen
  // knijpen dan even hard mee.
  const schaal = noot.grens / EB_MIS_NA;
  const venster = EB_VENSTERS.find((v) => afwijking <= v.grens * schaal) || EB_VENSTERS[EB_VENSTERS.length - 1];
  ebSpel.geraakt += 1;
  noot.gehaald = true;
  noot.el.classList.add('raak');
  const weg = noot.el;
  setTimeout(() => weg.remove(), 180);
  ebSpel.noten = ebSpel.noten.filter((n) => n !== noot);

  ebToonOordeel(venster.naam);
  ebWerkBalkBij();
  return venster.naam;
}

// ============================================================
//  Balk en kaart
// ============================================================

// Werkt ook als er geen spel loopt: dan zie je hoeveel hartjes je krijgt,
// hoeveel noten er gaan vallen en op welk tempo.
function ebWerkBalkBij() {
  if (!ebEl) return;
  const bezig = !!(ebSpel && ebSpel.loopt);
  const heel = ebSpel ? ebSpel.maxHartjes : ebStand.hartjes;
  const over = ebSpel ? Math.max(0, ebSpel.hartjes) : ebStand.hartjes;

  ebScoreEl.textContent = ebSpel ? ebSpel.geraakt : 0;
  ebTotaalEl.textContent = ebSpel ? ebSpel.totaal : ebAantalNoten();
  ebBpmEl.textContent = Math.round(seqStand.bpm);
  // De topscore loopt live mee, zodat je hem ziet sneuvelen terwijl je speelt.
  ebRecordEl.textContent = bezig ? Math.max(ebStand.record, ebSpel.geraakt) : ebStand.record;

  let hartjes = '';
  for (let i = 0; i < heel; i++) {
    hartjes += i < over
      ? '<i class="ph-bold ph-heart heel" aria-hidden="true"></i>'
      : '<i class="ph-bold ph-heart-break kwijt" aria-hidden="true"></i>';
  }
  ebHartjesEl.innerHTML = hartjes;
  ebHartjesEl.classList.toggle('veel', heel > EB_VEEL_HARTJES);
  ebHartjesEl.setAttribute('aria-label', over + ' van de ' + heel + ' hartjes over');
}

let ebOordeelTimer = 0;

function ebToonOordeel(tekst) {
  if (!ebOordeelEl) return;
  ebOordeelEl.textContent = tekst;
  ebOordeelEl.dataset.soort = tekst.toLowerCase();
  clearTimeout(ebOordeelTimer);
  if (tekst) ebOordeelTimer = setTimeout(() => { ebOordeelEl.textContent = ''; }, 500);
}

function ebToonKaart(titel, cijfers, tekst, knop) {
  ebKaartEl.querySelector('h3').textContent = titel;
  ebKaartCijfersEl.innerHTML = cijfers;
  ebKaartTekstEl.innerHTML = tekst;
  ebKaartKnopEl.textContent = knop;
  ebKaartEl.hidden = false;
}

function ebToonStartkaart() {
  if (!ebEl || (ebSpel && ebSpel.loopt)) return;
  const aantal = ebAantalNoten();

  if (!aantal) {
    ebToonKaart('Je bord is leeg', '',
      'Zet eerst een paar vakjes aan op het bord hierboven.<br>Dan kun je hier je beat spelen.',
      'Start');
    ebKaartKnopEl.disabled = true;
    return;
  }

  ebKaartKnopEl.disabled = false;
  ebToonKaart('Klaar?', '',
    'Je speelt je eigen beat, vier maten lang.<br>Er vallen <b>' + aantal + '</b> noten, op ' +
      Math.round(seqStand.bpm) + ' bpm. Eerst tellen we vier tellen af.',
    'Start');
}

function ebZetHartjes(aantal) {
  ebStand.hartjes = aantal;
  if (ebLevensEl) ebLevensEl.value = aantal;
  if (ebLevensGetalEl) ebLevensGetalEl.textContent = aantal;
}

// ============================================================
//  Als er boven iets verandert
// ============================================================

// Een vakje, een kaart, een reset of het tempo. Loopt er een beurt, dan stopt
// die: je speelt niet meer de beat waarmee je begon. En je beste score gaat
// terug naar nul, want die hoorde bij de oude beat.
function ebBeatVerandert() {
  if (ebBeatNu() === ebStand.beat) return;
  ebKijkBeat();
  if (ebSpel && ebSpel.loopt) {
    ebStop('anders');
    return;
  }
  ebWerkBalkBij();
  ebToonStartkaart();
}

// Wis voortgang: de game weer op slot, geen record en weer drie hartjes.
function ebWis() {
  if (ebSpel && ebSpel.loopt) ebStop('anders');
  ebSpel = null;
  ebStand = ebLegeStand();
  ebStand.beat = ebBeatNu();
  ebBewaar();
  ebZetHartjes(ebStand.hartjes);
  ebWerkSlotBij();
  ebWerkBalkBij();
  ebToonStartkaart();
}

// ============================================================
//  Aanzetten
// ============================================================

if (ebEl && ebBanenEl && ebLevensEl && typeof bord !== 'undefined') {
  bijVakje = (id, i) => ebGeprobeerd('vakje.' + id + '.' + i);
  bijSchuifje = (id, param) => ebGeprobeerd(id + '.' + param);
  bijBeatVerandert = ebBeatVerandert;
  bijWissen = ebWis;
  bijAanslag = ebBeoordeel;

  // Is het bord veranderd sinds de vorige keer, dan hoort het oude record daar
  // niet meer bij.
  ebKijkBeat();

  ebBouwBanen();
  ebZetHartjes(ebStand.hartjes);
  ebWerkSlotBij();
  ebWerkBalkBij();
  ebToonStartkaart();

  ebKaartKnopEl.addEventListener('click', ebStart);

  ebLevensEl.addEventListener('input', () => {
    ebZetHartjes(parseInt(ebLevensEl.value, 10));
    ebWerkBalkBij();
  });
  ebLevensEl.addEventListener('change', ebBewaar);
}
