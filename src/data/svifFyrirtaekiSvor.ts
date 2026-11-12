import { Company } from "@/types";

/**
 * Svörin við SVIF-herferðinni til nýstofnaðra fyrirtækja (okt.–nóv. 2026),
 * ásamt flokkum bæklingsins. Síðan „Svif fyrirtæki“ (/svif-listi) flytur
 * þessi svör inn í gagnagrunninn og sýnir flokkana, samkeppnina og verðin.
 *
 * Flokkarnir eru breiðir, eins og viðskiptavinur sér þá („Vefsíðugerð“,
 * „Auglýsingar og markaðssetning“), svo fyrirtæki sem selja það sama lendi
 * hlið við hlið. Verðið ræðst af því hve mörg sækja um sama flokk.
 */

export type SvarStada = "ja" | "spurning" | "bidur" | "nei";
export type FlokkurTier = "laus" | "einn" | "tveir" | "margir";

export interface SvifSvar {
  name: string;
  /** Önnur nöfn sem sama fyrirtæki gæti verið skráð undir í gagnagrunninum. */
  aliases?: string[];
  web: string;
  person: string;
  title?: string;
  phone?: string;
  /** Skýring þegar númerið er ekki beint á viðkomandi, eða ekkert fannst. */
  phoneNote?: string;
  alt?: { name: string; phone: string };
  email: string;
  status: SvarStada;
  /** Hvað viðkomandi sagði, stytt. */
  quote: string;
  source: "tölvupóstur" | "sími";
  /** Dagsetning svars, d.m.yyyy. Tómt þegar hún er óþekkt. */
  date: string;
  /** Seinni svör í sama þræði, í tímaröð. Bætast aftan við „Svarið“ á kortinu. */
  fylgt?: { date: string; quote: string }[];
  /** Hvað fyrirtækið gerir nákvæmlega, ein lína. */
  thjonusta: string;
  geiri: string;
  /** Flokkurinn sem fyrirtækið myndi kaupa pláss í. */
  undirgeiri: string;
  /** Aðrir flokkar sem fyrirtækið býður líka, án þess að það sé aðalþjónustan. */
  einnig?: string[];
  warn?: string;
}

export interface Flokkur {
  geiri: string;
  undirgeiri: string;
  /** Hvað þjónustan er, fyrir þann sem les flokkakortið. */
  lysing: string;
  /** Hvernig má skipta flokknum ef fleiri en einn eiga að komast inn. */
  skipting?: string;
  note?: string;
}

/** Verð á mánuði fyrir eina og tvær síður. Einn í flokki fær grunnverð, tveir eða fleiri keppnisverð. */
export const VERD = {
  einn: { ein: 38500, tvaer: 50000 },
  keppni: { ein: 55000, tvaer: 70000 },
};

/** Fjöldi þeirra sem sækja um flokk (án þeirra sem sögðu nei) ræður stöðunni. */
export function tierFor(count: number): FlokkurTier {
  if (count <= 0) return "laus";
  if (count === 1) return "einn";
  if (count === 2) return "tveir";
  return "margir";
}

export function verdFor(count: number) {
  return count >= 2 ? VERD.keppni : VERD.einn;
}

export const TIER_LABEL: Record<FlokkurTier, string> = {
  laus: "Laus",
  einn: "Einn",
  tveir: "Tveir keppa",
  margir: "Þrír eða fleiri keppa",
};

export const STADA_LABEL: Record<SvarStada, string> = {
  ja: "Já",
  spurning: "Spyr",
  bidur: "Bíður",
  nei: "Nei",
};

export const GEIRA_ROD = [
  "Fjármál og rekstur",
  "Lögfræði",
  "Vefur og tækni",
  "Ímynd og markaðsmál",
  "Fólk og skrifstofa",
  "Bílar og flutningar",
  "Þröngir flokkar",
];

