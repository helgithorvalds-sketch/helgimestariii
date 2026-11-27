// Heimaey's 1973 townsfolk (pure data, no three.js): the islanders who fled on the boats and the men who fought the
// lava with seawater, in pollagallar (yellow oilskins), sjóhattar, lopapeysur and gúmmístígvél.
import { Outfit, SKINS } from "../../shared/look/toon";

/** the hose men: oilskins (yellow / orange), sou'westers or beanies, rubber boots */
export const EYJAMADUR: Outfit[] = [
  { jacket: "#f2c230", pants: "#e0ad22", boots: "#2b2d36", hat: "sowester", cap: "#f2c230", noButtons: true, skin: SKINS[1], moustache: "#5a3b2a" },
  { jacket: "#e8742c", pants: "#2f3a4a", boots: "#2b2d36", hat: "beanie", cap: "#2f4470", hatBand: "#22325a", noButtons: true, skin: SKINS[0] },
  { jacket: "#f2c230", pants: "#e0ad22", boots: "#2b2d36", hat: "sowester", cap: "#f2c230", noButtons: true, skin: SKINS[2], build: "stout" },
  { jacket: "#8a8f99", lopi: ["#f4efe3", "#3a3f4a"], pants: "#2f3a4a", boots: "#2b2d36", hat: "beanie", cap: "#7a2e2a", noButtons: true, skin: SKINS[1] },
];

/** islanders fleeing at night: coats over whatever they slept in, húfur, a few lopapeysur */
export const FLOTTAFOLK: Outfit[] = [
  { jacket: "#3f6fb5", anorak: true, noButtons: true, pants: "#3b3f52", boots: "#2f3a4a", hat: "beanie", cap: "#c8402f", hatBand: "#f4efe3", skin: SKINS[0] },
  { jacket: "#8c3b4a", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#5a3b2a", skin: SKINS[1] },
  { jacket: "#bdb4a4", lopi: ["#f4efe3", "#5a4636"], noButtons: true, pants: "#3b3f52", boots: "#2f3a4a", hat: "beanie", cap: "#2f4470", skin: SKINS[2] },
  { jacket: "#5d7a3a", anorak: true, noButtons: true, pants: "#4a3f35", boots: "#2b2d36", hat: "hair", hair: "#d8b25a", braids: "#d8b25a", skin: SKINS[0], build: "teen" },
  { jacket: "#e0a83a", pants: "#3b3f52", boots: "#4a3426", hat: "sowester", cap: "#f2c230", noButtons: true, skin: SKINS[3], moustache: "#2a201a" },
  { jacket: "#2f5f6a", pants: "#3b3f52", boots: "#4a3426", hat: "bun", hair: "#cfcac2", glasses: "#4a3a30", skin: SKINS[1], build: "stout" },
];
