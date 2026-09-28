/* De lijfgeluiden: boem en klap

   Boem is met je vlakke handen op je knieën, klap is in je handen klappen. Los
   bestand omdat de body-percussionlessen ze delen: de klapoefening en de
   ritmevierkanten in les 1, en het ritmevierkant dat je zelf maakt in les 2.

   Laden na Tone.js en drumkit.js, want alles hangt aan master uit drumkit.
   lijfGeluid('boem' of 'klap', tijd) laat er een klinken. Roep eerst een keer
   startLijfRuis() aan zodra het geluid mag, anders heeft de ruis niets om uit
   te knippen. */

// De klap is een opname. Hij moet het hele lokaal over, dus hij staat boven
// alles uit.
//
// De opname zit al aan de top van wat in een bestand past, dus die negen decibel
// gaan daar overheen. Wat eronder zit -- het lijf van de klap -- wordt gewoon
// negen decibel harder; alleen de punt van de aanslag loopt de zachte begrenzer
// aan het eind van de keten in en wordt daar afgerond. Bij een klap hoor je dat
// niet als vervorming. Nog veel harder zetten kan wel, maar dan gaat het ten
// koste van de knal aan het begin en dat is nou juist wat een klap een klap
// maakt.
const KLAP_BESTAND = 'snd/klap.wav';
const KLAP_LUID = 9;

// Zoveel klappen kunnen tegelijk klinken. Bij vier klappen per tel op tempo 200
// zit er 75 ms tussen en de opname duurt 180 ms, dus ze lopen over elkaar heen.
// Eén speler zou de vorige dan afkappen.
const KLAP_STEMMEN = 6;

const klapVol = new Tone.Volume(KLAP_LUID).connect(master);

const klapSpelers = [];
for (let i = 0; i < KLAP_STEMMEN; i++) klapSpelers.push(new Tone.Player().connect(klapVol));

let klapBeurt = 0;
let klapOpnameKlaar = false;

const klapOpname = new Tone.ToneAudioBuffer(KLAP_BESTAND, () => {
  klapSpelers.forEach((speler) => { speler.buffer = klapOpname; });
  klapOpnameKlaar = true;
}, () => {
  // Niet geladen: dan blijft de nagebouwde klap hieronder staan. Een oefening
  // zonder klap is erger dan een klap die niet de opname is.
  klapOpnameKlaar = false;
});

// Hieronder het vangnet: een klap nagebouwd uit ruis, voor als de opname niet
// laadt. Een handklap van een enkele ruisstoot klinkt als een snare. Wat er een
// klap van maakt is dat het er eigenlijk drie zijn -- een handklap kaatst na, en
// de 909 bootst dat na met drie hele korte stootjes vlak achter elkaar en daarna
// een langere staart. Dat ratelende begin is het hele verschil.
//
// Elk stootje krijgt zijn eigen envelope. Een envelope drie keer achter elkaar
// aanslaan binnen twintig milliseconden vraagt om gedoe; vier losse envelopes
// zijn goedkoop en doen precies wat er staat.
const KLAP_TIKKEN = [0, 0.009, 0.019];   // de naklappers, in seconden
const KLAP_STAART = 0.027;

// Rond de 1100 hertz zit het lichaam van een klap; de hoogdoorlaat haalt het
// gerommel eronder weg zodat hij droog blijft.
const klapBand = new Tone.Filter({ type: 'bandpass', frequency: 1100, Q: 1.4 }).connect(klapVol);
const klapHoog = new Tone.Filter({ type: 'highpass', frequency: 480, Q: 0.7 }).connect(klapBand);
const klapMix = new Tone.Gain(0.5).connect(klapHoog);

const klapRuis = new Tone.Noise('white');

const klapTikEnvs = KLAP_TIKKEN.map(() => {
  const env = new Tone.AmplitudeEnvelope({
    attack: 0.0004, decay: 0.009, sustain: 0, release: 0.005
  }).connect(klapMix);
  klapRuis.connect(env);
  return env;
});

