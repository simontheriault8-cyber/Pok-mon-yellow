export function getMoveSubMenuCursor(mmu: any): number {
    const base = 0xC3A0;
    let foundCursorRow = -1;
    // Scan rows 12 to 17 for the cursor 0xED
    for (let r = 12; r <= 17; r++) {
      const rBase = base + r * 20;
      for (let c = 1; c <= 18; c++) {
        if (mmu.read(rBase + c) === 0xED) {
          foundCursorRow = r;
          break;
        }
      }
      if (foundCursorRow !== -1) break;
    }

    const topY = mmu.read(0xCC24); // TOP_MENU_Y
    if (foundCursorRow !== -1 && topY >= 12 && topY <= 14) {
      const slot = foundCursorRow - topY;
      if (slot >= 0 && slot <= 3) {
        return slot;
      }
    }

    // 2. RAM coordinates fallback
    const cursor = mmu.read(0xCC26); // wCurrentMenuItem
    const maxItem = mmu.read(0xCC28); // wMaxMenuItem

    let fallback = cursor;
    if (fallback > maxItem) fallback = maxItem;
    if (fallback < 0) fallback = 0;
    
    return fallback;
}
