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
      scene: "Nýji kaflinn svífur yfir dökku sviði.",
      words: "Við tengjum ykkur við alla nýja húseigendur á höfuðborgarsvæðinu.",
    },
    {
      scene:
        "Hús úr ljósum leir. Á stalli fyrir framan það rísa tryggingar, málning, húsgögn, gluggar, gólfefni og rafmagn.",
      words: "Um 80% nýrra húseigenda ráðast í framkvæmdir eftir húsakaup.",
    },
    {
      scene: "Hlutirnir hverfa inn í Nýja kaflann, sem lendir og opnast.",
      words: "Þess vegna bjuggum við til SVIF. Traust fyrirtæki fyrir hvert verkefni heimilisins.",
    },
    {
      scene: "Síðum er flett og fjórir afsláttarmiðar raðast yfir bæklinginn.",
      words:
        "Örfá traust fyrirtæki í hverjum flokki. Hvert þeirra býður nýjum húseigendum sérkjör.",
    },
    {
      scene: "Hverfi rís í kringum húsið. Heimili nýrra eigenda fá rósrauðan lit og pinna.",
      words: "Kerfið finnur nýja húseigendur. Við sjáum þegar kaupsamningi er þinglýst.",
    },
    {
      scene:
        "Bæklingar eru prentaðir og fljúga heim til nýju eigendanna. Sá síðasti rennur inn um lúguna.",
      words: "Við hönnum, prentum og sendum. Þú sendir merki og tilboð. Við sjáum um allt hitt.",
    },
    { scene: "Lokaspjald.", words: "Bókaðu pláss í næsta bæklingi. svif.is" },
  ],
  frame0: "/svif/film/svif-heimili-frame0.jpg",
  poster: "/svif/film/svif-heimili-poster.jpg",
  label: "Svona virkar SVIF",
  title: "Nýji kaflinn",
  seconds: 50,
};

export const FILM_FYRIRTAEKI: Film = {
  sources: [
    { src: "/svif/film/svif-fyrirtaeki-av1.mp4", type: AV1 },
    { src: "/svif/film/svif-fyrirtaeki.mp4", type: H264 },
  ],
  captions: "/svif/film/svif-fyrirtaeki.is.vtt",
  transcript: [
    {
      scene: "Bæklingurinn svífur yfir dökku sviði.",
      words: "Við tengjum ykkur við öll ný fyrirtæki á Íslandi.",
    },
    {
      scene:
        "Róleg gata með skrifstofuhúsum. Ný skrifstofa rís og fyrir framan hana bókhald, tryggingar, vefsíða, banki, tölvur og hönnun.",
      words: "Á hverjum degi verða til ný fyrirtæki. Nýjum rekstri fylgja ótal verkefni.",
    },
    {
      scene:
        "Hlutirnir hverfa inn í bæklinginn, sem opnast á síðu með einum reit fyrir hvern flokk.",
      words:
        "Þess vegna bjuggum við til SVIF. Eitt fyrirtæki í hverjum flokki. Með sérkjörum fyrir nýjan rekstur.",
    },
    {
      scene: "Gatan verður að hverfi. Nýskráð fyrirtæki fá rósrauðan lit og pinna.",
      words: "Kerfið finnur nýskráð fyrirtæki. Um allt land.",
    },
    {
      scene:
        "Bæklingar eru prentaðir og fljúga til nýju fyrirtækjanna. Sá síðasti rennur inn um lúguna á nýju skrifstofunni.",
      words: "Við hönnum, prentum og sendum. Um 250 eintök á mánuði, á fyrstu vikum rekstrarins.",
    },
    { scene: "Lokaspjald.", words: "Rétta fólkið á réttum tíma. svif.is" },
  ],
  frame0: "/svif/film/svif-fyrirtaeki-frame0.jpg",
  poster: "/svif/film/svif-fyrirtaeki-poster.jpg",
  label: "SVIF fyrir ný fyrirtæki, kynningarmyndband",
  title: "Fyrir ný fyrirtæki",
  seconds: 49,
};

/** "50 sek." */
export const filmMeta = (f: Film) => `${f.seconds} sek.`;
