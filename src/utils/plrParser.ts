/**
 * AES-128-CBC decryption for Terraria .plr files
 * Key: UTF-16LE of "h3y_gUyZ" = 68 00 33 00 79 00 5F 00 67 00 55 00 79 00 5A 00
 * IV: Same as key (matches JavaScript deserializer.js)
 */
const DECRYPT_KEY_HEX = '6800330079005f006700550079005a00';

interface PlrFile {
  playerName: string;
  research: Record<string, number>;
  version: number;
}

class BinaryReader {
  private data: Uint8Array;
  public offset: number = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  get position(): number { return this.offset; }
  get bytesLeft(): number { return this.data.length - this.offset; }
  get length(): number { return this.data.length; }

  readByte(): number {
    return this.offset < this.data.length ? (this.data[this.offset++] ?? 0) : 0;
  }

  readBytes(count: number): Uint8Array {
    if (this.offset + count > this.data.length) {
      count = this.data.length - this.offset;
      if (count <= 0) return new Uint8Array(0);
    }
    const bytes = this.data.slice(this.offset, this.offset + count);
    this.offset += count;
    return bytes;
  }

  readBoolean(): boolean {
    return this.readByte() !== 0;
  }

  readInt16(): number {
    if (this.offset + 2 > this.data.length) return 0;
    const view = new DataView(this.data.buffer, this.data.byteOffset + this.offset, 2);
    this.offset += 2;
    return view.getInt16(0, true);
  }

  readUInt16(): number {
    if (this.offset + 2 > this.data.length) return 0;
    const view = new DataView(this.data.buffer, this.data.byteOffset + this.offset, 2);
    this.offset += 2;
    return view.getUint16(0, true);
  }

  readInt32(): number {
    if (this.offset + 4 > this.data.length) return 0;
    const view = new DataView(this.data.buffer, this.data.byteOffset + this.offset, 4);
    this.offset += 4;
    return view.getInt32(0, true);
  }

  readUInt32(): number {
    if (this.offset + 4 > this.data.length) return 0;
    const view = new DataView(this.data.buffer, this.data.byteOffset + this.offset, 4);
    this.offset += 4;
    return view.getUint32(0, true);
  }

  readInt64(): bigint {
    if (this.offset + 8 > this.data.length) return 0n;
    const view = new DataView(this.data.buffer, this.data.byteOffset + this.offset, 8);
    this.offset += 8;
    return view.getBigInt64(0, true);
  }

  readUInt64(): bigint {
    if (this.offset + 8 > this.data.length) return 0n;
    const view = new DataView(this.data.buffer, this.data.byteOffset + this.offset, 8);
    this.offset += 8;
    return view.getBigUint64(0, true);
  }

  readString(): string {
    // 7-bit encoded length
    let length = 0;
    let shift = 0;
    let b: number;
    do {
      b = this.readByte();
      length |= (b & 0x7f) << shift;
      shift += 7;
    } while ((b & 0x80) && shift < 35);
    
    if (length === 0 || this.offset + length > this.data.length) return '';
    
    const strBytes = this.readBytes(length);
    return new TextDecoder('utf-8').decode(strBytes);
  }

  readByteBits(): boolean[] {
    const byte = this.readByte();
    const bits: boolean[] = [];
    for (let i = 0; i < 8; i++) {
      bits.push(((byte >> i) & 1) === 1);
    }
    return bits;
  }

  readRGB(): [number, number, number] {
    return [this.readByte(), this.readByte(), this.readByte()];
  }
}

function isEncryptedFile(_data: Uint8Array): boolean {
  return true; // Always attempt decryption; we'll validate after
}

function hexToBytes(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

async function decryptPlrData(encryptedData: ArrayBuffer): Promise<ArrayBuffer> {
  const keyBuffer = hexToBytes(DECRYPT_KEY_HEX);
  const ivBuffer = hexToBytes(DECRYPT_KEY_HEX);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBuffer, { name: 'AES-CBC' }, false, ['decrypt']
  );
  
  return crypto.subtle.decrypt({ name: 'AES-CBC', iv: ivBuffer }, cryptoKey, encryptedData);
}

function readMetadata(reader: BinaryReader): { type: number; revision: number; isFavorite: boolean } {
  // Metadata: 7 bytes ASCII "relogic" + 1 byte type + uint32 revision + uint64 isFavorite
  const magicStr = new TextDecoder('ascii').decode(reader.readBytes(7));
  if (magicStr !== 'relogic') {
    throw new Error('Invalid file format. Expected "relogic" magic, got: ' + magicStr);
  }
  const typeByte = reader.readByte(); // 3 = Player
  const revision = reader.readUInt32();
  const isFavorite = (reader.readUInt64() & 1n) === 1n;
  return { type: typeByte, revision, isFavorite };
}

