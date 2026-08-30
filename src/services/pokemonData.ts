// Comprehensive Pokémon Yellow (Gen 1) Reference Data:
// Species dictionary, Type effectiveness engine, Route encounters, and Gym Leader guides.

export type PokemonType =
  | 'Normal'
  | 'Feu'
  | 'Eau'
  | 'Plante'
  | 'Électrik'
  | 'Glace'
  | 'Combat'
  | 'Poison'
  | 'Sol'
  | 'Vol'
  | 'Psy'
  | 'Insecte'
  | 'Roche'
  | 'Spectre'
  | 'Dragon';

export interface PokemonInfo {
  id: number; // National Dex ID
  internalId: number; // Gen 1 RAM internal index
  name: string; // French name
  nameEn: string;
  type1: PokemonType;
  type2?: PokemonType;
}

// Gen 1 Type Byte Mapping (From RAM addresses 0xD019/0xD01A and 0xCFEA/0xCFEB)
export const RAM_TYPE_MAP: Record<number, PokemonType> = {
  0x00: 'Normal',
  0x01: 'Combat',
  0x02: 'Vol',
  0x03: 'Poison',
  0x04: 'Sol',
  0x05: 'Roche',
  0x07: 'Insecte',
  0x08: 'Spectre',
  0x14: 'Feu',
  0x15: 'Eau',
  0x16: 'Plante',
  0x17: 'Électrik',
  0x18: 'Psy',
  0x19: 'Glace',
  0x1A: 'Dragon',
};

