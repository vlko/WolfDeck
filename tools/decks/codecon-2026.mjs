// Source of public/codecon-2026.json — the CodeCon 2026 Žilina talk
// (outline: RawSources/talks/CodeCon2026ZA.md).   node tools/decks/codecon-2026.mjs
//
// The deck is ordinary WolfDeck JSON; it is written from here only because
// the START slides share one layout and the scenes are easier to keep tidy
// with a few helpers. Editing the JSON by hand works too — but then stop
// regenerating it.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ── helpers ───────────────────────────────────────────────────────────────
let seed = 0;
// Scene-wide prop size: small things (a mouse, a typewriter) are staged a
// little larger than life so they read from the back row of the hall.
// `exact: true` keeps a prop at its true size (the track and its cars).
let K = 1;
// prop: p('type', x, layer, { y, dz, scale, rotation, id, exact, ...options })
function p(type, x, layer = 'mid', o = {}) {
  const { y: y0 = 0, dz = 0, scale: s0, rotation, id, slide, exact, ...options } = o;
  seed += 1;
  const k = exact ? 1 : K;
  const y = +(y0 * k).toFixed(3);
  const scale = +((s0 ?? 1) * k).toFixed(3);
  const out = { type, position: dz ? [x, y, dz] : [x, y], layer, options: { seed, ...options } };
  if (id) out.id = id;
  if (slide) out.slide = slide; // on stage only during that slide
  if (scale !== 1) out.scale = scale;
  if (rotation) out.rotation = rotation;
  return out;
}
const part = (type, x, y, o = {}) => ({ type, position: [x, y], depth: 'mid', ...o });
const N = (...lines) => lines; // speaker notes, one paragraph per entry

// One START block: the title is the slide, then MUSÍŠ, then VZDAJ SA, then
// (where the outline has it) how it went for me.
// `hacks` (optional): short tips, each a small panel along the bottom.
// `en: true` puts the fixed labels in English. `also` (optional) replaces
// "Ako to bolo u mňa" with a titled list: { title, items }.
function startSlide({ id, verb, role, must, giveUp, mine, also, hacks, notes, en = true }) {
  const L = en
    ? { must: 'MUST', giveUp: 'GIVE UP', kicker: 'Want to start?', mine: 'What worked for me' }
    : { must: 'MUSÍŠ', giveUp: 'VZDAJ SA', kicker: 'Chceš začať?', mine: 'Ako to bolo u mňa' };
  const groups = [
    { parts: [part('text', -4.8, 5.7, { title: `${L.must}: ${must}`, align: 'center', width: 8.6, fontScale: 1.45, accentColor: '#5f7a63', tilt: -1.5 })] },
    { keep: true, parts: [part('text', 5, 4.5, { title: `${L.giveUp}: ${giveUp}`, align: 'center', width: 8.6, fontScale: 1.45, accentColor: '#b4843f', tilt: 1.5, depth: 'front' })] },
  ];
  // tips sit along the bottom of the same page, under the two big cards
  if (hacks?.length) {
    const xs = hacks.length === 1 ? [0] : [-5.6, 5.6];
    groups.push({
      keep: true,
      parts: hacks.slice(0, 2).map((h, i) => part('text', xs[i], 1.9, {
        title: `Hacks: ${h}`, align: 'center', width: 8.4, fontScale: 1, accentColor: '#7a6a9a', tilt: i ? 1 : -1, depth: 'front',
      })),
    });
  }
  if (mine) groups.push({ keep: true, parts: [part('text', -5.4, hacks?.length ? 3.5 : 3.3, { title: L.mine, body: mine, width: 7.6, fontScale: 1.15, tilt: -2, depth: hacks?.length ? 'mid' : 'front' })] });
  if (also) groups.push({ keep: true, parts: [part('bullets', -5.4, 3.2, { title: also.title, items: also.items, width: 7.6, fontScale: 1.25, tilt: -2, depth: 'front' })] });
  return { id, title: `START ${verb}`, kicker: role ?? L.kicker, notes, groups };
}

// ── scenes ────────────────────────────────────────────────────────────────
const scenes = [];

// A. Úvod — Orava: the lake, the church, a chalet, sheep on the meadow
scenes.push({
  id: 'uvod',
  quips: [
    'Vybrala ma AI!',
    'Vlk z Oravy, teší ma.',
    'Slidy písala AI. Asi.',
    'Dúfam, že mikrofón ide.',
    'Žiadny LinkedIn návod!',
  ],
  kicker: 'CodeCon 2026 · Žilina',
  style: 'paper',
  props: [
    p('lake', -10.5, 'back', { dz: 0.4 }),
    p('churchTower', 8.5, 'back'),
    p('chalet', 13.2, 'back', { dz: 1.2, variant: 'chalet' }),
    p('stoneCottage', -3.2, 'back', { dz: -0.6 }),
    p('pineTree', -14.5, 'back', { dz: 1, tiers: 6 }),
    p('pineTree', 3.6, 'back', { dz: -0.8 }),
    p('pineTree', 11.2, 'mid', { dz: -0.6, height: 3.6 }),
    p('pineTree', -13, 'mid', { height: 3.4 }),
    p('sheep', -8.2, 'mid', { dz: 1.2, animation: 'graze' }),
    p('lamb', -6.4, 'mid', { dz: 2 }),
    p('sheep', 11.3, 'mid', { dz: 2.2, flip: true }),
    p('fence', -9.5, 'front', { dz: 1.4, length: 5 }),
    p('haystack', -11.5, 'front', { dz: -0.4 }),
  ],
  slides: [
    {
      id: 'titul',
      title: 'Ako sa stať…',
      subtitle: '…amatérskym blogerom, pomocným podcasterom a spíkrom, ktorého vybrala AI',
      message: true,
      heroSide: -4.2,
      notes: N('Krátko **pozdraviť**.'),
      // the byline: small, bottom right, there from the start
      parts: [part('text', 8.5, 1.05, { title: 'Marián Vlčák', body: '@vlkodotnet', align: 'center', width: 4.2, fontScale: 0.85, depth: 'front' })],
      groups: [],
    },
    {
      id: 'co-to-nebude',
      title: 'Čo to nebude',
      subtitle: '…a čo si odnesieš',
      notes: N(
        'Teraz by ste sa mali dozvedieť, **o čom bude táto prednáška**.',
        'S istotou viem povedať, že **nedostanete návod**, ako sa stať influencerom, ani ako rozbiť LinkedIn algoritmy.',
        'Dozviete sa o **ceste introverta**, ktorý má za sebou **15 rokov pokusov, omylov** a niekoľko vecí, ktoré nečakane vyšli.',
      ),
      groups: [
        {
          parts: [part('bullets', -6.4, 5.6, {
            title: 'Čakáš?',
            items: ['~~ako sa stať influencerom~~', '~~návod na LinkedIn algoritmus~~'],
            width: 7.4, tilt: -3, fontScale: 1.3,
          })],
        },
        {
          keep: true,
          parts: [part('numbered', 4.2, 4.3, {
            title: 'Odnesieš si',
            items: [
              'Prečo je osobný brand v ére AI dôležitý',
              'Čo reálne funguje, keď si introvert, nebývaš v Bratislave a marketing ti nejde',
              'Prečo stačí vystúpiť z komfortnej zóny a ozvať sa',
            ],
            width: 8, depth: 'front',
          })],
        },
      ],
    },
    {
      id: 'kto-som',
      title: 'Kto som',
      kicker: 'Marián Vlčák alias vlko',
      notes: N(
        '**Odsťahoval som sa na Oravu** a ako jedinému programátorovi mi **bolo smutno**.',
        'Posledných 15 rokov sa preto nejakým spôsobom snažím **podporovať slovenskú developerskú komunitu**.',
        '**CTO** FinStat.sk',
        'žijem a tvorím v **Námestove** na Orave',
        'amatérsky bloger — technologický **týždenník** na vyvojari.dev',
        '**WebUP** supporter s pravidelným mesačníkom',
        'súčasť hodnotiacej **komisie CodeCon**',
        'dvojka v **podcaste Link**',
      ),
      groups: [
        { parts: [part('image', -6, 3.6, { src: 'images/vlko.jpg', caption: 'Marián „vlko“ Vlčák', width: 5 })] },
        {
          keep: true,
          parts: [part('bullets', 4.2, 3.4, {
            title: 'Marián Vlčák alias vlko',
            items: [
              'CTO FinStat.sk',
              'žijem a tvorím v Námestove na Orave',
              'amatérsky bloger — technologický týždenník na vyvojari.dev',
              'WebUP supporter s pravidelným mesačníkom',
              'súčasť hodnotiacej komisie CodeCon',
              'dvojka v podcaste Link',
            ],
            width: 8.4, fontScale: 1.05,
          })],
        },
      ],
    },
  ],
});

