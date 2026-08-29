/**
 * AES-128-CBC decryption for Terraria .plr files
 * Key: UTF-16LE of "h3y_gUyZ" = 68 00 33 00 79 00 5F 00 67 00 55 00 79 00 5A 00
 * IV: Same as key
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

  readInt32(): number {
    if (this.offset + 4 > this.data.length) return 0;
    const view = new DataView(this.data.buffer, this.data.byteOffset + this.offset, 4);
    this.offset += 4;
    return view.getInt32(0, true);
  }

  readInt64(): bigint {
    if (this.offset + 8 > this.data.length) return 0n;
    const view = new DataView(this.data.buffer, this.data.byteOffset + this.offset, 8);
    this.offset += 8;
    return view.getBigInt64(0, true);
  }

  readString(): string {
    if (this.offset >= this.data.length) return '';
    const length = this.data[this.offset++];
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
  const magicStr = new TextDecoder('ascii').decode(reader.readBytes(7));
  if (magicStr !== 'relogic') {
    throw new Error('Invalid file format. Expected "relogic" magic');
  }
  const typeByte = reader.readByte();
  const revision = reader.readInt32();
  const isFavorite = (reader.readInt64() & 1n) === 1n;
  return { type: typeByte, revision, isFavorite };
}

function parsePlayerData(reader: BinaryReader, version: number): { playerName: string; research: Record<string, number> } {
  const playerName = reader.readString();
  const research: Record<string, number> = {};

  // difficulty
  if (version >= 10) {
    if (version >= 17) {
      reader.readByte(); // difficulty
    } else if (reader.readBoolean()) {
      // difficulty = 2
    }
  }

  // playTime
  if (version >= 138) {
    reader.readInt64();
  }

  // hair
  reader.readInt32();
  if (version >= 228) {
    // hair set to 0
  }

  // hairDye
  if (version >= 82) {
    reader.readByte();
  }

  // team
  if (version >= 283) {
    reader.readByte();
  }

  // hideVisibleAccessory (10 bits)
  if (version >= 124) {
    reader.readByte(); // bits1
    reader.readByte(); // bits2
  } else if (version >= 83) {
    reader.readByte();
  }

  // hideMisc
  if (version >= 119) {
    reader.readByte();
  }

  // skinVariant/Male
  if (version <= 17) {
    // computed
  } else if (version < 107) {
    reader.readBoolean();
  } else {
    reader.readByte();
  }

  // stats
  reader.readInt32(); reader.readInt32(); reader.readInt32(); reader.readInt32();

  // extraAccessory
  if (version >= 125) {
    reader.readBoolean();
  }

  // biome stuff
  if (version >= 229) {
    reader.readBoolean(); reader.readBoolean();
    if (version >= 256) reader.readBoolean();
    if (version >= 324) reader.readBoolean();
    if (version >= 260) {
      reader.readBoolean(); reader.readBoolean(); reader.readBoolean(); reader.readBoolean(); reader.readBoolean();
    }
  }

  // downedDD2Event
  if (version >= 182) {
    reader.readBoolean();
  }

  // taxMoney
  if (version >= 128) {
    reader.readInt32();
  }

  // deaths
  if (version >= 254) {
    reader.readInt32(); reader.readInt32();
  }

  // Colors
  for (let i = 0; i < 8; i++) reader.readRGB();

  // armor
  const numArmor = version >= 124 ? 20 : (version >= 81 ? 16 : (version >= 38 ? 11 : 8));
  for (let i = 0; i < numArmor; i++) {
    reader.readInt32(); reader.readByte();
    if (version >= 322) reader.readBoolean();
  }

  // dye
  const numDye = version >= 124 ? 10 : (version >= 81 ? 8 : 3);
  for (let i = 0; i < numDye; i++) {
    reader.readInt32(); reader.readByte();
    if (version >= 322) reader.readBoolean();
  }

  // inventory
  const numInv = version >= 58 ? 58 : 48;
  for (let i = 0; i < numInv; i++) {
    reader.readInt32(); reader.readInt32(); reader.readByte();
    if (version >= 114) reader.readBoolean();
  }

  // miscEquips + miscDyes (5 each)
  for (let i = 0; i < 5; i++) {
    reader.readInt32(); reader.readByte();
    reader.readInt32(); reader.readByte();
  }

  // bank (40 items)
  for (let i = 0; i < 40; i++) {
    reader.readInt32(); reader.readInt32(); reader.readByte();
  }
  // bank2 (40 items)
  for (let i = 0; i < 40; i++) {
    reader.readInt32(); reader.readInt32(); reader.readByte();
  }
  // bank3
  if (version >= 182) {
    for (let i = 0; i < 40; i++) {
      reader.readInt32(); reader.readInt32(); reader.readByte();
    }
  }
  // bank4
  if (version >= 198) {
    for (let i = 0; i < 40; i++) {
      reader.readInt32(); reader.readInt32(); reader.readByte();
      if (version >= 255) reader.readBoolean();
    }
  }
  // voidVaultInfo
  if (version >= 199) {
    reader.readByte();
  }

  // buffs
  const numBuffs = version >= 252 ? 44 : (version >= 74 ? 22 : 10);
  for (let i = 0; i < numBuffs; i++) {
    const bt = reader.readInt32();
    void reader.readInt32(); // buff time
    if (bt === 0) { /* handled by loop */ }
  }

  // signs
  for (let i = 0; i < 200; i++) {
    const x = reader.readInt32();
    if (x === -1) break;
    reader.readInt32(); reader.readInt32(); reader.readString();
  }

  // hbLocked
  if (version >= 16) {
    reader.readBoolean();
  }

  // hideInfo
  if (version >= 115) {
    for (let i = 0; i < 13; i++) reader.readBoolean();
  }

  // anglerQuestsFinished
  if (version >= 98) {
    reader.readInt32();
  }

  // DpadRadial
  if (version >= 162) {
    for (let i = 0; i < 4; i++) reader.readInt32();
  }

  // builderAccStatus
  if (version >= 164) {
    const num = version >= 230 ? 12 : (version >= 197 ? 11 : (version >= 167 ? 10 : 8));
    for (let i = 0; i < num; i++) reader.readInt32();
  }

  // bartenderQuestLog
  if (version >= 181) {
    reader.readInt32();
  }

  // dead/respawnTimer
  if (version >= 200) {
    reader.readBoolean();
    if (reader.readBoolean()) {
      reader.readInt32();
    }
  }

  // lastTimePlayerWasSaved
  if (version >= 202) {
    reader.readInt64();
  }

  // golferScoreAccumulated
  if (version >= 206) {
    reader.readInt32();
  }

  // RESEARCH DATA!
  if (version >= 218) {
    console.log('Reading research at offset:', reader.position);

    if (version >= 282) {
      reader.readBoolean();
    }

    const count = reader.readInt32();
    console.log('Research count:', count);

    for (let i = 0; i < count; i++) {
      const name = reader.readString();
      const amount = reader.readInt32();
      if (name && name.length > 0 && name.length <= 60) {
        research[name] = amount;
      }
    }
  }

  return { playerName, research };
}

export async function parsePlrFile(arrayBuffer: ArrayBuffer): Promise<PlrFile> {
  const data = new Uint8Array(arrayBuffer);

  let decryptData: Uint8Array;

  // Check if already decrypted (starts with version number)
  const view = new DataView(data.buffer, data.byteOffset, 4);
  const possibleVersion = view.getInt32(0, true);
  const magicBytes = new TextDecoder('ascii', { fatal: false }).decode(data.slice(4, 11));

  if (possibleVersion > 100 && possibleVersion < 1000 && magicBytes === 'relogic') {
    decryptData = data;
  } else {
    decryptData = new Uint8Array(await decryptPlrData(arrayBuffer));
  }

  const reader = new BinaryReader(decryptData);

  const releaseVersion = reader.readInt32();
  console.log('Version:', releaseVersion);

  try {
    const metadata = readMetadata(reader);
    console.log('Metadata:', metadata);
  } catch (error) {
    console.error('Metadata error:', error);
  }

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
  return { totalResearched, progressPercent: Math.min(progressPercent, 100) };
}