/** Öll pláss í bæklingnum, líka þau sem enginn hefur sótt um. */
export const FLOKKAR: Flokkur[] = [
  { geiri: "Fjármál og rekstur", undirgeiri: "Bókhaldskerfi og reikningagerð", lysing: "Hugbúnaður til að senda reikninga, halda bókhald og reikna laun.", skipting: "Konto: bara reikningar. Stólpi: verkbókhald fyrir iðnað. Regla: kassakerfi og verslun. Payday og Netbókhald.is bjóða það sama." },
  { geiri: "Fjármál og rekstur", undirgeiri: "Bókhaldsstofa og launavinnsla", lysing: "Bókari sem sér um bókhaldið, launin, VSK og ársreikninginn.", skipting: "Bókhald.is: stofnun og skattframtal. ECIT: laun og stærri fyrirtæki." },
  { geiri: "Fjármál og rekstur", undirgeiri: "Innheimta", lysing: "Innheimta ógreiddra reikninga og kröfustofnun.", note: "Keppni aðeins ef Inkasso segir já." },
  { geiri: "Fjármál og rekstur", undirgeiri: "Lánshæfi og fyrirtækjaupplýsingar", lysing: "Lánshæfismat og upplýsingar um þá sem þú átt viðskipti við." },
  { geiri: "Fjármál og rekstur", undirgeiri: "Tryggingar", lysing: "Tryggingar fyrir reksturinn: ábyrgð, slys og lausafé.", skipting: "Afkoma er miðlari sem selur líka tryggingar VÍS. Má gefa Afkomu lífeyri og séreign." },
  { geiri: "Fjármál og rekstur", undirgeiri: "Posar og greiðslulausnir", lysing: "Posar, greiðslugátt og kortafærslur.", note: "Teya og Straumur svöruðu ekki." },
  { geiri: "Fjármál og rekstur", undirgeiri: "Banki og fyrirtækjareikningur", lysing: "Fyrirtækjareikningur, kort og netbanki.", note: "Kvika svaraði ekki." },
  { geiri: "Fjármál og rekstur", undirgeiri: "Endurskoðun", lysing: "Endurskoðun ársreikninga." },
  { geiri: "Fjármál og rekstur", undirgeiri: "Fjármögnun og styrkir", lysing: "Lán, styrkir og fjármögnun fyrir nýjan rekstur." },
  { geiri: "Lögfræði", undirgeiri: "Lögfræðiþjónusta", lysing: "Stofnskjöl, samningar, félagaréttur og almenn lögfræði.", skipting: "LOCAL: félagaréttur og vinnuréttur. Granda: leigusamningar og húsnæði. DG Legal: einyrki án þjónustulýsingar." },
  { geiri: "Lögfræði", undirgeiri: "Vörumerki og hugverk", lysing: "Skráning vörumerkja og hönnunar.", note: "Sérhæfð, skarast lítið við almenna lögfræði." },
  { geiri: "Vefur og tækni", undirgeiri: "Vefsíðugerð", lysing: "Heimasíða eða vefverslun fyrir nýtt fyrirtæki.", skipting: "Gonora: ódýr áskrift. Vefapp: sérsmíði og bókunarkerfi. Allra Átta: WordPress og Shopify. Hinir skarast við þessa." },
  { geiri: "Vefur og tækni", undirgeiri: "Auglýsingar og markaðssetning", lysing: "Auglýsingar á Google og samfélagsmiðlum, herferðir og efni.", skipting: "Pikk: Google og Meta. Birta: samfélagsmiðlar, efni og myndbönd. Vörar: full auglýsingastofa með mörkun. RVK Marketing: samfélagsmiðlar og vefsíður á Suðurlandi." },
  { geiri: "Vefur og tækni", undirgeiri: "Tölvurekstur og netöryggi", lysing: "Tölvukerfi, Microsoft 365, afritun og öryggi í áskrift.", skipting: "Valit: Microsoft 365 og netöryggi. Astra: símkerfi og hýsing." },
  { geiri: "Vefur og tækni", undirgeiri: "Tölvuaðstoð og ráðgjöf", lysing: "Tölvuaðstoð, viðgerðir og ráðgjöf í tölvumálum." },
  { geiri: "Vefur og tækni", undirgeiri: "Net, sími og lén", lysing: "Ljósleiðari, farsími, lén og tölvupóstur." },
  { geiri: "Vefur og tækni", undirgeiri: "Símsvörun og fyrirtækjaskráning", lysing: "Símsvörun, þjónustuver og skráning í 1819 og á kort.", skipting: "1819: skráning og símsvörun. Svörum strax: þjónustuver og úthringingar." },
  { geiri: "Vefur og tækni", undirgeiri: "Tölvur og tæki", lysing: "Tölvur, skjáir, símar og raftæki.", note: "ELKO bíður." },
  { geiri: "Vefur og tækni", undirgeiri: "Gervigreind og hugbúnaðarþróun", lysing: "Sérsmíðaður hugbúnaður og gervigreind.", note: "Peritus og AviLabs sögðu nei." },
  { geiri: "Ímynd og markaðsmál", undirgeiri: "Lógó og grafísk hönnun", lysing: "Lógó, ásýnd og hönnun á prentefni.", note: "Vörar og Grafika (Motif) hanna líka lógó." },
  { geiri: "Ímynd og markaðsmál", undirgeiri: "Prentun", lysing: "Nafnspjöld, bæklingar, umbúðir og prentað efni.", skipting: "Umslag: nafnspjöld, reikningar og útsendingar. Litróf: umbúðir, Svansvottað. Prentmet Oddi vill bara inn ef þau prenta bæklinginn." },
  { geiri: "Ímynd og markaðsmál", undirgeiri: "Skilti og merkingar", lysing: "Skilti, ljósaskilti, gluggamerkingar, bílamerkingar og fánar.", skipting: "Fjölprent: fánar og bílamerkingar. LXB eða Logoflex: ljósaskilti. SB skarast við bæði. Skilti & Merkingar: bara grafin smáskilti." },
  { geiri: "Ímynd og markaðsmál", undirgeiri: "Kynningarvörur og vinnuföt", lysing: "Merktir pennar, bolir, bollar og vinnufatnaður.", skipting: "Motif: kynningarvörur. Margt smátt: vinnuföt og merktur fatnaður." },
  { geiri: "Ímynd og markaðsmál", undirgeiri: "Útiauglýsingar", lysing: "Auglýsingar á LED-skjám og í strætóskýlum." },
  { geiri: "Ímynd og markaðsmál", undirgeiri: "Markaðsrannsóknir", lysing: "Kannanir og vörumerkjamælingar." },
  { geiri: "Ímynd og markaðsmál", undirgeiri: "Ljósmyndun og myndbönd", lysing: "Ljósmyndir og myndbönd fyrir vef og auglýsingar." },
  { geiri: "Fólk og skrifstofa", undirgeiri: "Ræsting", lysing: "Dagleg ræsting, lokaþrif og gluggaþvottur." },
  { geiri: "Fólk og skrifstofa", undirgeiri: "Námskeið og símenntun", lysing: "Námskeið fyrir starfsfólk og stjórnendur." },
  { geiri: "Fólk og skrifstofa", undirgeiri: "Mannauðsráðgjöf", lysing: "Ráðgjöf um starfsfólk, stjórnun og vinnuvernd." },
  { geiri: "Fólk og skrifstofa", undirgeiri: "Skrifstofuvörur og húsgögn", lysing: "Ritföng, pappír og skrifstofuhúsgögn." },
  { geiri: "Fólk og skrifstofa", undirgeiri: "Kaffi og rekstrarvörur", lysing: "Kaffivélar, vatnsvélar og rekstrarvörur í áskrift." },
  { geiri: "Fólk og skrifstofa", undirgeiri: "Ráðningar", lysing: "Ráðningarþjónusta og starfsmannaleiga." },
  { geiri: "Fólk og skrifstofa", undirgeiri: "Skrifstofuhúsnæði og samvinnurými", lysing: "Skrifstofa eða skrifborð til leigu." },
  { geiri: "Fólk og skrifstofa", undirgeiri: "Öryggiskerfi og vöktun", lysing: "Þjófavörn, myndavélar og vöktun.", note: "Securitas er merkt OFF í Svif." },
  { geiri: "Bílar og flutningar", undirgeiri: "Sendibílar og fyrirtækjabílar", lysing: "Sendibílar og bílar á rekstrarleigu.", note: "Ísband vísaði á auglýsingastofuna Hér&Nú, 520 2700." },
  { geiri: "Bílar og flutningar", undirgeiri: "Bílaleiga og rekstrarleiga", lysing: "Bílar til leigu til lengri eða skemmri tíma.", note: "Avis og Lykill svöruðu ekki." },
  { geiri: "Bílar og flutningar", undirgeiri: "Sendingar og flutningar", lysing: "Pakkasendingar og vöruflutningar." },
  { geiri: "Þröngir flokkar", undirgeiri: "Hráefni fyrir veitingastaði", lysing: "Mjólkurvörur og hráefni í heildsölu.", note: "Passar bara þeim sem opna veitingastað eða verslun." },
  { geiri: "Þröngir flokkar", undirgeiri: "Greiðslur frá kínverskum ferðamönnum", lysing: "Alipay og WeChat Pay fyrir verslanir sem þjóna kínverskum ferðamönnum." },
];

