/**
 * Tölvupósturinn í myndbandaherferðinni (nóv. 2026): frítt 10 sekúndna 2D/3D myndband.
 *
 * Sami póstur fer til allra. Það eina sem breytist er nafn fyrirtækisins, sem stendur
 * sem frumlag í nefnifalli („teljum að {nafn} gæti hentað“) svo það þurfi aldrei að fallbeygja.
 * Þessi skrá er notuð bæði þegar pósturinn er sendur og á síðunni „Myndbönd“ í CRM,
 * svo þar sést nákvæmlega hvað hvert fyrirtæki fékk.
 */

export const MYNDBOND_SLOD = "nordurvefur.is/myndbond";

export interface PostInntak {
  name: string;
}

export function efnislina(_c?: Pick<PostInntak, "name">) {
  return "Frítt 10 sekúndna myndband";
}

export function postur(c: PostInntak) {
  return [
    "Hæhæ,",
    "",
    "Helgi Már heiti ég og á fyrirtækið Norðurvefur.",
    "",
    `Við höfum verið að skoða nokkur fyrirtæki vel og teljum að fyrirtækið ${c.name} gæti hentað mjög vel fyrir nýja markaðsleið sem hefur sýnt sig að auka umferð inn á vefsíður um 55%.`,
    "",
    "Undanfarið höfum við verið að gera auglýsingamyndbönd í 2D og 3D fyrir fyrirtæki, þar sem hugmyndin, varan eða þjónustan er sýnd á myndrænan og skemmtilegan hátt. Við getum til dæmis gert vörurnar ykkar að þrívíddarlíkani, útskýrt þjónustuna, sýnt hvað gerir ykkur betri en aðra eða kynnt tilboð.",
    "",
    "Til að sýna ykkur gæðin langar okkur að gera fyrir ykkur 10 sekúndna myndband, ykkur að kostnaðarlausu og án allra skuldbindinga.",
    "",
    `Hér má sjá nokkur myndbönd sem við höfum gert: ${MYNDBOND_SLOD}`,
    "",
    "Við höfum lagt mikla vinnu í að skilja hvað heldur athygli fólks í dag, þegar flett er hratt, og byggjum hvert myndband þannig að fólk horfi alla leið.",
    "",
    "Ef þetta er eitthvað fyrir ykkur væri gaman að heyra hvort þið hafið ákveðna hugmynd að myndbandinu, hvort þið viljið frekar 2D eða 3D, eða hvort við megum bara vera skapandi og sýna ykkur hvað við getum.",
    "",
    "Það væri frábært að fá stutt svar, hvort sem það er já eða nei. Ef þetta er ekki eitthvað fyrir ykkur er það auðvitað ekkert mál, þá vitum við það og höfum ekki frekar samband vegna þessa.",
    "",
    "Bestu kveðjur,",
    "Helgi Már Þorvaldsson",
    "Norðurvefur",
    "853 5147",
    "nordurvefur.is",
  ].join("\n");
}