// De staart is langer en zachter: dat is de galm van je handen, niet de klap.
const klapStaartEnv = new Tone.AmplitudeEnvelope({
  attack: 0.001, decay: 0.16, sustain: 0, release: 0.02
}).connect(new Tone.Gain(0.7).connect(klapMix));
klapRuis.connect(klapStaartEnv);

function startKlapRuis() {
  if (klapRuis.state !== 'started') klapRuis.start();
}

function klapNu(tijd) {
  if (klapOpnameKlaar) {
    const speler = klapSpelers[klapBeurt];
    klapBeurt = (klapBeurt + 1) % klapSpelers.length;
    speler.start(tijd);
    return;
  }
  KLAP_TIKKEN.forEach((na, i) => klapTikEnvs[i].triggerAttack(tijd + na));
  klapStaartEnv.triggerAttack(tijd + KLAP_STAART);
}

// ============================================================
//  Boem
// ============================================================

// Een doffe klap op je knieën: een lage toon die snel wegzakt, en een kort
// stukje gedempte ruis erbovenop voor je handen op je broek. Geen kick uit het
// drumstel, want die heb je in de drumles misschien heel anders ingesteld.
const boemVol = new Tone.Volume(4).connect(master);
const boemToon = maakToonStem('sine', 70, 0.16, 1, boemVol);

const boemFilter = new Tone.Filter({ type: 'lowpass', frequency: 1200, Q: 0.7 }).connect(boemVol);
const boemHuidEnv = new Tone.AmplitudeEnvelope({
  attack: 0.001, decay: 0.045, sustain: 0, release: 0.01
}).connect(new Tone.Gain(0.55).connect(boemFilter));
const boemRuis = new Tone.Noise('pink');
boemRuis.connect(boemHuidEnv);

function boemNu(tijd) {
  valToon(boemToon, 150, 62, tijd, 0.05);
  boemToon.envelope.triggerAttack(tijd);
  boemHuidEnv.triggerAttack(tijd);
}

// ============================================================
//  Samen
// ============================================================

function startLijfRuis() {
  if (boemRuis.state !== 'started') boemRuis.start();
  startKlapRuis();
}

function lijfGeluid(soort, tijd) {
  if (soort === 'boem') boemNu(tijd);
  else klapNu(tijd);
}

// ============================================================
//  De klap in beeld
// ============================================================