/**
 * Parse player data, EXACTLY matching deserializer.js field order
 * Returns the research data Record<string, number>
 */
function parsePlayerData(reader: BinaryReader, version: number): { playerName: string; research: Record<string, number> } {
  const playerName = reader.readString();
  const research: Record<string, number> = {};
  
  // 2. difficulty
  if (version >= 10) {
    if (version >= 17) {
      reader.readByte();
    } else if (reader.readBoolean()) {
      // difficulty = 2
    }
  }
  
  // 3. playTime (Int64 if version >= 138)
  if (version >= 138) {
    reader.readInt64();
  }
  
  // 4. hair
  reader.readInt32();
  
  // 5. hairDye
  if (version >= 82) {
    reader.readByte();
  }
  
  // 6. team
  if (version >= 283) {
    reader.readByte();
  }
  
  // 7. hideVisibleAccessory
  if (version >= 124) {
    reader.readByte(); // bits1
    reader.readByte(); // bits2 (only 2 bits used)
  } else if (version >= 83) {
    reader.readByte();
  }
  
  // 8. hideMisc
  if (version >= 119) {
    reader.readByte();
  }
  
  // 9. skinVariant/Male
  if (version <= 17) {
    // computed
  } else if (version < 107) {
    reader.readBoolean();
  } else {
    reader.readByte(); // skinVariant
  }
  
  // 10. statLife, statLifeMax
  reader.readInt32();
  reader.readInt32();
  
  // 11. statMana, statManaMax
  reader.readInt32();
  reader.readInt32();
  
  // 12. extraAccessory
  if (version >= 125) {
    reader.readBoolean();
  }
  
  // 13. unlockedBiomeTorches etc.
  if (version >= 229) {
    reader.readBoolean(); // unlockedBiomeTorches
    reader.readBoolean(); // usingBiomeTorches
    if (version >= 256) {
      reader.readBoolean(); // ateArtisanBread
    }
    if (version >= 324) {
      reader.readBoolean(); // ateBowlOfSoup
    }
    if (version >= 260) {
      reader.readBoolean(); // usedAegisCrystal
      reader.readBoolean(); // usedAegisFruit
      reader.readBoolean(); // usedArcaneCrystal
      reader.readBoolean(); // usedGalaxyPearl
      reader.readBoolean(); // usedGummyWorm
      reader.readBoolean(); // usedAmbrosia
    }
  }
  
  // 14. downedDD2EventAnyDifficulty
  if (version >= 182) {
    reader.readBoolean();
  }
  
  // 15. taxMoney
  if (version >= 128) {
    reader.readInt32();
  }
  
  // 16. numberOfDeaths
  if (version >= 254) {
    reader.readInt32();
    reader.readInt32();
  }
  
  // 17. Colors
  reader.readRGB(); // hair
  reader.readRGB(); // skin
  reader.readRGB(); // eye
  reader.readRGB(); // shirt
  reader.readRGB(); // underShirt
  reader.readRGB(); // pants
  reader.readRGB(); // shoe
  
  // 18. armor (20 items, each: int32 type, byte prefix, [v322: bool favorited])
  for (let i = 0; i < 20; i++) {
    reader.readInt32(); // type
    reader.readByte();  // prefix
    if (version >= 322) {
      reader.readBoolean(); // favorited
    }
  }
  
  // 19. dye (10 items, each: int32 type, byte prefix, [v322: bool favorited])
  for (let i = 0; i < 10; i++) {
    reader.readInt32(); // type
    reader.readByte();  // prefix
    if (version >= 322) {
      reader.readBoolean(); // favorited
    }
  }
  
  // 20. inventory (58 items, each: int32 type, int32 stack, byte prefix, [v114: bool favorited])
  for (let i = 0; i < 58; i++) {
    reader.readInt32(); // type
    reader.readInt32(); // stack
    reader.readByte();  // prefix
    if (version >= 114) {
      reader.readBoolean(); // favorited
    }
  }
  
  // 21. miscEquips + miscDyes (5 each, each: int32 type, byte prefix)
  for (let i = 0; i < 5; i++) {
    reader.readInt32(); reader.readByte(); // miscEquip
    reader.readInt32(); reader.readByte(); // miscDye
  }
  
  // 22. bank (40 items)
  for (let i = 0; i < 40; i++) {
    reader.readInt32(); reader.readInt32(); reader.readByte();
  }
  // 23. bank2 (40 items)
  for (let i = 0; i < 40; i++) {
    reader.readInt32(); reader.readInt32(); reader.readByte();
  }
  // 24. bank3 (v182+, 40 items)
  if (version >= 182) {
    for (let i = 0; i < 40; i++) {
      reader.readInt32(); reader.readInt32(); reader.readByte();
    }
  }
  // 25. bank4 (v198+, 40 items, [v255: bool favorited])
  if (version >= 198) {
    for (let i = 0; i < 40; i++) {
      reader.readInt32(); reader.readInt32(); reader.readByte();
      if (version >= 255) {
        reader.readBoolean();
      }
    }
  }
  // 26. voidVaultInfo
  if (version >= 199) {
    reader.readByte();
  }
  
  // 27. buffs (44 in v252+)
  const buffCount = version >= 252 ? 44 : 22;
  for (let i = 0; i < buffCount; i++) {
    reader.readInt32(); // buffType
    reader.readInt32(); // buffTime
  }
  
  // 28. signs (up to 200, terminated by -1)
  for (let i = 0; i < 200; i++) {
    const x = reader.readInt32();
    if (x === -1) break;
    reader.readInt32(); // y
    reader.readInt32(); // item
    reader.readString(); // text
  }
  
  // 29. hbLocked
  if (version >= 16) {
    reader.readBoolean();
  }
  
  // 30. hideInfo (13 bools)
  if (version >= 115) {
    for (let i = 0; i < 13; i++) {
      reader.readBoolean();
    }
  }
  
  // 31. anglerQuestsFinished
  if (version >= 98) {
    reader.readInt32();
  }
  
  // 32. DpadRadial (4 int32s)
  if (version >= 162) {
    for (let i = 0; i < 4; i++) reader.readInt32();
  }
  
  // 33. builderAccStatus
  if (version >= 164) {
    const num = version >= 230 ? 12 : (version >= 197 ? 11 : (version >= 167 ? 10 : 8));
    for (let i = 0; i < num; i++) reader.readInt32();
  }
  
  // 34. bartenderQuestLog
  if (version >= 181) {
    reader.readInt32();
  }
  
  // 35. dead/respawnTimer
  if (version >= 200) {
    reader.readBoolean();
    if (reader.readBoolean()) {
      reader.readInt32();
    }
  }
  
  // 36. lastTimePlayerWasSaved (Int64)
  if (version >= 202) {
    reader.readInt64();
  }
  
  // 37. golferScoreAccumulated
  if (version >= 206) {
    reader.readInt32();
  }
  
  // 38. RESEARCH DATA!
  if (version >= 218) {
    console.log('Reading research data at position:', reader.position);
    
    if (version >= 282) {
      reader.readBoolean(); // sacrificial boolean
    }
    
    const researchedItems = reader.readInt32();
    console.log('Researched items count:', researchedItems);
    
    for (let i = 0; i < researchedItems; i++) {
      try {
        const itemName = reader.readString();
        const amount = reader.readInt32();
        if (itemName) {
          research[itemName] = amount;
          if (i < 10 || i >= researchedItems - 3) {
            console.log(`Research ${i}: ${itemName} = ${amount}`);
          }
        }
      } catch (e: any) {
        console.error('Error reading research item', i, ':', e?.message || e);
        break;
      }
    }
  }
  
  return { playerName, research };
}

