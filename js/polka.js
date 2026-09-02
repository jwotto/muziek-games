/* De begeleiding: een polka in A Phrygisch met grote terts

   Los bestand omdat twee lessen hem gebruiken: het ritmespel in de drumles en
   de klapoefening bij body percussion. Hier staat alleen wat er klinkt en hoe
   je een noot plant -- wanneer dat gebeurt bepaalt de les zelf.

   Laden na Tone.js en drumkit.js, want hij hangt aan master uit drumkit. */

// ============================================================
//  De begeleiding: een polka
// ============================================================

// Oom-pah. Op elke tel een lage basnoot, en precies tussen twee tellen in een
// kort akkoord -- die upbeat is waar een polka op drijft. De bas wisselt daarbij
// af tussen grondtoon en kwint, precies zoals een tuba dat in een polka doet.
//
// De toonsoort is A Phrygisch met grote terts: A, Bes, Cis, D, E, F, G. Dat is
// de klezmerladder, en de grap zit in die Bes -- een halve toon boven de
// grondtoon, waar je normaal een hele toon verwacht. Zodra het akkoord van A
// naar Bes stapt en weer terug heb je dat schelmse Balkangevoel te pakken.
//
// De rondgang is A | Bes | A | Bes: heen en weer, meer niet. Dat halve stapje
// tussen de grondtoon en de noot erboven is de klezmerstap zelf, en die heeft
// geen omweg nodig om te werken. Alle drie de stemmen schuiven per wissel een
// halve toon op en weer terug; er komt geen enkele noot buiten de ladder.
//
// Het staat als vier maten en niet als twee, zodat je later de tweede helft kunt
// laten afwijken zonder de rest aan te raken.
//
// De Dm, Gm, C en E hieronder worden op dit moment niet gebruikt; die staan
// klaar als je een maat wilt omwisselen.
//
// De maten tellen vanaf het allereerste begin, dus het aftellen ís maat 1.
const AKKOORDEN = {
  a:   { bas: 110.00, kwint: 164.81, tonen: [220.00, 277.18, 329.63] },  // A groot
  bes: { bas: 116.54, kwint: 174.61, tonen: [233.08, 293.66, 349.23] },  // Bes groot
  dm:  { bas: 146.83, kwint: 220.00, tonen: [220.00, 293.66, 349.23] },  // d klein
  gm:  { bas: 98.00, kwint: 146.83, tonen: [233.08, 293.66, 392.00] },   // g klein
  e:   { bas: 82.41, kwint: 123.47, tonen: [207.65, 246.94, 329.63] },   // E groot
  c:   { bas: 130.81, kwint: 196.00, tonen: [261.63, 329.63, 392.00] }   // C groot
};
// Elke maat is een lijstje. Staat er een akkoord in, dan duurt het de hele maat;
// staan er twee, dan krijgen ze allebei de helft. Zo kan maat 4 halverwege van
// Bes naar C stappen zonder dat de rest ingewikkelder wordt.
const RONDGANG = [['a'], ['bes'], ['a'], ['bes']];

// Het aftellen telt mee als maat 1: het duurt precies vier tellen, dus de
// rondgang loopt gewoon door van de aanloop het spel in zonder ergens opnieuw
// te beginnen. Je telt af op de A en de eerste noot valt op de Bes.
function akkoordVoor(tel) {
  const maat = RONDGANG[Math.floor(tel / 4) % RONDGANG.length];
  const deel = Math.floor((tel % 4) / (4 / maat.length));
  return AKKOORDEN[maat[deel]];
}

// De oom: een ronde lage noot, kort afgekapt.
const basVol = new Tone.Volume(-4).connect(master);
const basFilter = new Tone.Filter({ type: 'lowpass', frequency: 480, Q: 1 }).connect(basVol);
const basEnv = new Tone.AmplitudeEnvelope({ attack: 0.004, decay: 0.14, sustain: 0, release: 0.03 }).connect(basFilter);
const basOsc = new Tone.Oscillator({ type: 'triangle', frequency: 110 }).start();
basOsc.connect(basEnv);

// De pah: drie blokgolven samen, dus een echt akkoord. Ze gaan eerst door een
// gain, want drie golven bij elkaar opgeteld zou boven vol bereik uitkomen.
const akkVol = new Tone.Volume(-10).connect(master);
const akkFilter = new Tone.Filter({ type: 'lowpass', frequency: 2600, Q: 1 }).connect(akkVol);
const akkEnv = new Tone.AmplitudeEnvelope({ attack: 0.003, decay: 0.1, sustain: 0, release: 0.03 }).connect(akkFilter);
const akkMix = new Tone.Gain(0.33).connect(akkEnv);
const akkOscs = AKKOORDEN.a.tonen.map((f) => {
  const osc = new Tone.Oscillator({ type: 'square', frequency: f }).start();
  osc.connect(akkMix);
  return osc;
});

// Grondtoon op de oneven tellen, kwint op de even: dat heen en weer springen is
// wat een polkabas doet, en het geeft de maat vanzelf zijn wiegende gang.
function basNoot(tijd, akkoord, tellengte, inMaat) {
  basOsc.frequency.setValueAtTime(inMaat % 2 === 0 ? akkoord.bas : akkoord.kwint, tijd);
  basEnv.decay = Math.min(0.2, tellengte * 0.4);
  basEnv.triggerAttack(tijd);
}

// De metronoom telt de eerste vier tellen mee, over de muziek heen. Zo hoor je
// het tempo hard genoeg om in te vallen, terwijl de polka al speelt. Zodra het
// spel begint houdt hij op: dan is de polka zelf je maat.
const tikOsc = new Tone.Oscillator({ type: 'sine', frequency: 1000 }).start();
const tikEnv = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 });
const tikVol = new Tone.Volume(-9);
tikOsc.chain(tikEnv, tikVol, master);

function tik(tijd, laatste) {
  tikOsc.frequency.setValueAtTime(laatste ? 1400 : 1000, tijd);
  tikEnv.triggerAttack(tijd);
}

function akkoordStoot(tijd, akkoord, tellengte) {
  akkoord.tonen.forEach((f, i) => akkOscs[i].frequency.setValueAtTime(f, tijd));
  akkEnv.decay = Math.min(0.14, tellengte * 0.3);
  akkEnv.triggerAttack(tijd);
}