// Dezelfde klaphanden als op de kaart van deze les op de voorpagina: een zwarte
// lijntekening met de binnenkant ingekleurd.
//
// Dat zijn twee vormen. Bovenop de lijntekening zelf, in het inkt. Daaronder
// het silhouet dat de kleur draagt: de omtrek van de handen met de gaten
// ertussen dichtgemaakt. Die staat niet in de iconenset -- ook de gevulde versie
// is daar een lijntekening, met een holle handpalm -- dus hij is uitgerekend
// door de gevulde vorm op een raster te zetten, alles wat niet van buitenaf te
// bereiken is op te vullen en de rand daarvan weer na te lopen.
//
// De vormen staan hier uitgeschreven in plaats van als icoon uit het lettertype:
// dat komt van buiten, en een klapje dat niet laadt is een klapje dat je niet
// ziet aankomen.
const KLAP_HANDEN =
  '<svg viewBox="0 0 256 256" aria-hidden="true">' +
  '<path class="vlak" d="M166.5,0.0L171.3,0.5L174.3,2.8L175.8,5.5L176.0,25.3L174.3,29.0L171.3,31.3L166.8,31.8L163.5,30.5L160.3,25.5L160.3,6.3L161.5,3.3L164.0,1.0L166.3,0.3ZM207.0,13.0L211.3,13.5L214.5,16.0L216.0,19.3L216.0,22.5L206.3,39.3L202.3,41.8L197.3,41.5L194.5,39.8L192.8,37.3L192.3,32.5L202.3,15.5L206.8,13.3ZM115.0,32.0L120.5,32.0L124.0,33.0L131.0,37.8L155.8,79.8L155.3,71.3L156.3,67.5L158.8,63.0L163.3,58.8L169.3,56.3L176.0,56.0L180.8,57.5L185.0,60.3L189.0,65.3L209.3,100.3L215.0,112.3L218.0,122.5L219.5,134.3L219.3,144.5L217.8,153.5L213.3,167.0L208.0,176.5L206.8,191.0L203.3,203.5L196.5,217.5L187.8,229.3L178.3,238.3L168.0,245.3L155.8,251.0L144.5,254.3L133.8,255.8L117.3,255.3L106.5,253.0L94.3,248.5L85.5,243.8L77.5,238.0L68.5,229.5L63.3,223.0L21.5,151.0L20.0,144.8L20.0,139.0L23.3,129.0L26.5,124.5L31.8,120.0L36.0,117.8L42.5,116.0L37.8,107.0L36.3,100.8L36.5,93.3L40.3,83.8L44.5,78.8L51.8,74.0L59.8,72.0L68.3,72.3L64.0,64.8L62.8,60.3L63.3,53.3L66.3,47.0L69.8,43.5L74.3,41.0L78.0,40.0L85.5,40.5L90.5,42.8L94.3,46.0L100.3,55.8L99.8,47.3L102.5,40.0L107.8,34.8L114.8,32.3ZM234.8,48.0L237.3,48.0L240.3,49.3L243.0,52.3L243.8,57.3L242.3,60.8L238.5,63.5L222.0,68.8L218.5,68.5L214.0,65.0L212.8,60.3L215.3,55.0L218.0,53.3L234.5,48.3Z"/>' +
  '<path class="lijn" d="M160.22,24V8a8,8,0,0,1,16,0V24a8,8,0,0,1-16,0ZM196.1,41a7.91,7.91,0,0,0,4.17,1.17,8,8,0,0,0,6.84-3.83l8-13.11a8,8,0,0,0-13.68-8.33l-8,13.1A8,8,0,0,0,196.1,41Zm47.51,12.59a8,8,0,0,0-10.08-5.16l-15.06,4.85a8,8,0,0,0,2.46,15.62,8.15,8.15,0,0,0,2.46-.39l15.05-4.85A8,8,0,0,0,243.61,53.55ZM217,97.58a80.22,80.22,0,0,1-10.22,94c-.34,1.73-.72,3.46-1.19,5.18A80.17,80.17,0,0,1,58.77,216L23.5,155a26,26,0,0,1,19.24-38.79l-3-5.2a26,26,0,0,1,19.2-38.78L58.24,71A26,26,0,0,1,95.47,36.53,26.06,26.06,0,0,1,140.3,37l12.26,21.2A26.07,26.07,0,0,1,195.81,61ZM109.07,55l0,0h0l25,43.17a26,26,0,0,1,17.33-10L126.42,45a10,10,0,1,0-17.35,10ZM72.12,63l6.46,11.17a26.05,26.05,0,0,1,17.32-10L89.45,53A10,10,0,1,0,72.12,63Zm111.54,81-20.22-35a10,10,0,0,0-17.74,9.25L158.3,140a8,8,0,0,1-13.87,8l-36.5-63A10,10,0,1,0,90.58,95l26.05,45a8,8,0,0,1-13.87,8L71,93h0l0,0a10,10,0,0,0-17.33,10l35.22,61A8,8,0,0,1,75,172L54.72,137a10,10,0,0,0-17.34,10l35.27,61a64.12,64.12,0,0,0,117.42-15.44A63.52,63.52,0,0,0,183.66,144Zm19.41-38.42L181.93,69A10,10,0,0,0,164.55,79l33,57.05A80.2,80.2,0,0,1,207,161.51,64.23,64.23,0,0,0,203.07,105.58Z"/>' +
  '</svg>';
