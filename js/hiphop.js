/* De begeleiding van de ritme skater: een hiphopbeat

   Alleen drums, bas en een akkoord. Boom-bap: een dikke kick, een snare op 2
   en 4 en een hihat die een beetje swingt. Daaronder een vette bas met blue
   notes, en op de een van elke maat een kort jazzy akkoord met een warme,
   Rhodes-achtige klank. Het hele liedje op dat ene akkoord.

   Hier staat alleen wat er klinkt en hoe je een stap plant -- wanneer dat
   gebeurt bepaalt de les zelf. Dezelfde opbouw als polka.js: alle oscillators
   staan altijd aan, een envelope bepaalt of je ze hoort.

   Laden na Tone.js en drumkit.js, want hij hangt aan master en de galm uit
   drumkit, en gebruikt maakToonStem, valToon en stilNu. */

const hz = (noot) => Tone.Frequency(noot).toFrequency();

// Hoeveel later de zestienden tussen de achtsten vallen, als deel van een
// zestiende. Zonder swing klinkt de hihat als een naaimachine; met een beetje
// gaat hij heen en weer. Meer dan dit en het wordt een shuffle.
const HH_SWING = 0.18;

// ============================================================
//  De drums
// ============================================================

// Een kick die je in je buik voelt: een sinus die in een paar honderdste van
// hoog naar heel laag valt, en dan nog even doorbromt.
const hhKickVol = new Tone.Volume(3).connect(master);
const hhKick = maakToonStem('sine', 46, 0.42, 1, hhKickVol);

// Snare en hihat knippen uit dezelfde ruis. Die moet lopen voordat er iets uit
// te knippen valt, zie startHiphop.
const hhRuis = new Tone.Noise('white');

// De snare: ruis voor de snaartjes en een trommel voor de body, met een beetje
// galm erachter. Een boom-bap-snare is breed, niet strak.
const hhSnareVol = new Tone.Volume(-4).connect(master);
const hhSnareEnv = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.2, sustain: 0, release: 0.02 }).connect(hhSnareVol);
const hhSnareFilter = new Tone.Filter({ type: 'highpass', frequency: 900, Q: 0.7 }).connect(hhSnareEnv);
hhRuis.connect(hhSnareFilter);
const hhSnareTrommel = maakToonStem('triangle', 185, 0.11, 0.7, hhSnareVol);
hhSnareVol.connect(new Tone.Gain(0.22).connect(galm));

const hhHatVol = new Tone.Volume(-13).connect(master);
const hhHatEnv = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.035, sustain: 0, release: 0.01 }).connect(hhHatVol);
const hhHatFilter = new Tone.Filter({ type: 'highpass', frequency: 7500, Q: 0.7 }).connect(hhHatEnv);
hhRuis.connect(hhHatFilter);

// Per stap in de maat, wat er klinkt en hoe hard. Twee maten om en om, zodat de
// kick niet elke maat precies hetzelfde doet.
const HH_KICK = [
  { 0: 1, 7: 0.7, 10: 0.9 },
  { 0: 1, 10: 0.9, 13: 0.6 }
];
const HH_SNARE = [
  { 4: 1, 12: 1 },
  { 4: 1, 12: 1, 15: 0.25 }       // een spooknoot vlak voor de een
];

function hhDrums(t, stap, maat) {
  const kant = maat % 2;
  const kick = HH_KICK[kant][stap];
  if (kick) {
    valToon(hhKick, 150, 46, t, 0.07);
    hhKick.envelope.triggerAttack(t, kick);
  }

  const snare = HH_SNARE[kant][stap];
  if (snare) {
    hhSnareEnv.triggerAttack(t, snare);
    valToon(hhSnareTrommel, 185 * 2.2, 185, t, 0.02);
    hhSnareTrommel.envelope.triggerAttack(t, snare);
  }

  // Hihat op de achtsten, met de tel iets harder dan wat ertussen valt, en een
  // zachte op de laatste zestiende van een tel. Aan het eind van elke vier maten
  // gaat hij even open: daar hoor je dat de rondgang om is.
  const open = stap === 14 && maat % 4 === 3;
  let hat = 0;
  if (stap % 4 === 0) hat = 0.9;
  else if (stap % 2 === 0) hat = 0.55;
  else if (stap % 4 === 3) hat = 0.25;
  if (hat) {
    hhHatEnv.decay = open ? 0.2 : 0.035;
    hhHatEnv.triggerAttack(t, open ? 0.7 : hat);
  }
}

