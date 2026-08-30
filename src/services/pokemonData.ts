// Comprehensive Pokémon Yellow (Gen 1) Reference Data:
// Species dictionary, Type effectiveness engine, Route encounters, and Gym Leader guides in English.

export type PokemonType =
  | 'Normal'
  | 'Fire'
  | 'Water'
  | 'Grass'
  | 'Electric'
  | 'Ice'
  | 'Fighting'
  | 'Poison'
  | 'Ground'
  | 'Flying'
  | 'Psychic'
  | 'Bug'
  | 'Rock'
  | 'Ghost'
  | 'Dragon';

export interface PokemonInfo {
  id: number; // National Dex ID
  internalId: number; // Gen 1 RAM internal index
  name: string; // English name
  nameEn: string;
  type1: PokemonType;
  type2?: PokemonType;
}

// Gen 1 Type Byte Mapping (From RAM addresses 0xD019/0xD01A and 0xCFEA/0xCFEB)
export const RAM_TYPE_MAP: Record<number, PokemonType> = {
  0x00: 'Normal',
  0x01: 'Fighting',
  0x02: 'Flying',
  0x03: 'Poison',
  0x04: 'Ground',
  0x05: 'Rock',
  0x07: 'Bug',
  0x08: 'Ghost',
  0x14: 'Fire',
  0x15: 'Water',
  0x16: 'Grass',
  0x17: 'Electric',
  0x18: 'Psychic',
  0x19: 'Ice',
  0x1A: 'Dragon',
};

