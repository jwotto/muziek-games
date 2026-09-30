/* Klassikaal of alleen

   Klap mee en de ritme skater zijn gemaakt voor het digibord: de klas doet mee
   en het spel telt niets. Met de schakelaar klein rechts onder het vak zet je
   ze in de stand
   'alleen'. Dan speel je zelf met het toetsenbord en krijg je punten zoals in
   de game van de eerste drumles: hoe strakker je raakt, hoe meer. Mis je er
   een of klap je zomaar, dan gaan er punten af. Hartjes zijn er niet. Er zijn
   drie levels die je na elkaar vrijspeelt, elk met een
   eigen hiscore. Net als de game van de eerste drumles.

   De schakelaar begint altijd op klassikaal: zo staat hij als de juf de
   bladzijde op het bord opent, ook als er de vorige keer iemand alleen speelde.
   De levels en hiscores blijven wel bewaard in deze browser.

   Dit bestand doet alleen wat de twee spellen delen: de schakelaar, de knoppen
   van de levels, de teller en de uitslag. Wat goed of mis is, en welke toets
   wat doet, weet het spel zelf. Laden na drumkit.js en melding.js, want
   animeer(), minderBeweging en confetti() komen daarvandaan. */

const ALLEEN_BPM = 90;
const ALLEEN_MATEN = 16;
// Hoe dicht je erbij moet zitten, en wat het oplevert. Precies als in de
// drumles (spel.js), zodat punten op de hele site hetzelfde betekenen.
const ALLEEN_VENSTERS = [
  { grens: 0.045, punten: 100, naam: 'Perfect' },
  { grens: 0.090, punten: 60, naam: 'Goed' },
  { grens: 0.150, punten: 25, naam: 'Net' }
];
const ALLEEN_VENSTER = 0.15;     // daarna telt het als gemist
const ALLEEN_KOSTEN = 25;        // punten eraf voor missen of zomaar klappen

// Het volgende level gaat open als je driekwart van alles geraakt hebt, met
// minder dan tien missers: gemist of zomaar geklapt.
const ALLEEN_VRIJSPEEL = 0.75;
const ALLEEN_MAX_MISSERS = 10;

// Liggen de klappen dichter op elkaar dan het venster breed is, dan knijpt het
// venster mee, tot hooguit bijna een halve klap. Anders telt een klap bij vier
// per tel voor twee klapjes tegelijk. Net als in de drumles.
function alleenSchaal(bpm, aantal) {
  const tussen = 60 / bpm / (aantal || 1);
  return Math.min(1, (tussen * 0.45) / ALLEEN_VENSTER);
}

// Hetzelfde slotje als bij de graden van de drumles.
const ALLEEN_SLOTJE =
  '<svg class="slotje" viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" fill="none" stroke="currentColor"' +
  ' stroke-width="2.6" stroke-linecap="round"/>' +
  '<rect x="3.5" y="10" width="17" height="11.5" rx="2.6"/>' +
  '</svg>';

