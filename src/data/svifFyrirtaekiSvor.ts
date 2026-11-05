import { Company } from "@/types";

/**
 * Svörin við SVIF-herferðinni til nýstofnaðra fyrirtækja (okt.–nóv. 2026),
 * ásamt flokkakorti bæklingsins. Síðan „Svif fyrirtæki“ (/svif-listi) flytur
 * þessi svör inn í gagnagrunninn og sýnir flokkana, verðin og skaranirnar.
 */

export type SvarStada = "ja" | "spurning" | "bidur" | "nei";
export type FlokkurTier = "einn" | "keppni" | "laus";

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
  geiri: string;
  undirgeiri: string;
  warn?: string;
}

export interface Flokkur {
  geiri: string;
  undirgeiri: string;
  tier: FlokkurTier;
  note?: string;
}

/** Verð á mánuði fyrir eina og tvær síður, eftir stöðu flokks. */
export const VERD: Record<FlokkurTier, { ein: number; tvaer: number }> = {
  laus: { ein: 38500, tvaer: 50000 },
  einn: { ein: 38500, tvaer: 50000 },
  keppni: { ein: 55000, tvaer: 70000 },
};

export const TIER_LABEL: Record<FlokkurTier, string> = {
  laus: "Laus",
  einn: "Einn sækir um",
  keppni: "Keppni",
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
  { geiri: "Fjármál og rekstur", undirgeiri: "Reikningagerð", tier: "einn" },
  { geiri: "Fjármál og rekstur", undirgeiri: "Bókhaldskerfi", tier: "keppni", note: "Payday, Regla og Netbókhald.is sækja um. Regla fær Kassakerfi og verslun." },
  { geiri: "Fjármál og rekstur", undirgeiri: "Kassakerfi og verslun", tier: "keppni", note: "Klofið úr Bókhaldskerfi, heldur keppnisverði." },
  { geiri: "Fjármál og rekstur", undirgeiri: "Verkbókhald fyrir iðnað", tier: "einn" },
  { geiri: "Fjármál og rekstur", undirgeiri: "Stofnun fyrirtækis og skattframtal", tier: "keppni", note: "Bókhaldsstofurnar skipta: stofnun hér, laun í næsta flokki." },
  { geiri: "Fjármál og rekstur", undirgeiri: "Launavinnsla og úthýst bókhald", tier: "keppni" },
  { geiri: "Fjármál og rekstur", undirgeiri: "Innheimta", tier: "keppni", note: "Keppni aðeins ef Inkasso segir já." },
  { geiri: "Fjármál og rekstur", undirgeiri: "Lánshæfi og fyrirtækjaupplýsingar", tier: "einn" },
  { geiri: "Fjármál og rekstur", undirgeiri: "Tryggingar fyrirtækja", tier: "keppni", note: "Afkoma fær lífeyrismálin." },
  { geiri: "Fjármál og rekstur", undirgeiri: "Lífeyrir og séreign", tier: "einn" },
  { geiri: "Fjármál og rekstur", undirgeiri: "Posar og greiðslulausnir", tier: "laus", note: "Teya og Straumur svöruðu ekki." },
  { geiri: "Fjármál og rekstur", undirgeiri: "Banki og fyrirtækjareikningur", tier: "laus", note: "Kvika svaraði ekki." },
  { geiri: "Fjármál og rekstur", undirgeiri: "Endurskoðun", tier: "laus" },
  { geiri: "Fjármál og rekstur", undirgeiri: "Fjármögnun og styrkir", tier: "laus" },
  { geiri: "Lögfræði", undirgeiri: "Almenn lögfræði og félagaréttur", tier: "keppni", note: "Granda fær húsnæðismálin." },
  { geiri: "Lögfræði", undirgeiri: "Leigusamningar og húsnæði", tier: "keppni" },
  { geiri: "Lögfræði", undirgeiri: "Vörumerki og hugverk", tier: "einn" },
  { geiri: "Vefur og tækni", undirgeiri: "Vefsíða í áskrift", tier: "keppni", note: "Klofið úr Vefsíðugerð." },
  { geiri: "Vefur og tækni", undirgeiri: "Vefsíðugerð og vefverslun", tier: "keppni", note: "Sex sækja um vefsíður. Tveir komast inn með skiptingu." },
  { geiri: "Vefur og tækni", undirgeiri: "Google- og Meta-auglýsingar", tier: "keppni", note: "Birta fær samfélagsmiðlana." },
  { geiri: "Vefur og tækni", undirgeiri: "Samfélagsmiðlar og efni", tier: "einn" },
  { geiri: "Vefur og tækni", undirgeiri: "Tölvurekstur og netöryggi", tier: "keppni" },
  { geiri: "Vefur og tækni", undirgeiri: "Net, sími og lén", tier: "einn" },
  { geiri: "Vefur og tækni", undirgeiri: "Símsvörun og fyrirtækjaskráning", tier: "einn" },
  { geiri: "Vefur og tækni", undirgeiri: "Tölvur og tæki", tier: "laus", note: "ELKO bíður." },
  { geiri: "Vefur og tækni", undirgeiri: "Gervigreind og hugbúnaðarþróun", tier: "laus", note: "Peritus sagði nei." },
  { geiri: "Ímynd og markaðsmál", undirgeiri: "Lógó og grafísk hönnun", tier: "keppni" },
  { geiri: "Ímynd og markaðsmál", undirgeiri: "Kynningarvörur", tier: "keppni", note: "Margt smátt fær vinnufatnaðinn." },
  { geiri: "Ímynd og markaðsmál", undirgeiri: "Vinnufatnaður og merktur fatnaður", tier: "keppni" },
  { geiri: "Ímynd og markaðsmál", undirgeiri: "Prentun: nafnspjöld og bæklingar", tier: "keppni", note: "Prentmet Oddi vill bara inn ef þau prenta bæklinginn." },
  { geiri: "Ímynd og markaðsmál", undirgeiri: "Fánar og bílamerkingar", tier: "keppni", note: "Klofið úr Skilti og merkingar." },
  { geiri: "Ímynd og markaðsmál", undirgeiri: "Ljósaskilti og gluggamerkingar", tier: "keppni" },
  { geiri: "Ímynd og markaðsmál", undirgeiri: "Útiauglýsingar", tier: "einn" },
  { geiri: "Ímynd og markaðsmál", undirgeiri: "Markaðsrannsóknir", tier: "einn" },
  { geiri: "Ímynd og markaðsmál", undirgeiri: "Ljósmyndun og myndbönd", tier: "laus" },
  { geiri: "Fólk og skrifstofa", undirgeiri: "Ræsting", tier: "einn" },
  { geiri: "Fólk og skrifstofa", undirgeiri: "Námskeið og símenntun", tier: "einn" },
  { geiri: "Fólk og skrifstofa", undirgeiri: "Mannauðsráðgjöf", tier: "einn" },
  { geiri: "Fólk og skrifstofa", undirgeiri: "Skrifstofuvörur og húsgögn", tier: "einn" },
  { geiri: "Fólk og skrifstofa", undirgeiri: "Kaffi og rekstrarvörur", tier: "einn" },
  { geiri: "Fólk og skrifstofa", undirgeiri: "Ráðningar", tier: "laus" },
  { geiri: "Fólk og skrifstofa", undirgeiri: "Skrifstofuhúsnæði og samvinnurými", tier: "laus" },
  { geiri: "Fólk og skrifstofa", undirgeiri: "Öryggiskerfi og vöktun", tier: "laus", note: "Securitas er merkt OFF í Svif." },
  { geiri: "Bílar og flutningar", undirgeiri: "Sendibílar og fyrirtækjabílar", tier: "einn", note: "Ísband vísaði á auglýsingastofuna Hér&Nú, 520 2700." },
  { geiri: "Bílar og flutningar", undirgeiri: "Bílaleiga og rekstrarleiga", tier: "laus", note: "Avis og Lykill svöruðu ekki." },
  { geiri: "Bílar og flutningar", undirgeiri: "Sendingar og flutningar", tier: "laus" },
  { geiri: "Þröngir flokkar", undirgeiri: "Hráefni fyrir veitingastaði", tier: "einn", note: "Passar bara þeim sem opna veitingastað eða verslun." },
  { geiri: "Þröngir flokkar", undirgeiri: "Greiðslur frá kínverskum ferðamönnum", tier: "einn" },
];

