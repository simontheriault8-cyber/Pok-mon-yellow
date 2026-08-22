/**
 * Utility to parse and apply IPS (International Patching System) and BPS (Beat Patching System) patches to Game Boy ROMs
 */

export function isIpsFile(data: Uint8Array): boolean {
  if (data.length < 8) return false;
  // Header: 'PATCH' (0x50, 0x41, 0x54, 0x43, 0x48)
  return (
    data[0] === 0x50 &&
    data[1] === 0x41 &&
    data[2] === 0x54 &&
    data[3] === 0x43 &&
    data[4] === 0x48
  );
}

export function isBpsFile(data: Uint8Array): boolean {
  if (data.length < 16) return false;
  // Header: 'BPS1' (0x42, 0x50, 0x53, 0x31)
  return (
    data[0] === 0x42 &&
    data[1] === 0x50 &&
    data[2] === 0x53 &&
    data[3] === 0x31
  );
}

export function isPatchFile(data: Uint8Array): boolean {
  return isIpsFile(data) || isBpsFile(data);
}

export function applyIpsPatch(baseRom: Uint8Array, patchData: Uint8Array): Uint8Array {
  if (!isIpsFile(patchData)) {
    throw new Error("Le fichier fourni n'est pas un patch IPS valide (en-tête 'PATCH' manquant).");
  }

  // Create a copy of the base ROM, expanding if necessary
  let output = new Uint8Array(baseRom);

  const ensureCapacity = (requiredSize: number) => {
    if (output.length < requiredSize) {
      const nextSize = Math.max(requiredSize, output.length * 2);
      const newOutput = new Uint8Array(nextSize);
      newOutput.set(output);
      output = newOutput;
    }
  };

  let offset = 5; // Skip 'PATCH'
  const patchLength = patchData.length;

  while (offset < patchLength) {
    // Check for 'EOF' (0x45, 0x4F, 0x46)
    if (
      offset + 3 <= patchLength &&
      patchData[offset] === 0x45 &&
      patchData[offset + 1] === 0x4f &&
      patchData[offset + 2] === 0x46
    ) {
      offset += 3;
      // Optional 3-byte truncation extension
      if (offset + 3 <= patchLength) {
        const truncateSize =
          (patchData[offset] << 16) |
          (patchData[offset + 1] << 8) |
          patchData[offset + 2];
        if (truncateSize > 0 && truncateSize < output.length) {
          output = output.slice(0, truncateSize);
        }
      }
      break;
    }

    if (offset + 3 > patchLength) break;

    // 3 bytes target address (Big Endian)
    const targetOffset =
      (patchData[offset] << 16) |
      (patchData[offset + 1] << 8) |
      patchData[offset + 2];
    offset += 3;

    if (offset + 2 > patchLength) break;

    // 2 bytes size
    const size = (patchData[offset] << 8) | patchData[offset + 1];
    offset += 2;

    if (size === 0) {
      // RLE Record
      if (offset + 3 > patchLength) break;
      const rleLength = (patchData[offset] << 8) | patchData[offset + 1];
      offset += 2;
      const byteValue = patchData[offset];
      offset += 1;

      ensureCapacity(targetOffset + rleLength);
      output.fill(byteValue, targetOffset, targetOffset + rleLength);
    } else {
      // Standard Record
      if (offset + size > patchLength) break;
      ensureCapacity(targetOffset + size);
      for (let i = 0; i < size; i++) {
        output[targetOffset + i] = patchData[offset + i];
      }
      offset += size;
    }
  }

  return output;
}

/**
 * Applies a Beat Patching System (BPS) patch to a base ROM.
 * BPS is the modern standard for ROM hacks (Pokémon hacks, Gen 1-3, SNES, etc.)
 */