// Gen 1 Internal Index to Pokémon Species Data (Complete Gen 1 Index mapping)
export const GEN1_INTERNAL_POKEMON: Record<number, PokemonInfo> = {
  0x01: { id: 112, internalId: 0x01, name: 'Rhinoféros', nameEn: 'Rhydon', type1: 'Sol', type2: 'Roche' },
  0x02: { id: 115, internalId: 0x02, name: 'Kangourex', nameEn: 'Kangaskhan', type1: 'Normal' },
  0x03: { id: 32, internalId: 0x03, name: 'Nidoran♂', nameEn: 'Nidoran M', type1: 'Poison' },
  0x04: { id: 35, internalId: 0x04, name: 'Mélofée', nameEn: 'Clefairy', type1: 'Normal' },
  0x05: { id: 21, internalId: 0x05, name: 'Piafabec', nameEn: 'Spearow', type1: 'Normal', type2: 'Vol' },
  0x06: { id: 100, internalId: 0x06, name: 'Voltorbe', nameEn: 'Voltorb', type1: 'Électrik' },
  0x07: { id: 34, internalId: 0x07, name: 'Nidoking', nameEn: 'Nidoking', type1: 'Poison', type2: 'Sol' },
  0x08: { id: 80, internalId: 0x08, name: 'Flagadoss', nameEn: 'Slowbro', type1: 'Eau', type2: 'Psy' },
  0x09: { id: 2, internalId: 0x09, name: 'Herbizarre', nameEn: 'Ivysaur', type1: 'Plante', type2: 'Poison' },
  0x0A: { id: 103, internalId: 0x0A, name: 'Noadkoko', nameEn: 'Exeggutor', type1: 'Plante', type2: 'Psy' },
  0x0B: { id: 108, internalId: 0x0B, name: 'Excelangue', nameEn: 'Lickitung', type1: 'Normal' },
  0x0C: { id: 102, internalId: 0x0C, name: 'Noeunoeuf', nameEn: 'Exeggcute', type1: 'Plante', type2: 'Psy' },
  0x0D: { id: 88, internalId: 0x0D, name: 'Tadmorv', nameEn: 'Grimer', type1: 'Poison' },
  0x0E: { id: 94, internalId: 0x0E, name: 'Ectoplasma', nameEn: 'Gengar', type1: 'Spectre', type2: 'Poison' },
  0x0F: { id: 29, internalId: 0x0F, name: 'Nidoran♀', nameEn: 'Nidoran F', type1: 'Poison' },
  0x10: { id: 31, internalId: 0x10, name: 'Nidoqueen', nameEn: 'Nidoqueen', type1: 'Poison', type2: 'Sol' },
  0x11: { id: 104, internalId: 0x11, name: 'Osselait', nameEn: 'Cubone', type1: 'Sol' },
  0x12: { id: 111, internalId: 0x12, name: 'Rhinocorne', nameEn: 'Rhyhorn', type1: 'Sol', type2: 'Roche' },
  0x13: { id: 131, internalId: 0x13, name: 'Lokhlass', nameEn: 'Lapras', type1: 'Eau', type2: 'Glace' },
  0x14: { id: 59, internalId: 0x14, name: 'Arcanin', nameEn: 'Arcanine', type1: 'Feu' },
  0x15: { id: 151, internalId: 0x15, name: 'Mew', nameEn: 'Mew', type1: 'Psy' },
  0x16: { id: 130, internalId: 0x16, name: 'Léviator', nameEn: 'Gyarados', type1: 'Eau', type2: 'Vol' },
  0x17: { id: 90, internalId: 0x17, name: 'Kokiyas', nameEn: 'Shellder', type1: 'Eau' },
  0x18: { id: 72, internalId: 0x18, name: 'Tentacool', nameEn: 'Tentacool', type1: 'Eau', type2: 'Poison' },
  0x19: { id: 92, internalId: 0x19, name: 'Fantominus', nameEn: 'Gastly', type1: 'Spectre', type2: 'Poison' },
  0x1A: { id: 123, internalId: 0x1A, name: 'Insécateur', nameEn: 'Scyther', type1: 'Insecte', type2: 'Vol' },
  0x1B: { id: 120, internalId: 0x1B, name: 'Stari', nameEn: 'Staryu', type1: 'Eau' },
  0x1C: { id: 9, internalId: 0x1C, name: 'Tortank', nameEn: 'Blastoise', type1: 'Eau' },
  0x1D: { id: 127, internalId: 0x1D, name: 'Scarabrute', nameEn: 'Pinsir', type1: 'Insecte' },
  0x1E: { id: 114, internalId: 0x1E, name: 'Saquedeneu', nameEn: 'Tangela', type1: 'Plante' },
  0x21: { id: 58, internalId: 0x21, name: 'Caninos', nameEn: 'Growlithe', type1: 'Feu' },
  0x22: { id: 95, internalId: 0x22, name: 'Onix', nameEn: 'Onix', type1: 'Roche', type2: 'Sol' },
  0x23: { id: 22, internalId: 0x23, name: 'Rapasdepic', nameEn: 'Fearow', type1: 'Normal', type2: 'Vol' },
  0x24: { id: 16, internalId: 0x24, name: 'Roucool', nameEn: 'Pidgey', type1: 'Normal', type2: 'Vol' },
  0x25: { id: 79, internalId: 0x25, name: 'Ramoloss', nameEn: 'Slowpoke', type1: 'Eau', type2: 'Psy' },
  0x26: { id: 64, internalId: 0x26, name: 'Kadabra', nameEn: 'Kadabra', type1: 'Psy' },
  0x27: { id: 75, internalId: 0x27, name: 'Gravalanch', nameEn: 'Graveler', type1: 'Roche', type2: 'Sol' },
  0x28: { id: 113, internalId: 0x28, name: 'Leveinard', nameEn: 'Chansey', type1: 'Normal' },
  0x29: { id: 67, internalId: 0x29, name: 'Machopeur', nameEn: 'Machoke', type1: 'Combat' },
  0x2A: { id: 122, internalId: 0x2A, name: 'M. Mime', nameEn: 'Mr. Mime', type1: 'Psy' },
  0x2B: { id: 106, internalId: 0x2B, name: 'Kicklee', nameEn: 'Hitmonlee', type1: 'Combat' },
  0x2C: { id: 107, internalId: 0x2C, name: 'Tygnon', nameEn: 'Hitmonchan', type1: 'Combat' },
  0x2D: { id: 24, internalId: 0x2D, name: 'Arbok', nameEn: 'Arbok', type1: 'Poison' },
  0x2E: { id: 47, internalId: 0x2E, name: 'Parasect', nameEn: 'Parasect', type1: 'Insecte', type2: 'Plante' },
  0x2F: { id: 54, internalId: 0x2F, name: 'Psykokwak', nameEn: 'Psyduck', type1: 'Eau' },
  0x30: { id: 96, internalId: 0x30, name: 'Soporifik', nameEn: 'Drowzee', type1: 'Psy' },
  0x31: { id: 76, internalId: 0x31, name: 'Grolem', nameEn: 'Golem', type1: 'Roche', type2: 'Sol' },
  0x33: { id: 126, internalId: 0x33, name: 'Magmar', nameEn: 'Magmar', type1: 'Feu' },
  0x35: { id: 125, internalId: 0x35, name: 'Élektek', nameEn: 'Electabuzz', type1: 'Électrik' },
  0x36: { id: 82, internalId: 0x36, name: 'Magnéton', nameEn: 'Magneton', type1: 'Électrik' },
  0x37: { id: 109, internalId: 0x37, name: 'Smogo', nameEn: 'Koffing', type1: 'Poison' },
  0x39: { id: 56, internalId: 0x39, name: 'Férosinge', nameEn: 'Mankey', type1: 'Combat' },
  0x3A: { id: 86, internalId: 0x3A, name: 'Otaria', nameEn: 'Seel', type1: 'Eau' },
  0x3B: { id: 50, internalId: 0x3B, name: 'Taupiqueur', nameEn: 'Diglett', type1: 'Sol' },
  0x3C: { id: 128, internalId: 0x3C, name: 'Tauros', nameEn: 'Tauros', type1: 'Normal' },
  0x40: { id: 83, internalId: 0x40, name: 'Canarticho', nameEn: 'Farfetch\'d', type1: 'Normal', type2: 'Vol' },
  0x41: { id: 48, internalId: 0x41, name: 'Mimitoss', nameEn: 'Venonat', type1: 'Insecte', type2: 'Poison' },
  0x42: { id: 149, internalId: 0x42, name: 'Dracolosse', nameEn: 'Dragonite', type1: 'Dragon', type2: 'Vol' },
  0x46: { id: 84, internalId: 0x46, name: 'Doduo', nameEn: 'Doduo', type1: 'Normal', type2: 'Vol' },
  0x47: { id: 60, internalId: 0x47, name: 'Ptitard', nameEn: 'Poliwag', type1: 'Eau' },
  0x48: { id: 124, internalId: 0x48, name: 'Lippoutou', nameEn: 'Jynx', type1: 'Glace', type2: 'Psy' },
  0x49: { id: 146, internalId: 0x49, name: 'Sulfura', nameEn: 'Moltres', type1: 'Feu', type2: 'Vol' },
  0x4A: { id: 144, internalId: 0x4A, name: 'Artikodin', nameEn: 'Articuno', type1: 'Glace', type2: 'Vol' },
  0x4B: { id: 145, internalId: 0x4B, name: 'Électhor', nameEn: 'Zapdos', type1: 'Électrik', type2: 'Vol' },
  0x4C: { id: 132, internalId: 0x4C, name: 'Métamorph', nameEn: 'Ditto', type1: 'Normal' },
  0x4D: { id: 52, internalId: 0x4D, name: 'Miaouss', nameEn: 'Meowth', type1: 'Normal' },
  0x4E: { id: 98, internalId: 0x4E, name: 'Krabby', nameEn: 'Krabby', type1: 'Eau' },
  0x52: { id: 37, internalId: 0x52, name: 'Goupix', nameEn: 'Vulpix', type1: 'Feu' },
  0x53: { id: 38, internalId: 0x53, name: 'Feunard', nameEn: 'Ninetales', type1: 'Feu' },
  0x54: { id: 25, internalId: 0x54, name: 'Pikachu', nameEn: 'Pikachu', type1: 'Électrik' },
  0x55: { id: 26, internalId: 0x55, name: 'Raichu', nameEn: 'Raichu', type1: 'Électrik' },
  0x58: { id: 147, internalId: 0x58, name: 'Minidraco', nameEn: 'Dratini', type1: 'Dragon' },
  0x59: { id: 148, internalId: 0x59, name: 'Draco', nameEn: 'Dragonair', type1: 'Dragon' },
  0x5A: { id: 140, internalId: 0x5A, name: 'Kabuto', nameEn: 'Kabuto', type1: 'Roche', type2: 'Eau' },
  0x5B: { id: 141, internalId: 0x5B, name: 'Kabutops', nameEn: 'Kabutops', type1: 'Roche', type2: 'Eau' },
  0x5C: { id: 116, internalId: 0x5C, name: 'Hypotrempe', nameEn: 'Horsea', type1: 'Eau' },
  0x5D: { id: 117, internalId: 0x5D, name: 'Hypocéan', nameEn: 'Seadra', type1: 'Eau' },
  0x60: { id: 27, internalId: 0x60, name: 'Sabelette', nameEn: 'Sandshrew', type1: 'Sol' },
  0x61: { id: 28, internalId: 0x61, name: 'Sablaireau', nameEn: 'Sandslash', type1: 'Sol' },
  0x62: { id: 138, internalId: 0x62, name: 'Amonita', nameEn: 'Omanyte', type1: 'Roche', type2: 'Eau' },
  0x63: { id: 139, internalId: 0x63, name: 'Amonistar', nameEn: 'Omastar', type1: 'Roche', type2: 'Eau' },
  0x64: { id: 39, internalId: 0x64, name: 'Rondoudou', nameEn: 'Jigglypuff', type1: 'Normal' },
  0x65: { id: 40, internalId: 0x65, name: 'Grodoudou', nameEn: 'Wigglytuff', type1: 'Normal' },
  0x66: { id: 133, internalId: 0x66, name: 'Évoli', nameEn: 'Eevee', type1: 'Normal' },
  0x67: { id: 136, internalId: 0x67, name: 'Pyroli', nameEn: 'Flareon', type1: 'Feu' },
  0x68: { id: 135, internalId: 0x68, name: 'Voltali', nameEn: 'Jolteon', type1: 'Électrik' },
  0x69: { id: 134, internalId: 0x69, name: 'Aquali', nameEn: 'Vaporeon', type1: 'Eau' },
  0x6A: { id: 66, internalId: 0x6A, name: 'Machoc', nameEn: 'Machop', type1: 'Combat' },
  0x6B: { id: 41, internalId: 0x6B, name: 'Nosferapti', nameEn: 'Zubat', type1: 'Poison', type2: 'Vol' },
  0x6C: { id: 23, internalId: 0x6C, name: 'Abo', nameEn: 'Ekans', type1: 'Poison' },
  0x6D: { id: 46, internalId: 0x6D, name: 'Paras', nameEn: 'Paras', type1: 'Insecte', type2: 'Plante' },
  0x6E: { id: 61, internalId: 0x6E, name: 'Têtarte', nameEn: 'Poliwhirl', type1: 'Eau' },
  0x6F: { id: 62, internalId: 0x6F, name: 'Tartard', nameEn: 'Poliwrath', type1: 'Eau', type2: 'Combat' },
  0x70: { id: 13, internalId: 0x70, name: 'Aspicot', nameEn: 'Weedle', type1: 'Insecte', type2: 'Poison' },
  0x71: { id: 14, internalId: 0x71, name: 'Coconfort', nameEn: 'Kakuna', type1: 'Insecte', type2: 'Poison' },
  0x72: { id: 15, internalId: 0x72, name: 'Dardargnan', nameEn: 'Beedrill', type1: 'Insecte', type2: 'Poison' },
  0x74: { id: 85, internalId: 0x74, name: 'Dodrio', nameEn: 'Dodrio', type1: 'Normal', type2: 'Vol' },
  0x75: { id: 57, internalId: 0x75, name: 'Colossinge', nameEn: 'Primeape', type1: 'Combat' },
  0x76: { id: 51, internalId: 0x76, name: 'Triopikeur', nameEn: 'Dugtrio', type1: 'Sol' },
  0x77: { id: 49, internalId: 0x77, name: 'Aéromite', nameEn: 'Venomoth', type1: 'Insecte', type2: 'Poison' },
  0x78: { id: 87, internalId: 0x78, name: 'Lamantine', nameEn: 'Dewgong', type1: 'Eau', type2: 'Glace' },
  0x7B: { id: 10, internalId: 0x7B, name: 'Chenipan', nameEn: 'Caterpie', type1: 'Insecte' },
  0x7C: { id: 11, internalId: 0x7C, name: 'Chrysacier', nameEn: 'Metapod', type1: 'Insecte' },
  0x7D: { id: 12, internalId: 0x7D, name: 'Papilusion', nameEn: 'Butterfree', type1: 'Insecte', type2: 'Vol' },
  0x7E: { id: 68, internalId: 0x7E, name: 'Mackogneur', nameEn: 'Machamp', type1: 'Combat' },
  0x80: { id: 55, internalId: 0x80, name: 'Akwakwak', nameEn: 'Golduck', type1: 'Eau' },
  0x81: { id: 97, internalId: 0x81, name: 'Hypnomade', nameEn: 'Hypno', type1: 'Psy' },
  0x82: { id: 42, internalId: 0x82, name: 'Nosferalto', nameEn: 'Golbat', type1: 'Poison', type2: 'Vol' },
  0x83: { id: 150, internalId: 0x83, name: 'Mewtwo', nameEn: 'Mewtwo', type1: 'Psy' },
  0x84: { id: 143, internalId: 0x84, name: 'Ronflex', nameEn: 'Snorlax', type1: 'Normal' },
  0x85: { id: 129, internalId: 0x85, name: 'Magicarpe', nameEn: 'Magikarp', type1: 'Eau' },
  0x88: { id: 89, internalId: 0x88, name: 'Grotadmorv', nameEn: 'Muk', type1: 'Poison' },
  0x8A: { id: 99, internalId: 0x8A, name: 'Krabboss', nameEn: 'Kingler', type1: 'Eau' },
  0x8B: { id: 91, internalId: 0x8B, name: 'Crustabri', nameEn: 'Cloyster', type1: 'Eau', type2: 'Glace' },
  0x8D: { id: 101, internalId: 0x8D, name: 'Électrode', nameEn: 'Electrode', type1: 'Électrik' },
  0x8E: { id: 36, internalId: 0x8E, name: 'Mélodelfe', nameEn: 'Clefable', type1: 'Normal' },
  0x8F: { id: 110, internalId: 0x8F, name: 'Smogogo', nameEn: 'Weezing', type1: 'Poison' },
  0x90: { id: 53, internalId: 0x90, name: 'Persian', nameEn: 'Persian', type1: 'Normal' },
  0x91: { id: 105, internalId: 0x91, name: 'Ossatueur', nameEn: 'Marowak', type1: 'Sol' },
  0x93: { id: 93, internalId: 0x93, name: 'Spectrum', nameEn: 'Haunter', type1: 'Spectre', type2: 'Poison' },
  0x94: { id: 63, internalId: 0x94, name: 'Abra', nameEn: 'Abra', type1: 'Psy' },
  0x95: { id: 65, internalId: 0x95, name: 'Alakazam', nameEn: 'Alakazam', type1: 'Psy' },
  0x96: { id: 17, internalId: 0x96, name: 'Roucoups', nameEn: 'Pidgeotto', type1: 'Normal', type2: 'Vol' },
  0x97: { id: 18, internalId: 0x97, name: 'Roucarnage', nameEn: 'Pidgeot', type1: 'Normal', type2: 'Vol' },
  0x98: { id: 121, internalId: 0x98, name: 'Staross', nameEn: 'Starmie', type1: 'Eau', type2: 'Psy' },
  0x99: { id: 1, internalId: 0x99, name: 'Bulbizarre', nameEn: 'Bulbasaur', type1: 'Plante', type2: 'Poison' },
  0x9A: { id: 3, internalId: 0x9A, name: 'Florizarre', nameEn: 'Venusaur', type1: 'Plante', type2: 'Poison' },
  0x9B: { id: 73, internalId: 0x9B, name: 'Tentacruel', nameEn: 'Tentacruel', type1: 'Eau', type2: 'Poison' },
  0x9D: { id: 118, internalId: 0x9D, name: 'Poissirène', nameEn: 'Goldeen', type1: 'Eau' },
  0x9E: { id: 119, internalId: 0x9E, name: 'Poissoroy', nameEn: 'Seaking', type1: 'Eau' },
  0xA3: { id: 77, internalId: 0xA3, name: 'Ponyta', nameEn: 'Ponyta', type1: 'Feu' },
  0xA4: { id: 78, internalId: 0xA4, name: 'Galopa', nameEn: 'Rapidash', type1: 'Feu' },
  0xA5: { id: 19, internalId: 0xA5, name: 'Rattata', nameEn: 'Rattata', type1: 'Normal' },
  0xA6: { id: 20, internalId: 0xA6, name: 'Rattatac', nameEn: 'Raticate', type1: 'Normal' },
  0xA7: { id: 33, internalId: 0xA7, name: 'Nidorino', nameEn: 'Nidorino', type1: 'Poison' },
  0xA8: { id: 30, internalId: 0xA8, name: 'Nidorina', nameEn: 'Nidorina', type1: 'Poison' },
  0xA9: { id: 74, internalId: 0xA9, name: 'Racaillou', nameEn: 'Geodude', type1: 'Roche', type2: 'Sol' },
  0xAA: { id: 137, internalId: 0xAA, name: 'Porygon', nameEn: 'Porygon', type1: 'Normal' },
  0xAB: { id: 142, internalId: 0xAB, name: 'Ptéra', nameEn: 'Aerodactyl', type1: 'Roche', type2: 'Vol' },
  0xAD: { id: 81, internalId: 0xAD, name: 'Magnéti', nameEn: 'Magnemite', type1: 'Électrik' },
  0xB0: { id: 4, internalId: 0xB0, name: 'Salamèche', nameEn: 'Charmander', type1: 'Feu' },
  0xB1: { id: 7, internalId: 0xB1, name: 'Carapuce', nameEn: 'Squirtle', type1: 'Eau' },
  0xB2: { id: 5, internalId: 0xB2, name: 'Reptincel', nameEn: 'Charmeleon', type1: 'Feu' },
  0xB3: { id: 8, internalId: 0xB3, name: 'Carabaffe', nameEn: 'Wartortle', type1: 'Eau' },
  0xB4: { id: 6, internalId: 0xB4, name: 'Dracaufeu', nameEn: 'Charizard', type1: 'Feu', type2: 'Vol' },
  0xB9: { id: 43, internalId: 0xB9, name: 'Mystherbe', nameEn: 'Oddish', type1: 'Plante', type2: 'Poison' },
  0xBA: { id: 44, internalId: 0xBA, name: 'Ortide', nameEn: 'Gloom', type1: 'Plante', type2: 'Poison' },
  0xBB: { id: 45, internalId: 0xBB, name: 'Rafflesia', nameEn: 'Vileplume', type1: 'Plante', type2: 'Poison' },
  0xBC: { id: 69, internalId: 0xBC, name: 'Chétiflor', nameEn: 'Bellsprout', type1: 'Plante', type2: 'Poison' },
  0xBD: { id: 70, internalId: 0xBD, name: 'Boustiflor', nameEn: 'Weepinbell', type1: 'Plante', type2: 'Poison' },
  0xBE: { id: 71, internalId: 0xBE, name: 'Empiflor', nameEn: 'Victreebel', type1: 'Plante', type2: 'Poison' },
};