// Gen 1 Internal Index to Pokémon Species Data (Complete Gen 1 Index mapping)
export const GEN1_INTERNAL_POKEMON: Record<number, PokemonInfo> = {
  0x01: { id: 112, internalId: 0x01, name: 'Rhydon', nameEn: 'Rhydon', type1: 'Ground', type2: 'Rock' },
  0x02: { id: 115, internalId: 0x02, name: 'Kangaskhan', nameEn: 'Kangaskhan', type1: 'Normal' },
  0x03: { id: 32, internalId: 0x03, name: 'Nidoran♂', nameEn: 'Nidoran M', type1: 'Poison' },
  0x04: { id: 35, internalId: 0x04, name: 'Clefairy', nameEn: 'Clefairy', type1: 'Normal' },
  0x05: { id: 21, internalId: 0x05, name: 'Spearow', nameEn: 'Spearow', type1: 'Normal', type2: 'Flying' },
  0x06: { id: 100, internalId: 0x06, name: 'Voltorb', nameEn: 'Voltorb', type1: 'Electric' },
  0x07: { id: 34, internalId: 0x07, name: 'Nidoking', nameEn: 'Nidoking', type1: 'Poison', type2: 'Ground' },
  0x08: { id: 80, internalId: 0x08, name: 'Slowbro', nameEn: 'Slowbro', type1: 'Water', type2: 'Psychic' },
  0x09: { id: 2, internalId: 0x09, name: 'Ivysaur', nameEn: 'Ivysaur', type1: 'Grass', type2: 'Poison' },
  0x0A: { id: 103, internalId: 0x0A, name: 'Exeggutor', nameEn: 'Exeggutor', type1: 'Grass', type2: 'Psychic' },
  0x0B: { id: 108, internalId: 0x0B, name: 'Lickitung', nameEn: 'Lickitung', type1: 'Normal' },
  0x0C: { id: 102, internalId: 0x0C, name: 'Exeggcute', nameEn: 'Exeggcute', type1: 'Grass', type2: 'Psychic' },
  0x0D: { id: 88, internalId: 0x0D, name: 'Grimer', nameEn: 'Grimer', type1: 'Poison' },
  0x0E: { id: 94, internalId: 0x0E, name: 'Gengar', nameEn: 'Gengar', type1: 'Ghost', type2: 'Poison' },
  0x0F: { id: 29, internalId: 0x0F, name: 'Nidoran♀', nameEn: 'Nidoran F', type1: 'Poison' },
  0x10: { id: 31, internalId: 0x10, name: 'Nidoqueen', nameEn: 'Nidoqueen', type1: 'Poison', type2: 'Ground' },
  0x11: { id: 104, internalId: 0x11, name: 'Cubone', nameEn: 'Cubone', type1: 'Ground' },
  0x12: { id: 111, internalId: 0x12, name: 'Rhyhorn', nameEn: 'Rhyhorn', type1: 'Ground', type2: 'Rock' },
  0x13: { id: 131, internalId: 0x13, name: 'Lapras', nameEn: 'Lapras', type1: 'Water', type2: 'Ice' },
  0x14: { id: 59, internalId: 0x14, name: 'Arcanine', nameEn: 'Arcanine', type1: 'Fire' },
  0x15: { id: 151, internalId: 0x15, name: 'Mew', nameEn: 'Mew', type1: 'Psychic' },
  0x16: { id: 130, internalId: 0x16, name: 'Gyarados', nameEn: 'Gyarados', type1: 'Water', type2: 'Flying' },
  0x17: { id: 90, internalId: 0x17, name: 'Shellder', nameEn: 'Shellder', type1: 'Water' },
  0x18: { id: 72, internalId: 0x18, name: 'Tentacool', nameEn: 'Tentacool', type1: 'Water', type2: 'Poison' },
  0x19: { id: 92, internalId: 0x19, name: 'Gastly', nameEn: 'Gastly', type1: 'Ghost', type2: 'Poison' },
  0x1A: { id: 123, internalId: 0x1A, name: 'Scyther', nameEn: 'Scyther', type1: 'Bug', type2: 'Flying' },
  0x1B: { id: 120, internalId: 0x1B, name: 'Staryu', nameEn: 'Staryu', type1: 'Water' },
  0x1C: { id: 9, internalId: 0x1C, name: 'Blastoise', nameEn: 'Blastoise', type1: 'Water' },
  0x1D: { id: 127, internalId: 0x1D, name: 'Pinsir', nameEn: 'Pinsir', type1: 'Bug' },
  0x1E: { id: 114, internalId: 0x1E, name: 'Tangela', nameEn: 'Tangela', type1: 'Grass' },
  0x21: { id: 58, internalId: 0x21, name: 'Growlithe', nameEn: 'Growlithe', type1: 'Fire' },
  0x22: { id: 95, internalId: 0x22, name: 'Onix', nameEn: 'Onix', type1: 'Rock', type2: 'Ground' },
  0x23: { id: 22, internalId: 0x23, name: 'Fearow', nameEn: 'Fearow', type1: 'Normal', type2: 'Flying' },
  0x24: { id: 16, internalId: 0x24, name: 'Pidgey', nameEn: 'Pidgey', type1: 'Normal', type2: 'Flying' },
  0x25: { id: 79, internalId: 0x25, name: 'Slowpoke', nameEn: 'Slowpoke', type1: 'Water', type2: 'Psychic' },
  0x26: { id: 64, internalId: 0x26, name: 'Kadabra', nameEn: 'Kadabra', type1: 'Psychic' },
  0x27: { id: 75, internalId: 0x27, name: 'Graveler', nameEn: 'Graveler', type1: 'Rock', type2: 'Ground' },
  0x28: { id: 113, internalId: 0x28, name: 'Chansey', nameEn: 'Chansey', type1: 'Normal' },
  0x29: { id: 67, internalId: 0x29, name: 'Machoke', nameEn: 'Machoke', type1: 'Fighting' },
  0x2A: { id: 122, internalId: 0x2A, name: 'Mr. Mime', nameEn: 'Mr. Mime', type1: 'Psychic' },
  0x2B: { id: 106, internalId: 0x2B, name: 'Hitmonlee', nameEn: 'Hitmonlee', type1: 'Fighting' },
  0x2C: { id: 107, internalId: 0x2C, name: 'Hitmonchan', nameEn: 'Hitmonchan', type1: 'Fighting' },
  0x2D: { id: 24, internalId: 0x2D, name: 'Arbok', nameEn: 'Arbok', type1: 'Poison' },
  0x2E: { id: 47, internalId: 0x2E, name: 'Parasect', nameEn: 'Parasect', type1: 'Bug', type2: 'Grass' },
  0x2F: { id: 54, internalId: 0x2F, name: 'Psyduck', nameEn: 'Psyduck', type1: 'Water' },
  0x30: { id: 96, internalId: 0x30, name: 'Drowzee', nameEn: 'Drowzee', type1: 'Psychic' },
  0x31: { id: 76, internalId: 0x31, name: 'Golem', nameEn: 'Golem', type1: 'Rock', type2: 'Ground' },
  0x33: { id: 126, internalId: 0x33, name: 'Magmar', nameEn: 'Magmar', type1: 'Fire' },
  0x35: { id: 125, internalId: 0x35, name: 'Electabuzz', nameEn: 'Electabuzz', type1: 'Electric' },
  0x36: { id: 82, internalId: 0x36, name: 'Magneton', nameEn: 'Magneton', type1: 'Electric' },
  0x37: { id: 109, internalId: 0x37, name: 'Koffing', nameEn: 'Koffing', type1: 'Poison' },
  0x39: { id: 56, internalId: 0x39, name: 'Mankey', nameEn: 'Mankey', type1: 'Fighting' },
  0x3A: { id: 86, internalId: 0x3A, name: 'Seel', nameEn: 'Seel', type1: 'Water' },
  0x3B: { id: 50, internalId: 0x3B, name: 'Diglett', nameEn: 'Diglett', type1: 'Ground' },
  0x3C: { id: 128, internalId: 0x3C, name: 'Tauros', nameEn: 'Tauros', type1: 'Normal' },
  0x40: { id: 83, internalId: 0x40, name: 'Farfetch\'d', nameEn: 'Farfetch\'d', type1: 'Normal', type2: 'Flying' },
  0x41: { id: 48, internalId: 0x41, name: 'Venonat', nameEn: 'Venonat', type1: 'Bug', type2: 'Poison' },
  0x42: { id: 149, internalId: 0x42, name: 'Dragonite', nameEn: 'Dragonite', type1: 'Dragon', type2: 'Flying' },
  0x46: { id: 84, internalId: 0x46, name: 'Doduo', nameEn: 'Doduo', type1: 'Normal', type2: 'Flying' },
  0x47: { id: 60, internalId: 0x47, name: 'Poliwag', nameEn: 'Poliwag', type1: 'Water' },
  0x48: { id: 124, internalId: 0x48, name: 'Jynx', nameEn: 'Jynx', type1: 'Ice', type2: 'Psychic' },
  0x49: { id: 146, internalId: 0x49, name: 'Moltres', nameEn: 'Moltres', type1: 'Fire', type2: 'Flying' },
  0x4A: { id: 144, internalId: 0x4A, name: 'Articuno', nameEn: 'Articuno', type1: 'Ice', type2: 'Flying' },
  0x4B: { id: 145, internalId: 0x4B, name: 'Zapdos', nameEn: 'Zapdos', type1: 'Electric', type2: 'Flying' },
  0x4C: { id: 132, internalId: 0x4C, name: 'Ditto', nameEn: 'Ditto', type1: 'Normal' },
  0x4D: { id: 52, internalId: 0x4D, name: 'Meowth', nameEn: 'Meowth', type1: 'Normal' },
  0x4E: { id: 98, internalId: 0x4E, name: 'Krabby', nameEn: 'Krabby', type1: 'Water' },
  0x52: { id: 37, internalId: 0x52, name: 'Vulpix', nameEn: 'Vulpix', type1: 'Fire' },
  0x53: { id: 38, internalId: 0x53, name: 'Ninetales', nameEn: 'Ninetales', type1: 'Fire' },
  0x54: { id: 25, internalId: 0x54, name: 'Pikachu', nameEn: 'Pikachu', type1: 'Electric' },
  0x55: { id: 26, internalId: 0x55, name: 'Raichu', nameEn: 'Raichu', type1: 'Electric' },
  0x58: { id: 147, internalId: 0x58, name: 'Dratini', nameEn: 'Dratini', type1: 'Dragon' },
  0x59: { id: 148, internalId: 0x59, name: 'Dragonair', nameEn: 'Dragonair', type1: 'Dragon' },
  0x5A: { id: 140, internalId: 0x5A, name: 'Kabuto', nameEn: 'Kabuto', type1: 'Rock', type2: 'Water' },
  0x5B: { id: 141, internalId: 0x5B, name: 'Kabutops', nameEn: 'Kabutops', type1: 'Rock', type2: 'Water' },
  0x5C: { id: 116, internalId: 0x5C, name: 'Horsea', nameEn: 'Horsea', type1: 'Water' },
  0x5D: { id: 117, internalId: 0x5D, name: 'Seadra', nameEn: 'Seadra', type1: 'Water' },
  0x60: { id: 27, internalId: 0x60, name: 'Sandshrew', nameEn: 'Sandshrew', type1: 'Ground' },
  0x61: { id: 28, internalId: 0x61, name: 'Sandslash', nameEn: 'Sandslash', type1: 'Ground' },
  0x62: { id: 138, internalId: 0x62, name: 'Omanyte', nameEn: 'Omanyte', type1: 'Rock', type2: 'Water' },
  0x63: { id: 139, internalId: 0x63, name: 'Omastar', nameEn: 'Omastar', type1: 'Rock', type2: 'Water' },
  0x64: { id: 39, internalId: 0x64, name: 'Jigglypuff', nameEn: 'Jigglypuff', type1: 'Normal' },
  0x65: { id: 40, internalId: 0x65, name: 'Wigglytuff', nameEn: 'Wigglytuff', type1: 'Normal' },
  0x66: { id: 133, internalId: 0x66, name: 'Eevee', nameEn: 'Eevee', type1: 'Normal' },
  0x67: { id: 136, internalId: 0x67, name: 'Flareon', nameEn: 'Flareon', type1: 'Fire' },
  0x68: { id: 135, internalId: 0x68, name: 'Jolteon', nameEn: 'Jolteon', type1: 'Electric' },
  0x69: { id: 134, internalId: 0x69, name: 'Vaporeon', nameEn: 'Vaporeon', type1: 'Water' },
  0x6A: { id: 66, internalId: 0x6A, name: 'Machop', nameEn: 'Machop', type1: 'Fighting' },
  0x6B: { id: 41, internalId: 0x6B, name: 'Zubat', nameEn: 'Zubat', type1: 'Poison', type2: 'Flying' },
  0x6C: { id: 23, internalId: 0x6C, name: 'Ekans', nameEn: 'Ekans', type1: 'Poison' },
  0x6D: { id: 46, internalId: 0x6D, name: 'Paras', nameEn: 'Paras', type1: 'Bug', type2: 'Grass' },
  0x6E: { id: 61, internalId: 0x6E, name: 'Poliwhirl', nameEn: 'Poliwhirl', type1: 'Water' },
  0x6F: { id: 62, internalId: 0x6F, name: 'Poliwrath', nameEn: 'Poliwrath', type1: 'Water', type2: 'Fighting' },
  0x70: { id: 13, internalId: 0x70, name: 'Weedle', nameEn: 'Weedle', type1: 'Bug', type2: 'Poison' },
  0x71: { id: 14, internalId: 0x71, name: 'Kakuna', nameEn: 'Kakuna', type1: 'Bug', type2: 'Poison' },
  0x72: { id: 15, internalId: 0x72, name: 'Beedrill', nameEn: 'Beedrill', type1: 'Bug', type2: 'Poison' },
  0x74: { id: 85, internalId: 0x74, name: 'Dodrio', nameEn: 'Dodrio', type1: 'Normal', type2: 'Flying' },
  0x75: { id: 57, internalId: 0x75, name: 'Primeape', nameEn: 'Primeape', type1: 'Fighting' },
  0x76: { id: 51, internalId: 0x76, name: 'Dugtrio', nameEn: 'Dugtrio', type1: 'Ground' },
  0x77: { id: 49, internalId: 0x77, name: 'Venomoth', nameEn: 'Venomoth', type1: 'Bug', type2: 'Poison' },
  0x78: { id: 87, internalId: 0x78, name: 'Dewgong', nameEn: 'Dewgong', type1: 'Water', type2: 'Ice' },
  0x7B: { id: 10, internalId: 0x7B, name: 'Caterpie', nameEn: 'Caterpie', type1: 'Bug' },
  0x7C: { id: 11, internalId: 0x7C, name: 'Metapod', nameEn: 'Metapod', type1: 'Bug' },
  0x7D: { id: 12, internalId: 0x7D, name: 'Butterfree', nameEn: 'Butterfree', type1: 'Bug', type2: 'Flying' },
  0x7E: { id: 68, internalId: 0x7E, name: 'Machamp', nameEn: 'Machamp', type1: 'Fighting' },
  0x80: { id: 55, internalId: 0x80, name: 'Golduck', nameEn: 'Golduck', type1: 'Water' },
  0x81: { id: 97, internalId: 0x81, name: 'Hypno', nameEn: 'Hypno', type1: 'Psychic' },
  0x82: { id: 42, internalId: 0x82, name: 'Golbat', nameEn: 'Golbat', type1: 'Poison', type2: 'Flying' },
  0x83: { id: 150, internalId: 0x83, name: 'Mewtwo', nameEn: 'Mewtwo', type1: 'Psychic' },
  0x84: { id: 143, internalId: 0x84, name: 'Snorlax', nameEn: 'Snorlax', type1: 'Normal' },
  0x85: { id: 129, internalId: 0x85, name: 'Magikarp', nameEn: 'Magikarp', type1: 'Water' },
  0x88: { id: 89, internalId: 0x88, name: 'Muk', nameEn: 'Muk', type1: 'Poison' },
  0x8A: { id: 99, internalId: 0x8A, name: 'Kingler', nameEn: 'Kingler', type1: 'Water' },
  0x8B: { id: 91, internalId: 0x8B, name: 'Cloyster', nameEn: 'Cloyster', type1: 'Water', type2: 'Ice' },
  0x8D: { id: 101, internalId: 0x8D, name: 'Electrode', nameEn: 'Electrode', type1: 'Electric' },
  0x8E: { id: 36, internalId: 0x8E, name: 'Clefable', nameEn: 'Clefable', type1: 'Normal' },
  0x8F: { id: 110, internalId: 0x8F, name: 'Weezing', nameEn: 'Weezing', type1: 'Poison' },
  0x90: { id: 53, internalId: 0x90, name: 'Persian', nameEn: 'Persian', type1: 'Normal' },
  0x91: { id: 105, internalId: 0x91, name: 'Marowak', nameEn: 'Marowak', type1: 'Ground' },
  0x93: { id: 93, internalId: 0x93, name: 'Haunter', nameEn: 'Haunter', type1: 'Ghost', type2: 'Poison' },
  0x94: { id: 63, internalId: 0x94, name: 'Abra', nameEn: 'Abra', type1: 'Psychic' },
  0x95: { id: 65, internalId: 0x95, name: 'Alakazam', nameEn: 'Alakazam', type1: 'Psychic' },
  0x96: { id: 17, internalId: 0x96, name: 'Pidgeotto', nameEn: 'Pidgeotto', type1: 'Normal', type2: 'Flying' },
  0x97: { id: 18, internalId: 0x97, name: 'Pidgeot', nameEn: 'Pidgeot', type1: 'Normal', type2: 'Flying' },
  0x98: { id: 121, internalId: 0x98, name: 'Starmie', nameEn: 'Starmie', type1: 'Water', type2: 'Psychic' },
  0x99: { id: 1, internalId: 0x99, name: 'Bulbasaur', nameEn: 'Bulbasaur', type1: 'Grass', type2: 'Poison' },
  0x9A: { id: 3, internalId: 0x9A, name: 'Venusaur', nameEn: 'Venusaur', type1: 'Grass', type2: 'Poison' },
  0x9B: { id: 73, internalId: 0x9B, name: 'Tentacruel', nameEn: 'Tentacruel', type1: 'Water', type2: 'Poison' },
  0x9D: { id: 118, internalId: 0x9D, name: 'Goldeen', nameEn: 'Goldeen', type1: 'Water' },
  0x9E: { id: 119, internalId: 0x9E, name: 'Seaking', nameEn: 'Seaking', type1: 'Water' },
  0xA3: { id: 77, internalId: 0xA3, name: 'Ponyta', nameEn: 'Ponyta', type1: 'Fire' },
  0xA4: { id: 78, internalId: 0xA4, name: 'Rapidash', nameEn: 'Rapidash', type1: 'Fire' },
  0xA5: { id: 19, internalId: 0xA5, name: 'Rattata', nameEn: 'Rattata', type1: 'Normal' },
  0xA6: { id: 20, internalId: 0xA6, name: 'Raticate', nameEn: 'Raticate', type1: 'Normal' },
  0xA7: { id: 33, internalId: 0xA7, name: 'Nidorino', nameEn: 'Nidorino', type1: 'Poison' },
  0xA8: { id: 30, internalId: 0xA8, name: 'Nidorina', nameEn: 'Nidorina', type1: 'Poison' },
  0xA9: { id: 74, internalId: 0xA9, name: 'Geodude', nameEn: 'Geodude', type1: 'Rock', type2: 'Ground' },
  0xAA: { id: 137, internalId: 0xAA, name: 'Porygon', nameEn: 'Porygon', type1: 'Normal' },
  0xAB: { id: 142, internalId: 0xAB, name: 'Aerodactyl', nameEn: 'Aerodactyl', type1: 'Rock', type2: 'Flying' },
  0xAD: { id: 81, internalId: 0xAD, name: 'Magnemite', nameEn: 'Magnemite', type1: 'Electric' },
  0xB0: { id: 4, internalId: 0xB0, name: 'Charmander', nameEn: 'Charmander', type1: 'Fire' },
  0xB1: { id: 7, internalId: 0xB1, name: 'Squirtle', nameEn: 'Squirtle', type1: 'Water' },
  0xB2: { id: 5, internalId: 0xB2, name: 'Charmeleon', nameEn: 'Charmeleon', type1: 'Fire' },
  0xB3: { id: 8, internalId: 0xB3, name: 'Wartortle', nameEn: 'Wartortle', type1: 'Water' },
  0xB4: { id: 6, internalId: 0xB4, name: 'Charizard', nameEn: 'Charizard', type1: 'Fire', type2: 'Flying' },
  0xB9: { id: 43, internalId: 0xB9, name: 'Oddish', nameEn: 'Oddish', type1: 'Grass', type2: 'Poison' },
  0xBA: { id: 44, internalId: 0xBA, name: 'Gloom', nameEn: 'Gloom', type1: 'Grass', type2: 'Poison' },
  0xBB: { id: 45, internalId: 0xBB, name: 'Vileplume', nameEn: 'Vileplume', type1: 'Grass', type2: 'Poison' },
  0xBC: { id: 69, internalId: 0xBC, name: 'Bellsprout', nameEn: 'Bellsprout', type1: 'Grass', type2: 'Poison' },
  0xBD: { id: 70, internalId: 0xBD, name: 'Weepinbell', nameEn: 'Weepinbell', type1: 'Grass', type2: 'Poison' },
  0xBE: { id: 71, internalId: 0xBE, name: 'Victreebel', nameEn: 'Victreebel', type1: 'Grass', type2: 'Poison' },
};

