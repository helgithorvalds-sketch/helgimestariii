/**
 * "Meira um hugmyndina": the copy for both pages (research/06-round2-spec.md §3.4).
 * Every word on the section lives here, including the vignettes' overlay labels (keyed by the
 * overlay ids each vignette emits, see src/three/vignettes/*).
 */
import type { VignetteKey } from "@/three/vignettes/types";

export interface IdeaItem {
  /** "spurning-1" … : the panel id and the deep link (#spurning-3) */
  id: string;
  /** title in DisplayTitle terms: caps · serif-italic accent · capsAfter */
  caps: string;
  accent: string;
  capsAfter?: string;
  /** the plain question (the tab's accessible name and the live region) */
  title: string;
  /** 1–3 short sentences, rendered as one paragraph */
  answer: string[];
  /** words for the vignette's overlay ids */
  labels: Record<string, string>;
  /** one big figure, fixed top-left of the panel */
  figure?: { value: string; unit: string };
  /** the visual described for screen readers */
  alt: string;
  vignette: VignetteKey;
  /** pre-rendered end frame (reduced motion, no WebGL, no JS, loading poster) */
  still: string;
  /** the phone-sized end frame */
  stillSmall: string;
}

export interface IdeaCopy {
  eyebrow: string;
  caps: string;
  accent: string;
  intro: string;
  contact: { label: string; tel: string; display: string };
  tablist: string;
  prev: string;
  next: string;
  /** "Spurning {n} af {total}: {title}" */
  announce: (n: number, total: number, title: string) => string;
  items: IdeaItem[];
}

const still = (set: "home" | "biz", n: number) => ({
  still: `/svif/idea/${set}-${String(n).padStart(2, "0")}.jpg`,
  stillSmall: `/svif/idea/${set}-${String(n).padStart(2, "0")}-m.jpg`,
});

const HEADER = {
  eyebrow: "Spurt og svarað",
  caps: "Meira um",
  accent: "hugmyndina.",
  intro: "Af hverju þetta virkar og hvernig samstarfið gengur fyrir sig.",
  contact: { label: "Aðrar spurningar", tel: "tel:8535147", display: "853 5147" },
  tablist: "Spurningar",
  prev: "Fyrri spurning",
  next: "Næsta spurning",
  announce: (n: number, total: number, title: string) => `Spurning ${n} af ${total}: ${title}`,
};