// Gen 1 Type Effectiveness Chart (Multipliers: 2 = Super effective, 0.5 = Not very effective, 0 = Immune)
export const GEN1_TYPE_CHART: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
  Normal: {
    Roche: 0.5,
    Spectre: 0,
  },
  Feu: {
    Feu: 0.5,
    Eau: 0.5,
    Plante: 2,
    Glace: 2,
    Insecte: 2,
    Roche: 0.5,
    Dragon: 0.5,
  },
  Eau: {
    Feu: 2,
    Eau: 0.5,
    Plante: 0.5,
    Sol: 2,
    Roche: 2,
    Dragon: 0.5,
  },
  Plante: {
    Feu: 0.5,
    Eau: 2,
    Plante: 0.5,
    Poison: 0.5,
    Sol: 2,
    Vol: 0.5,
    Insecte: 0.5,
    Roche: 2,
    Dragon: 0.5,
  },
  Électrik: {
    Eau: 2,
    Plante: 0.5,
    Électrik: 0.5,
    Sol: 0,
    Vol: 2,
    Dragon: 0.5,
  },
  Glace: {
    Eau: 0.5,
    Plante: 2,
    Glace: 0.5,
    Sol: 2,
    Vol: 2,
    Dragon: 2,
  },
  Combat: {
    Normal: 2,
    Glace: 2,
    Poison: 0.5,
    Vol: 0.5,
    Psy: 0.5,
    Insecte: 0.5,
    Roche: 2,
    Spectre: 0,
  },
  Poison: {
    Plante: 2,
    Poison: 0.5,
    Sol: 0.5,
    Roche: 0.5,
    Spectre: 0.5,
    Insecte: 2, // In Gen 1, Poison is 2x against Bug
  },
  Sol: {
    Feu: 2,
    Électrik: 2,
    Plante: 0.5,
    Poison: 2,
    Vol: 0,
    Insecte: 0.5,
    Roche: 2,
  },
  Vol: {
    Électrik: 0.5,
    Plante: 2,
    Combat: 2,
    Insecte: 2,
    Roche: 0.5,
  },
  Psy: {
    Combat: 2,
    Poison: 2,
    Psy: 0.5,
    Spectre: 1, // In Gen 1, Psychic was immune or neutral to Ghost due to bug
  },
  Insecte: {
    Feu: 0.5,
    Plante: 2,
    Combat: 0.5,
    Poison: 2, // In Gen 1, Bug is 2x against Poison
    Vol: 0.5,
    Psy: 2,
    Spectre: 0.5,
  },
  Roche: {
    Feu: 2,
    Glace: 2,
    Combat: 0.5,
    Sol: 0.5,
    Vol: 2,
    Insecte: 2,
  },
  Spectre: {
    Normal: 0,
    Psy: 0, // In Gen 1, Ghost does 0x against Psychic due to programming bug
    Spectre: 2,
  },
  Dragon: {
    Dragon: 2,
  },
};