// Gen 1 Type Effectiveness Chart (Multipliers: 2 = Super effective, 0.5 = Not very effective, 0 = Immune)
export const GEN1_TYPE_CHART: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
  Normal: {
    Rock: 0.5,
    Ghost: 0,
  },
  Fire: {
    Fire: 0.5,
    Water: 0.5,
    Grass: 2,
    Ice: 2,
    Bug: 2,
    Rock: 0.5,
    Dragon: 0.5,
  },
  Water: {
    Fire: 2,
    Water: 0.5,
    Grass: 0.5,
    Ground: 2,
    Rock: 2,
    Dragon: 0.5,
  },
  Grass: {
    Fire: 0.5,
    Water: 2,
    Grass: 0.5,
    Poison: 0.5,
    Ground: 2,
    Flying: 0.5,
    Bug: 0.5,
    Rock: 2,
    Dragon: 0.5,
  },
  Electric: {
    Water: 2,
    Grass: 0.5,
    Electric: 0.5,
    Ground: 0,
    Flying: 2,
    Dragon: 0.5,
  },
  Ice: {
    Water: 0.5,
    Grass: 2,
    Ice: 0.5,
    Ground: 2,
    Flying: 2,
    Dragon: 2,
  },
  Fighting: {
    Normal: 2,
    Ice: 2,
    Poison: 0.5,
    Flying: 0.5,
    Psychic: 0.5,
    Bug: 0.5,
    Rock: 2,
    Ghost: 0,
  },
  Poison: {
    Grass: 2,
    Poison: 0.5,
    Ground: 0.5,
    Rock: 0.5,
    Ghost: 0.5,
    Bug: 2, // In Gen 1, Poison is 2x against Bug
  },
  Ground: {
    Fire: 2,
    Electric: 2,
    Grass: 0.5,
    Poison: 2,
    Flying: 0,
    Bug: 0.5,
    Rock: 2,
  },
  Flying: {
    Electric: 0.5,
    Grass: 2,
    Fighting: 2,
    Bug: 2,
    Rock: 0.5,
  },
  Psychic: {
    Fighting: 2,
    Poison: 2,
    Psychic: 0.5,
    Ghost: 1, // In Gen 1, Psychic was neutral to Ghost due to bug
  },
  Bug: {
    Fire: 0.5,
    Grass: 2,
    Fighting: 0.5,
    Poison: 2, // In Gen 1, Bug is 2x against Poison
    Flying: 0.5,
    Psychic: 2,
    Ghost: 0.5,
  },
  Rock: {
    Fire: 2,
    Ice: 2,
    Fighting: 0.5,
    Ground: 0.5,
    Flying: 2,
    Bug: 2,
  },
  Ghost: {
    Normal: 0,
    Psychic: 0, // In Gen 1, Ghost does 0x against Psychic due to programming bug
    Ghost: 2,
  },
  Dragon: {
    Dragon: 2,
  },
};

