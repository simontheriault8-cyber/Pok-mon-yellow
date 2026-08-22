const fs = require('fs');
let code = fs.readFileSync('src/components/RamViewer.tsx', 'utf8');

// Replace all `isFrench ? POKEMON_YELLOW_RAM.*_FR : POKEMON_YELLOW_RAM.*_EN` 
// with `resolveAddr(POKEMON_YELLOW_RAM.*_EN, mmu)`
code = code.replace(/isFrench \? POKEMON_YELLOW_RAM\.([A-Z_0-9]+)_FR : POKEMON_YELLOW_RAM\.\1_EN/g, (match, p1) => {
    return `resolveAddr(POKEMON_YELLOW_RAM.${p1}_EN, mmu)`;
});

fs.writeFileSync('src/components/RamViewer.tsx', code);
console.log('Fixed RamViewer.tsx');
