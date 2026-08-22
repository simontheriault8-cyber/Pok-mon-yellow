const fs = require('fs');
let code = fs.readFileSync('src/services/pokemonYellowRam.ts', 'utf8');

code = code.replace(/export function resolveAddr[\s\S]*?return enAddr \+ offset;\s*\}/, `export function resolveAddr(enAddr: number, mmu: any): number {
  if (enAddr < 0xD000) {
    return enAddr;
  }
  return enAddr + getRamOffset(mmu);
}`);

fs.writeFileSync('src/services/pokemonYellowRam.ts', code);
console.log('Reverted resolveAddr');