export const ALL_TYPES: PokemonType[] = [
  'Normal', 'Feu', 'Eau', 'Plante', 'Électrik', 'Glace', 'Combat',
  'Poison', 'Sol', 'Vol', 'Psy', 'Insecte', 'Roche', 'Spectre', 'Dragon'
];

/**
 * Calculates defensive effectiveness multiplier when defender is hit by an attack of type attackType.
 */
export function getDefenseMultiplier(
  attackType: PokemonType,
  defType1: PokemonType,
  defType2?: PokemonType
): number {
  const mult1 = GEN1_TYPE_CHART[attackType]?.[defType1] ?? 1.0;
  const mult2 = defType2 ? (GEN1_TYPE_CHART[attackType]?.[defType2] ?? 1.0) : 1.0;
  return mult1 * mult2;
}

export interface TypeMatchupReport {
  weaknesses: { type: PokemonType; multiplier: number }[]; // 2x or 4x damage taken
  resistances: { type: PokemonType; multiplier: number }[]; // 0.5x or 0.25x damage taken
  immunities: PokemonType[]; // 0x damage taken
}

export function getDefenderMatchupReport(type1: PokemonType, type2?: PokemonType): TypeMatchupReport {
  const weaknesses: { type: PokemonType; multiplier: number }[] = [];
  const resistances: { type: PokemonType; multiplier: number }[] = [];
  const immunities: PokemonType[] = [];

  for (const atkType of ALL_TYPES) {
    const mult = getDefenseMultiplier(atkType, type1, type2);
    if (mult === 0) {
      immunities.push(atkType);
    } else if (mult > 1) {
      weaknesses.push({ type: atkType, multiplier: mult });
    } else if (mult < 1) {
      resistances.push({ type: atkType, multiplier: mult });
    }
  }

  return {
    weaknesses: weaknesses.sort((a, b) => b.multiplier - a.multiplier),
    resistances: resistances.sort((a, b) => a.multiplier - b.multiplier),
    immunities,
  };
}