// B. Posledný rok bol jazda — a paper circuit, three formula cars lapping
const OVAL = [0, -3.7, 7.8, 2.1]; // raceTrack at height 6: 1 model unit = 0.06
K = 1;
scenes.push({
  id: 'jazda',
  quips: [
    'Zapnite si pásy!',
    'Brzdy? Aké brzdy?',
    'Kto to šoféruje?!',
    'Rok za štyri okruhy.',
    'Minulý týždeň = retro.',
  ],
  kicker: 'Čo sa zmenilo',
  style: 'screen',
  ground: 'asphalt',
  props: [
    p('raceTrack', 0, -3.7, { flip: false }),
    p('formulaCar', 0, -3.7, { y: 0.04, variant: 'formulaRed', flip: false, move: { kind: 'loop', oval: OVAL, speed: 5.6, lane: 0.42, startAt: 0.02 } }),
    p('formulaCar', 0, -3.7, { y: 0.04, variant: 'formulaTeal', flip: false, move: { kind: 'loop', oval: OVAL, speed: 5.0, lane: -0.42, startAt: 0.3 } }),
    p('formulaCar', 0, -3.7, { y: 0.04, variant: 'formulaOchre', flip: false, move: { kind: 'loop', oval: OVAL, speed: 5.0, lane: -0.42, startAt: 0.78 } }),
    p('startGantry', 9.9, -3.7, { flip: false }),
    p('stadiumStand', -4.5, -8.6, { variant: 'stadiumStand', scale: 1.5 }),
    p('stadiumStand', 5, -8.6, { variant: 'stadiumStand', scale: 1.5 }),
    p('timingTower', -12.6, 'back', { dz: 1.5 }),
    p('tyreStack', -11.3, 'mid', { dz: 2.6 }),
    p('tyreStack', 12.2, 'mid', { dz: -3.4 }),
    p('tyreStack', 11.6, 'mid', { dz: 2.8 }),
    p('chequeredFlag', -9.6, 'action', { dz: 0.6 }),
    p('pitCrew', -7.6, 'action', { dz: 1.2, animation: 'wave', flip: false }),
    p('trafficCone', 6.4, 'front', { dz: -1.4 }),
    p('trafficCone', 7.6, 'front', { dz: -0.9 }),
  ],
  slides: [
    {
      id: 'jazda',
      title: 'Posledný rok bol jazda',
      notes: N(
        'Ešte pred pár rokmi som veril, že budem **celý život programátorom**.',
        '**Pred dvoma rokmi** som zistil, že AI vie **generovať kód**.',
        '**Pred rokom**, že **vie programovať**.',
        '**Pred pol rokom**, že vie programovať **obstojne**.',
        '**Pred 2 mesiacmi**, že vie **generovať UI**.',
        '**Pred mesiacom**, že vytvorí **plnohodnotné aplikácie**.',
        'Ale…',
      ),
      groups: [
        { parts: [part('text', -9.3, 5.6, { title: 'Kód', body: 'pred 2 rokmi', align: 'center', width: 4.3, fontScale: 1.15 })] },
        { keep: true, parts: [part('text', -3.1, 5.6, { title: 'Programovanie', body: 'pred rokom', align: 'center', width: 5.6, fontScale: 1.15 })] },
        { keep: true, parts: [part('text', 3.3, 5.6, { title: 'Grafika', body: 'pred pol rokom', align: 'center', width: 4.8, fontScale: 1.15 })] },
        { keep: true, parts: [part('text', 9.2, 5.6, { title: 'UI', body: 'pred 2 mesiacmi', align: 'center', width: 4.6, fontScale: 1.15 })] },
        { parts: [part('text', 0, 4.8, { title: 'ALE…', align: 'center', width: 6, fontScale: 2.4, depth: 'front' })] },
      ],
    },
  ],
});

