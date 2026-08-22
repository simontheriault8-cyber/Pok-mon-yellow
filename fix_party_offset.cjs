const fs = require('fs');
let code = fs.readFileSync('src/services/pokemonYellowRam.ts', 'utf8');

const newResolve = `export function resolveAddr(enAddr: number, mmu: any): number {
  if (enAddr < 0xD000) {
    return enAddr;
  }
  
  // Special exception for Party Mon 1 structs.
  // In some English ROM hacks (like Yellow 151), the Party Count array is shifted by -1,
  // but the Party Mon structs are NOT shifted (due to an inserted dummy byte).
  // We can detect this by checking if applying the offset breaks the species ID match.
  const offset = getRamOffset(mmu);
  
  if (enAddr >= 0xD16B && enAddr <= 0xD300) { // Party structs range
     const countAddr = 0xD163 + offset;
     const firstMonSpecies = mmu.read(countAddr + 1);
     
     // The base species of Mon 1 in EN is D16B.
     // If we apply offset, it's D16B + offset.
     const expectedSpeciesAtOffset = mmu.read(0xD16B + offset);
     const expectedSpeciesAtEN = mmu.read(0xD16B);
     
     // If the offset one matches, use offset.
     if (expectedSpeciesAtOffset === firstMonSpecies && expectedSpeciesAtEN !== firstMonSpecies) {
         return enAddr + offset;
     }
     // If the EN one matches, it means the structs were NOT shifted!
     if (expectedSpeciesAtEN === firstMonSpecies) {
         return enAddr;
     }
  }
  
  return enAddr + offset;
}`;

code = code.replace(/export function resolveAddr[\s\S]*?return enAddr \+ getRamOffset\(mmu\);\s*\}/, newResolve);

fs.writeFileSync('src/services/pokemonYellowRam.ts', code);
console.log('Fixed resolveAddr for Party Structs');