export function applyBpsPatch(baseRom: Uint8Array, patchData: Uint8Array): Uint8Array {
  if (!isBpsFile(patchData)) {
    throw new Error("Le fichier fourni n'est pas un patch BPS valide (en-tête 'BPS1' manquant).");
  }

  const offsetRef = { offset: 4 };

  function decodeVarint(): number {
    let result = 0;
    let shift = 1;
    while (true) {
      if (offsetRef.offset >= patchData.length) {
        throw new Error("BPS: Fin inattendue des données du patch.");
      }
      const byte = patchData[offsetRef.offset++];
      result += (byte & 0x7f) * shift;
      if (byte & 0x80) break;
      shift <<= 7;
      result += shift;
    }
    return result;
  }

  const sourceSize = decodeVarint();
  const targetSize = decodeVarint();
  const metadataSize = decodeVarint();
  offsetRef.offset += metadataSize;

  const target = new Uint8Array(targetSize);
  let outputOffset = 0;
  let sourceRelativeOffset = 0;
  let targetRelativeOffset = 0;

  // The last 12 bytes are checksums (source CRC, target CRC, patch CRC)
  const payloadEnd = patchData.length - 12;

  while (offsetRef.offset < payloadEnd && outputOffset < targetSize) {
    const data = decodeVarint();
    const action = data & 3;
    const length = (data >>> 2) + 1;

    switch (action) {
      case 0: {
        // SourceRead: copy directly from base ROM at current outputOffset
        for (let i = 0; i < length; i++) {
          target[outputOffset] = outputOffset < baseRom.length ? baseRom[outputOffset] : 0;
          outputOffset++;
        }
        break;
      }
      case 1: {
        // TargetRead: copy bytes directly from patch
        for (let i = 0; i < length; i++) {
          if (offsetRef.offset >= patchData.length) {
            throw new Error("BPS: Données de patch incomplètes.");
          }
          target[outputOffset] = patchData[offsetRef.offset++];
          outputOffset++;
        }
        break;
      }
      case 2: {
        // SourceCopy: copy from base ROM relative to sourceRelativeOffset
        const sdata = decodeVarint();
        sourceRelativeOffset += (sdata & 1 ? -1 : 1) * (sdata >>> 1);
        for (let i = 0; i < length; i++) {
          target[outputOffset] = (sourceRelativeOffset >= 0 && sourceRelativeOffset < baseRom.length)
            ? baseRom[sourceRelativeOffset]
            : 0;
          outputOffset++;
          sourceRelativeOffset++;
        }
        break;
      }
      case 3: {
        // TargetCopy: copy from already-written target relative to targetRelativeOffset
        const sdata = decodeVarint();
        targetRelativeOffset += (sdata & 1 ? -1 : 1) * (sdata >>> 1);
        for (let i = 0; i < length; i++) {
          target[outputOffset] = (targetRelativeOffset >= 0 && targetRelativeOffset < target.length)
            ? target[targetRelativeOffset]
            : 0;
          outputOffset++;
          targetRelativeOffset++;
        }
        break;
      }
    }
  }

  return target;
}

/**
 * Universal patch application: auto-detects IPS or BPS format
 */
export function applyRomPatch(baseRom: Uint8Array, patchData: Uint8Array): Uint8Array {
  if (isBpsFile(patchData)) {
    return applyBpsPatch(baseRom, patchData);
  }
  if (isIpsFile(patchData)) {
    return applyIpsPatch(baseRom, patchData);
  }
  throw new Error("Format de patch non reconnu. Veuillez fournir un fichier .bps ou .ips.");
}

/**
 * Detects if a ROM has been patched or modified (via IPS/BPS, filename metadata, size, or tags)
 */
export function getRomPatchInfo(rom?: {
  name?: string;
  title?: string;
  isPatched?: boolean;
  patchName?: string;
  size?: number;
} | null): {
  isPatched: boolean;
  patchLabel: string | null;
  baseTitle: string;
  fullTitle: string;
} {
  if (!rom) {
    return {
      isPatched: false,
      patchLabel: null,
      baseTitle: 'Aucune ROM',
      fullTitle: 'Aucune ROM chargée'
    };
  }

  let isPatched = !!rom.isPatched;
  let patchLabel = rom.patchName || null;

  const rawName = rom.name || '';
  const rawTitle = rom.title || '';
  const combined = `${rawName} ${rawTitle}`;

  // Check for common patch / hack brackets like [Hack 151], [Patched 151], [FULL VERSION], (v1.1), [IPS], [BPS], [FR], (Hack), etc.
  const bracketMatch =
    combined.match(/\[([^\]]*(?:hack|patch|151|eevee|mod|ips|bps|trad|fr|eng|v\d|randomizer|version)[^\]]*)\]/i) ||
    combined.match(/\(([^)]*(?:hack|patch|151|eevee|mod|ips|bps|trad|fr|eng|randomizer|version)[^)]*)\)/i);

  if (bracketMatch) {
    isPatched = true;
    if (!patchLabel) {
      patchLabel = bracketMatch[1].trim();
    }
  }

  // Detect Eevee Edition
  if (!isPatched && /eevee/i.test(combined)) {
    isPatched = true;
    patchLabel = 'Special Eevee Edition';
  }

  // Detect 151 Hack or custom expansion
  if (!isPatched && /151/i.test(combined)) {
    isPatched = true;
    patchLabel = 'Hack 151';
  }

  if (!isPatched && /hack/i.test(combined)) {
    isPatched = true;
    patchLabel = 'Hack / Mod';
  }

  if (!isPatched && /patch/i.test(combined)) {
    isPatched = true;
    patchLabel = 'ROM Patchée';
  }

  // Clean base title (e.g. "POKEMON YELLOW" from "POKEMON YELLOW [Special Eevee Edition]")
  let baseTitle = (rom.title || rom.name || 'Jeu Game Boy')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .trim();

  if (!baseTitle) {
    baseTitle = rom.title || rom.name || 'Jeu Game Boy';
  }

  let fullTitle = baseTitle;
  if (isPatched && patchLabel) {
    // Avoid double tagging
    if (!fullTitle.toLowerCase().includes(patchLabel.toLowerCase())) {
      fullTitle = `${baseTitle} [${patchLabel}]`;
    }
  }

  return {
    isPatched,
    patchLabel,
    baseTitle,
    fullTitle
  };
}
