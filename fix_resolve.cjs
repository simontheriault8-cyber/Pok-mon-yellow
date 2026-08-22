const fs = require('fs');
let code = fs.readFileSync('src/services/pokemonYellowRam.ts', 'utf8');

code = code.replace(
  /export function resolveAddr\(enAddr: number, mmu: any\): number \{\s*return enAddr \+ getRamOffset\(mmu\);\s*\}/,
  `export function resolveAddr(enAddr: number, mmu: any): number {
  // WRAM0 (0xC000 - 0xCFFF) is typically unshifted in ROM hacks because it contains static system variables.
  // WRAM1 (0xD000 - 0xDFFF) contains game state which shifts when new variables are added.
  if (enAddr < 0xD000) {
    return enAddr;
  }
  return enAddr + getRamOffset(mmu);
}`
);

fs.writeFileSync('src/services/pokemonYellowRam.ts', code);
console.log('Fixed resolveAddr');
