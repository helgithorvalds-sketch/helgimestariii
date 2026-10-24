import { LegalPage, type LegalSection } from '../components/LegalPage';
import { usePageTitle } from '../components/usePageTitle';

const SECTIONS: LegalSection[] = [
  {
    id: 'abyrgdaradili',
    title: 'Hver ber ábyrgð',
    body: [
      'Norðurvefur („VILD“, „við“) er ábyrgðaraðili vinnslu persónuupplýsinga í VILD-appinu og á VILD-vefnum. Samstarfskeðjurnar eru sjálfstæðir ábyrgðaraðilar fyrir kaupin sjálf og kvittanir sínar; VILD er vinnsluaðili fyrir þær að því leyti sem við höldum utan um inneign þeirra.',
      'Spurningar og beiðnir um persónuupplýsingar: hallo@vild.is. Þú getur líka kvartað til Persónuverndar, personuvernd.is.',
    ],
  },
  {
    id: 'hvada-upplysingar',
    title: 'Hvaða upplýsingar við söfnum',
    body: [
      'Auðkenning: Þegar þú stofnar aðgang með rafrænum skilríkjum fáum við nafn og kennitölu frá auðkenningarþjónustunni. Kennitalan er notuð einu sinni, til að staðfesta hver þú ert, tryggja að hver manneskja eigi einn aðgang og staðfesta aldur. Hún er geymd dulkóðuð í lokaðri töflu og er aldrei birt starfsfólki keðja, prentuð á kvittanir eða send kassakerfum. Aðgangurinn þinn er auðkenndur með innra númeri alls staðar annars staðar.',
      'Samskipti: Símanúmer (fyrir innskráningu og staðfestingarkóða) og netfang ef þú skráir það. Fornafn eins og þú vilt að það birtist í appinu.',
      'Kaupasaga hjá samstarfskeðjum: Dagsetning, staður, vörur, upphæð, veitt og nýtt inneign. Þetta kemur frá kassakerfi keðjunnar þegar þú sýnir VILD-kortið. Við fáum ekki upplýsingar um kaup þín annars staðar, ekki kortanúmer og ekki bankaupplýsingar.',
      'Tæknilegar upplýsingar: Tegund tækis, útgáfa apps, tungumál og villuskýrslur svo appið virki. Staðsetningu notum við aðeins ef þú leyfir það í símanum, til að sýna næsta stað; hún er ekki geymd.',
    ],
  },
  {
    id: 'til-hvers',
    title: 'Til hvers við notum þær',
    body: [
      'Til að reka þjónustuna: stofna og auðkenna aðgang, reikna og geyma inneign, sýna þér yfirlit og kvittanir, og láta þig vita þegar inneign kemur inn eða rennur út. Lagagrundvöllur er samningurinn við þig (skilmálar VILD).',
      'Til að gera upp við keðjur: hver keðja fær uppgjör um veitta, nýtta og útrunna inneign, sundurliðað á staði og vörur, en ekki á einstaklinga nema að því marki sem þarf til að staðfesta einstaka færslu.',
      'Til að bæta þjónustuna: samanlagðar tölur um notkun, til dæmis hversu margir komu aftur. Þær eru ekki rekjanlegar til þín.',
      'Markaðsskilaboð sendum við aðeins með samþykki þínu, sem þú getur dregið til baka undir Stillingar. Tilkynningar um inneign sem þú átt eru hluti af þjónustunni, ekki markaðsefni.',
    ],
  },
  {
    id: 'hverjir-sja',
    title: 'Hverjir sjá upplýsingarnar',
    body: [
      'Samstarfskeðjan sem þú verslar hjá sér fornafn, innra númer og kaupin sem fóru fram hjá henni. Hún sér ekki kennitölu, netfang, símanúmer eða kaup hjá öðrum.',
      'Vinnsluaðilar sem við notum til að reka kerfið: hýsing og gagnagrunnur innan EES, auðkenningarþjónusta fyrir rafræn skilríki, SMS-þjónusta fyrir staðfestingarkóða og tilkynningaþjónusta símans. Við gerum vinnslusamning við hvern þeirra.',
      'Við seljum ekki persónuupplýsingar og afhendum þær ekki þriðja aðila nema lög krefjist þess.',
    ],
  },
  {
    id: 'hversu-lengi',
    title: 'Hversu lengi við geymum þær',
    body: [
      'Aðgangsupplýsingar og inneign: meðan aðgangurinn er virkur. Kaupasaga: í 24 mánuði eftir að inneign vegna kaupanna er nýtt eða runnin út, svo þú getir séð hvaðan hún kom og keðjan gert upp. Bókhaldsgögn sem lög krefjast: í sjö ár, án tengingar við aðganginn þinn.',
      'Þegar þú eyðir aðganginum eyðum við eða afauðkennum persónuupplýsingar innan 30 daga. Kennitölunni er eytt strax.',
    ],
  },
  {
    id: 'rettindi',
    title: 'Réttindi þín',
    body: [
      'Þú getur séð allar upplýsingar sem við geymum um þig undir Ég í appinu og sótt afrit af þeim. Þar getur þú líka leiðrétt nafn og netfang, slökkt á tilkynningum og markaðsskilaboðum, og eytt aðganginum.',
      'Þú átt rétt á að fá upplýsingum eytt, vinnslu takmarkaða eða mótmæla henni, og að fá gögnin þín afhent á tölvutæku formi. Sendu beiðni á hallo@vild.is; við svörum innan mánaðar.',
    ],
  },
  {
    id: 'oryggi',
    title: 'Öryggi',
    body: [
      'Gögn eru dulkóðuð í flutningi og í hvíld. Aðgangur starfsfólks er takmarkaður við það sem þarf og allar uppflettingar eru skráðar. Kóðinn sem kassinn skannar er stuttlífur og inniheldur ekki persónuupplýsingar.',
      'Verði öryggisbrestur sem getur haft áhrif á þig látum við þig og Persónuvernd vita án tafar.',
    ],
  },
  {
    id: 'breytingar',
    title: 'Breytingar',
    body: ['Breytingar á stefnunni tilkynnum við í appinu. Dagsetning síðustu útgáfu stendur efst á þessari síðu.'],
  },
];

export default function PrivacyPage() {
  usePageTitle('Persónuvernd – VILD');
  return (
    <LegalPage
      eyebrow="Persónuvernd"
      title="Persónuvernd hjá VILD"
      updated="23. október 2026"
      intro="Hvaða upplýsingar við söfnum, til hvers, hverjir sjá þær og hversu lengi þær eru geymdar. Kennitalan er notuð einu sinni og fer aldrei á kassann. Nöfn vinnsluaðila bætast við fyrir útgáfu."
      sections={SECTIONS}
    />
  );
}
