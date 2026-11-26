// Bar-based timeline. 110 BPM, bar 0 = 0.1 s. Music sections (in bars): 0 intro, 8 lift, 16 main,
// 32–40 quiet break (form filling), 40 full again ("Senda" + burst), 64 ending.
import { bar } from './util.js';

export const T = {
  end: 147.6,
  mother: bar(0),
  tilesStart: bar(4),
  tilesFast: bar(5.5),
  tilesEnd: bar(10),
  click: bar(12),
  folds: [12.5, 13.0, 13.5, 14.0, 14.5, 15.0].map(bar),
  foldDur: 0.82,
  hop: bar(15.25),
  coverShut: bar(16),
  bookFly: bar(16.05),
  bookOpen: bar(17.5),
  pageTurn: bar(21),
  bookClose: bar(24.25),
  people: bar(25),
  form: bar(30.5),
  typing: bar(32),
  send: bar(39.6),
  burst1: bar(40),
  print: bar(41),
  burst2: bar(46),
  assemble: bar(47),
  burst3: bar(52),
  deliver: bar(53),
  slot: bar(57),
  free: bar(58),
  endCard: bar(63.5),
};

export const CHAPTERS = [
  { a: 0, n: '01', name: 'BARNIÐ' },
  { a: bar(4), n: '02', name: 'VERKEFNIN' },
  { a: bar(12), n: '03', name: 'BÆKLINGURINN' },
  { a: bar(25), n: '04', name: 'PÖNTUNIN' },
  { a: bar(40), n: '05', name: 'VIÐ SJÁUM UM RESTINA' },
  { a: bar(58), n: '06', name: 'FRÍTT' },
];

export const CUES = [
  { a: bar(0.55), b: bar(3.85), label: 'BARNIÐ', head: 'Það er barn á leiðinni.', sub: 'Til hamingju! Nú byrjar undirbúningurinn.' },
  { a: bar(4.05), b: bar(7.85), label: 'VERKEFNIN', head: 'En það er ótal margt\nsem þarf að huga að.', sub: 'Bílstóll, barnavagn, brjóstagjöf, tryggingar,\nfæðingarorlof og margt, margt fleira.' },
  { a: bar(8.0), b: bar(11.85), label: 'VERKEFNIN', head: 'Hvar á að byrja?' },
  { a: bar(12.05), b: bar(15.7), label: 'BÆKLINGURINN', head: 'Svo við tökum þetta\n*allt saman.*' },
  { a: bar(16.1), b: bar(20.85), label: 'BÆKLINGURINN', head: 'Allt sem nýbakaðir foreldrar\nþurfa, *á einum stað.*', sub: 'Einn bæklingur með bestu tilboðunum,\nfrá meðgöngu og fram á fyrstu árin.' },
  { a: bar(21.0), b: bar(24.3), label: 'BÆKLINGURINN', head: 'Við semjum um\n*bestu kjörin.*', sub: 'Fyrir hvert verkefni finnum við traust fyrirtæki\nog fáum sérkjör fyrir nýbakaða foreldra.' },
  { a: bar(25.1), b: bar(30.35), label: 'PÖNTUNIN', head: 'Amma, afi, vinir eða\nforeldrarnir sjálfir.', sub: 'Hver sem er getur pantað bæklinginn\nhanda nýbökuðum foreldrum.' },
  { a: bar(30.6), b: bar(39.85), label: 'PÖNTUNIN', head: 'Þú fyllir út\neinfalt form.', sub: 'Nafn, kennitala og heimilisfang.\nMeira þarf ekki.' },
  { a: bar(41.0), b: bar(45.85), label: 'VIÐ SJÁUM UM RESTINA', head: 'Við prentum hann.\n*Frítt.*' },
  { a: bar(47.0), b: bar(51.85), label: 'VIÐ SJÁUM UM RESTINA', head: 'Við setjum hann saman.\n*Frítt.*' },
  { a: bar(53.0), b: bar(57.85), label: 'VIÐ SJÁUM UM RESTINA', head: 'Við sendum hann\nheim að dyrum. *Frítt.*' },
];