export const ALL_TYPES: PokemonType[] = [
  'Normal',
  'Fire',
  'Water',
  'Grass',
  'Electric',
  'Ice',
  'Fighting',
  'Poison',
  'Ground',
  'Flying',
  'Psychic',
  'Bug',
  'Rock',
  'Ghost',
  'Dragon',
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
  Fire: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40', badge: 'bg-orange-500' },
  Water: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40', badge: 'bg-blue-500' },
  Grass: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40', badge: 'bg-emerald-500' },
  Electric: { bg: 'bg-yellow-400/20', text: 'text-yellow-300', border: 'border-yellow-400/40', badge: 'bg-yellow-500' },
  Ice: { bg: 'bg-cyan-400/20', text: 'text-cyan-300', border: 'border-cyan-400/40', badge: 'bg-cyan-500' },
  Fighting: { bg: 'bg-red-600/20', text: 'text-red-300', border: 'border-red-600/40', badge: 'bg-red-600' },
  Poison: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40', badge: 'bg-purple-500' },
  Ground: { bg: 'bg-amber-600/20', text: 'text-amber-300', border: 'border-amber-600/40', badge: 'bg-amber-600' },
  Flying: { bg: 'bg-indigo-400/20', text: 'text-indigo-300', border: 'border-indigo-400/40', badge: 'bg-indigo-500' },
  Psychic: { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/40', badge: 'bg-pink-500' },
  Bug: { bg: 'bg-lime-500/20', text: 'text-lime-300', border: 'border-lime-500/40', badge: 'bg-lime-500' },
  Rock: { bg: 'bg-stone-500/20', text: 'text-stone-300', border: 'border-stone-500/40', badge: 'bg-stone-500' },
  Ghost: { bg: 'bg-violet-600/20', text: 'text-violet-300', border: 'border-violet-600/40', badge: 'bg-violet-600' },
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
  // Pewter City (0x02) - Brock
  0x02: {
    cityMapId: 0x02,
    cityName: 'Pewter City',
    leaderName: 'Brock',
    badgeName: 'Boulder Badge',
    badgeEffect: 'Boosts Attack + Allows Flash outside of battle',
    primaryType: 'Rock',
    team: [
      { name: 'Geodude', level: 10, types: ['Rock', 'Ground'] },
      { name: 'Onix', level: 12, types: ['Rock', 'Ground'] },
    ],
    weaknesses: ['Water', 'Grass', 'Fighting', 'Ground'],
    tactics: 'Pikachu is ineffective here! Catch Mankey on Route 22 (Low Kick) or Nidoran♂/♀ (Double Kick at Lv. 12), or use Butterfree with Confusion.',
  },
  // Cerulean City (0x03) - Misty
  0x03: {
    cityMapId: 0x03,
    cityName: 'Cerulean City',
    leaderName: 'Misty',
    badgeName: 'Cascade Badge',
    badgeEffect: 'Pokémon up to Lv. 30 obey + Allows Cut outside of battle',
    primaryType: 'Water',
    team: [
      { name: 'Staryu', level: 18, types: ['Water'] },
      { name: 'Starmie', level: 21, types: ['Water', 'Psychic'] },
    ],
    weaknesses: ['Electric', 'Grass', 'Bug'],
    tactics: 'Starmie hits hard and fast with BubbleBeam. Pikachu with Thundershock and Bulbasaur with Vine Whip are great counters.',
  },
  // Vermilion City (0x05) - Lt. Surge
  0x05: {
    cityMapId: 0x05,
    cityName: 'Vermilion City',
    leaderName: 'Lt. Surge',
    badgeName: 'Thunder Badge',
    badgeEffect: 'Boosts Speed + Allows Fly outside of battle',
    primaryType: 'Electric',
    team: [
      { name: 'Raichu', level: 28, types: ['Electric'] },
    ],
    weaknesses: ['Ground'],
    tactics: 'Catch a Diglett or Dugtrio in the nearby Diglett\'s Cave: they are completely immune to Electric moves.',
  },
  // Celadon City (0x06) - Erika
  0x06: {
    cityMapId: 0x06,
    cityName: 'Celadon City',
    leaderName: 'Erika',
    badgeName: 'Rainbow Badge',
    badgeEffect: 'Pokémon up to Lv. 50 obey + Allows Strength outside of battle',
    primaryType: 'Grass',
    team: [
      { name: 'Victreebel', level: 32, types: ['Grass', 'Poison'] },
      { name: 'Tangela', level: 30, types: ['Grass'] },
      { name: 'Vileplume', level: 32, types: ['Grass', 'Poison'] },
    ],
    weaknesses: ['Fire', 'Flying', 'Ice', 'Psychic'],
    tactics: 'Use Flying (Pidgeotto, Fearow), Fire (Charmeleon, Vulpix) or Psychic types (Kadabra). Watch out for status conditions like Sleep Powder and Stun Spore.',
  },
  // Fuchsia City (0x07) - Koga
  0x07: {
    cityMapId: 0x07,
    cityName: 'Fuchsia City',
    leaderName: 'Koga',
    badgeName: 'Soul Badge',
    badgeEffect: 'Boosts Defense + Allows Surf outside of battle',
    primaryType: 'Poison',
    team: [
      { name: 'Venonat', level: 44, types: ['Bug', 'Poison'] },
      { name: 'Venonat', level: 46, types: ['Bug', 'Poison'] },
      { name: 'Venonat', level: 48, types: ['Bug', 'Poison'] },
      { name: 'Venomoth', level: 50, types: ['Bug', 'Poison'] },
    ],
    weaknesses: ['Psychic', 'Fire', 'Flying', 'Rock'],
    tactics: 'Psychic Pokémon like Alakazam or Hypno sweep his entire team effortlessly. Fire and Flying attacks are also very effective.',
  },
  // Saffron City (0x0A) - Sabrina
  0x0A: {
    cityMapId: 0x0A,
    cityName: 'Saffron City',
    leaderName: 'Sabrina',
    badgeName: 'Marsh Badge',
    badgeEffect: 'Pokémon up to Lv. 70 obey',
    primaryType: 'Psychic',
    team: [
      { name: 'Abra', level: 50, types: ['Psychic'] },
      { name: 'Kadabra', level: 50, types: ['Psychic'] },
      { name: 'Alakazam', level: 50, types: ['Psychic'] },
    ],
    weaknesses: ['Bug', 'Normal'],
    tactics: 'Psychic is dominant in Gen 1, but their physical Defense is paper-thin! Use heavy physical attackers (Snorlax\'s Body Slam, Dugtrio\'s Earthquake).',
  },
  // Cinnabar Island (0x08) - Blaine
  0x08: {
    cityMapId: 0x08,
    cityName: 'Cinnabar Island',
    leaderName: 'Blaine',
    badgeName: 'Volcano Badge',
    badgeEffect: 'Boosts Special stats',
    primaryType: 'Fire',
    team: [
      { name: 'Ninetales', level: 48, types: ['Fire'] },
      { name: 'Rapidash', level: 50, types: ['Fire'] },
      { name: 'Arcanine', level: 54, types: ['Fire'] },
    ],
    weaknesses: ['Water', 'Ground', 'Rock'],
    tactics: 'Water moves (Surf from Blastoise, Vaporeon, Gyarados) or Ground moves (Earthquake) easily sweep his Fire Pokémon.',
  },
  // Viridian City (0x01) - Giovanni
  0x01: {
    cityMapId: 0x01,
    cityName: 'Viridian City',
    leaderName: 'Giovanni',
    badgeName: 'Earth Badge',
    badgeEffect: 'All Pokémon obey unconditionally',
    primaryType: 'Ground',
    team: [
      { name: 'Dugtrio', level: 50, types: ['Ground'] },
      { name: 'Persian', level: 53, types: ['Normal'] },
      { name: 'Nidoqueen', level: 53, types: ['Poison', 'Ground'] },
      { name: 'Nidoking', level: 55, types: ['Poison', 'Ground'] },
      { name: 'Rhydon', level: 55, types: ['Ground', 'Rock'] },
    ],
    weaknesses: ['Water', 'Grass', 'Ice', 'Fighting'],
    tactics: 'Water (Surf) and Ice (Ice Beam) moves hit almost his entire lineup for 2x or 4x weakness (Rhydon).',
  },
};

// ============================================================================
// WILD POKÉMON ENCOUNTERS DATABASE (Pokémon Yellow - Land & Marine / Water / Fishing)
// ============================================================================

export type EncounterCategory = 'walk' | 'surf' | 'fish';

export interface WildEncounter {
  dexId: number;
  name: string;
  levels: string;
  chance: number; // percentage %
  types: PokemonType[];
  category: EncounterCategory;
  methodLabel?: string; // e.g. 'Tall Grass', 'Surfing', 'Super Rod', 'Good Rod', 'Old Rod'
}

// Name to National Pokédex ID (1..151) dictionary
export const NATIONAL_DEX_MAP: Record<string, number> = {
  'Bulbasaur': 1, 'Ivysaur': 2, 'Venusaur': 3, 'Charmander': 4, 'Charmeleon': 5, 'Charizard': 6,
  'Squirtle': 7, 'Wartortle': 8, 'Blastoise': 9, 'Caterpie': 10, 'Metapod': 11, 'Butterfree': 12,
  'Weedle': 13, 'Kakuna': 14, 'Beedrill': 15, 'Pidgey': 16, 'Pidgeotto': 17, 'Pidgeot': 18,
  'Rattata': 19, 'Raticate': 20, 'Spearow': 21, 'Fearow': 22, 'Ekans': 23, 'Arbok': 24,
  'Pikachu': 25, 'Raichu': 26, 'Sandshrew': 27, 'Sandslash': 28, 'Nidoran♀': 29, 'Nidorina': 30,
  'Nidoqueen': 31, 'Nidoran♂': 32, 'Nidorino': 33, 'Nidoking': 34, 'Clefairy': 35, 'Clefable': 36,
  'Vulpix': 37, 'Ninetales': 38, 'Jigglypuff': 39, 'Wigglytuff': 40, 'Zubat': 41, 'Golbat': 42,
  'Oddish': 43, 'Gloom': 44, 'Vileplume': 45, 'Paras': 46, 'Parasect': 47, 'Venonat': 48,
  'Venomoth': 49, 'Diglett': 50, 'Dugtrio': 51, 'Meowth': 52, 'Persian': 53, 'Psyduck': 54,
  'Golduck': 55, 'Mankey': 56, 'Primeape': 57, 'Growlithe': 58, 'Arcanine': 59, 'Poliwag': 60,
  'Poliwhirl': 61, 'Poliwrath': 62, 'Abra': 63, 'Kadabra': 64, 'Alakazam': 65, 'Machop': 66,
  'Machoke': 67, 'Machamp': 68, 'Bellsprout': 69, 'Weepinbell': 70, 'Victreebel': 71, 'Tentacool': 72,
  'Tentacruel': 73, 'Geodude': 74, 'Graveler': 75, 'Golem': 76, 'Ponyta': 77, 'Rapidash': 78,
  'Slowpoke': 79, 'Slowbro': 80, 'Magnemite': 81, 'Magneton': 82, 'Farfetch\'d': 83, 'Doduo': 84,
  'Dodrio': 85, 'Seel': 86, 'Dewgong': 87, 'Grimer': 88, 'Muk': 89, 'Shellder': 90,
  'Cloyster': 91, 'Gastly': 92, 'Haunter': 93, 'Gengar': 94, 'Onix': 95, 'Drowzee': 96,
  'Hypno': 97, 'Krabby': 98, 'Kingler': 99, 'Voltorb': 100, 'Electrode': 101, 'Exeggcute': 102,
  'Exeggutor': 103, 'Cubone': 104, 'Marowak': 105, 'Hitmonlee': 106, 'Hitmonchan': 107, 'Lickitung': 108,
  'Koffing': 109, 'Weezing': 110, 'Rhyhorn': 111, 'Rhydon': 112, 'Chansey': 113, 'Tangela': 114,
  'Kangaskhan': 115, 'Horsea': 116, 'Seadra': 117, 'Goldeen': 118, 'Seaking': 119, 'Staryu': 120,
  'Starmie': 121, 'Mr. Mime': 122, 'Scyther': 123, 'Jynx': 124, 'Electabuzz': 125, 'Magmar': 126,
  'Pinsir': 127, 'Tauros': 128, 'Magikarp': 129, 'Gyarados': 130, 'Lapras': 131, 'Ditto': 132,
  'Eevee': 133, 'Vaporeon': 134, 'Jolteon': 135, 'Flareon': 136, 'Porygon': 137, 'Omanyte': 138,
  'Omastar': 139, 'Kabuto': 140, 'Kabutops': 141, 'Aerodactyl': 142, 'Snorlax': 143, 'Articuno': 144,
  'Zapdos': 145, 'Moltres': 146, 'Dratini': 147, 'Dragonair': 148, 'Dragonite': 149, 'Mewtwo': 150,
  'Mew': 151
};

export const WILD_ENCOUNTERS_BY_MAP: Record<number, WildEncounter[]> = {
  // Pallet Town (0x00) - Water / Fishing
  0x00: [
    { dexId: 72, name: 'Tentacool', levels: 'Lv. 5-40', chance: 100, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 72, name: 'Tentacool', levels: 'Lv. 15-20', chance: 50, types: ['Water', 'Poison'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 90, name: 'Shellder', levels: 'Lv. 15', chance: 25, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 120, name: 'Staryu', levels: 'Lv. 15', chance: 25, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 60, name: 'Poliwag', levels: 'Lv. 10', chance: 50, types: ['Water'], category: 'fish', methodLabel: 'Good Rod 🎣' },
    { dexId: 118, name: 'Goldeen', levels: 'Lv. 10', chance: 50, types: ['Water'], category: 'fish', methodLabel: 'Good Rod 🎣' },
    { dexId: 129, name: 'Magikarp', levels: 'Lv. 5', chance: 100, types: ['Water'], category: 'fish', methodLabel: 'Old Rod 🎣' },
  ],

  // Viridian City (0x01) - Pond & Fishing
  0x01: [
    { dexId: 54, name: 'Psyduck', levels: 'Lv. 15-25', chance: 85, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 55, name: 'Golduck', levels: 'Lv. 25-35', chance: 15, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 60, name: 'Poliwag', levels: 'Lv. 15', chance: 50, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 61, name: 'Poliwhirl', levels: 'Lv. 20', chance: 25, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 118, name: 'Goldeen', levels: 'Lv. 15', chance: 25, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 129, name: 'Magikarp', levels: 'Lv. 5', chance: 100, types: ['Water'], category: 'fish', methodLabel: 'Old Rod 🎣' },
  ],

  // Cerulean City (0x03) - River / Gym Waters
  0x03: [
    { dexId: 54, name: 'Psyduck', levels: 'Lv. 15-25', chance: 85, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 55, name: 'Golduck', levels: 'Lv. 25-35', chance: 15, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 118, name: 'Goldeen', levels: 'Lv. 15', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 119, name: 'Seaking', levels: 'Lv. 20', chance: 30, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 98, name: 'Krabby', levels: 'Lv. 15', chance: 30, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 129, name: 'Magikarp', levels: 'Lv. 5', chance: 100, types: ['Water'], category: 'fish', methodLabel: 'Old Rod 🎣' },
  ],

  // Vermilion City & Harbor (0x05)
  0x05: [
    { dexId: 72, name: 'Tentacool', levels: 'Lv. 5-40', chance: 100, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 90, name: 'Shellder', levels: 'Lv. 15', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 98, name: 'Krabby', levels: 'Lv. 15', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 116, name: 'Horsea', levels: 'Lv. 15', chance: 20, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 129, name: 'Magikarp', levels: 'Lv. 5', chance: 100, types: ['Water'], category: 'fish', methodLabel: 'Old Rod 🎣' },
  ],

  // Celadon City (0x06) - Polluted Pond
  0x06: [
    { dexId: 54, name: 'Psyduck', levels: 'Lv. 15-25', chance: 80, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 89, name: 'Muk', levels: 'Lv. 25', chance: 15, types: ['Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 88, name: 'Grimer', levels: 'Lv. 20', chance: 5, types: ['Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 109, name: 'Koffing', levels: 'Lv. 15', chance: 50, types: ['Poison'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 88, name: 'Grimer', levels: 'Lv. 15', chance: 50, types: ['Poison'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 129, name: 'Magikarp', levels: 'Lv. 5', chance: 100, types: ['Water'], category: 'fish', methodLabel: 'Old Rod 🎣' },
  ],

  // Fuchsia City (0x07) - Ponds & Fishing
  0x07: [
    { dexId: 54, name: 'Psyduck', levels: 'Lv. 15-25', chance: 85, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 55, name: 'Golduck', levels: 'Lv. 25-35', chance: 15, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 130, name: 'Gyarados', levels: 'Lv. 25', chance: 40, types: ['Water', 'Flying'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 119, name: 'Seaking', levels: 'Lv. 20', chance: 30, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 61, name: 'Poliwhirl', levels: 'Lv. 20', chance: 30, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 129, name: 'Magikarp', levels: 'Lv. 5', chance: 100, types: ['Water'], category: 'fish', methodLabel: 'Old Rod 🎣' },
  ],

  // Cinnabar Island (0x08) - Surfing & Deep Sea Fishing
  0x08: [
    { dexId: 72, name: 'Tentacool', levels: 'Lv. 5-40', chance: 95, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 73, name: 'Tentacruel', levels: 'Lv. 35-40', chance: 5, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 120, name: 'Staryu', levels: 'Lv. 15-20', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 90, name: 'Shellder', levels: 'Lv. 15-20', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 116, name: 'Horsea', levels: 'Lv. 15', chance: 20, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 129, name: 'Magikarp', levels: 'Lv. 5', chance: 100, types: ['Water'], category: 'fish', methodLabel: 'Old Rod 🎣' },
  ],

  // Route 1 (0x0C)
  0x0C: [
    { dexId: 16, name: 'Pidgey', levels: 'Lv. 3-5', chance: 70, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 19, name: 'Rattata', levels: 'Lv. 2-4', chance: 30, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
  ],

  // Route 2 (0x0D)
  0x0D: [
    { dexId: 16, name: 'Pidgey', levels: 'Lv. 3-7', chance: 45, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 19, name: 'Rattata', levels: 'Lv. 2-5', chance: 35, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 29, name: 'Nidoran♀', levels: 'Lv. 4-6', chance: 10, types: ['Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 32, name: 'Nidoran♂', levels: 'Lv. 4-6', chance: 10, types: ['Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
  ],

  // Viridian Forest (0x33)
  0x33: [
    { dexId: 10, name: 'Caterpie', levels: 'Lv. 3-6', chance: 35, types: ['Bug'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 11, name: 'Metapod', levels: 'Lv. 4-8', chance: 20, types: ['Bug'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 16, name: 'Pidgey', levels: 'Lv. 3-7', chance: 20, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 17, name: 'Pidgeotto', levels: 'Lv. 9', chance: 10, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 25, name: 'Pikachu', levels: 'Lv. 3-5', chance: 10, types: ['Electric'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 12, name: 'Butterfree', levels: 'Lv. 9', chance: 5, types: ['Bug', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
  ],

  // Route 3 (0x0E)
  0x0E: [
    { dexId: 21, name: 'Spearow', levels: 'Lv. 8-12', chance: 45, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 19, name: 'Rattata', levels: 'Lv. 9-11', chance: 25, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 56, name: 'Mankey', levels: 'Lv. 8-10', chance: 15, types: ['Fighting'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 39, name: 'Jigglypuff', levels: 'Lv. 9-12', chance: 10, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 27, name: 'Sandshrew', levels: 'Lv. 8-10', chance: 5, types: ['Ground'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
  ],

  // Route 4 (0x0F) - Grass & River
  0x0F: [
    { dexId: 21, name: 'Spearow', levels: 'Lv. 8-12', chance: 40, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 19, name: 'Rattata', levels: 'Lv. 8-12', chance: 30, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 56, name: 'Mankey', levels: 'Lv. 10-12', chance: 20, types: ['Fighting'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 27, name: 'Sandshrew', levels: 'Lv. 8-12', chance: 10, types: ['Ground'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 54, name: 'Psyduck', levels: 'Lv. 15-25', chance: 85, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 55, name: 'Golduck', levels: 'Lv. 25-35', chance: 15, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 118, name: 'Goldeen', levels: 'Lv. 15', chance: 50, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 60, name: 'Poliwag', levels: 'Lv. 15', chance: 50, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
  ],

  // Mt. Moon 1F (0x3B)
  0x3B: [
    { dexId: 41, name: 'Zubat', levels: 'Lv. 7-11', chance: 55, types: ['Poison', 'Flying'], category: 'walk', methodLabel: 'Cave Ground ⛰️' },
    { dexId: 74, name: 'Geodude', levels: 'Lv. 7-11', chance: 30, types: ['Rock', 'Ground'], category: 'walk', methodLabel: 'Cave Ground ⛰️' },
    { dexId: 46, name: 'Paras', levels: 'Lv. 8', chance: 10, types: ['Bug', 'Grass'], category: 'walk', methodLabel: 'Cave Ground ⛰️' },
    { dexId: 35, name: 'Clefairy', levels: 'Lv. 8-13', chance: 5, types: ['Normal'], category: 'walk', methodLabel: 'Cave Ground ⛰️' },
  ],

  // Route 24 (0x24) - Nugget Bridge & River
  0x24: [
    { dexId: 69, name: 'Bellsprout', levels: 'Lv. 12-14', chance: 35, types: ['Grass', 'Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 16, name: 'Pidgey', levels: 'Lv. 11-13', chance: 25, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 17, name: 'Pidgeotto', levels: 'Lv. 13', chance: 15, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 63, name: 'Abra', levels: 'Lv. 8-12', chance: 15, types: ['Psychic'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 27, name: 'Sandshrew', levels: 'Lv. 12', chance: 10, types: ['Ground'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 54, name: 'Psyduck', levels: 'Lv. 15-25', chance: 85, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 55, name: 'Golduck', levels: 'Lv. 25-35', chance: 15, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 118, name: 'Goldeen', levels: 'Lv. 15', chance: 50, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 119, name: 'Seaking', levels: 'Lv. 20', chance: 30, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 98, name: 'Krabby', levels: 'Lv. 15', chance: 20, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
  ],

  // Route 25 (0x25) - Bill's Sea Cottage
  0x25: [
    { dexId: 69, name: 'Bellsprout', levels: 'Lv. 12-14', chance: 35, types: ['Grass', 'Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 16, name: 'Pidgey', levels: 'Lv. 12-14', chance: 25, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 63, name: 'Abra', levels: 'Lv. 9-12', chance: 20, types: ['Psychic'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 27, name: 'Sandshrew', levels: 'Lv. 12-14', chance: 20, types: ['Ground'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 54, name: 'Psyduck', levels: 'Lv. 15-25', chance: 85, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 55, name: 'Golduck', levels: 'Lv. 25-35', chance: 15, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 98, name: 'Krabby', levels: 'Lv. 15', chance: 50, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 99, name: 'Kingler', levels: 'Lv. 25', chance: 50, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
  ],

  // Route 5 (0x10)
  0x10: [
    { dexId: 16, name: 'Pidgey', levels: 'Lv. 13-16', chance: 35, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 19, name: 'Rattata', levels: 'Lv. 14-16', chance: 25, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 63, name: 'Abra', levels: 'Lv. 10-16', chance: 20, types: ['Psychic'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 39, name: 'Jigglypuff', levels: 'Lv. 12-16', chance: 15, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 56, name: 'Mankey', levels: 'Lv. 14-16', chance: 5, types: ['Fighting'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
  ],

  // Route 6 (0x11) - Grass & Pond
  0x11: [
    { dexId: 16, name: 'Pidgey', levels: 'Lv. 13-16', chance: 35, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 19, name: 'Rattata', levels: 'Lv. 14-16', chance: 25, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 63, name: 'Abra', levels: 'Lv. 15', chance: 20, types: ['Psychic'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 39, name: 'Jigglypuff', levels: 'Lv. 12-16', chance: 15, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 56, name: 'Mankey', levels: 'Lv. 14-16', chance: 5, types: ['Fighting'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 54, name: 'Psyduck', levels: 'Lv. 15-25', chance: 85, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 55, name: 'Golduck', levels: 'Lv. 25-35', chance: 15, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 90, name: 'Shellder', levels: 'Lv. 15', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 98, name: 'Krabby', levels: 'Lv. 15', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 118, name: 'Goldeen', levels: 'Lv. 15', chance: 20, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
  ],

  // Route 11 (0x16) - Grass & Coast
  0x16: [
    { dexId: 21, name: 'Spearow', levels: 'Lv. 13-17', chance: 35, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 96, name: 'Drowzee', levels: 'Lv. 15-19', chance: 30, types: ['Psychic'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 19, name: 'Rattata', levels: 'Lv. 13-15', chance: 20, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 27, name: 'Sandshrew', levels: 'Lv. 15', chance: 15, types: ['Ground'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 72, name: 'Tentacool', levels: 'Lv. 5-30', chance: 100, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 90, name: 'Shellder', levels: 'Lv. 15', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 98, name: 'Krabby', levels: 'Lv. 15', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 116, name: 'Horsea', levels: 'Lv. 15', chance: 20, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
  ],

  // Route 9 (0x14)
  0x14: [
    { dexId: 19, name: 'Rattata', levels: 'Lv. 15-18', chance: 30, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 21, name: 'Spearow', levels: 'Lv. 16-19', chance: 30, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 29, name: 'Nidoran♀', levels: 'Lv. 16-18', chance: 15, types: ['Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 32, name: 'Nidoran♂', levels: 'Lv. 16-18', chance: 15, types: ['Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 30, name: 'Nidorina', levels: 'Lv. 20', chance: 5, types: ['Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 33, name: 'Nidorino', levels: 'Lv. 20', chance: 5, types: ['Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
  ],

  // Route 10 (0x15 / 0x18) - Power Plant Water Route
  0x15: [
    { dexId: 81, name: 'Magnemite', levels: 'Lv. 16-22', chance: 35, types: ['Electric'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 100, name: 'Voltorb', levels: 'Lv. 16-22', chance: 30, types: ['Electric'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 21, name: 'Spearow', levels: 'Lv. 18', chance: 20, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 66, name: 'Machop', levels: 'Lv. 16-20', chance: 15, types: ['Fighting'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 72, name: 'Tentacool', levels: 'Lv. 15-30', chance: 85, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 79, name: 'Slowpoke', levels: 'Lv. 20-30', chance: 15, types: ['Water', 'Psychic'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 116, name: 'Horsea', levels: 'Lv. 15-20', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 98, name: 'Krabby', levels: 'Lv. 15', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 147, name: 'Dratini', levels: 'Lv. 15', chance: 20, types: ['Dragon'], category: 'fish', methodLabel: 'Super Rod 🎣' },
  ],
  0x18: [
    { dexId: 81, name: 'Magnemite', levels: 'Lv. 16-22', chance: 35, types: ['Electric'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 100, name: 'Voltorb', levels: 'Lv. 16-22', chance: 30, types: ['Electric'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 21, name: 'Spearow', levels: 'Lv. 18', chance: 20, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 66, name: 'Machop', levels: 'Lv. 16-20', chance: 15, types: ['Fighting'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 72, name: 'Tentacool', levels: 'Lv. 15-30', chance: 85, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 79, name: 'Slowpoke', levels: 'Lv. 20-30', chance: 15, types: ['Water', 'Psychic'], category: 'surf', methodLabel: 'Surfing 🌊' },
  ],

  // Route 8 (0x13)
  0x13: [
    { dexId: 16, name: 'Pidgey', levels: 'Lv. 18-22', chance: 30, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 17, name: 'Pidgeotto', levels: 'Lv. 20-24', chance: 25, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 19, name: 'Rattata', levels: 'Lv. 18-20', chance: 20, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 64, name: 'Kadabra', levels: 'Lv. 20-27', chance: 15, types: ['Psychic'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 63, name: 'Abra', levels: 'Lv. 15-19', chance: 10, types: ['Psychic'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
  ],

  // Route 7 (0x12)
  0x12: [
    { dexId: 16, name: 'Pidgey', levels: 'Lv. 19-22', chance: 35, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 19, name: 'Rattata', levels: 'Lv. 19-21', chance: 30, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 39, name: 'Jigglypuff', levels: 'Lv. 19-24', chance: 20, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 63, name: 'Abra', levels: 'Lv. 19', chance: 15, types: ['Psychic'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
  ],

  // Route 12 (0x17) - Fishing Mecca
  0x17: [
    { dexId: 69, name: 'Bellsprout', levels: 'Lv. 24-26', chance: 35, types: ['Grass', 'Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 70, name: 'Weepinbell', levels: 'Lv. 28-30', chance: 25, types: ['Grass', 'Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 17, name: 'Pidgeotto', levels: 'Lv. 28-30', chance: 20, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 58, name: 'Growlithe', levels: 'Lv. 24-26', chance: 20, types: ['Fire'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 72, name: 'Tentacool', levels: 'Lv. 15-30', chance: 90, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 73, name: 'Tentacruel', levels: 'Lv. 30-35', chance: 10, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 79, name: 'Slowpoke', levels: 'Lv. 15-25', chance: 40, types: ['Water', 'Psychic'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 98, name: 'Krabby', levels: 'Lv. 15', chance: 30, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 99, name: 'Kingler', levels: 'Lv. 25', chance: 20, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 116, name: 'Horsea', levels: 'Lv. 15', chance: 10, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
  ],

  // Route 13 (0x19)
  0x19: [
    { dexId: 69, name: 'Bellsprout', levels: 'Lv. 24-27', chance: 30, types: ['Grass', 'Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 70, name: 'Weepinbell', levels: 'Lv. 28-30', chance: 25, types: ['Grass', 'Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 17, name: 'Pidgeotto', levels: 'Lv. 28-30', chance: 20, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 132, name: 'Ditto', levels: 'Lv. 25', chance: 15, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 83, name: 'Farfetch\'d', levels: 'Lv. 26', chance: 10, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 72, name: 'Tentacool', levels: 'Lv. 15-30', chance: 90, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 73, name: 'Tentacruel', levels: 'Lv. 30-35', chance: 10, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 79, name: 'Slowpoke', levels: 'Lv. 15-25', chance: 40, types: ['Water', 'Psychic'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 98, name: 'Krabby', levels: 'Lv. 15', chance: 30, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 99, name: 'Kingler', levels: 'Lv. 25', chance: 20, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 116, name: 'Horsea', levels: 'Lv. 15', chance: 10, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
  ],

  // Route 16 (0x1C)
  0x1C: [
    { dexId: 84, name: 'Doduo', levels: 'Lv. 22-26', chance: 40, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 19, name: 'Rattata', levels: 'Lv. 22', chance: 30, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 20, name: 'Raticate', levels: 'Lv. 25-28', chance: 20, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 21, name: 'Spearow', levels: 'Lv. 20-24', chance: 10, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
  ],

  // Route 17 (0x1D - Cycling Road Ocean Coast)
  0x1D: [
    { dexId: 84, name: 'Doduo', levels: 'Lv. 26-29', chance: 35, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 22, name: 'Fearow', levels: 'Lv. 26-29', chance: 25, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 20, name: 'Raticate', levels: 'Lv. 25-29', chance: 25, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 85, name: 'Dodrio', levels: 'Lv. 29', chance: 15, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 72, name: 'Tentacool', levels: 'Lv. 15-30', chance: 90, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 73, name: 'Tentacruel', levels: 'Lv. 30-35', chance: 10, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 90, name: 'Shellder', levels: 'Lv. 20', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 72, name: 'Tentacool', levels: 'Lv. 20', chance: 40, types: ['Water', 'Poison'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 120, name: 'Staryu', levels: 'Lv. 20', chance: 20, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
  ],

  // Route 18 (0x1E)
  0x1E: [
    { dexId: 84, name: 'Doduo', levels: 'Lv. 24-28', chance: 40, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 22, name: 'Fearow', levels: 'Lv. 26-29', chance: 30, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 20, name: 'Raticate', levels: 'Lv. 25-29', chance: 30, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 72, name: 'Tentacool', levels: 'Lv. 15-30', chance: 90, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 73, name: 'Tentacruel', levels: 'Lv. 30-35', chance: 10, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 90, name: 'Shellder', levels: 'Lv. 20', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 120, name: 'Staryu', levels: 'Lv. 20', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 116, name: 'Horsea', levels: 'Lv. 20', chance: 20, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
  ],

  // Route 19 (0x1F - Fuchsia Open Sea)
  0x1F: [
    { dexId: 72, name: 'Tentacool', levels: 'Lv. 5-40', chance: 90, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 73, name: 'Tentacruel', levels: 'Lv. 35-40', chance: 10, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 120, name: 'Staryu', levels: 'Lv. 20-25', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 90, name: 'Shellder', levels: 'Lv. 20-25', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 73, name: 'Tentacruel', levels: 'Lv. 30', chance: 20, types: ['Water', 'Poison'], category: 'fish', methodLabel: 'Super Rod 🎣' },
  ],

  // Route 20 (0x20 - Seafoam Sea)
  0x20: [
    { dexId: 72, name: 'Tentacool', levels: 'Lv. 5-40', chance: 85, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 73, name: 'Tentacruel', levels: 'Lv. 35-40', chance: 10, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 87, name: 'Dewgong', levels: 'Lv. 30-35', chance: 5, types: ['Water', 'Ice'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 120, name: 'Staryu', levels: 'Lv. 20-25', chance: 35, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 90, name: 'Shellder', levels: 'Lv. 20-25', chance: 35, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 117, name: 'Seadra', levels: 'Lv. 25-30', chance: 20, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 130, name: 'Gyarados', levels: 'Lv. 25', chance: 10, types: ['Water', 'Flying'], category: 'fish', methodLabel: 'Super Rod 🎣' },
  ],

  // Route 21 (0x22 - Pallet to Cinnabar Ocean Channel)
  0x22: [
    { dexId: 72, name: 'Tentacool', levels: 'Lv. 5-40', chance: 90, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 73, name: 'Tentacruel', levels: 'Lv. 35-40', chance: 10, types: ['Water', 'Poison'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 90, name: 'Shellder', levels: 'Lv. 20', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 120, name: 'Staryu', levels: 'Lv. 20', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 116, name: 'Horsea', levels: 'Lv. 20', chance: 20, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 114, name: 'Tangela', levels: 'Lv. 28-32', chance: 100, types: ['Grass'], category: 'walk', methodLabel: 'South Grass Patch 🌿' },
  ],

  // Route 22 (0x21 - League Entrance Pond)
  0x21: [
    { dexId: 19, name: 'Rattata', levels: 'Lv. 2-4', chance: 40, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 29, name: 'Nidoran♀', levels: 'Lv. 2-4', chance: 20, types: ['Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 32, name: 'Nidoran♂', levels: 'Lv. 2-4', chance: 20, types: ['Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 21, name: 'Spearow', levels: 'Lv. 3-5', chance: 10, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 56, name: 'Mankey', levels: 'Lv. 3-5', chance: 10, types: ['Fighting'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 60, name: 'Poliwag', levels: 'Lv. 15-25', chance: 80, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 61, name: 'Poliwhirl', levels: 'Lv. 20-30', chance: 20, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 60, name: 'Poliwag', levels: 'Lv. 15', chance: 50, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 118, name: 'Goldeen', levels: 'Lv. 15', chance: 50, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
  ],

  // Route 23 (0x23) - Victory Road Access Water
  0x23: [
    { dexId: 22, name: 'Fearow', levels: 'Lv. 38-44', chance: 35, types: ['Normal', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 57, name: 'Primeape', levels: 'Lv. 38-44', chance: 30, types: ['Fighting'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 28, name: 'Sandslash', levels: 'Lv. 41-44', chance: 20, types: ['Ground'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 24, name: 'Arbok', levels: 'Lv. 41-44', chance: 15, types: ['Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 79, name: 'Slowpoke', levels: 'Lv. 25-35', chance: 70, types: ['Water', 'Psychic'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 80, name: 'Slowbro', levels: 'Lv. 35-40', chance: 20, types: ['Water', 'Psychic'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 99, name: 'Kingler', levels: 'Lv. 35', chance: 10, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 119, name: 'Seaking', levels: 'Lv. 30', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 99, name: 'Kingler', levels: 'Lv. 30', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 61, name: 'Poliwhirl', levels: 'Lv. 30', chance: 20, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
  ],

  // Safari Zone (0xCF, 0xD0, 0xD1, 0xD2)
  0xCF: [
    { dexId: 30, name: 'Nidorina', levels: 'Lv. 24', chance: 20, types: ['Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 33, name: 'Nidorino', levels: 'Lv. 24', chance: 20, types: ['Poison'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 102, name: 'Exeggcute', levels: 'Lv. 24-26', chance: 20, types: ['Grass', 'Psychic'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 111, name: 'Rhyhorn', levels: 'Lv. 25', chance: 15, types: ['Ground', 'Rock'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 113, name: 'Chansey', levels: 'Lv. 28', chance: 10, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 128, name: 'Tauros', levels: 'Lv. 28', chance: 10, types: ['Normal'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 123, name: 'Scyther', levels: 'Lv. 28', chance: 5, types: ['Bug', 'Flying'], category: 'walk', methodLabel: 'Tall Grass 🌿' },
    { dexId: 54, name: 'Psyduck', levels: 'Lv. 15-25', chance: 80, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 79, name: 'Slowpoke', levels: 'Lv. 15-25', chance: 15, types: ['Water', 'Psychic'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 147, name: 'Dratini', levels: 'Lv. 15', chance: 5, types: ['Dragon'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 147, name: 'Dratini', levels: 'Lv. 15', chance: 25, types: ['Dragon'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 148, name: 'Dragonair', levels: 'Lv. 25', chance: 10, types: ['Dragon'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 54, name: 'Psyduck', levels: 'Lv. 15', chance: 30, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 79, name: 'Slowpoke', levels: 'Lv. 15', chance: 25, types: ['Water', 'Psychic'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 129, name: 'Magikarp', levels: 'Lv. 15', chance: 10, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
  ],

  // Seafoam Islands B4F (0x9E - Articuno Ice River)
  0x9E: [
    { dexId: 86, name: 'Seel', levels: 'Lv. 28-35', chance: 50, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 87, name: 'Dewgong', levels: 'Lv. 35-42', chance: 30, types: ['Water', 'Ice'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 116, name: 'Horsea', levels: 'Lv. 28-32', chance: 10, types: ['Water'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 79, name: 'Slowpoke', levels: 'Lv. 28', chance: 10, types: ['Water', 'Psychic'], category: 'surf', methodLabel: 'Surfing 🌊' },
    { dexId: 117, name: 'Seadra', levels: 'Lv. 30', chance: 40, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 90, name: 'Shellder', levels: 'Lv. 30', chance: 30, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
    { dexId: 120, name: 'Staryu', levels: 'Lv. 30', chance: 30, types: ['Water'], category: 'fish', methodLabel: 'Super Rod 🎣' },
  ],
};