/** Home (/): þú. */
export const IDEA_HOME: IdeaCopy = {
  ...HEADER,
  items: [
    {
      id: "spurning-1",
      caps: "Af hverju",
      accent: "virkar þetta?",
      title: "Af hverju virkar þetta?",
      answer: [
        "Mörg fyrirtæki keppast um nýja húseigendur.",
        "Afsláttur á réttum tíma eykur líkurnar á að hringt sé í þig.",
        "Nýji kaflinn kemur honum í hendur þeirra.",
      ],
      labels: { many: "Mörg fyrirtæki", yours: "Tilboðið þitt" },
      alt: "Lítið hús og sjö eins fyrirtækjaspjöld í hálfhring fyrir framan það. Eitt spjaldanna ber rósrauðan afsláttarmiða og lína liggur frá dyrum hússins að því. Hin dofna.",
      vignette: "crowd",
      ...still("home", 1),
    },
    {
      id: "spurning-2",
      caps: "Hvenær",
      accent: "berst bæklingurinn?",
      title: "Hvenær berst bæklingurinn?",
      answer: [
        "Á fyrstu vikunum eftir kaupin, á meðan fólk er að koma sér fyrir og skipuleggja framkvæmdir.",
        "Þess vegna sendum við í hverri viku.",
      ],
      labels: { buy: "Kaupin", booklet: "Nýji kaflinn", work: "Framkvæmdir" },
      alt: "Tímalína með sex merkjum. Lykill liggur við það fyrsta, Nýji kaflinn við annað og hlutir fyrir framkvæmdir birtast við hin.",
      vignette: "timeline",
      ...still("home", 2),
    },
    {
      id: "spurning-3",
      caps: "Hversu mörgum bæklingum",
      accent: "er dreift?",
      title: "Hversu mörgum bæklingum er dreift?",
      answer: [
        "350–500 á mánuði, til nýrra húseigenda á höfuðborgarsvæðinu.",
        "Dreift er í hverri viku.",
        "Á þremur mánuðum nær auglýsingin þín til 1.050–1.500 heimila.",
      ],
      labels: { weekly: "Í hverri viku" },
      figure: { value: "350–500", unit: "Á mánuði" },
      alt: "Fjórir jafnháir staflar af bæklingum á dagatali, einn á sama vikudegi í hverri viku mánaðarins.",
      vignette: "weeks",
      ...still("home", 3),
    },
    {
      id: "spurning-4",
      caps: "Þarf ég að bjóða",
      accent: "afslátt?",
      title: "Þarf ég að bjóða afslátt?",
      answer: [
        "Nei, en við mælum eindregið með því.",
        "Auglýsingu er hent, en afsláttur er geymdur þar til þörfin vaknar.",
      ],
      labels: { thrown: "Auglýsingu hent", kept: "Afsláttur geymdur" },
      alt: "Venjuleg auglýsing endar í ruslafötu en afsláttarmiði úr bæklingnum er festur á ísskáp með rósrauðum segli.",
      vignette: "kept",
      ...still("home", 4),
    },
    {
      id: "spurning-5",
      caps: "Þarf ég",
      accent: "afsláttarkóða?",
      title: "Þarf ég afsláttarkóða?",
      answer: [
        "Nei.",
        "Í kerfinu okkar sérðu öll heimili sem fengu bæklinginn.",
        "Viðskiptavinurinn nefnir heimilisfangið sitt og þú staðfestir það þar.",
      ],
      labels: { address: "Heimilisfangið", ok: "Staðfest" },
      alt: "Sími og fartölva. Á skjánum er listi yfir heimili og eitt þeirra er merkt með haki.",
      vignette: "address",
      ...still("home", 5),
    },
    {
      id: "spurning-6",
      caps: "Hvernig",
      accent: "er greitt?",
      title: "Hvernig er greitt?",
      answer: [
        "Mánaðarlega.",
        "Verðið fer eftir því hve margar síður þú kaupir.",
        "Samningurinn er til þriggja mánaða í senn.",
      ],
      labels: { pages: "Eftir síðufjölda", monthly: "Mánaðarlega" },
      alt: "Opinn bæklingur þar sem tvær síður lyftast upp. Við hliðina raðast þrír reikningar, einn fyrir hvern mánuð.",
      vignette: "months",
      ...still("home", 6),
    },
    {
      id: "spurning-7",
      caps: "Hvað er",
      accent: "innifalið?",
      title: "Hvað er innifalið?",
      answer: [
        "Hönnun, prentun og dreifing.",
        "Þú færð þrívíddarmynd af bæklingnum, eintak sent til þín og aðgang að kerfinu.",
        "Í hverjum mánuði förum við saman yfir árangurinn og bætum auglýsinguna.",
      ],
      labels: {
        design: "Hönnun & prentun",
        post: "Dreifing",
        mock: "Þrívíddarmynd",
        talk: "Mánaðarlegt samtal",
      },
      alt: "Bakki með sex hólfum: penni og reglustika, prentaðar síður, umslag, bæklingur á standi, fartölva og tvær talblöðrur.",
      vignette: "tray",
      ...still("home", 7),
    },
    {
      id: "spurning-8",
      caps: "Fá keppinautar mínir",
      accent: "líka pláss?",
      title: "Fá keppinautar mínir líka pláss?",
      answer: ["Nei.", "Aðeins eitt fyrirtæki í hverjum flokki, svo auglýsingin þín stendur ein."],
      labels: { yourcat: "Flokkurinn þinn", nocomp: "Enginn keppinautur" },
      alt: "Leturkassi með átta hólfum og einu spjaldi í hverju. Eitt spjaldið er rósrautt. Annað spjald kemst ekki að og fölnar fyrir utan kassann.",
      vignette: "typecase",
      ...still("home", 8),
    },
  ],
};

/**
 * /fyrirtaeki: þið (spec §3.4 business table). The vignettes run with kind "biz": `iceland` (B3) is
 * business-only and the other scenes swap their builders on `kind` (an office, a pin board, the
 * registration certificate, the business booklet's pages and categories). Labels use the same
 * overlay ids as the home scenes.
 */
