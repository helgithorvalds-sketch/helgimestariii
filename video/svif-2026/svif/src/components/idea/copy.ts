/**
 * "Meira um hugmyndina": the copy for both pages (round 3: research/BIBLE-R3.md §3–4).
 * Every word on the section lives here, including the vignettes' overlay labels (keyed by the
 * overlay ids each vignette emits, see src/three/vignettes/*). A label "Line|second line" gets a
 * second, serif-italic line.
 *
 * Six items per page, the same order on both: 1 why · 2 how many · 3 when · 4 discount ·
 * 5 what is included · 6 competitors. The deep links #spurning-1 … #spurning-6 follow this order.
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
  /** one big figure, a callout in the scene (overlay id "figure") */
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
        "Mörg fyrirtæki í sömu grein keppast um nýja húseigendur.",
        "Nýji kaflinn kemur tilboðinu þínu inn um lúguna á réttum tíma og eykur líkurnar á að hringt sé í þig.",
      ],
      labels: { many: "Margir málarar", booklet: "Nýji kaflinn", yours: "Tilboðið þitt" },
      alt: "Nýtt hús og sex málarabílar í kringum það, hver með stóra málningarrúllu á þakinu. Nýji kaflinn rennur inn um lúguna. Bíll málarans sem er með tilboð í bæklingnum verður rósrauður og færir sig nær húsinu, hinir bakka frá og dofna.",
      vignette: "crowd",
      ...still("home", 1),
    },
    {
      id: "spurning-2",
      caps: "Hversu mörgum bæklingum",
      accent: "er dreift?",
      title: "Hversu mörgum bæklingum er dreift?",
      answer: [
        "350–500 á mánuði, til nýrra húseigenda.",
        "Við byrjum á höfuðborgarsvæðinu og bætum fleiri landshlutum við.",
      ],
      labels: { north: "Norðurland|Væntanlegt", south: "Suðurland|Væntanlegt" },
      figure: { value: "350–500", unit: "Á mánuði" },
      alt: "Upphleypt Íslandskort. Höfuðborgarsvæðið lýsist rósrautt, merkt 350–500 á mánuði. Norðurland og Suðurland eru merkt væntanleg.",
      vignette: "iceland",
      ...still("home", 2),
    },
    {
      id: "spurning-3",
      caps: "Hvenær",
      accent: "er dreift?",
      title: "Hvenær er dreift?",
      answer: [
        "Í hverri viku.",
        "Nýir húseigendur fá Nýja kaflann á fyrstu vikunum eftir kaupin, á meðan þeir eru að koma sér fyrir.",
      ],
      labels: { weekly: "Í hverri viku" },
      alt: "Dagatal mánaðarins. Á sama vikudegi í hverri viku lendir stafli af Nýja kaflanum, fjórar vikur í röð.",
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
      caps: "Hvað er innifalið",
      accent: "í verðinu?",
      title: "Hvað er innifalið í verðinu?",
      answer: [
        "Hönnun, rafrænt eintak af bæklingnum, prentað eintak sent til þín, prentun og dreifing, aðgangur að kerfinu og mánaðarlegur fundur um árangurinn.",
        "Greitt er mánaðarlega.",
      ],
      labels: {
        design: "Hönnun",
        digital: "Rafrænt eintak",
        printed: "Prentað eintak",
        talk: "Mánaðarlegur fundur",
      },
      alt: "Bakki með sex hólfum: penni og reglustika, prentaðar síður, prentað eintak af bæklingnum í umslagi, spjaldtölva með bæklingnum á skjánum, fartölva með kerfinu og tvær talblöðrur.",
      vignette: "tray",
      ...still("home", 5),
    },
    {
      id: "spurning-6",
      caps: "Fá keppinautar mínir",
      accent: "líka pláss?",
      title: "Fá keppinautar mínir líka pláss?",
      answer: ["Nei.", "Aðeins eitt fyrirtæki í hverjum flokki, svo auglýsingin þín stendur ein."],
      labels: { one: "Eitt í hverjum flokki", yourcat: "Flokkurinn þinn" },
      alt: "Nýji kaflinn liggur opinn. Á opnunni eru sex flokkar og einn hlutur í hverjum: gluggi, lampi, málningardós, hægindastóll, gólfflísar og skjöldur. Önnur málningardós rennur að flokknum Málning, en hann er þegar tekinn. Dósin sem fyrir er verður rósrauð og hin hörfar og hverfur.",
      vignette: "typecase",
      ...still("home", 6),
    },
  ],
};