export const SVOR: SvifSvar[] = [
  { name: "Stólpi Viðskiptalausnir", web: "stolpi.is", person: "Guðmundur Ingi Hauksson", title: "framkvæmdastjóri", phone: "898 0030", alt: { name: "Skiptiborð", phone: "512 4400" }, email: "gih@stolpi.is", status: "ja", quote: "Já við höfum áhuga að skoða þetta. Vill ná til iðnaðar, verkstæða og lögmanna. Biður þig að hringja.", source: "tölvupóstur", date: "29.10.2026", thjonusta: "Bókhaldskerfi með verkbókhaldi fyrir iðnað og verkstæði", geiri: "Fjármál og rekstur", undirgeiri: "Bókhaldskerfi og reikningagerð" },
  { name: "LOCAL lögmenn", web: "locallogmenn.is", person: "Áslaug Gunnlaugsdóttir", title: "lögmaður og eigandi", phone: "527 9700", phoneNote: "aðalnúmer", email: "aslaug@locallogmenn.is", status: "ja", quote: "Já takk, við hefðum áhuga á að fá fleiri upplýsingar.", source: "tölvupóstur", date: "30.10.2026", thjonusta: "Almenn lögmannsstofa með 4 lögmenn: félagaréttur, vinnuréttur, skattar", geiri: "Lögfræði", undirgeiri: "Lögfræðiþjónusta" },
  { name: "Fjölprent", web: "fjolprent.is", person: "Ragnar Másson", title: "framkvæmdastjóri", phone: "581 4141", phoneNote: "aðalnúmer", email: "ragnar@fjolprent.is", status: "ja", quote: "Hljómar spennandi og ég er alveg til í að skoða þetta. Sendu mér meiri upplýsingar.", source: "tölvupóstur", date: "30.10.2026", thjonusta: "Fánar, fánastangir, bílamerkingar og gluggafilmur, frá 1955", geiri: "Ímynd og markaðsmál", undirgeiri: "Skilti og merkingar" },
  { name: "Bókhald.is", web: "bokhald.is", person: "Sæþór Orri Guðjónsson", title: "framkvæmdastjóri og eigandi", phoneNote: "ekkert númer á vef", email: "bokhald@bokhald.is", status: "ja", quote: "Skemmtilegt concept. Mátt senda mér meira um innihaldið og kostnaðinn.", source: "tölvupóstur", date: "2.11.2026", thjonusta: "Bókhaldsstofa: bókhald, VSK, laun, ársreikningar og stofnun fyrirtækja", geiri: "Fjármál og rekstur", undirgeiri: "Bókhaldsstofa og launavinnsla" },
  { name: "Payday", web: "payday.is", person: "Björn Hr. Björnsson", title: "forstjóri og stofnandi", phone: "551 5121", phoneNote: "aðalnúmer, opið 10–16", email: "bjorn@payday.is", status: "ja", quote: "Áhugavert, til í að heyra meira varðandi verð.", source: "tölvupóstur", date: "30.10.2026", thjonusta: "Reikningar, laun og bókhald í appi fyrir einyrkja og lítil fyrirtæki (Visma)", geiri: "Fjármál og rekstur", undirgeiri: "Bókhaldskerfi og reikningagerð" },
  { name: "Lögmenn Granda", web: "granda.is", person: "Marteinn Jónasson", title: "lögmaður og eigandi", phone: "626 9922", email: "marteinn@granda.is", status: "ja", quote: "Sendu mér hvað þetta kostar og eins væri gaman að sjá hvernig þetta mun líta út.", source: "tölvupóstur", date: "30.10.2026", thjonusta: "Ný lögmannsstofa með 2 lögmenn: fasteignir, leiga, erfðir, félagaréttur", geiri: "Lögfræði", undirgeiri: "Lögfræðiþjónusta" },
  { name: "Vanda Legal", web: "vandalegal.is", person: "Dagný Fjóla Jóhannsdóttir", title: "lögmaður", phone: "865 6364", email: "dagny@vandalegal.is", status: "ja", quote: "Áhugasöm að heyra um verð og að fá að sjá svona bækling. Bendir á að SVIF ætti að skrá vörumerkið sitt.", source: "tölvupóstur", date: "2.11.2026", fylgt: [{ date: "10.11.2026", quote: "Ég hef áhuga á að auglýsa. Hvert var verðið, sagðirðu 30.000 kr. á mánuði og binding í 3 mánuði?" }], thjonusta: "Skráning vörumerkja og hönnunar, hugverkaréttur", geiri: "Lögfræði", undirgeiri: "Vörumerki og hugverk" },
  { name: "Blek hönnunarstofa", web: "blekhonnun.is", person: "Dagný Reykjalín", title: "grafískur hönnuður og eigandi, Akureyri", phone: "615 1655", email: "dagny@blekhonnun.is", status: "ja", quote: "Mjög sniðugt. Hvað kostar auglýsingin (3 mánaða samningur) og geturðu sent sýnishorn? Bendir á að ný fyrirtæki borgi oft seint.", source: "tölvupóstur", date: "2.11.2026", thjonusta: "Hönnunarstofa á Akureyri: lógó, prentefni, auglýsingar og vefir", geiri: "Ímynd og markaðsmál", undirgeiri: "Lógó og grafísk hönnun", einnig: ["Vefsíðugerð"] },
  { name: "Creditinfo", web: "creditinfo.is", person: "Mist Edvardsdóttir", title: "forstöðumaður markaðs- og kynningarmála", phone: "550 9600", phoneNote: "aðalnúmer samstæðu", email: "mist.edvardsdottir@creditinfo.com", status: "ja", quote: "Skemmtilegt concept. Áttu dæmi um bækling sem þú hefur sent til fyrirtækja?", source: "tölvupóstur", date: "3.11.2026", thjonusta: "Lánshæfismat, vanskilaskrá og upplýsingar um fyrirtæki", geiri: "Fjármál og rekstur", undirgeiri: "Lánshæfi og fyrirtækjaupplýsingar" },
  { name: "Hringiðan", web: "hringidan.is", person: "Guðmundur Kr. Unnsteinsson", title: "framkvæmdastjóri", phone: "525 2400", phoneNote: "aðalnúmer", email: "gudmundur@hringidan.is", status: "ja", quote: "Áttu svona bækling til að senda mér í PDF til að sjá hvernig þetta lítur út?", source: "tölvupóstur", date: "2.11.2026", fylgt: [{ date: "11.11.2026", quote: "Samþykkti 50.000 kr. með vsk. fyrir auglýsingu í húseigendabæklingnum (hönnun með hvíta lógóinu). Spyr um dreifingartíma og upplag. Gjafabréf og afsláttarkóði í vinnslu." }], thjonusta: "Ljósleiðari, 5G, farsími, heimasími, hýsing og lén, frá 1995", geiri: "Vefur og tækni", undirgeiri: "Net, sími og lén" },
  { name: "Afkoma vátryggingamiðlun", web: "afkoma.is", person: "Benisa Hoti", title: "þjónustufulltrúi", phone: "774 0867", alt: { name: "Sæmundur St. Magnússon, framkvæmdastjóri", phone: "621 9300" }, email: "benisa@afkoma.is", status: "ja", quote: "Þetta lítur mjög vel út, ætla að bera þetta undir framkvæmdastjórann og verð í bandi.", source: "tölvupóstur", date: "30.10.2026", thjonusta: "Vátryggingamiðlun: ber saman tryggingar og lífeyri frá öllum félögum", geiri: "Fjármál og rekstur", undirgeiri: "Tryggingar" },
  { name: "Prentmet Oddi", web: "prentmetoddi.is", person: "Guðmundur Ragnar Guðmundsson", title: "framkvæmdastjóri", phone: "856 0600", alt: { name: "Skiptiborð", phone: "5 600 601" }, email: "grg@prentmetoddi.is", status: "ja", quote: "Við erum áhugasöm að kynna okkar þjónustu í svona bækling ef bæklingurinn er prentaður hjá okkur.", source: "tölvupóstur", date: "29.10.2026", thjonusta: "Stærsta prentsmiðja landsins: prentun, umbúðir og límmiðar", geiri: "Ímynd og markaðsmál", undirgeiri: "Prentun", warn: "Skilyrði um prentun. Rekst á Litlaprent." },
  { name: "Valit ráðgjöf", web: "valit.is", person: "Sverrir", phone: "860 0408", email: "sverrir@valit.is", status: "ja", quote: "Áhugi í síma.", source: "sími", date: "", thjonusta: "Tölvurekstur í áskrift, Microsoft 365, afritun og netöryggi", geiri: "Vefur og tækni", undirgeiri: "Tölvurekstur og netöryggi" },
  { name: "Birta Media", web: "birtamedia.is", person: "Auður Elísabet Jóhannsdóttir", title: "hönnuður og vefstjóri", phone: "869 0937", alt: { name: "Elín Arnar", phone: "821 5568" }, email: "audur@birtamedia.is", status: "ja", quote: "Áhugi í síma. Eru í húseigendabæklingnum.", source: "sími", date: "", thjonusta: "Samfélagsmiðlar, Meta- og Google-auglýsingar, vefsíður og myndbönd", geiri: "Vefur og tækni", undirgeiri: "Auglýsingar og markaðssetning", einnig: ["Vefsíðugerð", "Ljósmyndun og myndbönd"] },
  { name: "Kerfi fyrirtækjaþjónusta", aliases: ["Kerfi Fyrirtækjaþjónusta ehf", "Kerfi"], web: "kerfi.is", person: "Sigurður", phone: "860 7250", alt: { name: "Skiptiborð", phone: "564 1400" }, email: "kerfi@kerfi.is", status: "ja", quote: "Ætlaði að hringja til baka.", source: "sími", date: "", thjonusta: "Kaffi- og vatnsvélar í leigu, kaffi og rekstrarvörur fyrir skrifstofur", geiri: "Fólk og skrifstofa", undirgeiri: "Kaffi og rekstrarvörur" },
  { name: "VÍS", aliases: ["VÍS tryggingar hf.", "VÍS tryggingar", "Vís"], web: "vis.is", person: "Trausti Sigurður Hilmisson", phone: "560 5000", phoneNote: "aðalnúmer", email: "traustih@vis.is", status: "ja", quote: "Áhugi í síma. Eru í húseigendabæklingnum.", source: "sími", date: "", thjonusta: "Tryggingafélag: ábyrgðar-, slysa- og lausafjártryggingar fyrirtækja", geiri: "Fjármál og rekstur", undirgeiri: "Tryggingar" },
  { name: "Motus", aliases: ["Motus.", "Motus ehf."], web: "motus.is", person: "Eva Dögg Guðmundsdóttir", title: "markaðs- og samskiptastjóri", phone: "825 6174", email: "evadogg@motus.is", status: "ja", quote: "Áhugi í síma. Laufey, forstöðumaður innheimtumála, hafnaði í tölvupósti 30.10.", source: "sími", date: "", thjonusta: "Kröfustofnun og innheimta", geiri: "Fjármál og rekstur", undirgeiri: "Innheimta", warn: "Tvö ólík svör frá Motus. Staðfesta við Evu Dögg." },
  { name: "ECIT Ísland", aliases: ["Ecit", "ECIT", "Virtus", "ECIT Virtus"], web: "ecit.com/is", person: "Þorkell Guðjónsson", title: "framkvæmdastjóri viðskiptaþróunar og sölu", phone: "824 3201", alt: { name: "Skiptiborð", phone: "419 7100" }, email: "thorkell.gudjons@ecit.is", status: "ja", quote: "Leist mjög vel á hugmyndina. Heyra í honum þegar nær dregur og senda tölvupóst.", source: "sími", date: "", thjonusta: "Bókhald, launavinnsla og úthýst fjármáladeild, yfir 100 starfsmenn", geiri: "Fjármál og rekstur", undirgeiri: "Bókhaldsstofa og launavinnsla" },
  { name: "A4", web: "a4.is", person: "Dagbjört Margrét Pálsdóttir", phone: "661 5138", email: "info@a4.is", status: "ja", quote: "Áhugi í síma. Vantar netfangið hennar, senda myndbandið.", source: "sími", date: "", thjonusta: "Skrifstofuvörur, ritföng og skrifstofuhúsgögn", geiri: "Fólk og skrifstofa", undirgeiri: "Skrifstofuvörur og húsgögn" },
  { name: "Konto", web: "konto.is", person: "Ari Kaprasíus Kristjánsson", title: "þjónustustjóri", phoneNote: "ekkert númer á vef, bara form", email: "info@konto.is", status: "ja", quote: "Hljómar spennandi og gæti hentað okkur vel. Spyr um verð, sýnishorn, hvernig viðtakendur eru valdir og hvort listinn sé borinn saman við bannskrá Þjóðskrár.", source: "tölvupóstur", date: "4.11.2026", fylgt: [{ date: "11.11.2026", quote: "Ari biður um símanúmer eða að bóka fjarfund. Þú sendir númerið þitt og póst á stjani@konto.is 12.11." }], thjonusta: "Rafrænir reikningar í appi, ókeypis grunnáskrift", geiri: "Fjármál og rekstur", undirgeiri: "Bókhaldskerfi og reikningagerð" },
  { name: "Regla", web: "regla.is", person: "Margrét", phone: "520 1200", email: "regla@regla.is", status: "ja", quote: "Þetta er áhugavert. Endilega leyfðu mér að heyra verðin sem þið eruð með í gangi.", source: "tölvupóstur", date: "4.11.2026", fylgt: [{ date: "9.11.2026", quote: "Búin að fara yfir þetta innanhúss, líst skakalega vel á þetta og erum til í 3ja mánaða bindingu til að byrja með. Hver væru næstu skref?" }], thjonusta: "Skýjabókhald með kassakerfi, birgðum, launum og netverslun, 3.000+ fyrirtæki", geiri: "Fjármál og rekstur", undirgeiri: "Bókhaldskerfi og reikningagerð" },
  { name: "Netbókhald.is", web: "netbokhald.is", person: "Elvar Níelsson", title: "framkvæmdastjóri", phone: "533 2090", email: "netbokhald@netbokhald.is", status: "ja", quote: "Ég er jákvæður. Spyr um verð, hvort kennitölulistinn sé frá Creditinfo, og vill geta rakið hvaðan nýir viðskiptavinir koma.", source: "tölvupóstur", date: "3.11.2026", fylgt: [{ date: "10.11.2026", quote: "Takk fyrir símtalið og bæklinginn. Mig langar að slá til og vera með í þessu ferðalagi. Hver eru næstu skref?" }], thjonusta: "Vefbókhald með sölu-, fjárhags- og launakerfi, 5.900 kr. á mánuði", geiri: "Fjármál og rekstur", undirgeiri: "Bókhaldskerfi og reikningagerð" },
  { name: "Datatech / Vefapp", web: "vefapp.is", person: "Andri Steinn Jóhannsson", title: "stofnandi og eigandi", phone: "571 9300", phoneNote: "aðalnúmer", email: "vefapp@datatech.is", status: "ja", quote: "Sniðugt, var með nákvæmlega þessa hugmynd. En hvað kostar að vera með?", source: "tölvupóstur", date: "4.11.2026", thjonusta: "Sérsmíðaðar vefsíður, vefverslanir og bókunarkerfi; gagnabjörgun og afritun", geiri: "Vefur og tækni", undirgeiri: "Vefsíðugerð", einnig: ["Tölvurekstur og netöryggi"] },
  { name: "Gonora", web: "gonora.is", person: "Sara Kristín", phoneNote: "ekkert númer á vef", email: "hallo@gonora.is", status: "ja", quote: "Við höfum áhuga á að skoða þetta nánar. Er þetta einungis prentaður bæklingur eða fer þetta líka stafrænt? Hvernig er verðskráin?", source: "tölvupóstur", date: "4.11.2026", thjonusta: "Heimasíða í áskrift, 8.900 kr. á mánuði, tilbúin á 48 klst.", geiri: "Vefur og tækni", undirgeiri: "Vefsíðugerð" },
  { name: "Vefsíðuhönnun (Vefhýsing ehf.)", web: "vefsiduhonnun.is", person: "Ekkert nafn", title: "Reyðarfirði", phone: "588 1228", email: "info@vefsiduhonnun.is", status: "ja", quote: "Mátt senda okkur nánari upplýsingar.", source: "tölvupóstur", date: "4.11.2026", thjonusta: "WordPress- og Shopify-vefir frá 169.990 kr., Reyðarfirði", geiri: "Vefur og tækni", undirgeiri: "Vefsíðugerð" },
  { name: "Vefmundur (Filmís)", web: "vefmundur.is", person: "Aron Bjarnason", phone: "537 1717", email: "veistuhvar@veistuhvar.is", status: "ja", quote: "Þetta gæti átt vel við Vefmundur.is frekar en Veistu hvar. Gætirðu sent mér verð og skilmála?", source: "tölvupóstur", date: "4.11.2026", thjonusta: "Vefsíðuþjónusta hönnunarstofunnar Filmís", geiri: "Vefur og tækni", undirgeiri: "Vefsíðugerð", warn: "Vefsíðan vefmundur.is svaraði ekki." },
  { name: "Pikk", web: "pikk.is", person: "Birkir Guðsteinsson", title: "stofnandi", phone: "449 8888", email: "info@pikk.is", status: "ja", quote: "Þetta er áhugavert. Þú ert væntanlega að selja mér dálk í bæklingnum. Hvað myndi það kosta?", source: "tölvupóstur", date: "4.11.2026", thjonusta: "Google- og Meta-auglýsingar í mánaðaráskrift frá 44.900 kr.", geiri: "Vefur og tækni", undirgeiri: "Auglýsingar og markaðssetning" },
  { name: "SB Skiltagerð", web: "sbskilti.is", person: "Ekkert nafn", title: "Þorlákshöfn", phone: "483 1955", email: "sbskilti@sbskilti.is", status: "ja", quote: "Þetta hljómar áhugavert. Hvernig virkar þetta, hvaða möguleikar eru í boði og hver er kostnaðurinn?", source: "tölvupóstur", date: "3.11.2026", thjonusta: "Skilti, bílamerkingar og gluggamerkingar, Þorlákshöfn", geiri: "Ímynd og markaðsmál", undirgeiri: "Skilti og merkingar" },
  { name: "Motif auglýsingavörur", web: "motif.is", person: "Guðrún Anna Magnúsdóttir", title: "eigandi, rekur líka Grafika auglýsingastofu", phone: "896 1896", email: "motif@motif.is", status: "ja", quote: "Svolítið hugsi: ný fyrirtæki eiga lítinn pening. Sendi samt tilboðspakka (lógó, heimasíða, nafnspjöld með 30% afslætti) og spyr hvað kostar að vera með.", source: "tölvupóstur", date: "3.11.2026", thjonusta: "Merktar auglýsingavörur: pennar, bolir, bollar; Grafika hannar lógó og vefi", geiri: "Ímynd og markaðsmál", undirgeiri: "Kynningarvörur og vinnuföt", einnig: ["Lógó og grafísk hönnun"] },
  { name: "Dokkan", web: "dokkan.is", person: "Herdís Pála Pálsdóttir", title: "eigandi og framkvæmdastjóri", phone: "860 0203", email: "herdispala@dokkan.is", status: "ja", quote: "Gæti alveg verið áhugavert. Er krafa um afslátt? Í hvaða flokki sérðu Dokkuna? Á annað fyrirtæki sem gæti líka hentað.", source: "tölvupóstur", date: "3.11.2026", thjonusta: "Örnámskeið fyrir vinnustaði í áskrift, 150+ vinnustaðir", geiri: "Fólk og skrifstofa", undirgeiri: "Námskeið og símenntun" },
  { name: "Margt smátt", web: "margtsmatt.is", person: "Árni Esra Einarsson", title: "framkvæmdastjóri, sér um þetta", phone: "893 8634", alt: { name: "Hrafnhildur (Habba) Heimisdóttir, markaðsfulltrúi", phone: "895 3502" }, email: "arni@margtsmatt.is", status: "ja", quote: "Við höfum áhuga á að skoða þetta hjá ykkur. Habba bætti Árna Esra á þráðinn.", source: "tölvupóstur", date: "5.11.2026", thjonusta: "Merktar auglýsingavörur, vinnuföt og gjafavörur, 36 starfsmenn", geiri: "Ímynd og markaðsmál", undirgeiri: "Kynningarvörur og vinnuföt" },
  { name: "AÞ-Þrif", web: "ath-thrif.is", person: "Arnar Þorsteinsson", title: "forstjóri", phone: "517 2215", phoneNote: "aðalnúmer", alt: { name: "Bjarki Þorsteinsson, sölustjóri", phone: "821 7741" }, email: "arnar@ath-thrif.is", status: "ja", quote: "Við erum til í kynningu hjá þér. Hvernig hljómar fimmtudagurinn 12. nóv. kl. 9? Skeiðarás 12, Garðabæ.", source: "tölvupóstur", date: "5.11.2026", thjonusta: "Ræstingar, lokaþrif, gluggaþvottur og mygluhreinsun, 250 starfsmenn", geiri: "Fólk og skrifstofa", undirgeiri: "Ræsting" },
  { name: "LXB skiltagerð", web: "lxb.is", person: "Eiríkur Hilmarsson", title: "eigandi", phone: "420 0541", alt: { name: "Skiptiborð", phone: "420 0540" }, email: "eirikur@lxb.is", status: "ja", quote: "Sniðugt concept, klárlega til í að skoða nánar. Er hægt að skoða bæklinginn sem var gefinn út í síðasta mánuði?", source: "tölvupóstur", date: "4.11.2026", thjonusta: "Ljósaskilti, gluggamerkingar, bílamerkingar og fánar", geiri: "Ímynd og markaðsmál", undirgeiri: "Skilti og merkingar" },
  { name: "Veffirma", web: "veffirma.is", person: "Patrick Puelmanns", title: "vefforritari og stofnandi, svarar á ensku", phone: "888 5851", email: "patrick@veffirma.is", status: "ja", quote: "Yes, I'm interested. Býður skipti: pláss í bæklingnum gegn yfirferð og lagfæringu á svif.is. Spyr um verð og árangur húseigendabæklingsins.", source: "tölvupóstur", date: "4.11.2026", thjonusta: "Eins manns vefstofa: vefsíðugerð, vefumsjón og netföng á eigin léni", geiri: "Vefur og tækni", undirgeiri: "Vefsíðugerð", warn: "Vill skipti í stað greiðslu." },
  { name: "Allra Átta", web: "8.is", person: "Jón Trausti Snorrason", title: "framkvæmdastjóri, Hafnarfirði", phone: "588 8885", alt: { name: "Neyðarsími", phone: "821 3790" }, email: "trausti@8.is", status: "ja", quote: "Hljómar ágætlega. Hvað kostar að vera skráður þarna hjá ykkur?", source: "tölvupóstur", date: "4.11.2026", thjonusta: "Vefstofa í 20 ár: WordPress og Shopify, hýsing, Google-auglýsingar, SEO", geiri: "Vefur og tækni", undirgeiri: "Vefsíðugerð", einnig: ["Auglýsingar og markaðssetning"] },
  { name: "DG Legal", web: "dglegal.is", person: "Davíð Guðmundsson", title: "héraðsdómslögmaður", phone: "860 3990", email: "david@dglegal.is", status: "ja", quote: "Ágætis hugmynd en þetta fer algerlega eftir ykkar verðhugmyndum. Getur þú gefið mér min/max per mánuð?", source: "tölvupóstur", date: "4.11.2026", thjonusta: "Einn héraðsdómslögmaður, engin þjónustulýsing á vef", geiri: "Lögfræði", undirgeiri: "Lögfræðiþjónusta" },
  { name: "1819", web: "1819.is", person: "Victor Pálmarsson", title: "framkvæmdastjóri", phone: "546 1819", email: "victor@1819.is", status: "spurning", quote: "Hvernig hugsarðu þér okkar innkomu? Samstarf við að nálgast fyrirtækin, eða að vera í bæklingnum? Ef það síðara þarf ég birtingarkostnað.", source: "tölvupóstur", date: "4.11.2026", thjonusta: "Upplýsinganúmerið 1819, fyrirtækjaskráning og símsvörun", geiri: "Vefur og tækni", undirgeiri: "Símsvörun og fyrirtækjaskráning" },
  { name: "Vörar auglýsingastofa", web: "vorar.is", person: "Hrönn Óskarsdóttir", title: "framkvæmdastjóri", phone: "694 4666", alt: { name: "Skiptiborð", phone: "571 2244" }, email: "hronn@vorar.is", status: "spurning", quote: "Ertu að bjóða okkur að vera með auglýsingu í bæklingnum eða ertu að leita eftir aðstoð við markaðssetningu á honum?", source: "tölvupóstur", date: "4.11.2026", thjonusta: "Auglýsingastofa með 8 manns: mörkun, hönnun, umbúðir og stafræn markaðssetning", geiri: "Vefur og tækni", undirgeiri: "Auglýsingar og markaðssetning", einnig: ["Lógó og grafísk hönnun"] },
  { name: "Umslag", web: "umslag.is", person: "Stefán Steinsen", title: "framkvæmdastjóri", phone: "823 3325", alt: { name: "Skiptiborð", phone: "533 5252" }, email: "steinsen@umslag.is", status: "spurning", quote: "Ertu að leitast eftir prentun á þessum bæklingi eða hvort við séum eitt af þeim fyrirtækjum sem bjóða þjónustu til nýrra fyrirtækja?", source: "tölvupóstur", date: "3.11.2026", thjonusta: "Prentsmiðja og póstsendingar: nafnspjöld, reikningar og fjöldapóstur", geiri: "Ímynd og markaðsmál", undirgeiri: "Prentun" },
  { name: "Billboard", web: "billboard.is", person: "Aron Bjarki Jósepsson", title: "sölustjóri", phone: "867 5706", email: "aron.josepsson@billboard.is", status: "spurning", quote: "Hljómar flott verkefni. Hver væri okkar aðkoma að þessu verkefni?", source: "tölvupóstur", date: "4.11.2026", thjonusta: "LED-skjáir og strætóskýli um allt höfuðborgarsvæðið", geiri: "Ímynd og markaðsmál", undirgeiri: "Útiauglýsingar" },
  { name: "Hugarheimur", web: "hugarheimur.is", person: "Ragnheiður Guðfinna Guðnadóttir", title: "eigandi, vinnusálfræðingur", phone: "897 0787", alt: { name: "Skiptiborð", phone: "562 7770" }, email: "ragnheidur@hugarheimur.is", status: "spurning", quote: "Fer yfir þegar ég hef tök á. Mjög margt sem ég gæti nýtt mér þarna.", source: "tölvupóstur", date: "4.11.2026", thjonusta: "Mannauðs- og vinnusálfræðiráðgjöf, eins manns stofa", geiri: "Fólk og skrifstofa", undirgeiri: "Mannauðsráðgjöf", warn: "Heldur kannski að bæklingurinn sé ætlaður henni." },
  { name: "Inkasso", web: "inkasso.is", person: "Jóhann Valberg Árnason", title: "sölustjóri", phone: "520 4040", phoneNote: "aðalnúmer", email: "johann.arnason@inkasso.is", status: "bidur", quote: "Þjónustuver: „Ég kem þessu áleiðis á réttan aðila.“", source: "tölvupóstur", date: "2.11.2026", thjonusta: "Innheimtuþjónusta og kröfufjármögnun, 3.000 viðskiptavinir", geiri: "Fjármál og rekstur", undirgeiri: "Innheimta" },
  { name: "ELKO", web: "elko.is", person: "Fyrirtækjaþjónusta", phone: "544 4000", email: "b2b@elko.is", status: "bidur", quote: "Þjónustuver: „Búin að áframsenda póstinn á viðeigandi deild, haft verður samband ef áhugi er fyrir hendi.“", source: "tölvupóstur", date: "3.11.2026", thjonusta: "Stærsta raftækjaverslun landsins með fyrirtækjaþjónustu", geiri: "Vefur og tækni", undirgeiri: "Tölvur og tæki" },
  { name: "Logoflex", web: "logoflex.is", person: "Garðar Jónsson", title: "sala og ráðgjöf", phone: "414 1908", alt: { name: "Ingi Guðmundsson, framkvæmdastjóri", phone: "898 5242" }, email: "logoflex@logoflex.is", status: "bidur", quote: "Sjálfvirkt svar: lofa svari innan sólarhrings.", source: "tölvupóstur", date: "3.11.2026", thjonusta: "Skilti, ljósaskilti, merkingar og límmiðar, frá 1982", geiri: "Ímynd og markaðsmál", undirgeiri: "Skilti og merkingar" },
  { name: "Central Pay", web: "centralpay.is", person: "Söludeild", phone: "556 3600", email: "sala@centralpay.is", status: "bidur", quote: "Sjálfvirkt svar.", source: "tölvupóstur", date: "2.11.2026", thjonusta: "Alipay og WeChat Pay greiðslulausnir á Íslandi", geiri: "Þröngir flokkar", undirgeiri: "Greiðslur frá kínverskum ferðamönnum" },
  { name: "Prósent", web: "prosent.is", person: "Trausti Heiðar Haraldsson", title: "framkvæmdastjóri", phone: "859 9130", alt: { name: "Bryndís Marteinsdóttir, greiningar", phone: "864 8212" }, email: "trausti@prosent.is", status: "bidur", quote: "Bryndís bætti Eddu Sólveigu og Trausta við þráðinn, þau skoða þetta.", source: "tölvupóstur", date: "4.11.2026", thjonusta: "Markaðsrannsóknir, kannanir og vörumerkjamælingar", geiri: "Ímynd og markaðsmál", undirgeiri: "Markaðsrannsóknir" },
  { name: "MS Mjólkursamsalan", web: "ms.is", person: "Halldóra Arnardóttir", title: "markaðs- og vöruflokkastjóri", phone: "663 6311", alt: { name: "Skiptiborð", phone: "450 1180" }, email: "halldoraa@ms.is", status: "bidur", quote: "Hlekkurinn virkaði ekki. Þú vísaðir henni á svif.is.", source: "tölvupóstur", date: "4.11.2026", thjonusta: "Mjólkurvörur og hráefni fyrir veitingastaði og verslanir", geiri: "Þröngir flokkar", undirgeiri: "Hráefni fyrir veitingastaði" },
  { name: "Litróf", web: "litrof.is", person: "Ólafur Stolzenwald", title: "sölu- og markaðsmál", phone: "897 2166", alt: { name: "Skiptiborð", phone: "563 6007" }, email: "olistolz@litrof.is", status: "bidur", quote: "Kíkir á þetta, bauð um leið prentun á bæklingnum.", source: "tölvupóstur", date: "4.11.2026", thjonusta: "Svansvottuð prentsmiðja frá 1943: prentun, umbúðir og bækur", geiri: "Ímynd og markaðsmál", undirgeiri: "Prentun" },
  { name: "Ísband", web: "isband.is", person: "Sigurður Kr. Björnsson", email: "siggikr@isband.is", status: "nei", quote: "Auglýsingastofan Hér&Nú sér um auglýsingar og birtingar fyrir okkur. Hafðu samband við þá: 520 2700, hn@hn.is.", source: "tölvupóstur", date: "4.11.2026", thjonusta: "Bílaumboð: Jeep, Fiat, sendibílar og rekstrarleiga", geiri: "Bílar og flutningar", undirgeiri: "Sendibílar og fyrirtækjabílar", warn: "Þess virði að elta í gegnum Hér&Nú. Bílar eru laus flokkur." },
  { name: "Peritus", web: "peritus.is", person: "Lárus Hjartarson", title: "ráðgjafi og stofnandi", email: "larus@peritus.is", status: "nei", quote: "Nei takk. Ábendingar: senda frá netfangi á svif.is, sýna heimavinnu, birta kennitölu og heimilisfang á vefnum, bæta við persónuverndarstefnu og skilmálum, birta verð og árangur.", source: "tölvupóstur", date: "3.11.2026", thjonusta: "Gervigreindar- og hugbúnaðarráðgjöf, eins manns stofa", geiri: "Vefur og tækni", undirgeiri: "Gervigreind og hugbúnaðarþróun" },
  { name: "AviLabs", web: "avilabs.is", person: "Marteinn Áki Ellertsson", email: "marteinn@avilabs.is", status: "nei", quote: "Töff framtak, en sér fáa snertipunkta. Þjónusta fyrst og fremst flugfélög.", source: "tölvupóstur", date: "30.10.2026", thjonusta: "Hugbúnaður fyrir flugfélög", geiri: "Vefur og tækni", undirgeiri: "Gervigreind og hugbúnaðarþróun" },
  { name: "DLF lögfræðiráðgjöf", web: "dlf.is", person: "Einar Örn Davíðsson", email: "einarorn@dlf.is", status: "nei", quote: "Frábær hugmynd. Sér ekki þörf fyrir sig en framsendir póstinn á aðra.", source: "tölvupóstur", date: "30.10.2026", thjonusta: "Lögfræðiráðgjöf, einyrki", geiri: "Lögfræði", undirgeiri: "Lögfræðiþjónusta" },
  { name: "Lögborg", web: "logborg.is", person: "Guðjón Ármann Jónsson", title: "hrl.", email: "gudjon@logborg.is", status: "nei", quote: "„Var ég að stofna fyrirtæki??“ Misskildi póstinn.", source: "tölvupóstur", date: "30.10.2026", thjonusta: "Lögmannsstofa frá 1953", geiri: "Lögfræði", undirgeiri: "Lögfræðiþjónusta" },
  // Svör sem bárust 5.–12. nóvember
  { name: "Skilti & Merkingar", aliases: ["Skilti og Merkingar", "Skilti og Merkingar & Tec"], web: "skiltiogmerkingar.is", person: "Ekkert nafn", title: "Erlingur Bjarnason er eigandi skv. fyrirtækjaskrá", phone: "454 1001", phoneNote: "aðalnúmer", email: "sm@skiltiogmerkingar.is", status: "ja", quote: "Við höfum áhuga, hver er kostnaðurinn á bak við það?", source: "tölvupóstur", date: "5.11.2026", thjonusta: "Grafin smáskilti í vefverslun: hurðaskilti, húsnúmer og öryggisskilti, fjölskylduverkstæði í Reykjanesbæ", geiri: "Ímynd og markaðsmál", undirgeiri: "Skilti og merkingar", warn: "Bara smáskilti, skarast lítið við hin skiltafyrirtækin." },
  { name: "Svörum strax", aliases: ["Svörum Strax", "Svorum strax"], web: "svorumstrax.is", person: "Daníel Þór Irvine", title: "framkvæmdastjóri og stofnandi", phone: "699 8051", alt: { name: "Skiptiborð", phone: "537 0800" }, email: "daniel@svorumstrax.is", status: "ja", quote: "Væri alveg til að taka spjall á fundi. Sniðugt concept sem gæti virkað fyrir okkur. Gætu líka aðstoðað á móti við að bæta fyrirtækjum í bæklinginn, með djúpa þekkingu á B2B-markaðnum.", source: "tölvupóstur", date: "5.11.2026", thjonusta: "Símsvörun, þjónustuver og úthringingar með íslensku starfsfólki í Barcelona, 35+ starfsmenn", geiri: "Vefur og tækni", undirgeiri: "Símsvörun og fyrirtækjaskráning" },
  { name: "Tölvuaðstoð", aliases: ["Tölvuaðstoð ehf.", "Tolvuadstod"], web: "tolvuadstod.is", person: "Valgeir Ólafsson", title: "framkvæmdastjóri", phone: "772 4200", alt: { name: "Skiptiborð", phone: "5 500 200" }, email: "valgeir@tolvuadstod.is", status: "ja", quote: "Líst vel á hugmyndina, sérstaklega að aðeins eitt fyrirtæki sé í hverjum flokki. Vill verð fyrir hverja dreifingu, sýnishorn, fjölda sendra bæklinga og árangur auglýsenda. Ábendingar: netfang á svif.is, kennitala og persónuverndarstefna á vefinn. Guðjón Helgi rekstrarstjóri tekur ákvarðanir með honum.", source: "tölvupóstur", date: "9.11.2026", thjonusta: "Tölvuþjónusta í áskrift, Microsoft 365, afritun (afrit.is) og netöryggi, frá 2004", geiri: "Vefur og tækni", undirgeiri: "Tölvuaðstoð og ráðgjöf", einnig: ["Tölvurekstur og netöryggi"] },
  { name: "Astra", aliases: ["ASTRA ehf", "Astra ehf."], web: "astra.is", person: "Henry Berg Guðmundsson", phone: "660 8308", alt: { name: "Skiptiborð", phone: "414 3100" }, email: "henry@astra.is", status: "ja", quote: "Voru við það að flokka póstinn sem spam (Gmail, nýtt lén, engar upplýsingar um okkur). Hugmyndin er fín: hvað kostar, hvaðan kemur listinn yfir ný fyrirtæki, og er til bæklingur sem má sjá?", source: "tölvupóstur", date: "11.11.2026", thjonusta: "Rekstur tölvukerfa fyrir lítil og meðalstór fyrirtæki, skýjaþjónusta, afritun, símkerfi og hýsing, frá 2006", geiri: "Vefur og tækni", undirgeiri: "Tölvurekstur og netöryggi", einnig: ["Vefsíðugerð"], warn: "Tortryggin á póstinn. Sýna sýnishorn og hvaðan listinn kemur." },
  { name: "RVK Marketing", aliases: ["Reykjavík Marketing", "Rvk marketing"], web: "rvkmarketing.is", person: "Hlynur Þór Agnarsson", phone: "655 5554", phoneNote: "aðalnúmer", email: "hlynur@rvkmarketing.is", status: "ja", quote: "Hljómar spennandi, geturðu sagt mér nánar frá því hvernig þetta samstarf virkar og kostnað?", source: "tölvupóstur", date: "12.11.2026", thjonusta: "Stafræn auglýsingastofa á Selfossi: samfélagsmiðlar, auglýsingar, vefsíður og aðgengisúttektir", geiri: "Vefur og tækni", undirgeiri: "Auglýsingar og markaðssetning", einnig: ["Vefsíðugerð"] },
];

