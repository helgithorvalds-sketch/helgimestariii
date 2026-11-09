/**
 * The two films (rendered from the same three.js scenes as the site's stories).
 * AV1 10-bit first, H.264 as the universal fallback (research 04 §4.5). 1920×1080, 30 fps, with music.
 */
export interface Film {
  sources: { src: string; type: string }[];
  /** WebVTT captions: the film's card texts timed to the cut, plus the music cue (research 04 §5.6) */
  captions: string;
  /** text alternative: what is seen, in order, and the words on screen */
  transcript: { scene: string; words: string }[];
  /**
   * frame 0 of the film (extracted with ffmpeg: the empty dark stage), layered over the video until
   * the first frame is presented, so the swap is invisible (research 01 §7)
   */
  frame0: string;
  /** a resting still with the title and the booklet: for sharing (og:image), not for the swap */
  poster: string;
  /** accessible name of the dialog */
  label: string;
  /** what the film is called in its corner label */
  title: string;
  /** real running time, rounded */
  seconds: number;
}

const AV1 = 'video/mp4; codecs="av01.0.08M.10"';
const H264 = "video/mp4";

export const FILM_HEIMILI: Film = {
  sources: [
    { src: "/svif/film/svif-heimili-av1.mp4", type: AV1 },
    { src: "/svif/film/svif-heimili.mp4", type: H264 },
  ],
  captions: "/svif/film/svif-heimili.is.vtt",
  transcript: [
    {
      scene: "Nýji kaflinn lendir á dökku sviði og opnast. Flett er hratt í gegnum allar síðurnar og svo lokast hann.",
      words: "Við tengjum ykkur við alla nýja húseigendur á höfuðborgarsvæðinu.",
    },
    {
      scene: "Hús úr ljósum leir með skilti sem á stendur SELT. Í kringum það birtast tryggingar, málning, húsgögn, gluggar, gólfefni og rafmagn.",
      words: "Um 80% nýrra húseigenda ráðast í framkvæmdir eftir húsakaup. Nýju heimili fylgja ótal verkefni.",
    },
    {
      scene: "Hlutirnir dofna og Nýji kaflinn lendir á auða svæðinu og opnast. Flett er í gegnum nokkrar síður.",
      words: "Þess vegna bjuggum við til SVIF.",
    },
    {
      scene: "Fjórir afsláttarmiðar lyftast upp úr bæklingnum og hver þeirra lendir hjá verkefninu sem hann á við.",
      words: "Traust fyrirtæki með afslátt fyrir hvert verkefni.",
    },
    {
      scene: "Auglýsing verður til á síðu: hjálparlínur dragast og mynd, texti og afsláttarmiði falla á sinn stað.",
      words: "Við hönnum auglýsinguna þína.",
    },
    {
      scene: "Prentvél úr leir. Prentuð eintök raðast í snyrtilegan stafla.",
      words: "Við prentum bæklinginn. 350–500 eintök á mánuði.",
    },
    {
      scene: "Höfuðborgarsvæðið úr lofti. Sendibíll SVIF ekur um göturnar og eintök berast að dyrum nýrra eigenda. Það síðasta fer inn um lúguna.",
      words: "Og sendum vikulega til allra nýrra húseigenda. Fólk fær afsláttinn þinn þegar þörfin vaknar.",
    },
    { scene: "Lokaspjald.", words: "Bókaðu pláss í næsta bæklingi. svif.is" },
  ],
  frame0: "/svif/film/svif-heimili-frame0.jpg",
  poster: "/svif/film/svif-heimili-poster.jpg",
  label: "Svona virkar SVIF",
  title: "Nýji kaflinn",
  seconds: 53,
};

export const FILM_FYRIRTAEKI: Film = {
  sources: [
    { src: "/svif/film/svif-fyrirtaeki-av1.mp4", type: AV1 },
    { src: "/svif/film/svif-fyrirtaeki.mp4", type: H264 },
  ],
  captions: "/svif/film/svif-fyrirtaeki.is.vtt",
  transcript: [
    {
      scene: "Bæklingurinn lendir á dökku sviði og opnast. Flett er hratt í gegnum síðurnar og svo lokast hann.",
      words: "Við tengjum ykkur við öll ný fyrirtæki á Íslandi.",
    },
    {
      scene: "Nýjar skrifstofur opna hver á eftir annarri og bókhald, tryggingar, vefsíða, banki, tölvur og hönnun birtast í kring.",
      words: "Hundruð nýrra fyrirtækja í hverjum mánuði. Nýjum rekstri fylgja ótal verkefni.",
    },
    {
      scene: "Bæklingurinn opnast á síðu með flokkum sem lýsast upp hver á fætur öðrum.",
      words: "Sérkjör frá þeim sem nýr rekstur þarf. Eitt fyrirtæki í hverjum flokki.",
    },
    {
      scene: "Perlulík kúla svífur yfir hverfinu og dregur fínar línur niður að nýskráðum fyrirtækjum, sem verða rósrauð.",
      words: "Kerfið finnur nýskráð fyrirtæki.",
    },
    {
      scene: "Sendibíll SVIF ekur um göturnar og bæklingar berast nýju fyrirtækjunum. Sá síðasti fer í póstkassann á nýju skrifstofunni.",
      words: "Við sendum bæklinginn til nýrra fyrirtækja. Um 250 á mánuði, um allt land.",
    },
    { scene: "Lokaspjald.", words: "Bókið pláss í næsta bæklingi. svif.is" },
  ],
  frame0: "/svif/film/svif-fyrirtaeki-frame0.jpg",
  poster: "/svif/film/svif-fyrirtaeki-poster.jpg",
  label: "SVIF fyrir ný fyrirtæki, kynningarmyndband",
  title: "Fyrir ný fyrirtæki",
  seconds: 43,
};

/** "53 sek." */
export const filmMeta = (f: Film) => `${f.seconds} sek.`;
