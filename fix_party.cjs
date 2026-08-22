const fs = require('fs');
let code = fs.readFileSync('src/services/simpleTrainerBot.ts', 'utf8');

const oldFunc = `  private getPartyStatus(mmu: any): PartyStatus {
    // 1. Try English RAM layout
    const partyEn = this.tryParseParty(
      mmu,
      POKEMON_YELLOW_RAM.PARTY_MON1_HP_EN,
      POKEMON_YELLOW_RAM.PARTY_MON1_MAX_HP_EN,
      POKEMON_YELLOW_RAM.PARTY_COUNT_EN
    );
    if (partyEn && partyEn.isValid) {
      this.cachedPartyStatus = partyEn;
      return partyEn;
    }

    // 2. Try French / European RAM layout
    const partyFr = this.tryParseParty(
      mmu,
      POKEMON_YELLOW_RAM.PARTY_MON1_HP_FR,
      POKEMON_YELLOW_RAM.PARTY_MON1_MAX_HP_FR,
      POKEMON_YELLOW_RAM.PARTY_COUNT_FR
    );
    if (partyFr && partyFr.isValid) {
      this.cachedPartyStatus = partyFr;
      return partyFr;
    }

    // 3. Fallback to last confirmed cached status (with isValid = false to prevent premature panic)
    return {
      ...this.cachedPartyStatus,
      isValid: false
    };
  }`;

const newFunc = `  private getPartyStatus(mmu: any): PartyStatus {
    const pCountAddr = resolveAddr(POKEMON_YELLOW_RAM.PARTY_COUNT_EN, mmu);
    const pHpBase = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_HP_EN, mmu);
    const pMaxHpBase = resolveAddr(POKEMON_YELLOW_RAM.PARTY_MON1_MAX_HP_EN, mmu);
    
    const party = this.tryParseParty(mmu, pHpBase, pMaxHpBase, pCountAddr);
    if (party && party.isValid) {
      this.cachedPartyStatus = party;
      return party;
    }
    
    if (this.cachedPartyStatus) return { ...this.cachedPartyStatus, isValid: false };
    return { aliveMons: 0, totalMons: 0, monsHp: [], isValid: false };
  }`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('src/services/simpleTrainerBot.ts', code);
console.log('Fixed getPartyStatus correctly.');