// B. AI moved my cheese — the mouse runs, the cheese hops away
K = 1.45;
scenes.push({
  id: 'syr',
  quips: [
    'Kto mi zobral syr?!',
    'Sniff… tu bol kód.',
    'Kávička ostala.',
    'Tokeny idú, ja sedím.',
    'Myš to vie tiež.',
  ],
  kicker: 'Čo sa zmenilo',
  style: 'tear',
  ground: 'floor',
  props: [
    p('cheese', -8.5, 'action', { id: 'cheese', dz: 1.9, scale: 1.3, flip: false, move: { kind: 'flee', from: 'mouse', spots: [[-9, 1.6], [9, 1.5], [-3.5, 3.6], [4.5, 3.4]], near: 2.3, hop: 2.2, air: 0.6 } }),
    p('mouse', 6, 'action', { id: 'mouse', dz: 1.8, scale: 1.3, flip: false, move: { kind: 'chase', target: 'cheese', speed: 4.2, reach: 2.3, think: 1.2, anims: { move: 'run', still: 'sniff' } } }),
    p('mouseHole', -12.2, 'mid', { dz: 0.4, flip: false }),
    p('cheeseSign', 11.8, 'mid', { dz: 0.2, flip: false }),
    p('table', -6.2, 'back', { dz: 1.6 }),
    p('cheeseCloche', -6.2, 'back', { y: 1.2, dz: 1.9 }),
    p('cheeseCrumbs', 5.2, 'mid', { dz: 0.9 }),
    p('mouseTrap', 12.4, 'front', { dz: -0.8, flip: false }),
    p('bookshelf', 6.6, 'back', { dz: 0.6 }),
    p('officePlant', -13.8, 'back', { dz: 1.2 }),
    p('officePlant', 12.6, 'back', { dz: 0.8 }),
  ],
  slides: [
    {
      id: 'cheese',
      title: 'AI moved my cheese',
      subtitle: 'pred rokom vs. dnes',
      notes: N(
        'Dnes **AI píše väčšiu časť kódu**.',
        'To, čo nás robilo šťastnými, teda programovanie, **strácame** a musíme sa s tým nejako vyrovnať.',
        '**Pred rokom** som si ráno urobil **kávičku**, otvoril som **Visual Studio, Jiru** a väčšinu dňa, ak do toho nevošla porada, tak **písal kód**.',
        '**Dnes?** Otvorím ráno **konzolu**, Jiru, v konzole aspoň **dve session** a **spustím prompty**. Urobím si kávičku, popíjam a pozerám, **ako sa míňajú tokeny**.',
        'Akurát niekde v tom procese **sa podela tá radosť**, že som niečo urobil. Je čas ju **hľadať inde**.',
      ),
      groups: [
        { closeup: { prop: 1, zoom: 1.9 } }, // the mouse after the cheese, close up
        {
          parts: [
            part('bullets', -5.6, 4.7, { title: 'Pred rokom', items: ['kód píšem ja', 'AI mi dopĺňa riadky', 'radosť: vyriešil som to'], width: 7.6, fontScale: 1.25, tilt: -1.5 }),
            part('bullets', 5.6, 4.7, { title: 'Dnes', items: ['kód píše AI', 'ja zadávam, čítam a rozhodujem', 'radosť: …kam sa podela?'], width: 8.6, fontScale: 1.25, tilt: 1.5 }),
          ],
        },
      ],
    },
  ],
});

// B. DIFF — career + hiring: an office floor, a ladder, a queue, a robot
const diff = (title, lines, x = 0, y = 5.2) => part('diff', x, y, {
  title, before: 'pred rokom', after: 'teraz', lines, width: 13.6, fontScale: 1,
});
K = 1.35;
scenes.push({
  id: 'diff-praca',
  quips: [
    'git blame: AI',
    'Merge conflict so životom.',
    'Senior prompt inžinier.',
    'LGTM. Asi.',
    'Open to work? Aj ja.',
  ],
  kicker: 'git diff pred-rokom..teraz',
  style: 'cyber',
  ground: 'floor',
  props: [
    p('towerSlate', -9.8, -9.5, { height: 6, exact: true, flip: false }),
    p('towerIvory', 0.4, -9, { height: 6, exact: true }),
    p('careerLadder', -9.4, 'mid', { dz: 0.6, flip: false }),
    p('fox', -11.4, 'mid', { dz: 1.6, height: 1.6 }),
    p('serverRack', -13.6, 'back', { dz: 0.8 }),
    p('serverRack', -12.1, 'back', { dz: 0.8 }),
    p('desk', 4.4, 'mid', { dz: -0.4, flip: false }),
    p('aiRobot', 6.9, 'mid', { dz: 0.2, animation: 'scan', flip: false }),
    p('hiredSign', 2.2, 'mid', { dz: 1.3, flip: false }),
    p('queueRope', 10.4, 'mid', { dz: 1.9, flip: false }),
    p('kit', 9.4, 'mid', { dz: 0.5, height: 1.5 }),
    p('bearDog', 11.2, 'mid', { dz: 0.3, height: 1.6 }),
    p('pandaKid', 12.9, 'mid', { dz: 0.6, height: 1.4 }),
    p('boar', 14.5, 'mid', { dz: 0.2, height: 1.6 }),
    p('cvStack', 12.6, 'action', { dz: 1.6 }),
    p('officePlant', 0.6, 'back', { dz: 1 }),
  ],
  slides: [
    {
      id: 'diff-kariera',
      title: 'DIFF: Kariéra',
      notes: N(
        'Pred rokom bola **špecializácia istotou**: čím viac si bol odborník vo svojej oblasti, tým si bol **vzácnejší**.',
        'Dnes **hĺbkovú znalosť nahrádza AI model**. **Očakávania sú od nás iné**, len nám to ešte nikto nepovedal. Naša práca sa posúva **z odborníka na generalistu**. A už neplatí, že **cintoríny sú plné nenahraditeľných ľudí**, ale naše **náhrady sú v tokenoch**.',
      ),
      groups: [{ parts: [diff('Kariéra', ['- istoty, špecialista', '+ nahraditeľnosť, generalista'])] }],
    },
    {
      id: 'diff-hiring',
      title: 'DIFF: Hiring',
      notes: N(
        'Trh práce vyzerá tak, že firmy **radšej kúpia AI agenta** ako programátora.',
        'Pred rokom sme si **my vyberali**, kam pôjdeme, a **firmy sa o programátorov bili**. Dnes mám plný LinkedIn **„Open to work“**. **Nikde sa neprijíma**, našťastie zatiaľ **ani nevyhadzuje**. A **juniori to schytali najviac**.',
      ),
      groups: [{ parts: [diff('Hiring', ['- nedostatok ľudí, mohli sme si vyberať', '+ prebytok ľudí, bolestné chodenie po pohovoroch'])] }],
    },
  ],
});