// Type color and styling utility
export const TYPE_COLORS: Record<PokemonType, { bg: string; text: string; border: string; badge: string }> = {
  Normal: { bg: 'bg-zinc-500/20', text: 'text-zinc-300', border: 'border-zinc-500/40', badge: 'bg-zinc-500' },
  Feu: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40', badge: 'bg-orange-500' },
  Eau: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40', badge: 'bg-blue-500' },
  Plante: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40', badge: 'bg-emerald-500' },
  Électrik: { bg: 'bg-yellow-400/20', text: 'text-yellow-300', border: 'border-yellow-400/40', badge: 'bg-yellow-500' },
  Glace: { bg: 'bg-cyan-400/20', text: 'text-cyan-300', border: 'border-cyan-400/40', badge: 'bg-cyan-500' },
  Combat: { bg: 'bg-red-600/20', text: 'text-red-300', border: 'border-red-600/40', badge: 'bg-red-600' },
  Poison: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40', badge: 'bg-purple-500' },
  Sol: { bg: 'bg-amber-600/20', text: 'text-amber-300', border: 'border-amber-600/40', badge: 'bg-amber-600' },
  Vol: { bg: 'bg-indigo-400/20', text: 'text-indigo-300', border: 'border-indigo-400/40', badge: 'bg-indigo-500' },
  Psy: { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/40', badge: 'bg-pink-500' },
  Insecte: { bg: 'bg-lime-500/20', text: 'text-lime-300', border: 'border-lime-500/40', badge: 'bg-lime-500' },
  Roche: { bg: 'bg-stone-500/20', text: 'text-stone-300', border: 'border-stone-500/40', badge: 'bg-stone-500' },
  Spectre: { bg: 'bg-violet-600/20', text: 'text-violet-300', border: 'border-violet-600/40', badge: 'bg-violet-600' },
  Dragon: { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-500/40', badge: 'bg-teal-600' },
};

// ============================================================================
// GYM LEADERS & BOSSES DATABASE
// ============================================================================

export interface GymLeaderInfo {
  cityMapId: number;
  cityName: string;
  leaderName: string;
  badgeName: string;
  badgeEffect: string;
  primaryType: PokemonType;
  team: { name: string; level: number; types: PokemonType[] }[];
  weaknesses: PokemonType[];
  tactics: string;
}

export const GYM_LEADERS: Record<number, GymLeaderInfo> = {
  // Argenta (0x02) - Brock
  0x02: {
    cityMapId: 0x02,
    cityName: 'Argenta (Pewter City)',
    leaderName: 'Pierre (Brock)',
    badgeName: 'Badge Roche',
    badgeEffect: 'Attaque boostée + Autorise Flash hors combat',
    primaryType: 'Roche',
    team: [
      { name: 'Racaillou', level: 10, types: ['Roche', 'Sol'] },
      { name: 'Onix', level: 12, types: ['Roche', 'Sol'] },
    ],
    weaknesses: ['Eau', 'Plante', 'Combat', 'Sol'],
    tactics: 'Pikachu est inefficace contre son équipe ! Utilisez Férosinge (Balayage), Nidoran♂/♀ (Double Pied au niv. 12) ou Papilusion (Choc Mental).',
  },
  // Azuria (0x03) - Misty
  0x03: {
    cityMapId: 0x03,
    cityName: 'Azuria (Cerulean City)',
    leaderName: 'Ondine (Misty)',
    badgeName: 'Badge Cascade',
    badgeEffect: 'Pokémon obéissent jusqu\'au niv. 30 + Autorise Coupe',
    primaryType: 'Eau',
    team: [
      { name: 'Stari', level: 18, types: ['Eau'] },
      { name: 'Staross', level: 21, types: ['Eau', 'Psy'] },
    ],
    weaknesses: ['Électrik', 'Plante', 'Insecte'],
    tactics: 'Staross frappe fort et vite avec Bulles d\'O. Pikachu avec Éclair et Bulbizarre avec Fouet Lianes sont idéaux.',
  },
  // Carmin sur Mer (0x05) - Lt. Surge
  0x05: {
    cityMapId: 0x05,
    cityName: 'Carmin sur Mer (Vermilion City)',
    leaderName: 'Major Bob (Lt. Surge)',
    badgeName: 'Badge Foudre',
    badgeEffect: 'Vitesse boostée + Autorise Vol hors combat',
    primaryType: 'Électrik',
    team: [
      { name: 'Raichu', level: 28, types: ['Électrik'] },
    ],
    weaknesses: ['Sol'],
    tactics: 'Capturez un Taupiqueur ou un Triopikeur dans la Cave Taupiqueur toute proche : il est totalement immunisé à ses attaques électriques.',
  },
  // Céladopole (0x06) - Erika
  0x06: {
    cityMapId: 0x06,
    cityName: 'Céladopole (Celadon City)',
    leaderName: 'Érika',
    badgeName: 'Badge Prisme',
    badgeEffect: 'Pokémon obéissent jusqu\'au niv. 50 + Autorise Force',
    primaryType: 'Plante',
    team: [
      { name: 'Empiflor', level: 32, types: ['Plante', 'Poison'] },
      { name: 'Saquedeneu', level: 30, types: ['Plante'] },
      { name: 'Rafflesia', level: 32, types: ['Plante', 'Poison'] },
    ],
    weaknesses: ['Feu', 'Vol', 'Glace', 'Psy'],
    tactics: 'Privilégiez les types Vol (Roucoups, Rapasdepic), Feu (Salamèche/Dracaufeu, Goupix) ou Psy (Kadabra). Attention aux altérations de statut (Poudre Dodo/Para).',
  },
  // Parmanie (0x07) - Koga
  0x07: {
    cityMapId: 0x07,
    cityName: 'Parmanie (Fuchsia City)',
    leaderName: 'Koga',
    badgeName: 'Badge Âme',
    badgeEffect: 'Défense boostée + Autorise Surf hors combat',
    primaryType: 'Poison',
    team: [
      { name: 'Mimitoss', level: 44, types: ['Insecte', 'Poison'] },
      { name: 'Mimitoss', level: 46, types: ['Insecte', 'Poison'] },
      { name: 'Mimitoss', level: 48, types: ['Insecte', 'Poison'] },
      { name: 'Aéromite', level: 50, types: ['Insecte', 'Poison'] },
    ],
    weaknesses: ['Psy', 'Feu', 'Vol', 'Roche'],
    tactics: 'Alakazam ou Hypnomade balaient son équipe en un éclair grâce aux attaques Psy. Les Pokémon Feu et Vol sont également très efficaces.',
  },
  // Safrania (0x0A) - Sabrina
  0x0A: {
    cityMapId: 0x0A,
    cityName: 'Safrania (Saffron City)',
    leaderName: 'Morgane (Sabrina)',
    badgeName: 'Badge Marais',
    badgeEffect: 'Pokémon obéissent jusqu\'au niv. 70',
    primaryType: 'Psy',
    team: [
      { name: 'Abra', level: 50, types: ['Psy'] },
      { name: 'Kadabra', level: 50, types: ['Psy'] },
      { name: 'Alakazam', level: 50, types: ['Psy'] },
    ],
    weaknesses: ['Insecte', 'Normal'],
    tactics: 'Le type Psy est surpuissant en 1ère génération, mais sa défense physique est très faible ! Utilisez des attaques physiques brutes (Plaquage de Ronflex, Séisme de Triopikeur).',
  },
  // Cramois'Île (0x08) - Blaine
  0x08: {
    cityMapId: 0x08,
    cityName: 'Cramois\'Île (Cinnabar Island)',
    leaderName: 'Auguste (Blaine)',
    badgeName: 'Badge Volcan',
    badgeEffect: 'Spécial boosté',
    primaryType: 'Feu',
    team: [
      { name: 'Feunard', level: 48, types: ['Feu'] },
      { name: 'Galopa', level: 50, types: ['Feu'] },
      { name: 'Arcanin', level: 54, types: ['Feu'] },
    ],
    weaknesses: ['Eau', 'Sol', 'Roche'],
    tactics: 'Le type Eau (Surf/Hydrocanon de Tortank, Aquali, Léviator) ou Sol (Séisme) détruit totalement son équipe.',
  },
  // Jadielle (0x01) - Giovanni
  0x01: {
    cityMapId: 0x01,
    cityName: 'Jadielle (Viridian City)',
    leaderName: 'Giovanni',
    badgeName: 'Badge Terre',
    badgeEffect: 'Tous les Pokémon obéissent sans limite',
    primaryType: 'Sol',
    team: [
      { name: 'Triopikeur', level: 50, types: ['Sol'] },
      { name: 'Persian', level: 53, types: ['Normal'] },
      { name: 'Nidoqueen', level: 53, types: ['Poison', 'Sol'] },
      { name: 'Nidoking', level: 55, types: ['Poison', 'Sol'] },
      { name: 'Rhinoféros', level: 55, types: ['Sol', 'Roche'] },
    ],
    weaknesses: ['Eau', 'Plante', 'Glace', 'Combat'],
    tactics: 'Les attaques Eau (Surf) et Glace (Laser Glace) touchent tous ses Pokémon en faiblesse x2 ou x4 (Rhinoféros).',
  },
};

// ============================================================================
// WILD POKÉMON ENCOUNTERS DATABASE (Pokémon Jaune / Yellow)
// ============================================================================

export interface WildEncounter {
  name: string;
  levels: string;
  chance: number; // percentage %
  types: PokemonType[];
}

export const WILD_ENCOUNTERS_BY_MAP: Record<number, WildEncounter[]> = {
  // Route 1 (0x0C)
  0x0C: [
    { name: 'Roucool', levels: 'Niv. 3-5', chance: 70, types: ['Normal', 'Vol'] },
    { name: 'Rattata', levels: 'Niv. 2-4', chance: 30, types: ['Normal'] },
  ],
  // Route 2 (0x0D)
  0x0D: [
    { name: 'Roucool', levels: 'Niv. 3-7', chance: 45, types: ['Normal', 'Vol'] },
    { name: 'Rattata', levels: 'Niv. 2-5', chance: 35, types: ['Normal'] },
    { name: 'Nidoran♀', levels: 'Niv. 4-6', chance: 10, types: ['Poison'] },
    { name: 'Nidoran♂', levels: 'Niv. 4-6', chance: 10, types: ['Poison'] },
  ],
  // Forêt de Jade (0x33)
  0x33: [
    { name: 'Chenipan', levels: 'Niv. 3-6', chance: 35, types: ['Insecte'] },
    { name: 'Chrysacier', levels: 'Niv. 4-8', chance: 20, types: ['Insecte'] },
    { name: 'Roucool', levels: 'Niv. 3-7', chance: 20, types: ['Normal', 'Vol'] },
    { name: 'Roucoups', levels: 'Niv. 9', chance: 10, types: ['Normal', 'Vol'] },
    { name: 'Pikachu', levels: 'Niv. 3-5', chance: 10, types: ['Électrik'] },
    { name: 'Papilusion', levels: 'Niv. 9', chance: 5, types: ['Insecte', 'Vol'] },
  ],
  // Route 3 (0x0E)
  0x0E: [
    { name: 'Piafabec', levels: 'Niv. 8-12', chance: 45, types: ['Normal', 'Vol'] },
    { name: 'Rattata', levels: 'Niv. 9-11', chance: 25, types: ['Normal'] },
    { name: 'Férosinge', levels: 'Niv. 8-10', chance: 15, types: ['Combat'] },
    { name: 'Rondoudou', levels: 'Niv. 9-12', chance: 10, types: ['Normal'] },
    { name: 'Sabelette', levels: 'Niv. 8-10', chance: 5, types: ['Sol'] },
  ],
  // Route 4 (0x0F)
  0x0F: [
    { name: 'Piafabec', levels: 'Niv. 8-12', chance: 40, types: ['Normal', 'Vol'] },
    { name: 'Rattata', levels: 'Niv. 8-12', chance: 30, types: ['Normal'] },
    { name: 'Férosinge', levels: 'Niv. 10-12', chance: 20, types: ['Combat'] },
    { name: 'Sabelette', levels: 'Niv. 8-12', chance: 10, types: ['Sol'] },
  ],
  // Mont Sélénite 1 (0x3B)
  0x3B: [
    { name: 'Nosferapti', levels: 'Niv. 7-11', chance: 55, types: ['Poison', 'Vol'] },
    { name: 'Racaillou', levels: 'Niv. 7-11', chance: 30, types: ['Roche', 'Sol'] },
    { name: 'Paras', levels: 'Niv. 8', chance: 10, types: ['Insecte', 'Plante'] },
    { name: 'Mélofée', levels: 'Niv. 8-13', chance: 5, types: ['Normal'] },
  ],
  // Route 24 (0x24) - Pont Pépite
  0x24: [
    { name: 'Chétiflor', levels: 'Niv. 12-14', chance: 35, types: ['Plante', 'Poison'] },
    { name: 'Roucool', levels: 'Niv. 11-13', chance: 25, types: ['Normal', 'Vol'] },
    { name: 'Roucoups', levels: 'Niv. 13', chance: 15, types: ['Normal', 'Vol'] },
    { name: 'Abra', levels: 'Niv. 8-12', chance: 15, types: ['Psy'] },
    { name: 'Sabelette', levels: 'Niv. 12', chance: 10, types: ['Sol'] },
  ],
  // Route 25 (0x25) - Maison Léo
  0x25: [
    { name: 'Chétiflor', levels: 'Niv. 12-14', chance: 35, types: ['Plante', 'Poison'] },
    { name: 'Roucool', levels: 'Niv. 12-14', chance: 25, types: ['Normal', 'Vol'] },
    { name: 'Abra', levels: 'Niv. 9-12', chance: 20, types: ['Psy'] },
    { name: 'Sabelette', levels: 'Niv. 12-14', chance: 20, types: ['Sol'] },
  ],
  // Route 5 (0x10)
  0x10: [
    { name: 'Roucool', levels: 'Niv. 13-16', chance: 35, types: ['Normal', 'Vol'] },
    { name: 'Rattata', levels: 'Niv. 14-16', chance: 25, types: ['Normal'] },
    { name: 'Abra', levels: 'Niv. 10-16', chance: 20, types: ['Psy'] },
    { name: 'Rondoudou', levels: 'Niv. 12-16', chance: 15, types: ['Normal'] },
    { name: 'Férosinge', levels: 'Niv. 14-16', chance: 5, types: ['Combat'] },
  ],
  // Route 6 (0x11)
  0x11: [
    { name: 'Roucool', levels: 'Niv. 13-16', chance: 35, types: ['Normal', 'Vol'] },
    { name: 'Rattata', levels: 'Niv. 14-16', chance: 25, types: ['Normal'] },
    { name: 'Abra', levels: 'Niv. 15', chance: 20, types: ['Psy'] },
    { name: 'Rondoudou', levels: 'Niv. 12-16', chance: 15, types: ['Normal'] },
    { name: 'Férosinge', levels: 'Niv. 14-16', chance: 5, types: ['Combat'] },
  ],
  // Route 11 (0x16)
  0x16: [
    { name: 'Piafabec', levels: 'Niv. 13-17', chance: 35, types: ['Normal', 'Vol'] },
    { name: 'Soporifik', levels: 'Niv. 15-19', chance: 30, types: ['Psy'] },
    { name: 'Rattata', levels: 'Niv. 13-15', chance: 20, types: ['Normal'] },
    { name: 'Sabelette', levels: 'Niv. 15', chance: 15, types: ['Sol'] },
  ],
  // Route 9 (0x14)
  0x14: [
    { name: 'Rattata', levels: 'Niv. 15-18', chance: 30, types: ['Normal'] },
    { name: 'Piafabec', levels: 'Niv. 16-19', chance: 30, types: ['Normal', 'Vol'] },
    { name: 'Nidoran♀ / ♂', levels: 'Niv. 16-18', chance: 25, types: ['Poison'] },
    { name: 'Nidorina / Nidorino', levels: 'Niv. 20', chance: 15, types: ['Poison'] },
  ],
  // Route 10 (0x15 / 0x18)
  0x15: [
    { name: 'Magnéti', levels: 'Niv. 16-22', chance: 35, types: ['Électrik'] },
    { name: 'Voltorbe', levels: 'Niv. 16-22', chance: 30, types: ['Électrik'] },
    { name: 'Piafabec', levels: 'Niv. 18', chance: 20, types: ['Normal', 'Vol'] },
    { name: 'Machoc', levels: 'Niv. 16-20', chance: 15, types: ['Combat'] },
  ],
  0x18: [
    { name: 'Magnéti', levels: 'Niv. 16-22', chance: 35, types: ['Électrik'] },
    { name: 'Voltorbe', levels: 'Niv. 16-22', chance: 30, types: ['Électrik'] },
    { name: 'Piafabec', levels: 'Niv. 18', chance: 20, types: ['Normal', 'Vol'] },
    { name: 'Machoc', levels: 'Niv. 16-20', chance: 15, types: ['Combat'] },
  ],
  // Route 8 (0x13)
  0x13: [
    { name: 'Roucool', levels: 'Niv. 18-22', chance: 30, types: ['Normal', 'Vol'] },
    { name: 'Roucoups', levels: 'Niv. 20-24', chance: 25, types: ['Normal', 'Vol'] },
    { name: 'Rattata', levels: 'Niv. 18-20', chance: 20, types: ['Normal'] },
    { name: 'Kadabra', levels: 'Niv. 20-27', chance: 15, types: ['Psy'] },
    { name: 'Abra', levels: 'Niv. 15-19', chance: 10, types: ['Psy'] },
  ],
  // Route 7 (0x12)
  0x12: [
    { name: 'Roucool', levels: 'Niv. 19-22', chance: 35, types: ['Normal', 'Vol'] },
    { name: 'Rattata', levels: 'Niv. 19-21', chance: 30, types: ['Normal'] },
    { name: 'Rondoudou', levels: 'Niv. 19-24', chance: 20, types: ['Normal'] },
    { name: 'Abra', levels: 'Niv. 19', chance: 15, types: ['Psy'] },
  ],
  // Route 12 (0x17)
  0x17: [
    { name: 'Chétiflor', levels: 'Niv. 24-26', chance: 35, types: ['Plante', 'Poison'] },
    { name: 'Boustiflor', levels: 'Niv. 28-30', chance: 25, types: ['Plante', 'Poison'] },
    { name: 'Roucoups', levels: 'Niv. 28-30', chance: 20, types: ['Normal', 'Vol'] },
    { name: 'Caninos', levels: 'Niv. 24-26', chance: 20, types: ['Feu'] },
  ],
  // Route 16 (0x1C)
  0x1C: [
    { name: 'Doduo', levels: 'Niv. 22-26', chance: 40, types: ['Normal', 'Vol'] },
    { name: 'Rattata', levels: 'Niv. 22', chance: 30, types: ['Normal'] },
    { name: 'Rattatac', levels: 'Niv. 25-28', chance: 20, types: ['Normal'] },
    { name: 'Piafabec', levels: 'Niv. 20-24', chance: 10, types: ['Normal', 'Vol'] },
  ],
  // Route 17 (Piste Cyclable - 0x1D)
  0x1D: [
    { name: 'Doduo', levels: 'Niv. 26-29', chance: 35, types: ['Normal', 'Vol'] },
    { name: 'Rapasdepic', levels: 'Niv. 26-29', chance: 25, types: ['Normal', 'Vol'] },
    { name: 'Rattatac', levels: 'Niv. 25-29', chance: 25, types: ['Normal'] },
    { name: 'Dodrio', levels: 'Niv. 29', chance: 15, types: ['Normal', 'Vol'] },
  ],
  // Route 22 (0x21) - Ligue
  0x21: [
    { name: 'Rattata', levels: 'Niv. 2-4', chance: 40, types: ['Normal'] },
    { name: 'Nidoran♀', levels: 'Niv. 2-4', chance: 20, types: ['Poison'] },
    { name: 'Nidoran♂', levels: 'Niv. 2-4', chance: 20, types: ['Poison'] },
    { name: 'Piafabec', levels: 'Niv. 3-5', chance: 10, types: ['Normal', 'Vol'] },
    { name: 'Férosinge', levels: 'Niv. 3-5', chance: 10, types: ['Combat'] },
  ],
  // Route 23 (0x23) - Route Victoire
  0x23: [
    { name: 'Rapasdepic', levels: 'Niv. 38-44', chance: 35, types: ['Normal', 'Vol'] },
    { name: 'Colossinge', levels: 'Niv. 38-44', chance: 30, types: ['Combat'] },
    { name: 'Sablaireau', levels: 'Niv. 41-44', chance: 20, types: ['Sol'] },
    { name: 'Arbok', levels: 'Niv. 41-44', chance: 15, types: ['Poison'] },
  ],
};