// paneel: het paneel van het spel. opties:
//   sleutel   waar de levels en hiscores bewaard worden
//   niveaus   [{ id, uitleg }], van makkelijk naar moeilijk
//   toetsen   een zin over welke toets wat doet
//   bijWissel functie(alleen), als de schakelaar omgaat
//   bijNiveau functie(), als er een ander level gekozen wordt
function maakAlleen(paneel, opties) {
  // De schakelaar staat onder het paneel, niet erin: hij hoort bij het spel,
  // niet bij wat er in het vak gebeurt.
  const schakelEl = document.querySelector('[data-alleen-schakel="' + paneel.id + '"]');
  const niveausEl = paneel.querySelector('[data-alleen-niveaus]');
  const uitlegEl = paneel.querySelector('[data-alleen-uitleg]');
  const tellerEl = paneel.querySelector('[data-alleen-teller]');
  const uitslagEl = paneel.querySelector('[data-alleen-uitslag]');
  const vrijEl = paneel.querySelector('[data-alleen-vrij]');
  const klasEls = Array.from(paneel.querySelectorAll('[data-alleen-klas]'));
  const niveaus = opties.niveaus;

  // ---------- Bewaren ----------

  function legeStand() {
    const records = {};
    niveaus.forEach((n) => { records[n.id] = 0; });
    return { vrij: 1, records: records };
  }

  // Elke waarde apart nakijken: opslag van een oudere versie mag de bladzijde
  // nooit stukmaken.
  function laad() {
    const stand = legeStand();
    let bewaard = null;
    try {
      bewaard = JSON.parse(localStorage.getItem(opties.sleutel));
    } catch (e) {
      return stand;
    }
    if (!bewaard || typeof bewaard !== 'object') return stand;
    const vrij = parseInt(bewaard.vrij, 10);
    if (Number.isFinite(vrij)) stand.vrij = Math.min(niveaus.length, Math.max(1, vrij));
    if (bewaard.records && typeof bewaard.records === 'object') {
      niveaus.forEach((n) => {
        const w = parseInt(bewaard.records[n.id], 10);
        if (Number.isFinite(w) && w >= 0) stand.records[n.id] = w;
      });
    }
    return stand;
  }

  function bewaar() {
    try {
      localStorage.setItem(opties.sleutel, JSON.stringify(voortgang));
    } catch (e) {
      // Opslag kan uit staan. Het spel werkt gewoon door.
    }
  }

  const voortgang = laad();

  // ---------- Stand van nu ----------

  let aan = false;
  let nr = voortgang.vrij - 1;   // je begint op het hoogste level dat open is
  let bezig = false;
  // goed: op tijd geraakt. mis: voorbij laten gaan. fout: geklapt waar niets
  // te klappen viel. De punten gaan nooit onder nul.
  const telling = { goed: 0, mis: 0, fout: 0, punten: 0 };
  const score = () => telling.punten;
  const oordeelEl = paneel.querySelector('[data-alleen-oordeel]');
  let oordeelTimer = 0;

  function toonOordeel(naam) {
    if (!oordeelEl) return;
    oordeelEl.textContent = naam;
    oordeelEl.dataset.soort = naam.toLowerCase();
    clearTimeout(oordeelTimer);
    oordeelTimer = setTimeout(() => { oordeelEl.textContent = ''; }, 500);
  }

  function kost(naam) {
    telling.punten = Math.max(0, telling.punten - ALLEEN_KOSTEN);
    toonOordeel(naam);
    werkTellerBij();
  }

  // ---------- De levels ----------

  const knoppen = niveaus.map((n, i) => {
    const knop = document.createElement('button');
    knop.className = 'niveau';
    knop.type = 'button';
    knop.innerHTML = '<span class="niveau-naam">Level ' + (i + 1) + '</span><span class="niveau-beste"></span>';
    knop.addEventListener('click', () => {
      if (bezig || i >= voortgang.vrij || i === nr) return;
      nr = i;
      verbergUitslag();
      werkBij();
      if (opties.bijNiveau) opties.bijNiveau();
    });
    niveausEl.appendChild(knop);
    return knop;
  });

  function werkBij() {
    knoppen.forEach((knop, i) => {
      const open = i < voortgang.vrij;
      knop.classList.toggle('op-slot', !open);
      knop.setAttribute('aria-pressed', String(i === nr));
      knop.disabled = !open || bezig;
      knop.querySelector('.niveau-beste').innerHTML =
        open ? '<b>' + voortgang.records[niveaus[i].id] + '</b>' : ALLEEN_SLOTJE;
      if (open) knop.removeAttribute('aria-label');
      else knop.setAttribute('aria-label', 'Level ' + (i + 1) + ', op slot');
    });

    if (uitlegEl) {
      let tekst = 'Level ' + (nr + 1) + ': ' + niveaus[nr].uitleg + '. ' + opties.toetsen;
      if (nr + 1 < niveaus.length && voortgang.vrij <= nr + 1) {
        tekst += ' Hoe strakker je raakt, hoe meer punten; missen of zomaar klappen kost punten.' +
                 ' Raak je driekwart en heb je minder dan ' + ALLEEN_MAX_MISSERS + ' missers, dan gaat level ' +
                 (nr + 2) + ' open.';
      }
      uitlegEl.textContent = tekst;
    }
    werkTellerBij();
  }

  function werkTellerBij() {
    if (tellerEl) tellerEl.querySelector('b').textContent = score();
  }

  // ---------- De schakelaar ----------

  // Wat bij klassikaal hoort (de schuifjes en keuzes van de juf, het tempo in de
  // balk) gaat weg; wat bij alleen hoort komt ervoor in de plaats.
  function zet(alleen) {
    aan = alleen;
    schakelEl.checked = alleen;
    klasEls.forEach((el) => { el.hidden = alleen; });
    niveausEl.hidden = !alleen;
    if (uitlegEl) uitlegEl.hidden = !alleen;
    if (tellerEl) tellerEl.hidden = !alleen;
    verbergUitslag();
    werkBij();
    if (opties.bijWissel) opties.bijWissel(alleen);
  }

  schakelEl.checked = false;
  schakelEl.addEventListener('change', () => zet(schakelEl.checked));
  werkBij();

  // ---------- Uitslag ----------

  function verbergUitslag() {
    if (uitslagEl) uitslagEl.hidden = true;
  }

  // nog: een zin over wat er nog nodig is voor het volgende level, of leeg.
  function toonUitslag(titel, recordNu, nog) {
    if (!uitslagEl) return;
    const totaal = telling.goed + telling.mis;
    uitslagEl.innerHTML =
      '<h3>' + titel + '</h3>' +
      '<div class="kaart-cijfers">' +
        '<div class="cijfer"><span>jouw score</span><b>' + score() + '</b></div>' +
        '<div class="cijfer beste"><span>beste op level ' + (nr + 1) + '</span><b>' + recordNu + '</b></div>' +
      '</div>' +
      '<p>' + telling.goed + ' van de ' + totaal + ' geraakt, ' +
        (telling.mis + telling.fout) + ' missers.' + (nog ? ' ' + nog : '') + '</p>';
    uitslagEl.hidden = false;
  }

  // Groot in het veld, net als in de drumles, met confetti. Vangt geen klikken.
  let vrijTimer = 0;

  function vier(tekst) {
    if (!vrijEl) return;
    vrijEl.innerHTML = '<b>' + tekst + '<span>vrijgespeeld!</span></b>';
    clearTimeout(vrijTimer);
    vrijTimer = setTimeout(() => { vrijEl.textContent = ''; }, 2600);
    if (typeof confetti === 'function') confetti(44, vrijEl.parentElement);
    if (minderBeweging.matches) return;
    animeer(vrijEl.firstElementChild, [
      { transform: 'scale(0.3) rotate(-14deg)', opacity: 0, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      { transform: 'scale(1) rotate(-3deg)', opacity: 1, offset: 0.18, easing: 'linear' },
      { transform: 'scale(1) rotate(-3deg)', opacity: 1, offset: 0.8, easing: 'ease-in' },
      { transform: 'scale(1.15) rotate(-3deg)', opacity: 0 }
    ], { duration: 2600 });
  }

  return {
    aan: () => aan,
    niveau: () => niveaus[nr],

    // Alles terug naar het begin: alleen level 1 open, alle hiscores op nul.
    // Handig als de volgende leerling achter dezelfde computer gaat zitten.
    wis() {
      const leeg = legeStand();
      voortgang.vrij = leeg.vrij;
      voortgang.records = leeg.records;
      nr = 0;
      bewaar();
      verbergUitslag();
      if (vrijEl) vrijEl.textContent = '';
      werkBij();
    },

    // Tijdens een beurt staan de schakelaar en de levels vast.
    zetBezig(b) {
      bezig = b;
      schakelEl.disabled = b;
      werkBij();
    },

    nieuweBeurt() {
      telling.goed = 0;
      telling.mis = 0;
      telling.fout = 0;
      telling.punten = 0;
      if (oordeelEl) oordeelEl.textContent = '';
      verbergUitslag();
      if (vrijEl) vrijEl.textContent = '';
      werkTellerBij();
    },

    // afstand: hoe ver je ernaast zat, in seconden. schaal: zie alleenSchaal.
    // Geeft het oordeel terug, of null als het te ver weg was om te tellen.
    raak(afstand, schaal) {
      const venster = ALLEEN_VENSTERS.find((v) => afstand <= v.grens * (schaal || 1));
      if (!venster) return null;
      telling.goed += 1;
      telling.punten += venster.punten;
      toonOordeel(venster.naam);
      werkTellerBij();
      return venster.naam;
    },
    mis() { telling.mis += 1; kost('Mis'); },
    fout() { telling.fout += 1; kost('Naast'); },

    // De beurt is helemaal uitgespeeld: hiscore bijwerken, misschien het
    // volgende level openzetten, en de uitslag laten zien. Wie halverwege op
    // stop drukt krijgt niets: dan telt het niet.
    klaar() {
      const id = niveaus[nr].id;
      const punten = score();
      const nieuw = punten > voortgang.records[id];
      if (nieuw) voortgang.records[id] = punten;

      const totaal = telling.goed + telling.mis;
      const missers = telling.mis + telling.fout;
      const gehaald = totaal > 0 && telling.goed >= ALLEEN_VRIJSPEEL * totaal &&
                      missers < ALLEEN_MAX_MISSERS;
      const volgende = nr + 1;
      let open = false;
      if (gehaald && volgende < niveaus.length && voortgang.vrij <= volgende) {
        voortgang.vrij = volgende + 1;
        open = true;
      }
      bewaar();

      let nog = '';
      if (!gehaald && volgende < niveaus.length && voortgang.vrij <= volgende) {
        nog = 'Voor level ' + (volgende + 1) + ': driekwart raken en minder dan ' +
              ALLEEN_MAX_MISSERS + ' missers.';
      }
      toonUitslag(nieuw ? 'Nieuw record!' : 'Klaar!', voortgang.records[id], nog);
      werkBij();
      if (open) vier('Level ' + (volgende + 1));
    }
  };
}

// Welk doel bedoelde je? Het dichtstbijzijnde van deze soort dat nog open staat.
// doelen: [{ soort, tijd, ... }]. Geeft het doel terug en hoe ver je ernaast zat.
function zoekDoel(doelen, soort, wanneer) {
  let beste = null;
  doelen.forEach((d) => {
    if (d.soort !== soort || d.gehaald || d.gemist) return;
    if (!beste || Math.abs(d.tijd - wanneer) < Math.abs(beste.tijd - wanneer)) beste = d;
  });
  return beste ? { doel: beste, afstand: Math.abs(beste.tijd - wanneer) } : null;
}