// B. DIFF — education + work: a school, a carpenter, a bricklayer; a desk
// under a swarm of notifications
scenes.push({
  id: 'diff-skola',
  quips: [
    'Idem za stolára.',
    'Vlk murár, prečo nie.',
    'Fokus? Ten býval.',
    'Tri agenty, jedna hlava.',
    'Kde mi hlava stojí?',
  ],
  kicker: 'git diff pred-rokom..teraz',
  style: 'cyber',
  props: [
    p('schoolhouse', -11.2, 'back', { dz: 0.2 }),
    p('blackboard', -7.2, 'back', { dz: 2.2 }),
    p('pupil', -5.4, 'back', { dz: 2.8 }),
    p('carpenterBench', -8.6, 'mid', { dz: 2.2, flip: false }),
    p('bricks', -2.9, 'mid', { dz: 0.2 }),
    p('builder', -1.4, 'mid', { dz: 0.4, animal: 'bear', animation: 'work' }),
    p('cementMixer', 0.9, 'back', { dz: 1.6 }),
    p('desk', 8.2, 'mid', { dz: 0.2, flip: false }),
    p('notifySwarm', 8.2, 'mid', { dz: 0.5, obstacle: false }),
    p('laptop', 10.9, 'mid', { y: 1.0, dz: 1.2, flip: false }),
    p('table', 10.9, 'mid', { dz: 1.2, height: 1.0 }),
    p('officeChair', 12.6, 'mid', { dz: 1.8 }),
    p('pineTree', 4.4, 'back', {}),
    p('pineTree', 13.8, 'back', { dz: 0.8 }),
  ],
  slides: [
    {
      id: 'diff-skolstvo',
      title: 'DIFF: Školstvo',
      notes: N(
        'Pred rokom bola **kariéra v IT** **bezpečnou istotou** budúcnosti.',
        'Dnes počúvam, že byť taký **stolár a murár** nie je na zahodenie. Zmenilo sa to **neuveriteľne rýchlo**.',
      ),
      groups: [{ parts: [diff('Školstvo', ['- IT, programátor', '+ stolár, murár'])] }],
    },
    {
      id: 'diff-work',
      title: 'DIFF: Work',
      notes: N(
        'Pred rokom som vedel **celý deň presedieť nad problémom**.',
        'Dnes mi beží **niekoľko agentov naraz**. Hlavu mám v **dvoch až troch problémoch súčasne** a neviem, **kde mi hlava stojí**.',
      ),
      groups: [{ parts: [diff('Work', ['- focus', '+ context switching'])] }],
    },
  ],
});

// B. STRACH — the gloom: dead trees, a storm cloud, crows; then first light
K = 1.3;
scenes.push({
  id: 'strach',
  quips: [
    'Brrr.',
    'Tu straší.',
    'Aúúú… to nič.',
    'Krkavec vie viac.',
    'Kto zhasol?',
  ],
  kicker: 'Čo sa zmenilo',
  style: 'cyber',
  mood: 'gloom',
  ground: 'barren',
  props: [
    p('deadTree', -11.6, 'back', { dz: 0.6 }),
    p('deadTree', 9.2, 'back', { dz: -0.4, scale: 0.85 }),
    p('deadTree', 13.6, 'mid', { dz: 0.4, scale: 0.7 }),
    p('stormCloud', -4.2, 'back', { dz: 1.2, flip: false }),
    p('stormCloud', 6, -9, { scale: 1.1, flip: false }),
    p('tombstoneCode', -7.4, 'mid', { dz: 0.6, flip: false }),
    p('crow', 4.8, 'mid', { dz: 1, animation: 'caw' }),
    p('crow', -13.4, 'mid', { dz: 2, animation: 'idle' }),
    p('cheeseCrumbs', -2.8, 'action', { dz: 2 }),
    p('emptySpotlight', 9.8, 'mid', { dz: 2, flip: false }),
    p('meetupChairs', 12.9, 'action', { dz: 1.6 }),
    p('tumbleweed', -14, 'front', { flip: false, move: { kind: 'cross', from: [-15, 3.1], to: [15, 2.5], speed: 2.3, pause: 4, startAt: 0.4 } }),
    p('lighthouse', -14.6, 'back', { dz: -1.4 }),
  ],
  slides: [
    {
      id: 'strach',
      title: 'STRACH',
      notes: N('**Strach z toho, čo prináša AI**. Všetky **DIFF-y** vyššie sa dajú zhrnúť do tohto pocitu.'),
      groups: [],
    },
    {
      id: 'nikoho-nezaujimam',
      title: 'NIKOHO NEZAUJÍMAM',
      kicker: '', // the scene's "Čo sa zmenilo" strapline stays off this slide
      message: true,
      style: 'tear',
      notes: N(
        '(**Chvíľka ticha**.)',
        'Pre mňa bolo **najdôležitejšie zistenie**, že „Nikoho nezaujímam“. Niežeby to bolo predtým iné, ale **v období nedostatku** zisťovali moju hodnotu **až vo firme**. Teraz je **na mne ukázať, že mám hodnotu**.',
        'A tu má začať aj **vaša cesta**: **zmenilo sa prostredie, musíte sa zmeniť aj vy**. Nemusí sa z vás stať **druhý vlko**. **Akákoľvek zmena** vám pomôže zvýšiť vašu hodnotu, ktorú musíte **ukázať vopred**.',
        'Možno za chvíľu nebude záležať na tom, čo vieš, ale na tom, **či o tebe vôbec niekto vie**, že existuješ.',
        'Tým je zodpovedaný bod 1: preto je **osobný brand v ére AI** dôležitý.',
      ),
      groups: [],
    },
    {
      id: 'ako-to-zmenit',
      title: 'Ako to zmeniť?',
      style: 'sticker',
      mood: 'dawn',
      notes: N('**Viditeľnosť v komunite** je možno **najlacnejšia poistka**, ktorú si vieme kúpiť.'),
      groups: [],
    },
  ],
});