// ============================================================
//  De bas
// ============================================================

// Een zaagtand voor het grommen en een sinus eronder voor het gewicht, samen
// door een dicht filter. Dat is wat hem vet maakt: je hoort vooral het lage,
// maar net genoeg boventonen om hem ook op een digibordspeakertje te horen.
const hhBasVol = new Tone.Volume(-1).connect(master);
const hhBasFilter = new Tone.Filter({ type: 'lowpass', frequency: 620, Q: 2.5, rolloff: -24 }).connect(hhBasVol);
const hhBasEnv = new Tone.AmplitudeEnvelope({ attack: 0.006, decay: 0.3, sustain: 0.55, release: 0.07 }).connect(hhBasFilter);
const hhBasZaag = new Tone.Oscillator({ type: 'sawtooth', frequency: 73 }).start();
const hhBasSub = new Tone.Oscillator({ type: 'sine', frequency: 73 }).start();
hhBasZaag.connect(new Tone.Gain(0.4).connect(hhBasEnv));
hhBasSub.connect(new Tone.Gain(0.85).connect(hhBasEnv));

// glijNaar is optioneel: dan begint de noot op f en glijdt hij er snel naartoe.
// Zo komt de blue note bij de gewone kwint uit.
function hhBasNoot(t, f, lengte, glijNaar) {
  [hhBasZaag, hhBasSub].forEach((osc) => {
    osc.frequency.setValueAtTime(f, t);
    if (glijNaar) osc.frequency.exponentialRampToValueAtTime(glijNaar, t + Math.min(0.09, lengte * 0.5));
  });
  hhBasEnv.triggerAttack(t);
  hhBasEnv.triggerRelease(t + lengte * 0.9);
}

// ============================================================
//  De akkoorden
// ============================================================

// Vier stemmen met een klein beetje FM: een sinus die door een tweede sinus
// wordt aangeraakt. Dat geeft het tingelende randje van een Rhodes-piano.
const hhKeysVol = new Tone.Volume(-7).connect(master);
const hhKeysFilter = new Tone.Filter({ type: 'lowpass', frequency: 2400, Q: 0.7 }).connect(hhKeysVol);
// Een korte aanslag die snel wegzakt: het akkoord kleurt de maat, maar de
// groove is van de drums en de bas.
const hhKeysEnv = new Tone.AmplitudeEnvelope({ attack: 0.004, decay: 0.5, sustain: 0.3, release: 0.2 }).connect(hhKeysFilter);
const hhKeysMix = new Tone.Gain(0.25).connect(hhKeysEnv);
const hhKeys = [0, 1, 2, 3].map(() => {
  const osc = new Tone.FMOscillator({ frequency: 220, harmonicity: 1, modulationIndex: 1.2 }).start();
  osc.connect(hhKeysMix);
  return osc;
});
hhKeysFilter.connect(new Tone.Gain(0.3).connect(galm));

// Het hele liedje op één akkoord: Dm9, in d klein. Zonder grondtoon gegrepen,
// zoals een jazzpianist dat doet: die laat hij aan de bas over. Eén akkoord dat
// blijft liggen is precies wat een hiphoploop is -- de groove zit in de drums
// en de bas, niet in de akkoorden.
const HH_AKKOORD = { bas: hz('D2'), tonen: ['F3', 'A3', 'C4', 'E4'].map(hz) };

function hhAkkoord(t, akkoord, lengte, sterkte) {
  akkoord.tonen.forEach((f, i) => hhKeys[i].frequency.setValueAtTime(f, t));
  hhKeysEnv.triggerAttack(t, sterkte);
  hhKeysEnv.triggerRelease(t + lengte);
}

const halfToon = (f, n) => f * Math.pow(2, n / 12);

