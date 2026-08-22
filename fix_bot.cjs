const fs = require('fs');
let code = fs.readFileSync('src/services/simpleTrainerBot.ts', 'utf8');
const lines = code.split('\n');

const fixes = {
    273: '        const hpAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_HP_EN, mmu);',
    274: '        const maxHpAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_MAX_HP_EN, mmu);',
    287: '      const playerMonAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_MON_NUMBER_EN, mmu);',
    430: '    const l1Addr = resolveAddr(POKEMON_YELLOW_RAM.TEXTBOX_LINE1_EN, mmu);',
    431: '    const l2Addr = resolveAddr(POKEMON_YELLOW_RAM.TEXTBOX_LINE2_EN, mmu);', 
    469: '      const cursorAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_CURSOR_EN, mmu);',
    470: '      const maxItemAddr = resolveAddr(POKEMON_YELLOW_RAM.MAX_MENU_ITEM_EN, mmu);',
    471: '      const partyCountAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_COUNT_EN, mmu);',
    550: '      const hpAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_HP_EN, mmu);', 
    551: '      const maxHpAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_MAX_HP_EN, mmu);', 
    576: '    const joyIgnoreAddr = resolveAddr(POKEMON_YELLOW_RAM.JOY_IGNORE_EN, mmu);',
    596: '    const xAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_X_EN, mmu);',
    597: '    const yAddr = resolveAddr(POKEMON_YELLOW_RAM.PLAYER_Y_EN, mmu);',
    642: '    const movesAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_MOVES_EN, mmu);',
    643: '    const ppAddr = resolveAddr(POKEMON_YELLOW_RAM.BATTLE_MON_PP_EN, mmu);',
    658: '      const partyMovesAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_MOVES_EN, mmu);', 
    659: '      const partyPpAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_PP_EN, mmu);'
};

for (const [lineIdxStr, fixedLine] of Object.entries(fixes)) {
    const lineIdx = parseInt(lineIdxStr, 10);
    lines[lineIdx] = fixedLine;
}

fs.writeFileSync('src/services/simpleTrainerBot.ts', lines.join('\n'));
console.log('Fixed simpleTrainerBot.ts manually.');