// C. IMPOSTOR SYNDROME — a sheep behind a wolf mask
K = 1.3;
scenes.push({
  id: 'impostor',
  quips: [
    'Ja som fakt vlk?',
    'Tá ovca je podozrivá.',
    'Pochvale neverím.',
    'Zrkadlo klame.',
    'Odhalia ma. Určite.',
  ],
  kicker: 'Z čoho vychádzam',
  style: 'tear',
  mood: 'dusk',
  props: [
    p('impostorSheep', -4.2, 'action', { dz: 0.6, animation: 'peek', flip: false }),
    p('standingMirror', -7.6, 'mid', { dz: 2.2, flip: false }),
    p('sheep', 6.2, 'mid', { dz: 0.6 }),
    p('sheep', 8.6, 'mid', { dz: 1.8, animation: 'graze' }),
    p('lamb', 10.4, 'action', { dz: 0.8 }),
    p('sheep', 11.8, 'back', { dz: 1.4 }),
    p('fence', -12.6, 'mid', { dz: 1.4, length: 5 }),
    p('pineTree', -13.4, 'back', {}),
    p('pineTree', 13.6, 'back', { dz: 0.6 }),
    p('pineTree', 2.2, 'back', { dz: -1 }),
    p('hut', -9.8, 'back', { dz: 1 }),
    p('haystack', 13.2, 'mid', { dz: 0.4 }),
  ],
  slides: [
    {
      id: 'impostor',
      title: 'IMPOSTOR SYNDROME',
      message: true,
      heroSide: 3.2,
      notes: N(
        'Celý život mám **impostor syndróm**, teda pocit, že **nie som dosť dobrý**, že som sa sem dostal **len náhodou** a každú chvíľu na to niekto príde. Keby ste mi dali **pochvalu**, tak vám **neuverím ani slovo**.',
        'Uff, to je materiál v mojej hlave, s ktorým celý život bojujem. Prirátajte **introvertnosť** a život **mimo centra diania**, na okraji Slovenska.',
        'Ale s **trochou konzistencie** sa s tým dá pohnúť. Tu sú **4 kroky**.',
      ),
      groups: [{ closeup: { at: [-5.6, 1.2, -1.2], size: [9, 5] } }], // the sheep in the wolf mask, and its mirror
    },
  ],
});

// D. START LEARNING — a small meetup
K = 1.35;
scenes.push({
  id: 'learning',
  quips: [
    'Meetup? Idem!',
    'Sedím vzadu.',
    'Pizza bude?',
    'Z gauča to nepôjde.',
    'RSS čítačka žije!',
  ],
  style: 'sticker',
  props: [
    p('projectorScreen', -9.4, 'back', { dz: 2, flip: false }),
    p('teacher', -12, 'mid', { dz: 0.4 }),
    p('meetupChairs', -7.6, 'mid', { dz: 2.2 }),
    p('learnerCat', -4.4, 'mid', { dz: 2.4, flip: false }),
    p('plannerBoard', 7.2, 'mid', { dz: 0.6, flip: false }),
    p('couch', 11.6, 'mid', { dz: 1.6, flip: false }),
    p('floorLamp', 13.8, 'mid', { dz: 0.4, flip: false }),
    p('townhouse', 2.8, 'back', { dz: -0.6 }),
    p('parkTree', 13.6, 'back', { shape: 'round' }),
    p('parkTree', -14.2, 'back', { shape: 'cone' }),
    p('bench', 4.6, 'back', { dz: 2.4 }),
  ],
  slides: [startSlide({
    id: 'start-learning',
    verb: 'LEARNING',
    must: 'ORGANIZE',
    giveUp: 'COMFORT',
    also: { title: 'Learning is also:', items: ['communities'] },
    notes: N(
      'Môže sa zdať, že s príchodom AI **nemá zmysel učiť sa** niečo nové. **Opak je ale pravdou**. Niekto tie **prompty musí kontrolovať**, niekto musí specke povedať, že má používať túto **novú technológiu**.',
      'Na učenie sa ale **človek musí pripraviť**. Nainštalujte si dobrú **RSS čítačku**, prihláste sa do dobrých **newsletterov**. A **dajte novej téme čas**, niekedy mi trvá aj **pár týždňov**, kým sa to celé v hlave poskladá.',
      'Musíte ale **niečo obetovať**. **Vyčleňte si čas**, nahraďte **hodinu pred TV, Netflixom či YouTube** hodinou koncentrovaného konzumovania noviniek.',
      'Nezabudnite, že vzdelávanie je aj **stretávanie sa s komunitami**. Tak ako tento **CodeCon**, tak ako náš žilinský **WebUP**.',
    ),
  })],
});

// D. START READING — books against the television
scenes.push({
  id: 'reading',
  quips: [
    'Čítam, nescrollujem.',
    'Kniha nemá notifikácie.',
    'Ešte jednu kapitolu.',
    'E-ink a dobrú noc.',
    'Papier nepadá.',
  ],
  style: 'sticker',
  ground: 'floor',
  props: [
    p('bookshelf', -12.6, 'back', { dz: 1, variant: 'bookshelfTall' }),
    p('bookshelf', -10.2, 'back', { dz: 1, variant: 'bookshelf' }),
    p('openBook', -7.6, 'mid', { dz: 1.4, flip: false }),
    p('bookTower', -4.6, 'mid', { dz: 0.4 }),
    p('floorLamp', -10.4, 'mid', { dz: 1.2, flip: false }),
    p('retroTv', 8.6, 'mid', { dz: 0.8, animation: 'watch', flip: false }),
    p('couch', 11.4, 'action', { dz: 1.4, flip: true }),
    p('bookTower', 5.6, 'back', { dz: 1.8, scale: 0.8 }),
    p('officePlant', 13.8, 'back', { dz: 1.2 }),
    p('officePlant', 1.4, 'back', { dz: 0.6 }),
  ],
  slides: [startSlide({
    id: 'start-reading',
    verb: 'READING',
    must: 'READ',
    giveUp: '~~WATCHING~~',
    hacks: ['e-ink / low blue light', 'paging, not scrolling'],
    notes: N(
      'Nekonzumujte obsah **len vo forme videa**. Pri čítaní sa mozog prepína do **špeciálneho módu**, ktorý pri videu nedosiahnete. Rýchlejšie tak **pochopíte súvislosti**.',
      'Vzdajte sa **pasívneho pozerania videí a scrollovania**. A keď máte novinky hotové, tak si **otvorte knižku**.',
      'Mám **pár tipov**: kúpte si **Android e-ink zariadenie**, čítať večer pred spaním na mobile je **zabijak spánku**, a kúpte alebo vyvibecodujte si **RSS čítačku, čo vie stránkovať obsah**.',
    ),
  })],
});