export const SVIF_FYRIRTAEKI_SOURCE = "svif_fyrirtæki";

const OUTCOME_BY_STATUS: Record<SvarStada, Company["lastCallOutcome"]> = {
  ja: "interested",
  spurning: "call_again",
  bidur: undefined,
  nei: "rejected",
};

/** Lágstafir, án greinarmerkja og félagsforms (ehf., hf., slf.), svo „Motus.“ og „Motus ehf.“ þekkist sem sama nafn. */
export const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/[.,'’"()]/g, " ")
    .replace(/\b(ehf|hf|slf|sf|ohf)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Er fyrirtækið í gagnagrunninum sama fyrirtæki og svarið? */
export function matchesSvar(c: Pick<Company, "name">, s: SvifSvar): boolean {
  const target = normName(c.name);
  return [s.name, ...(s.aliases || [])].some((n) => normName(n) === target);
}

/** Svarið sem á við fyrirtækið, ef það er úr herferðinni. */
export function svarFor(c: Pick<Company, "name">): SvifSvar | undefined {
  return SVOR.find((s) => matchesSvar(c, s));
}

/** Svarið og seinni svör sem einn texti, eins og hann er geymdur í „pitch“. */
export function fullQuote(s: SvifSvar): string {
  return [s.quote, ...(s.fylgt || []).map((f) => `[${f.date}] ${f.quote}`)].join("\n\n");
}

/** Vantar seinni svör úr svaralistanum á fyrirtækið? */
export function missingFollowUps(c: Pick<Company, "pitch">, s: SvifSvar): boolean {
  return (s.fylgt || []).some((f) => !(c.pitch || "").includes(f.quote));
}

export function flokkurFor(undirgeiri?: string): Flokkur | undefined {
  if (!undirgeiri) return undefined;
  const key = normName(undirgeiri);
  return FLOKKAR.find((f) => normName(f.undirgeiri) === key);
}

/** Hve mörg svör (önnur en nei) sækja um flokkinn samkvæmt svaralistanum. */
function seedCountIn(undirgeiri: string): number {
  const key = normName(undirgeiri);
  return SVOR.filter((s) => s.status !== "nei" && normName(s.undirgeiri) === key).length;
}

/** Breytir svari í fyrirtæki sem hægt er að vista í gagnagrunninn. */
export function svarToCompany(s: SvifSvar): Omit<Company, "id" | "createdAt"> {
  const contacts = [
    { id: crypto.randomUUID(), name: s.person, phone: s.phone || "", email: s.email },
    ...(s.alt ? [{ id: crypto.randomUUID(), name: s.alt.name, phone: s.alt.phone }] : []),
  ];
  const notesLines = [
    `Svar ${s.date ? s.date + " " : ""}(${s.source}).`,
    s.phoneNote ? `Sími: ${s.phoneNote}.` : "",
    s.warn ? `Ath: ${s.warn}` : "",
  ].filter(Boolean);
  return {
    name: s.name,
    owner: s.title ? `${s.person}, ${s.title}` : s.person,
    companyId: "",
    websiteUrl: `https://${s.web}`,
    phone: s.phone || undefined,
    email: s.email,
    industry: s.geiri,
    category: s.undirgeiri,
    leadSource: SVIF_FYRIRTAEKI_SOURCE,
    stage: "svif_fyrirtæki",
    pitch: fullQuote(s),
    rejected: s.status === "nei",
    rejectedAt: s.status === "nei" ? new Date().toISOString() : undefined,
    lastCallOutcome: OUTCOME_BY_STATUS[s.status],
    registeredInSvif: false,
    // Mánaðarverð plássins miðað við hve mörg sækja um það, svo áætlun símtala sýni rétta upphæð.
    estimatedPrice: verdFor(seedCountIn(s.undirgeiri)).ein,
    contacts,
    checklist: [],
    notes: notesLines.join("\n"),
    personalityDescription: "",
    previewSent: false,
    projectedEarnings: 0,
    monthlyPaymentActive: false,
  };
}

/**
 * Fyllir inn í fyrirtæki sem er þegar til: flokk, svarið, vef og tengiliði.
 * Það sem er þegar skráð heldur sér; aðeins tóm svæði eru fyllt. Flokkur sem
 * er ekki lengur á flokkakortinu er færður á það.
 */
export function enrichWithSvar(c: Company, s: SvifSvar): Company {
  const digits = (p?: string) => (p || "").replace(/\D/g, "");
  const seed = svarToCompany(s);
  const havePhones = new Set((c.contacts || []).map((p) => digits(p.phone)).filter(Boolean));
  const haveNames = new Set((c.contacts || []).map((p) => normName(p.name || "")).filter(Boolean));
  const newContacts = seed.contacts.filter(
    (p) => !(p.phone && havePhones.has(digits(p.phone))) && !haveNames.has(normName(p.name))
  );
  const notesHasSvar = /(^|\n)Svar /.test(c.notes || "");
  const keepCategory = !!flokkurFor(c.category);
  // Seinni svör sem vantar bætast aftan við það sem þegar er skráð.
  const newFollowUps = (s.fylgt || []).filter((f) => !(c.pitch || "").includes(f.quote));
  const pitch = [c.pitch || seed.pitch, ...newFollowUps.map((f) => `[${f.date}] ${f.quote}`)]
    .filter(Boolean)
    .join("\n\n");
  return {
    ...c,
    owner: c.owner?.trim() ? c.owner : seed.owner,
    websiteUrl: c.websiteUrl || seed.websiteUrl,
    phone: c.phone || seed.phone,
    email: c.email || seed.email,
    industry: keepCategory ? c.industry || seed.industry : seed.industry,
    category: keepCategory ? c.category : seed.category,
    pitch,
    estimatedPrice: keepCategory && c.estimatedPrice ? c.estimatedPrice : seed.estimatedPrice,
    lastCallOutcome: c.lastCallOutcome || seed.lastCallOutcome,
    rejected: c.rejected || seed.rejected,
    contacts: [...(c.contacts || []), ...newContacts],
    notes: notesHasSvar ? c.notes || "" : [c.notes || "", seed.notes].filter(Boolean).join("\n"),
  };
}
