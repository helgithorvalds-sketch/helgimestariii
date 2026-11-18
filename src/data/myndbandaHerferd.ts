import gogn from "./myndbandaHerferd.json";

/**
 * Myndbandaherferðin (nóv. 2026): frítt 10 sekúndna 2D/3D myndband, sent frá
 * nordurvefur@nordurvefur.is. Hvert fyrirtæki sem fékk póst er hér, með rökunum fyrir
 * valinu, því sem við skrifuðum til þess og stöðu svarsins. Svörin eru uppfærð þegar
 * pósthólfið er farið yfir (fyrst kl. 16:00 17.11.2026).
 *
 * Gögnin sjálf eru í myndbandaHerferd.json svo auðvelt sé að uppfæra þau með skriftu.
 */

export type HerferdStada =
  /** Póstur farinn, ekkert svar enn. */
  | "sent"
  /** Vill frítt myndband / vill heyra meira. */
  | "ja"
  /** Spyr spurninga (verð, ferli o.s.frv.) án þess að segja já eða nei. */
  | "spurning"
  | "nei"
  /** Pósturinn komst ekki til skila. */
  | "skopp"
  /** Sjálfvirkt svar (í fríi, hætt o.s.frv.), ekkert raunverulegt svar enn. */
  | "sjalfvirkt"
  /** Á listanum en ekki sendur. */
  | "osent";

export interface HerferdSvar {
  /** d.m.yyyy kl. hh:mm */
  dags: string;
  fra: string;
  /** Stutt samantekt á því sem viðkomandi skrifaði. */
  samantekt: string;
  /** Orðrétt lykilsetning úr svarinu. */
  tilvitnun?: string;
}

export interface HerferdFyrirtaeki {
  name: string;
  /** Nafnið í eignarfalli, eins og það stendur í póstinum („starfsemi GKS Innréttinga“). */
  ef?: string;
  /** Nafnið í þolfalli, eins og það stendur í póstinum („fyrir GKS Innréttingar“). */
  thf?: string;
  /** Hvað fyrirtækið selur, ræður orðalaginu í póstinum: vörur, þjónusta, hvort tveggja eða lausnir. */
  tegund?: "vorur" | "thjonusta" | "baedi" | "lausnir";
  web: string;
  sector: string;
  /** Hvað fyrirtækið gerir. */
  what: string;
  person?: string;
  title?: string;
  email: string;
  email_type: "personal" | "generic";
  email_source?: string;
  phone?: string;
  phone_note?: string;
  /** Hvað rannsóknin sá hjá fyrirtækinu (ekki í póstinum, sem er eins fyrir alla). */
  hook: string;
  /** Hugmynd að 10 sek. myndbandi fyrir símtalið (ekki í póstinum). */
  idea: string;
  /** Af hverju fyrirtækið var valið (rökin úr rannsókninni). */
  why: string;
  /** 1–10: líkur á já að mati rannsóknarinnar. */
  score: number;
  stada: HerferdStada;
  /** ISO-tími þegar pósturinn fór. */
  sent?: string;
  threadId?: string;
  svor?: HerferdSvar[];
  /** Samantekt á öllu samtalinu, ein til tvær setningar. */
  samantekt?: string;
  /** Hver svaraði og símanúmerið hans/hennar, ef það kom fram (t.d. í undirskrift). */
  svarandi?: { nafn?: string; titill?: string; simi?: string; netfang?: string };
  /** Næsta skref, t.d. „Hringja og fá hugmynd að myndbandinu“. */
  naest?: string;
}

export interface Herferd {
  heiti: string;
  fra: string;
  /** Síðast farið yfir pósthólfið, ISO. */
  yfirfarid?: string;
  fyrirtaeki: HerferdFyrirtaeki[];
}

export const HERFERD = gogn as Herferd;

export const STADA_LABEL: Record<HerferdStada, string> = {
  sent: "Sent",
  ja: "Já",
  spurning: "Spurning",
  nei: "Nei",
  skopp: "Skoppaði",
  sjalfvirkt: "Sjálfvirkt svar",
  osent: "Ósent",
};