export const SVOR: SvifSvar[] = [
  { name: "Stólpi Viðskiptalausnir", web: "stolpi.is", person: "Guðmundur Ingi Hauksson", title: "framkvæmdastjóri", phone: "898 0030", alt: { name: "Skiptiborð", phone: "512 4400" }, email: "gih@stolpi.is", status: "ja", quote: "Já við höfum áhuga að skoða þetta. Vill ná til iðnaðar, verkstæða og lögmanna. Biður þig að hringja.", source: "tölvupóstur", date: "29.10.2026", geiri: "Fjármál og rekstur", undirgeiri: "Verkbókhald fyrir iðnað" },
  { name: "LOCAL lögmenn", web: "locallogmenn.is", person: "Áslaug Gunnlaugsdóttir", title: "lögmaður og eigandi", phone: "527 9700", phoneNote: "aðalnúmer", email: "aslaug@locallogmenn.is", status: "ja", quote: "Já takk, við hefðum áhuga á að fá fleiri upplýsingar.", source: "tölvupóstur", date: "30.10.2026", geiri: "Lögfræði", undirgeiri: "Almenn lögfræði og félagaréttur" },
  { name: "Fjölprent", web: "fjolprent.is", person: "Ragnar Másson", title: "framkvæmdastjóri", phone: "581 4141", phoneNote: "aðalnúmer", email: "ragnar@fjolprent.is", status: "ja", quote: "Hljómar spennandi og ég er alveg til í að skoða þetta. Sendu mér meiri upplýsingar.", source: "tölvupóstur", date: "30.10.2026", geiri: "Ímynd og markaðsmál", undirgeiri: "Fánar og bílamerkingar" },
  { name: "Bókhald.is", web: "bokhald.is", person: "Sæþór Orri Guðjónsson", title: "framkvæmdastjóri og eigandi", phoneNote: "ekkert númer á vef", email: "bokhald@bokhald.is", status: "ja", quote: "Skemmtilegt concept. Mátt senda mér meira um innihaldið og kostnaðinn.", source: "tölvupóstur", date: "2.11.2026", geiri: "Fjármál og rekstur", undirgeiri: "Stofnun fyrirtækis og skattframtal" },
  { name: "Payday", web: "payday.is", person: "Björn Hr. Björnsson", title: "forstjóri og stofnandi", phone: "551 5121", phoneNote: "aðalnúmer, opið 10–16", email: "bjorn@payday.is", status: "ja", quote: "Áhugavert, til í að heyra meira varðandi verð.", source: "tölvupóstur", date: "30.10.2026", geiri: "Fjármál og rekstur", undirgeiri: "Bókhaldskerfi" },
  { name: "Lögmenn Granda", web: "granda.is", person: "Marteinn Jónasson", title: "lögmaður og eigandi", phone: "626 9922", email: "marteinn@granda.is", status: "ja", quote: "Sendu mér hvað þetta kostar og eins væri gaman að sjá hvernig þetta mun líta út.", source: "tölvupóstur", date: "30.10.2026", geiri: "Lögfræði", undirgeiri: "Leigusamningar og húsnæði" },
  { name: "Vanda Legal", web: "vandalegal.is", person: "Dagný Fjóla Jóhannsdóttir", title: "lögmaður", phone: "865 6364", email: "dagny@vandalegal.is", status: "ja", quote: "Áhugasöm að heyra um verð og að fá að sjá svona bækling. Bendir á að SVIF ætti að skrá vörumerkið sitt.", source: "tölvupóstur", date: "2.11.2026", geiri: "Lögfræði", undirgeiri: "Vörumerki og hugverk" },
  { name: "Blek hönnunarstofa", web: "blekhonnun.is", person: "Dagný Reykjalín", title: "grafískur hönnuður og eigandi, Akureyri", phone: "615 1655", email: "dagny@blekhonnun.is", status: "ja", quote: "Mjög sniðugt. Hvað kostar auglýsingin (3 mánaða samningur) og geturðu sent sýnishorn? Bendir á að ný fyrirtæki borgi oft seint.", source: "tölvupóstur", date: "2.11.2026", geiri: "Ímynd og markaðsmál", undirgeiri: "Lógó og grafísk hönnun" },
  { name: "Creditinfo", web: "creditinfo.is", person: "Mist Edvardsdóttir", title: "forstöðumaður markaðs- og kynningarmála", phone: "550 9600", phoneNote: "aðalnúmer samstæðu", email: "mist.edvardsdottir@creditinfo.com", status: "ja", quote: "Skemmtilegt concept. Áttu dæmi um bækling sem þú hefur sent til fyrirtækja?", source: "tölvupóstur", date: "3.11.2026", geiri: "Fjármál og rekstur", undirgeiri: "Lánshæfi og fyrirtækjaupplýsingar" },
  { name: "Hringiðan", web: "hringidan.is", person: "Guðmundur Kr. Unnsteinsson", title: "framkvæmdastjóri", phone: "525 2400", phoneNote: "aðalnúmer", email: "gudmundur@hringidan.is", status: "ja", quote: "Áttu svona bækling til að senda mér í PDF til að sjá hvernig þetta lítur út?", source: "tölvupóstur", date: "2.11.2026", geiri: "Vefur og tækni", undirgeiri: "Net, sími og lén" },
  { name: "Afkoma vátryggingamiðlun", web: "afkoma.is", person: "Benisa Hoti", title: "þjónustufulltrúi", phone: "774 0867", alt: { name: "Sæmundur St. Magnússon, framkvæmdastjóri", phone: "621 9300" }, email: "benisa@afkoma.is", status: "ja", quote: "Þetta lítur mjög vel út, ætla að bera þetta undir framkvæmdastjórann og verð í bandi.", source: "tölvupóstur", date: "30.10.2026", geiri: "Fjármál og rekstur", undirgeiri: "Lífeyrir og séreign" },
  { name: "Prentmet Oddi", web: "prentmetoddi.is", person: "Guðmundur Ragnar Guðmundsson", title: "framkvæmdastjóri", phone: "856 0600", alt: { name: "Skiptiborð", phone: "5 600 601" }, email: "grg@prentmetoddi.is", status: "ja", quote: "Við erum áhugasöm að kynna okkar þjónustu í svona bækling ef bæklingurinn er prentaður hjá okkur.", source: "tölvupóstur", date: "29.10.2026", geiri: "Ímynd og markaðsmál", undirgeiri: "Prentun: nafnspjöld og bæklingar", warn: "Skilyrði um prentun. Rekst á Litlaprent." },
  { name: "Valit ráðgjöf", web: "valit.is", person: "Sverrir", phone: "860 0408", email: "sverrir@valit.is", status: "ja", quote: "Áhugi í síma.", source: "sími", date: "", geiri: "Vefur og tækni", undirgeiri: "Tölvurekstur og netöryggi" },
  { name: "Birta Media", web: "birtamedia.is", person: "Auður Elísabet Jóhannsdóttir", title: "hönnuður og vefstjóri", phone: "869 0937", alt: { name: "Elín Arnar", phone: "821 5568" }, email: "audur@birtamedia.is", status: "ja", quote: "Áhugi í síma. Eru í húseigendabæklingnum.", source: "sími", date: "", geiri: "Vefur og tækni", undirgeiri: "Samfélagsmiðlar og efni" },
  { name: "Kerfi fyrirtækjaþjónusta", aliases: ["Kerfi Fyrirtækjaþjónusta ehf", "Kerfi"], web: "kerfi.is", person: "Sigurður", phone: "860 7250", alt: { name: "Skiptiborð", phone: "564 1400" }, email: "kerfi@kerfi.is", status: "ja", quote: "Ætlaði að hringja til baka.", source: "sími", date: "", geiri: "Fólk og skrifstofa", undirgeiri: "Kaffi og rekstrarvörur" },
  { name: "VÍS", aliases: ["VÍS tryggingar hf.", "VÍS tryggingar", "Vís"], web: "vis.is", person: "Trausti Sigurður Hilmisson", phone: "560 5000", phoneNote: "aðalnúmer", email: "traustih@vis.is", status: "ja", quote: "Áhugi í síma. Eru í húseigendabæklingnum.", source: "sími", date: "", geiri: "Fjármál og rekstur", undirgeiri: "Tryggingar fyrirtækja" },
  { name: "Motus", aliases: ["Motus.", "Motus ehf."], web: "motus.is", person: "Eva Dögg Guðmundsdóttir", title: "markaðs- og samskiptastjóri", phone: "825 6174", email: "evadogg@motus.is", status: "ja", quote: "Áhugi í síma. Laufey, forstöðumaður innheimtumála, hafnaði í tölvupósti 30.10.", source: "sími", date: "", geiri: "Fjármál og rekstur", undirgeiri: "Innheimta", warn: "Tvö ólík svör frá Motus. Staðfesta við Evu Dögg." },
  { name: "ECIT Ísland", aliases: ["Ecit", "ECIT", "Virtus", "ECIT Virtus"], web: "ecit.com/is", person: "Þorkell Guðjónsson", title: "framkvæmdastjóri viðskiptaþróunar og sölu", phone: "824 3201", alt: { name: "Skiptiborð", phone: "419 7100" }, email: "thorkell.gudjons@ecit.is", status: "ja", quote: "Leist mjög vel á hugmyndina. Heyra í honum þegar nær dregur og senda tölvupóst.", source: "sími", date: "", geiri: "Fjármál og rekstur", undirgeiri: "Launavinnsla og úthýst bókhald" },
  { name: "A4", web: "a4.is", person: "Dagbjört Margrét Pálsdóttir", phone: "661 5138", email: "info@a4.is", status: "ja", quote: "Áhugi í síma. Vantar netfangið hennar, senda myndbandið.", source: "sími", date: "", geiri: "Fólk og skrifstofa", undirgeiri: "Skrifstofuvörur og húsgögn" },
  { name: "Konto", web: "konto.is", person: "Ari Kaprasíus Kristjánsson", title: "þjónustustjóri", phoneNote: "ekkert númer á vef, bara form", email: "info@konto.is", status: "ja", quote: "Hljómar spennandi og gæti hentað okkur vel. Spyr um verð, sýnishorn, hvernig viðtakendur eru valdir og hvort listinn sé borinn saman við bannskrá Þjóðskrár.", source: "tölvupóstur", date: "4.11.2026", geiri: "Fjármál og rekstur", undirgeiri: "Reikningagerð" },
  { name: "Regla", web: "regla.is", person: "Margrét", phone: "520 1200", email: "regla@regla.is", status: "ja", quote: "Þetta er áhugavert. Endilega leyfðu mér að heyra verðin sem þið eruð með í gangi.", source: "tölvupóstur", date: "4.11.2026", geiri: "Fjármál og rekstur", undirgeiri: "Kassakerfi og verslun" },
  { name: "Netbókhald.is", web: "netbokhald.is", person: "Elvar Níelsson", title: "framkvæmdastjóri", phone: "533 2090", email: "netbokhald@netbokhald.is", status: "ja", quote: "Ég er jákvæður. Spyr um verð, hvort kennitölulistinn sé frá Creditinfo, og vill geta rakið hvaðan nýir viðskiptavinir koma.", source: "tölvupóstur", date: "3.11.2026", geiri: "Fjármál og rekstur", undirgeiri: "Bókhaldskerfi", warn: "Skarast beint við Payday." },
  { name: "Datatech / Vefapp", web: "vefapp.is", person: "Andri Steinn Jóhannsson", title: "stofnandi og eigandi", phone: "571 9300", phoneNote: "aðalnúmer", email: "vefapp@datatech.is", status: "ja", quote: "Sniðugt, var með nákvæmlega þessa hugmynd. En hvað kostar að vera með?", source: "tölvupóstur", date: "4.11.2026", geiri: "Vefur og tækni", undirgeiri: "Vefsíðugerð og vefverslun" },
  { name: "Gonora", web: "gonora.is", person: "Sara Kristín", phoneNote: "ekkert númer á vef", email: "hallo@gonora.is", status: "ja", quote: "Við höfum áhuga á að skoða þetta nánar. Er þetta einungis prentaður bæklingur eða fer þetta líka stafrænt? Hvernig er verðskráin?", source: "tölvupóstur", date: "4.11.2026", geiri: "Vefur og tækni", undirgeiri: "Vefsíða í áskrift" },
  { name: "Vefsíðuhönnun (Vefhýsing ehf.)", web: "vefsiduhonnun.is", person: "Ekkert nafn", title: "Reyðarfirði", phone: "588 1228", email: "info@vefsiduhonnun.is", status: "ja", quote: "Mátt senda okkur nánari upplýsingar.", source: "tölvupóstur", date: "4.11.2026", geiri: "Vefur og tækni", undirgeiri: "Vefsíðugerð og vefverslun", warn: "Fellur út vegna skörunar við Gonora og Allra Átta." },
  { name: "Vefmundur (Filmís)", web: "vefmundur.is", person: "Aron Bjarnason", phone: "537 1717", email: "veistuhvar@veistuhvar.is", status: "ja", quote: "Þetta gæti átt vel við Vefmundur.is frekar en Veistu hvar. Gætirðu sent mér verð og skilmála?", source: "tölvupóstur", date: "4.11.2026", geiri: "Vefur og tækni", undirgeiri: "Vefsíðugerð og vefverslun", warn: "Vefsíðan vefmundur.is svaraði ekki. Fellur út vegna skörunar." },
  { name: "Pikk", web: "pikk.is", person: "Birkir Guðsteinsson", title: "stofnandi", phone: "449 8888", email: "info@pikk.is", status: "ja", quote: "Þetta er áhugavert. Þú ert væntanlega að selja mér dálk í bæklingnum. Hvað myndi það kosta?", source: "tölvupóstur", date: "4.11.2026", geiri: "Vefur og tækni", undirgeiri: "Google- og Meta-auglýsingar" },
  { name: "SB Skiltagerð", web: "sbskilti.is", person: "Ekkert nafn", title: "Þorlákshöfn", phone: "483 1955", email: "sbskilti@sbskilti.is", status: "ja", quote: "Þetta hljómar áhugavert. Hvernig virkar þetta, hvaða möguleikar eru í boði og hver er kostnaðurinn?", source: "tölvupóstur", date: "3.11.2026", geiri: "Ímynd og markaðsmál", undirgeiri: "Fánar og bílamerkingar", warn: "Fellur út vegna skörunar við Fjölprent og LXB." },
  { name: "Motif auglýsingavörur", web: "motif.is", person: "Guðrún Anna Magnúsdóttir", title: "eigandi, rekur líka Grafika auglýsingastofu", phone: "896 1896", email: "motif@motif.is", status: "ja", quote: "Svolítið hugsi: ný fyrirtæki eiga lítinn pening. Sendi samt tilboðspakka (lógó, heimasíða, nafnspjöld með 30% afslætti) og spyr hvað kostar að vera með.", source: "tölvupóstur", date: "3.11.2026", geiri: "Ímynd og markaðsmál", undirgeiri: "Kynningarvörur" },
  { name: "Dokkan", web: "dokkan.is", person: "Herdís Pála Pálsdóttir", title: "eigandi og framkvæmdastjóri", phone: "860 0203", email: "herdispala@dokkan.is", status: "ja", quote: "Gæti alveg verið áhugavert. Er krafa um afslátt? Í hvaða flokki sérðu Dokkuna? Á annað fyrirtæki sem gæti líka hentað.", source: "tölvupóstur", date: "3.11.2026", geiri: "Fólk og skrifstofa", undirgeiri: "Námskeið og símenntun" },
  { name: "Margt smátt", web: "margtsmatt.is", person: "Árni Esra Einarsson", title: "framkvæmdastjóri, sér um þetta", phone: "893 8634", alt: { name: "Hrafnhildur (Habba) Heimisdóttir, markaðsfulltrúi", phone: "895 3502" }, email: "arni@margtsmatt.is", status: "ja", quote: "Við höfum áhuga á að skoða þetta hjá ykkur. Habba bætti Árna Esra á þráðinn.", source: "tölvupóstur", date: "5.11.2026", geiri: "Ímynd og markaðsmál", undirgeiri: "Vinnufatnaður og merktur fatnaður" },
  { name: "AÞ-Þrif", web: "ath-thrif.is", person: "Arnar Þorsteinsson", title: "forstjóri", phone: "517 2215", phoneNote: "aðalnúmer", alt: { name: "Bjarki Þorsteinsson, sölustjóri", phone: "821 7741" }, email: "arnar@ath-thrif.is", status: "ja", quote: "Við erum til í kynningu hjá þér. Hvernig hljómar fimmtudagurinn 12. nóv. kl. 9? Skeiðarás 12, Garðabæ.", source: "tölvupóstur", date: "5.11.2026", geiri: "Fólk og skrifstofa", undirgeiri: "Ræsting" },
  { name: "LXB skiltagerð", web: "lxb.is", person: "Eiríkur Hilmarsson", title: "eigandi", phone: "420 0541", alt: { name: "Skiptiborð", phone: "420 0540" }, email: "eirikur@lxb.is", status: "ja", quote: "Sniðugt concept, klárlega til í að skoða nánar. Er hægt að skoða bæklinginn sem var gefinn út í síðasta mánuði?", source: "tölvupóstur", date: "4.11.2026", geiri: "Ímynd og markaðsmál", undirgeiri: "Ljósaskilti og gluggamerkingar" },
  { name: "Veffirma", web: "veffirma.is", person: "Patrick Puelmanns", title: "vefforritari og stofnandi, svarar á ensku", phone: "888 5851", email: "patrick@veffirma.is", status: "ja", quote: "Yes, I'm interested. Býður skipti: pláss í bæklingnum gegn yfirferð og lagfæringu á svif.is. Spyr um verð og árangur húseigendabæklingsins.", source: "tölvupóstur", date: "4.11.2026", geiri: "Vefur og tækni", undirgeiri: "Vefsíðugerð og vefverslun", warn: "Eins manns stofa. Vill skipti í stað greiðslu." },
  { name: "Allra Átta", web: "8.is", person: "Jón Trausti Snorrason", title: "framkvæmdastjóri, Hafnarfirði", phone: "588 8885", alt: { name: "Neyðarsími", phone: "821 3790" }, email: "trausti@8.is", status: "ja", quote: "Hljómar ágætlega. Hvað kostar að vera skráður þarna hjá ykkur?", source: "tölvupóstur", date: "4.11.2026", geiri: "Vefur og tækni", undirgeiri: "Vefsíðugerð og vefverslun" },
  { name: "DG Legal", web: "dglegal.is", person: "Davíð Guðmundsson", title: "héraðsdómslögmaður", phone: "860 3990", email: "david@dglegal.is", status: "ja", quote: "Ágætis hugmynd en þetta fer algerlega eftir ykkar verðhugmyndum. Getur þú gefið mér min/max per mánuð?", source: "tölvupóstur", date: "4.11.2026", geiri: "Lögfræði", undirgeiri: "Almenn lögfræði og félagaréttur", warn: "Einyrki, engin þjónustulýsing á vef." },
  { name: "1819", web: "1819.is", person: "Victor Pálmarsson", title: "framkvæmdastjóri", phone: "546 1819", email: "victor@1819.is", status: "spurning", quote: "Hvernig hugsarðu þér okkar innkomu? Samstarf við að nálgast fyrirtækin, eða að vera í bæklingnum? Ef það síðara þarf ég birtingarkostnað.", source: "tölvupóstur", date: "4.11.2026", geiri: "Vefur og tækni", undirgeiri: "Símsvörun og fyrirtækjaskráning" },
  { name: "Vörar auglýsingastofa", web: "vorar.is", person: "Hrönn Óskarsdóttir", title: "framkvæmdastjóri", phone: "694 4666", alt: { name: "Skiptiborð", phone: "571 2244" }, email: "hronn@vorar.is", status: "spurning", quote: "Ertu að bjóða okkur að vera með auglýsingu í bæklingnum eða ertu að leita eftir aðstoð við markaðssetningu á honum?", source: "tölvupóstur", date: "4.11.2026", geiri: "Ímynd og markaðsmál", undirgeiri: "Lógó og grafísk hönnun" },
  { name: "Umslag", web: "umslag.is", person: "Stefán Steinsen", title: "framkvæmdastjóri", phone: "823 3325", alt: { name: "Skiptiborð", phone: "533 5252" }, email: "steinsen@umslag.is", status: "spurning", quote: "Ertu að leitast eftir prentun á þessum bæklingi eða hvort við séum eitt af þeim fyrirtækjum sem bjóða þjónustu til nýrra fyrirtækja?", source: "tölvupóstur", date: "3.11.2026", geiri: "Ímynd og markaðsmál", undirgeiri: "Prentun: nafnspjöld og bæklingar" },
  { name: "Billboard", web: "billboard.is", person: "Aron Bjarki Jósepsson", title: "sölustjóri", phone: "867 5706", email: "aron.josepsson@billboard.is", status: "spurning", quote: "Hljómar flott verkefni. Hver væri okkar aðkoma að þessu verkefni?", source: "tölvupóstur", date: "4.11.2026", geiri: "Ímynd og markaðsmál", undirgeiri: "Útiauglýsingar" },
  { name: "Hugarheimur", web: "hugarheimur.is", person: "Ragnheiður Guðfinna Guðnadóttir", title: "eigandi, vinnusálfræðingur", phone: "897 0787", alt: { name: "Skiptiborð", phone: "562 7770" }, email: "ragnheidur@hugarheimur.is", status: "spurning", quote: "Fer yfir þegar ég hef tök á. Mjög margt sem ég gæti nýtt mér þarna.", source: "tölvupóstur", date: "4.11.2026", geiri: "Fólk og skrifstofa", undirgeiri: "Mannauðsráðgjöf", warn: "Heldur kannski að bæklingurinn sé ætlaður henni." },
  { name: "Inkasso", web: "inkasso.is", person: "Jóhann Valberg Árnason", title: "sölustjóri", phone: "520 4040", phoneNote: "aðalnúmer", email: "johann.arnason@inkasso.is", status: "bidur", quote: "Þjónustuver: „Ég kem þessu áleiðis á réttan aðila.“", source: "tölvupóstur", date: "2.11.2026", geiri: "Fjármál og rekstur", undirgeiri: "Innheimta" },
  { name: "ELKO", web: "elko.is", person: "Fyrirtækjaþjónusta", phone: "544 4000", email: "b2b@elko.is", status: "bidur", quote: "Þjónustuver: „Búin að áframsenda póstinn á viðeigandi deild, haft verður samband ef áhugi er fyrir hendi.“", source: "tölvupóstur", date: "3.11.2026", geiri: "Vefur og tækni", undirgeiri: "Tölvur og tæki" },
  { name: "Logoflex", web: "logoflex.is", person: "Garðar Jónsson", title: "sala og ráðgjöf", phone: "414 1908", alt: { name: "Ingi Guðmundsson, framkvæmdastjóri", phone: "898 5242" }, email: "logoflex@logoflex.is", status: "bidur", quote: "Sjálfvirkt svar: lofa svari innan sólarhrings.", source: "tölvupóstur", date: "3.11.2026", geiri: "Ímynd og markaðsmál", undirgeiri: "Ljósaskilti og gluggamerkingar" },
  { name: "Central Pay", web: "centralpay.is", person: "Söludeild", phone: "556 3600", email: "sala@centralpay.is", status: "bidur", quote: "Sjálfvirkt svar.", source: "tölvupóstur", date: "2.11.2026", geiri: "Þröngir flokkar", undirgeiri: "Greiðslur frá kínverskum ferðamönnum" },
  { name: "Prósent", web: "prosent.is", person: "Trausti Heiðar Haraldsson", title: "framkvæmdastjóri", phone: "859 9130", alt: { name: "Bryndís Marteinsdóttir, greiningar", phone: "864 8212" }, email: "trausti@prosent.is", status: "bidur", quote: "Bryndís bætti Eddu Sólveigu og Trausta við þráðinn, þau skoða þetta.", source: "tölvupóstur", date: "4.11.2026", geiri: "Ímynd og markaðsmál", undirgeiri: "Markaðsrannsóknir" },
  { name: "MS Mjólkursamsalan", web: "ms.is", person: "Halldóra Arnardóttir", title: "markaðs- og vöruflokkastjóri", phone: "663 6311", alt: { name: "Skiptiborð", phone: "450 1180" }, email: "halldoraa@ms.is", status: "bidur", quote: "Hlekkurinn virkaði ekki. Þú vísaðir henni á svif.is.", source: "tölvupóstur", date: "4.11.2026", geiri: "Þröngir flokkar", undirgeiri: "Hráefni fyrir veitingastaði" },
  { name: "Litróf", web: "litrof.is", person: "Ólafur Stolzenwald", title: "sölu- og markaðsmál", phone: "897 2166", alt: { name: "Skiptiborð", phone: "563 6007" }, email: "olistolz@litrof.is", status: "bidur", quote: "Kíkir á þetta, bauð um leið prentun á bæklingnum.", source: "tölvupóstur", date: "4.11.2026", geiri: "Ímynd og markaðsmál", undirgeiri: "Prentun: nafnspjöld og bæklingar" },
  { name: "Ísband", web: "isband.is", person: "Sigurður Kr. Björnsson", email: "siggikr@isband.is", status: "nei", quote: "Auglýsingastofan Hér&Nú sér um auglýsingar og birtingar fyrir okkur. Hafðu samband við þá: 520 2700, hn@hn.is.", source: "tölvupóstur", date: "4.11.2026", geiri: "Bílar og flutningar", undirgeiri: "Sendibílar og fyrirtækjabílar", warn: "Þess virði að elta í gegnum Hér&Nú. Bílar eru laus flokkur." },
  { name: "Peritus", web: "peritus.is", person: "Lárus Hjartarson", title: "ráðgjafi og stofnandi", email: "larus@peritus.is", status: "nei", quote: "Nei takk. Ábendingar: senda frá netfangi á svif.is, sýna heimavinnu, birta kennitölu og heimilisfang á vefnum, bæta við persónuverndarstefnu og skilmálum, birta verð og árangur.", source: "tölvupóstur", date: "3.11.2026", geiri: "Vefur og tækni", undirgeiri: "Gervigreind og hugbúnaðarþróun" },
  { name: "AviLabs", web: "avilabs.is", person: "Marteinn Áki Ellertsson", email: "marteinn@avilabs.is", status: "nei", quote: "Töff framtak, en sér fáa snertipunkta. Þjónusta fyrst og fremst flugfélög.", source: "tölvupóstur", date: "30.10.2026", geiri: "Vefur og tækni", undirgeiri: "Gervigreind og hugbúnaðarþróun" },
  { name: "DLF lögfræðiráðgjöf", web: "dlf.is", person: "Einar Örn Davíðsson", email: "einarorn@dlf.is", status: "nei", quote: "Frábær hugmynd. Sér ekki þörf fyrir sig en framsendir póstinn á aðra.", source: "tölvupóstur", date: "30.10.2026", geiri: "Lögfræði", undirgeiri: "Almenn lögfræði og félagaréttur" },
  { name: "Lögborg", web: "logborg.is", person: "Guðjón Ármann Jónsson", title: "hrl.", email: "gudjon@logborg.is", status: "nei", quote: "„Var ég að stofna fyrirtæki??“ Misskildi póstinn.", source: "tölvupóstur", date: "30.10.2026", geiri: "Lögfræði", undirgeiri: "Almenn lögfræði og félagaréttur" },
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

/**
 * Fyllir inn í fyrirtæki sem er þegar til: geira, undirgeira, svarið, vef og tengiliði.
 * Það sem er þegar skráð heldur sér; aðeins tóm svæði eru fyllt.
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
  return {
    ...c,
    owner: c.owner?.trim() ? c.owner : seed.owner,
    websiteUrl: c.websiteUrl || seed.websiteUrl,
    phone: c.phone || seed.phone,
    email: c.email || seed.email,
    industry: c.industry || seed.industry,
    // Undirgeiri sem er ekki á flokkakortinu (t.d. „Tryggingar“) víkur fyrir rétta plássinu.
    category: flokkurFor(c.category) ? c.category : seed.category,
    pitch: c.pitch || seed.pitch,
    lastCallOutcome: c.lastCallOutcome || seed.lastCallOutcome,
    rejected: c.rejected || seed.rejected,
    contacts: [...(c.contacts || []), ...newContacts],
    notes: notesHasSvar ? c.notes || "" : [c.notes || "", seed.notes].filter(Boolean).join("\n"),
  };
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
    pitch: s.quote,
    rejected: s.status === "nei",
    rejectedAt: s.status === "nei" ? new Date().toISOString() : undefined,
    lastCallOutcome: OUTCOME_BY_STATUS[s.status],
    registeredInSvif: false,
    estimatedPrice: 0,
    contacts,
    checklist: [],
    notes: notesLines.join("\n"),
    personalityDescription: "",
    previewSent: false,
    projectedEarnings: 0,
    monthlyPaymentActive: false,
  };
}

export function flokkurFor(undirgeiri?: string): Flokkur | undefined {
  if (!undirgeiri) return undefined;
  const key = normName(undirgeiri);
  return FLOKKAR.find((f) => normName(f.undirgeiri) === key);
}