export async function parsePlrFile(arrayBuffer: ArrayBuffer): Promise<PlrFile> {
  const data = new Uint8Array(arrayBuffer);
  
  let decryptData: Uint8Array;
  
  if (isEncryptedFile(data)) {
    console.log('Detected encrypted .plr file, decrypting...');
    const decrypted = await decryptPlrData(arrayBuffer);
    decryptData = new Uint8Array(decrypted);
    console.log('Decrypted size:', decryptData.length);
  } else {
    decryptData = data;
    console.log('Unencrypted file, size:', decryptData.length);
  }
  
  const reader = new BinaryReader(decryptData);
  
  // Read version FIRST
  const releaseVersion = reader.readInt32();
  console.log('Release version:', releaseVersion);
  
  // Read metadata
  try {
    const metadata = readMetadata(reader);
    console.log('Metadata:', metadata);
  } catch (error) {
    console.error('Metadata error:', error);
  }
  
  // Parse player data, get research
  const playerData = parsePlayerData(reader, releaseVersion);
  return {
    playerName: playerData.playerName,
    research: playerData.research,
    version: releaseVersion
  };
}

export function getResearchProgress(research: Record<string, number>): {
  totalResearched: number;
  progressPercent: number;
} {
  let totalResearched = 0;
  for (const count of Object.values(research)) {
    totalResearched += Math.min(count, 100);
  }
  
  const estimatedTotalItems = 5000;
  const progressPercent = (totalResearched / estimatedTotalItems) * 100;
  
  return {
    totalResearched,
    progressPercent: Math.min(progressPercent, 100)
  };
}