/**
 * /fyrirtaeki: þið. The same six questions for new companies; the vignettes run with kind "biz"
 * (an office instead of a home, the business booklet and its categories, pins all over the country
 * on the map, an office pin board instead of the fridge). Labels use the same overlay ids.
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
        "Bæklingurinn kemur sérkjörum ykkar í hendur eigendanna á réttum tíma og eykur líkurnar á að leitað sé til ykkar.",
      ],
      labels: { many: "Margar bókhaldsstofur", booklet: "Bæklingurinn", yours: "Sérkjörin ykkar" },
      alt: "Ný skrifstofubygging með skilti sem á stendur NÝTT og fimm bókhaldsstofur í kring, hver með stóra reiknivél á þakinu. Bæklingurinn rennur inn um lúguna á nýju skrifstofunni. Stofan sem er með sérkjör í bæklingnum verður rósrauð og færist nær, hinar hörfa og dofna.",
      vignette: "crowd",
      ...still("biz", 1),
    },
    {
      id: "spurning-2",
      caps: "Hversu mörgum bæklingum",
      accent: "er dreift?",
      title: "Hversu mörgum bæklingum er dreift?",
      answer: ["Um 250 á mánuði, til nýstofnaðra fyrirtækja um allt land."],
      labels: { country: "Um allt land" },
      figure: { value: "Um 250", unit: "Á mánuði" },
      alt: "Upphleypt Íslandskort. Rósrauðir prjónar birtast í bæjum um allt land.",
      vignette: "iceland",
      ...still("biz", 2),
    },
    {
      id: "spurning-3",
      caps: "Hvenær",
      accent: "er dreift?",
      title: "Hvenær er dreift?",
      answer: [
        "Í hverri viku.",
        "Ný fyrirtæki fá bæklinginn á fyrstu vikum rekstrarins, á meðan verið er að velja bókhald, banka og tryggingar.",
      ],
      labels: { weekly: "Í hverri viku" },
      alt: "Dagatal mánaðarins. Á sama vikudegi í hverri viku lendir stafli af bæklingnum, fjórar vikur í röð.",
      vignette: "weeks",
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
      caps: "Hvað er innifalið",
      accent: "í verðinu?",
      title: "Hvað er innifalið í verðinu?",
      answer: [
        "Hönnun, rafrænt eintak af bæklingnum, prentað eintak sent til ykkar, prentun og dreifing, aðgangur að kerfinu og mánaðarlegur fundur um árangurinn.",
        "Greitt er mánaðarlega.",
      ],
      labels: {
        design: "Hönnun",
        digital: "Rafrænt eintak",
        printed: "Prentað eintak",
        talk: "Mánaðarlegur fundur",
      },
      alt: "Bakki með sex hólfum: penni og reglustika, prentaðar síður, prentað eintak af bæklingnum í umslagi, spjaldtölva með bæklingnum á skjánum, fartölva með kerfinu og tvær talblöðrur.",
      vignette: "tray",
      ...still("biz", 5),
    },
    {
      id: "spurning-6",
      caps: "Fá keppinautar okkar",
      accent: "líka pláss?",
      title: "Fá keppinautar okkar líka pláss?",
      answer: ["Nei.", "Aðeins eitt fyrirtæki í hverjum flokki, svo auglýsingin ykkar stendur ein."],
      labels: { one: "Eitt í hverjum flokki", yourcat: "Flokkurinn ykkar" },
      alt: "Bæklingurinn liggur opinn. Á opnunni eru sex flokkar og einn hlutur í hverjum: skjár, skjöldur, möppur, greiðslukort, fartölva og litaprufur með penna. Aðrar möppur renna að flokknum Bókhald, en hann er þegar tekinn. Möppurnar sem fyrir eru verða rósrauðar og hinar hörfa og hverfa.",
      vignette: "typecase",
      ...still("biz", 6),
    },
  ],
};