// Per maat: de grondtoon lang, een kort octaafje omhoog, de kleine terts, dan de
// blue note (de verlaagde kwint, die in de kwint glijdt) en tot slot de septiem.
// Allemaal rond hetzelfde akkoord, zodat de bas beweegt zonder dat het ergens
// anders heen gaat.
function hhBasEnAkkoord(t, stap, stapDuur) {
  const r = HH_AKKOORD.bas;

  if (stap === 0) hhBasNoot(t, r, stapDuur * 4);
  if (stap === 6) hhBasNoot(t, halfToon(r, 12), stapDuur);
  if (stap === 8) hhBasNoot(t, halfToon(r, 3), stapDuur * 2);
  if (stap === 11) hhBasNoot(t, halfToon(r, 6), stapDuur * 2, halfToon(r, 7));
  if (stap === 14) hhBasNoot(t, halfToon(r, 10), stapDuur * 2);

  // Het akkoord één keer per maat, op de een, ongeveer een tel lang.
  if (stap === 0) hhAkkoord(t, HH_AKKOORD, stapDuur * 3.5, 0.9);
}

// ============================================================
//  Het aftellen
// ============================================================

// De metronoom voor het aftellen. De laatste tel is hoger: daarna gaat het los.
const hhTik = maakToonStem('sine', 1000, 0.04, 0.6, new Tone.Volume(-8).connect(master));

function hhTikNu(t, laatste) {
  hhTik.oscillator.frequency.setValueAtTime(laatste ? 1400 : 1000, t);
  hhTik.envelope.triggerAttack(t);
}

// ============================================================
//  Springen en bukken
// ============================================================

// Een kort geluidje bij springen en bukken: een toon die omhoog schiet, of een
// die omlaag zakt. Zo hoor je wat het poppetje doet, ook als je even niet kijkt.
const hhSeinVol = new Tone.Volume(4).connect(master);
const hhSeinFilter = new Tone.Filter({ type: 'lowpass', frequency: 2200, Q: 0.7 }).connect(hhSeinVol);
const hhSein = maakToonStem('square', 500, 0.16, 1, hhSeinFilter);

function hhSeintje(t, omhoog) {
  if (omhoog) valToon(hhSein, 260, 900, t, 0.14);
  else valToon(hhSein, 700, 160, t, 0.16);
  hhSein.envelope.triggerAttack(t);
}

// ============================================================
//  Plannen en stoppen
// ============================================================

// Eén zestiende plannen. maat mag negatief zijn (het aftellen); hij bepaalt
// alleen welke van de twee drumpatronen er klinkt.
function speelHiphopStap(t, stap, maat, stapDuur) {
  const tt = t + (stap % 2 === 1 ? stapDuur * HH_SWING : 0);
  hhDrums(tt, stap, ((maat % 4) + 4) % 4);
  hhBasEnAkkoord(tt, stap, stapDuur);
}

// Het slot: nog een keer de kick en het akkoord, en die mag uitklinken.
function speelHiphopSlot(t, stapDuur) {
  const akk = HH_AKKOORD;
  valToon(hhKick, 150, 46, t, 0.07);
  hhKick.envelope.triggerAttack(t);
  hhBasNoot(t, akk.bas, stapDuur * 8);
  hhAkkoord(t, akk, stapDuur * 10, 1);
  hhHatEnv.decay = 0.3;
  hhHatEnv.triggerAttack(t, 0.6);
}

function startHiphop() {
  if (hhRuis.state !== 'started') hhRuis.start();
}

// Alles wat vooruit gepland stond eruit, en wat nu klinkt netjes laten
// uitsterven. Ook de toonhoogtes: een bastoon die voor over twee seconden
// gepland stond, zou anders midden in de volgende ronde van toon verspringen.
function stopHiphop() {
  const nu = Tone.now();
  [hhKick, hhSnareTrommel, hhTik, hhSein].forEach((stem) => {
    stilNu(stem.envelope);
    stem.oscillator.frequency.cancelScheduledValues(nu);
  });
  [hhSnareEnv, hhHatEnv, hhBasEnv, hhKeysEnv].forEach(stilNu);
  hhBasZaag.frequency.cancelScheduledValues(nu);
  hhBasSub.frequency.cancelScheduledValues(nu);
  hhKeys.forEach((osc) => osc.frequency.cancelScheduledValues(nu));
}