export const IDEA_BIZ: IdeaCopy = {
  ...HEADER,
  items: [
    {
      id: "spurning-1",
      caps: "Af hverju",
      accent: "virkar þetta?",
      title: "Af hverju virkar þetta?",
      answer: [
        "Mörg fyrirtæki keppast um viðskipti nýrra fyrirtækja.",
        "Sérkjör á réttum tíma auka líkurnar á að leitað sé til ykkar.",
        "Bæklingurinn kemur þeim í hendur eigendanna.",
      ],
      labels: { many: "Mörg fyrirtæki", yours: "Sérkjörin ykkar" },
      alt: "Lítil skrifstofubygging og sjö eins fyrirtækjaspjöld í hálfhring fyrir framan hana. Eitt spjaldanna ber rósrauðan afsláttarmiða og lína liggur frá dyrunum að því. Hin dofna.",
      vignette: "crowd",
      ...still("biz", 1),
    },
    {
      id: "spurning-2",
      caps: "Hvenær",
      accent: "berst bæklingurinn?",
      title: "Hvenær berst bæklingurinn?",
      answer: [
        "Á fyrstu vikum rekstrarins, á meðan verið er að velja bókhald, banka og tryggingar.",
        "Þá er flest valið.",
      ],
      labels: { buy: "Skráning", booklet: "Bæklingurinn", work: "Fyrstu vikurnar" },
      alt: "Tímalína með sex merkjum. Skráningarskjal liggur við það fyrsta, bæklingurinn við annað og skrifstofuhlutir birtast við hin.",
      vignette: "timeline",
      ...still("biz", 2),
    },
    {
      id: "spurning-3",
      caps: "Hversu mörgum bæklingum",
      accent: "er dreift?",
      title: "Hversu mörgum bæklingum er dreift?",
      answer: [
        "Um 250 á mánuði, til nýstofnaðra fyrirtækja um allt land.",
        "Á þremur mánuðum nær auglýsingin ykkar til um 750 fyrirtækja.",
      ],
      labels: { country: "Um allt land" },
      figure: { value: "Um 250", unit: "Á mánuði" },
      alt: "Upphleypt Íslandskort. Rósrauðir prjónar birtast í bæjum um allt land.",
      vignette: "iceland",
      ...still("biz", 3),
    },
    {
      id: "spurning-4",
      caps: "Þurfum við að bjóða",
      accent: "sérkjör?",
      title: "Þurfum við að bjóða sérkjör?",
      answer: [
        "Nei, en við mælum eindregið með því.",
        "Auglýsingu er hent, en sérkjör eru geymd þar til þörfin vaknar.",
      ],
      labels: { thrown: "Auglýsingu hent", kept: "Sérkjör geymd" },
      alt: "Venjuleg auglýsing endar í ruslafötu en afsláttarmiði er festur á korktöflu.",
      vignette: "kept",
      ...still("biz", 4),
    },
    {
      id: "spurning-5",
      caps: "Þurfum við",
      accent: "afsláttarkóða?",
      title: "Þurfum við afsláttarkóða?",
      answer: [
        "Nei.",
        "Í kerfinu okkar sjáið þið öll fyrirtæki sem fengu bæklinginn.",
        "Viðskiptavinurinn gefur upp nafn fyrirtækisins eða kennitölu og þið staðfestið það þar.",
      ],
      labels: { address: "Nafn eða kennitala", ok: "Staðfest" },
      alt: "Sími og fartölva. Á skjánum er listi yfir fyrirtæki og eitt þeirra er merkt með haki.",
      vignette: "address",
      ...still("biz", 5),
    },
    {
      id: "spurning-6",
      caps: "Hvernig",
      accent: "er greitt?",
      title: "Hvernig er greitt?",
      answer: [
        "Mánaðarlega.",
        "Verðið fer eftir því hve margar síður þið kaupið.",
        "Samningurinn er til þriggja mánaða í senn.",
      ],
      labels: { pages: "Eftir síðufjölda", monthly: "Mánaðarlega" },
      alt: "Opinn bæklingur þar sem tvær síður lyftast upp. Við hliðina raðast þrír reikningar, einn fyrir hvern mánuð.",
      vignette: "months",
      ...still("biz", 6),
    },
    {
      id: "spurning-7",
      caps: "Hvað er",
      accent: "innifalið?",
      title: "Hvað er innifalið?",
      answer: [
        "Hönnun, prentun og dreifing.",
        "Þið fáið þrívíddarmynd af bæklingnum, eintak sent til ykkar og aðgang að kerfinu.",
        "Í hverjum mánuði förum við saman yfir árangurinn og bætum auglýsinguna.",
      ],
      labels: {
        design: "Hönnun & prentun",
        post: "Dreifing",
        mock: "Þrívíddarmynd",
        talk: "Mánaðarlegt samtal",
      },
      alt: "Bakki með sex hólfum: penni og reglustika, prentaðar síður, umslag, bæklingur á standi, fartölva og tvær talblöðrur.",
      vignette: "tray",
      ...still("biz", 7),
    },
    {
      id: "spurning-8",
      caps: "Fá keppinautar okkar",
      accent: "líka pláss?",
      title: "Fá keppinautar okkar líka pláss?",
      answer: ["Nei.", "Aðeins eitt fyrirtæki í hverjum flokki, svo auglýsingin ykkar stendur ein."],
      labels: { yourcat: "Flokkurinn ykkar", nocomp: "Enginn keppinautur" },
      alt: "Leturkassi með átta hólfum og einu spjaldi í hverju. Eitt spjaldið er rósrautt. Annað spjald kemst ekki að og fölnar fyrir utan kassann.",
      vignette: "typecase",
      ...still("biz", 8),
    },
  ],
};