// D. START WRITING — the amateur blogger
scenes.push({
  id: 'writing',
  quips: [
    'Píšem, teda som.',
    'Prvý článok bolí.',
    'FOMO, zbohom!',
    'Nie koľko, ale kto číta.',
    'Publish a utekaj.',
  ],
  style: 'sticker',
  props: [
    p('table', -8.4, 'mid', { dz: 0.8 }),
    p('typewriter', -8.4, 'mid', { y: 1.2, dz: 1.1, flip: false }),
    p('officeChair', -10.6, 'mid', { dz: 0.4 }),
    p('newsletterStack', -5.6, 'mid', { dz: 2 }),
    p('newsletterStack', -4.4, 'mid', { dz: 1.2, scale: 0.8 }),
    p('postBoxOpen', -12.6, 'action', { dz: 0.6, flip: false }),
    p('paperPlane', -12, 'mid', { y: 0.6, flip: false, move: { kind: 'cross', from: [-11.5, -2.6], to: [14.5, -5.2], speed: 3.2, pause: 2.5 } }),
    p('fomoFeed', 9.6, 'mid', { dz: 0.4, flip: false }),
    p('fomoFeed', 12.4, 'back', { dz: 1.2, flip: false, scale: 0.9 }),
    p('cottage', 2.4, 'back', { dz: -0.4, variant: 'timber' }),
    p('pineTree', -14.4, 'back', {}),
    p('pineTree', 6.4, 'back', { dz: 0.4 }),
  ],
  slides: [startSlide({
    id: 'start-writing',
    verb: 'WRITING',
    role: 'amateur blogger',
    must: 'CONSISTENCY IS KEY',
    giveUp: 'FOMO',
    mine: 'a weekly on vyvojari.dev — eighth year, every week',
    notes: N(
      'Prvá rola z názvu: **amatérsky bloger**.',
      'Musíš začať **písať pravidelne**, **bez výhovoriek** a hlavne **pre seba**. Skutočné dosahy ale dosiahneš, ak budeš **písať po anglicky**.',
      'Daj si pozor na **FOMO**, fear of missing out. **Nemusíš pokryť úplne všetko**. Časom si vybudujete solídnu základňu zdrojov a článkov a nedá sa popísať všetko. **Nastavte si hranicu**.',
      'Ja som začal písať **krátke správičky** pred dávnymi rokmi. **Bol to des**, ale krátke texty na začiatok stačia. **Skúste Twitter**. Postupne mi prestal formát dostačovať, lebo FOMO písať to denne zaberalo veľa času. Tak som prešiel na **týždenné intervaly**, ale aj tak som s tým **na desať rokov sekol**.',
      '**vyvojari.dev** bola pre mňa nová fáza, lebo som zistil, že **bez revízie toho, čo prečítam**, sa mi neukladajú informácie dobre. Neverili by ste, ako pomôže dať svoje **myšlienky na papier** alebo ich zapísať na klávesnici. Tak som to začal robiť pravidelne a už **ôsmy rok** píšem týždenník **cez zaťaté zuby**, či sa mi chce, alebo nechce. A keďže som amatérsky bloger, tak každý týždenník má čítanosť tak **50 až 80 ľudí**. To nie je moc, ale ako mi povedal jeden kamarát: nie je dôležité, koľko, **ale kto ťa číta**.',
      'Pred rokom som začal pomocou AI a manuálneho review s **anglickou verziou**. Keďže som slabý marketér, tak mám už asi **15 čítaní** na jednu verziu. Ach jaj.',
    ),
  })],
});

// D. START TALKING — the co-host
scenes.push({
  id: 'talking',
  quips: [
    'Skúška, raz, dva.',
    'Nahrávame?',
    'Introvert pri mikrofóne.',
    'Horší než robot nebudem.',
    'Aúúú do éteru!',
  ],
  style: 'sticker',
  props: [
    p('table', -7.4, 'mid', { dz: 1 }),
    p('podcastMic', -8.6, 'mid', { y: 1.2, dz: 1.3, scale: 0.6, flip: false }),
    p('headphones', -6.2, 'mid', { y: 1.2, dz: 1.4, scale: 0.8 }),
    p('podcastHost', -10.6, 'mid', { dz: 0.8, flip: false }),
    p('onAirSign', -13.2, 'mid', { dz: -0.4, flip: false }),
    p('speechBubbles', -4.2, 'back', { y: 0.4, dz: 2.6, flip: false }),
    p('stage', 9.4, 'back', { dz: 1.2 }),
    p('musician', 12.6, 'mid', { dz: 0.4 }),
    p('citizen', 7.2, 'mid', { dz: 1.6 }),
    p('citizen', 9.2, 'mid', { dz: 2.2 }),
    p('citizen', 11, 'action', { dz: 1.2 }),
    p('speechBubbles', 9.6, 'mid', { y: 1.5, dz: 1, scale: 0.7, flip: false }),
    p('townhouse', 2.2, 'back', { dz: -0.8 }),
    p('parkTree', -14.6, 'back', { shape: 'round' }),
  ],
  slides: [startSlide({
    id: 'start-talking',
    verb: 'TALKING',
    role: 'sidekick podcaster',
    must: 'JOIN COMMUNITY · JUST ASK',
    giveUp: 'COMFORT ZONE',
    mine: 'via WebUP to CodeCon · one message to Dávid and I am on the Link podcast',
    notes: N(
      'Druhá rola z názvu: **pomocný podcaster**.',
      'Viete, ako začnete hovoriť na verejných eventoch? Tak, že začnete hovoriť **na tých neverejných**. Spravte si **mini event raz za mesiac** vo vašej firme, nájdite si **malú milú komunitu**, ktorá vám dá **feedback**, ako je WebUP.',
      'Budete ale musieť vystúpiť **zo svojej komfortnej zóny**. Úprimne, ja som mal a asi aj stále mám **všetky chyby**, aké prednášajúci môže mať. **Rýchlo hovorím, mumlem, opakujem sa**, keď som v úzkych, tak je to samé **akokebyže, akože, takže**. Ale **cvičenie robí majstra**. Keď som **pred 4 rokmi** začal mať na WebUP **mesačník**, tak to bolo utrpenie pre poslucháčov aj mňa, našťastie sa stretávame tam, kde **čapujú pivo**, tak to nejako prežili. Ale začal som sám seba nútiť **lepšie artikulovať, pomalšie hovoriť**. O rok na tom budem lepšie ako teraz.',
      'A vystúpiť z komfortnej zóny znamená aj sa **jednoducho spýtať**. Všetky komunitné eventy **hľadajú spíkrov**, stačí zaplniť **15 až 20 minút**. Spýtajte sa, či nepotrebujú **pomôcť s organizáciou**. Mimochodom, ja som sa tak raz spýtal **Dávida Tvrdoňa**, že či nechce vyskúšať nahradiť také **robotické hlasy** tým mojím, veď horšie to už nemôže byť, a už rok robím pomocného podcastera v **podcaste Link**. Aj do **hodnotiacej komisie CodeCon** som sa dostal, lebo sa **stačilo iba ponúknuť**.',
    ),
  })],
});

// D. CREATE something — the maker's corner
scenes.push({
  id: 'create',
  quips: [
    'Idem niečo zbúchať.',
    'Nápad! Kde je pero?',
    'Funguje to? Šokujúce.',
    'Vytiahnite telefóny!',
    'Hotové je lepšie.',
  ],
  kicker: 'learning + reading + writing + talking',
  style: 'sticker',
  props: [
    p('makerBench', -8.2, 'mid', { dz: 0.8, flip: false }),
    p('lightbulb', -4.6, 'mid', { dz: 2, flip: false }),
    p('paperRocket', 9.2, 'mid', { dz: 0.4, animation: 'launch', flip: false }),
    p('crane', 13.4, 'back', { dz: 0.4 }),
    p('scaffold', 5.2, 'back', { dz: 1 }),
    p('builder', -11.8, 'mid', { dz: 1.8, animal: 'bear', animation: 'work' }),
    p('bricks', 6.6, 'mid', { dz: 1.4 }),
    p('typewriter', 11.6, 'action', { dz: 1.2, scale: 1.4, flip: false }),
    p('bookTower', 12.9, 'mid', { dz: 1.6, scale: 0.8 }),
    p('pineTree', -14.2, 'back', {}),
    p('pineTree', 1.2, 'back', { dz: -0.6 }),
  ],
  slides: [
    {
      id: 'create',
      title: 'CREATE something',
      notes: N(
        'Pri všetkom tom AI, čo je okolo nás, verím, že si ľudia budú ceniť to, čo **tvoríme ručne**. Nemusí to byť nič zložité, nájdite si **komunitu v okolí**, spravte **malú prednášku na meetupe**.',
        'A teraz prichádza časť, keď by ste si mali **vytiahnuť telefóny**, lebo prichádzajú odkazy.',
        '**Prvá dvojica je písanie**. **Týždenník** na vyvojari.dev je môj technologický prehľad, ktorý píšem ôsmy rok každý týždeň. **Weekly Dev Digest** na Substacku je jeho anglická verzia, ktorú robím asi rok s pomocou AI a ručného review.',
        '**Druhá dvojica je rozprávanie**. **WebUP** je žilinský meetup, na YouTube nájdete záznamy prednášok aj môj mesačník. **Link** je technologický podcast Dávida Tvrdoňa, v ktorom robím pomocného podcastera.',
        '**Tretia dvojica** je to, čo som si postavil sám. **WolfDeck** je nástroj, v ktorom beží táto prezentácia. **WolfMark** je môj denný zápisník: obyčajné Markdown súbory, kalendár namiesto zoznamu a história poznámok.',
      ),
      // what I made: three pairs of links, one pair at a time
      groups: [
        { parts: [
          part('image', -5.2, 4.3, { src: 'images/qr-tyzdennik.png', caption: 'Týždenník', width: 5.4, tilt: -1.5, depth: 'front' }),
          part('image', 5.2, 4.3, { src: 'images/qr-substack.png', caption: 'Weekly Dev Digest', width: 5.4, tilt: 1.5, depth: 'front' }),
        ] },
        { parts: [
          part('image', -5.2, 4.3, { src: 'images/qr-webup.png', caption: 'WebUP', width: 5.4, tilt: -1.5, depth: 'front' }),
          part('image', 5.2, 4.3, { src: 'images/qr-link.png', caption: 'Link', width: 5.4, tilt: 1.5, depth: 'front' }),
        ] },
        { parts: [
          part('image', -5.2, 4.3, { src: 'images/qr-wolfdeck.png', caption: 'WolfDeck', width: 5.4, tilt: -1.5, depth: 'front' }),
          part('image', 5.2, 4.3, { src: 'images/qr-wolfmark.png', caption: 'WolfMark', width: 5.4, tilt: 1.5, depth: 'front' }),
        ] },
      ],
    },
  ],
});

// E. BUILD YOUR BRAND → BE RECOGNIZABLE → BE CHOSEN BY AI — a night stage
K = 1.3;
scenes.push({
  id: 'brand',
  quips: [
    'Reflektor? Na mňa?',
    'AI si ma pamätá!',
    'Schod po schode.',
    'Pozná ma aj chatbot.',
    'Zamoril som internet.',
  ],
  kicker: 'spíker, ktorého vybrala AI',
  style: 'screen',
  mood: 'night',
  ground: 'stage',
  props: [
    p('brandStairs', 6.8, 'back', { dz: 2.2, flip: false }),
    // pools of light: the stairs, the robot with his trophy
    p('light', 7.4, -3.2, { y: 4.2, exact: true, intensity: 3, distance: 10 }),
    p('light', -7.4, -1.6, { y: 3.6, exact: true, intensity: 2, distance: 8, color: '#dfe8ff' }),
    p('starBadge', 12.6, 'mid', { dz: 0.2, flip: false }),
    p('aiRobot', -6.6, 'mid', { dz: 1.4, animation: 'point', flip: true }),
    p('trophyPick', -9, 'mid', { dz: 2.4, flip: false }),
    p('stageSpot', -13, 'mid', { dz: -0.6, flip: false }),
    p('stageSpot', 13.6, 'back', { dz: 0.4, flip: true }),
    p('serverRack', -11.2, 'back', { dz: 0.6 }),
    p('serverRack', -9.7, 'back', { dz: 0.6 }),
    p('onAirSign', 2.4, 'back', { dz: 0.4, flip: false }),
    p('meetupChairs', -2.6, 'front', { dz: 1.4 }),
    p('meetupChairs', 2.8, 'front', { dz: 1.6 }),
  ],
  slides: [
    {
      id: 'brand',
      title: 'Výsledok',
      notes: N(
        'Keď sa prelúskaš cez **všetky štyri START bloky**, tak je veľká šanca, že si **vytvoríš brand**.',
        'Keď o tebe vedia ľudia, tak sa o tebe **dozvie aj AI**. Treba len **internet zamoriť svojím obsahom**.',
        'A to je ten **finálny krok**. **Byť vybratý AI**. Mimochodom, to je dôvod, **prečo vznikla táto prednáška**.',
      ),
      groups: [
        { parts: [part('text', -7.4, 4.3, { title: 'BUILD YOUR BRAND', align: 'center', width: 7.4, fontScale: 1.15 })] },
        { keep: true, parts: [part('text', 0, 5.5, { title: 'BE RECOGNIZABLE', align: 'center', width: 7, fontScale: 1.15 })] },
        { keep: true, parts: [part('text', 7.2, 6.7, { title: 'BE CHOSEN BY AI', align: 'center', width: 6.8, fontScale: 1.15 })] },
        // the proof: the chat message where an AI put me on the speaker list
        { closeup: true, parts: [part('image', 0, 3.6, { src: 'images/chosen-by-ai.png', width: 13, aspect: 753 / 316, depth: 'front' })] },
      ],
    },
  ],
});

// F. Záver — the curtain, the recap, that's all folks (in 3D)
K = 1;
scenes.push({
  id: 'zaver',
  quips: [
    'Už len potlesk.',
    'Prežili sme to!',
    'Otázky? Ľahké, prosím.',
    'QR kódy neštípu.',
    'Aúúú, ďakujem!',
  ],
  kicker: 'Záver',
  style: 'paper',
  ground: 'stage',
  props: [
    // a wide curtain across the back of the stage
    { ...p('curtain', 0, -8.4, { animation: 'open', flip: false, height: 7 }), scale: [1.9, 1, 1] },
    // curtain call: the cast of the talk lines up in the opening, just behind
    // the curtain line, and bows (a wave from the middle outwards)
    ...[
      ['pitCrew', -9.8, { animation: 'wave' }],
      ['crow', -7.0, { animation: 'caw', scale: 2.2 }],
      ['mouse', -4.3, { scale: 2.2 }],
      ['aiRobot', -1.6, { animation: 'idle' }],
      ['impostorSheep', 1.6, { animation: 'peek', scale: 1.7 }],
      ['learnerCat', 4.3, {}],
      ['podcastHost', 7.0, {}],
      ['builder', 9.8, { animal: 'bear', animation: 'work' }],
    ].map(([type, x, o]) => p(type, x, -9.1, { flip: false, obstacle: false, bow: +(Math.abs(x) * 0.06).toFixed(2), scale: 1.8, ...o })),
    // the end card: a funnel of rings right in front of the camera — it
    // covers the whole stage — with the sign-off across it. Both arrive with
    // the last slide; the wolf backs into the blue well and peeks out.
    p('ringTunnel', 0, 2.6, { y: 3.4, radius: 16, well: 2.6, overlay: true, exact: true, slide: 'thats-all-folks' }),
    p('text3d', 0, 3.5, { y: 2.2, text: "That's all Folks!", size: 1.25, depth: 0.3, roll: 9, shadow: false, obstacle: false, color: '#fffaf0', sideColor: '#5a0a12', glow: 0.55, animation: 'wave', exact: true, slide: 'thats-all-folks' }),
    p('confettiCannon', -11.4, 'mid', { dz: 1.6, scale: 2.2, flip: false }),
    p('confettiCannon', 11.4, 'mid', { dz: 1.6, scale: 2.2, flip: true }),
    p('stageSpot', -13.6, 'mid', { dz: -1, animation: 'idle', flip: false }),
    p('stageSpot', 13.6, 'mid', { dz: -1, animation: 'idle', flip: true }),
    p('starBadge', -12.4, 'action', { dz: 1.6, flip: false }),
    p('paperRocket', 12.6, 'action', { dz: 1.4, scale: 0.7, flip: false }),
  ],
  slides: [
    {
      id: 'rekapitulacia',
      title: 'Rekapitulácia',
      notes: N(
        'Žiadny z týchto krokov **nebol plánovaný**. Vždy stačilo **ozvať sa a urobiť prvý krok**.',
        '[NÁVRH] Jedna vec, ktorú môžeš urobiť ešte dnes: **napíš jednému človeku** z tejto konferencie, ktorého prednáška ťa zaujala. Poďakuj a spýtaj sa jednu otázku. Presne tak sa začali všetky moje kroky.',
      ),
      groups: [
        {
          parts: [part('numbered', 0, 5.3, {
            items: [
              { title: 'Osobný brand v ére AI', text: 'kým o tebe nevedia, nikoho nezaujímaš' },
              { title: 'Čo funguje', text: 'START learning · reading · writing · talking' },
              { title: 'Komfortná zóna', text: 'stačí sa ozvať' },
            ],
            width: 9.4, fontScale: 1.12, depth: 'front',
          })],
        },
      ],
    },
    {
      id: 'thats-all-folks',
      title: '', // nothing but the end card; the thanks come with the QR codes
      kicker: '',
      heroPerch: [0, 3.3, -0.3], // inside the tunnel, between the last ring and the well
      notes: N(
        '**Poďakovať**, **priestor na otázky**.',
        'QR kódy: vyvojari.dev, Weekly Dev Digest (Substack) a podcast Link (YouTube).',
      ),
      groups: [
        {
          parts: [
            part('text', 0, 7.7, { title: 'Ďakujem!', align: 'center', width: 5.6, fontScale: 1.5, depth: 4.6 }),
            part('image', -6.6, 1.0, { src: 'images/qr-vyvojari.png', caption: 'vyvojari.dev', width: 3, depth: 4.6 }),
            part('image', 0.0, 1.0, { src: 'images/qr-substack.png', caption: 'Weekly Dev Digest', width: 3, depth: 4.6 }),
            part('image', 6.6, 1.0, { src: 'images/qr-link.png', caption: 'podcast Link', width: 3, depth: 4.6 }),
          ],
        },
      ],
    },
  ],
});

const deck = {
  meta: {
    title: 'Ako sa stať amatérskym blogerom, pomocným podcasterom a spíkrom, ktorého vybrala AI',
    sceneSpacing: 34,
    walkSpeed: 9,
    seed: 26,
  },
  scenes: scenes.map((s) => ({ ...s, slides: s.slides.map((sl) => ({ ...sl, notes: sl.notes })) })),
};
const out = path.join(root, 'public/codecon-2026.json');
fs.writeFileSync(out, `${JSON.stringify(deck, null, 2)}\n`);
const slides = deck.scenes.reduce((n, s) => n + s.slides.length, 0);
console.log(`[deck] ${deck.scenes.length} scenes, ${slides} slides → public/codecon-2026.json`);
