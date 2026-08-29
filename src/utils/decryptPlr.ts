/**
 * AES-128-CBC decryption for Terraria .plr files
 * Testing different key formats and IVs
 */

export function isEncryptedFile(data: Uint8Array): boolean {
  if (data.length < 2) return false;
  const firstByte = data[0];
  if ((firstByte & 0xC0) === 0xC0) return true;
  if ((firstByte & 0x80) === 0x80 && (firstByte & 0x40) === 0) return true;
  if (data.length >= 4) {
    const lengthLE = data[0] | (data[1] << 8) | (data[2] << 16) | (data[3] << 24);
    if (lengthLE >= 100 && lengthLE <= 50 * 1024 * 1024) return false;
  }
  return false;
}

function hexToBytes(hex: string): Uint8Array {
  hex = hex.replace(/\s/g, '');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function getArrayBuffer(bufferSource: ArrayBufferLike): ArrayBuffer {
  if (bufferSource instanceof ArrayBuffer) return bufferSource;
  const arrayBuffer = new ArrayBuffer(bufferSource.byteLength);
  new Uint8Array(arrayBuffer).set(new Uint8Array(bufferSource));
  return arrayBuffer;
}

async function decryptWithParams(
  encryptedData: ArrayBuffer,
  keyHex: string,
  ivHex: string
): Promise<ArrayBuffer> {
  const keyBytes = hexToBytes(keyHex);
  const ivBytes = hexToBytes(ivHex);
  
  const keyBuffer = getArrayBuffer(keyBytes.buffer);
  const ivBuffer = getArrayBuffer(ivBytes.buffer);
  const dataBuffer = getArrayBuffer(encryptedData);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBuffer, { name: 'AES-CBC' }, false, ['decrypt']
  );
  
  return crypto.subtle.decrypt({ name: 'AES-CBC', iv: ivBuffer }, cryptoKey, dataBuffer);
}

export async function decryptPlrData(encryptedData: ArrayBuffer): Promise<ArrayBuffer> {
  // Define multiple key/IV combinations to try
  const attempts = [
    { name: 'UTF-16LE key, zeros IV', key: '6800330079005f006700550079005a00', iv: '00000000000000000000000000000000' },
    { name: 'UTF-16LE key, same as key', key: '6800330079005f006700550079005a00', iv: '6800330079005f006700550079005a00' },
    { name: 'ASCII key (h3y_gUyZ), zeros IV', key: '6833795f6755795a', iv: '00000000000000000000000000000000' },
    { name: 'ASCII key (h3y_gUyZ), same as key', key: '6833795f6755795a', iv: '6833795f6755795a' },
    { name: 'Hex from string bytes', key: '6833795f6755795a00', iv: '00000000000000000000000000000000' },
  ];

  for (const attempt of attempts) {
    console.log(`Trying: ${attempt.name}`);
    console.log(`  Key: ${attempt.key}`);
    console.log(`  IV:  ${attempt.iv}`);
    
    try {
      const decrypted = await decryptWithParams(encryptedData, attempt.key, attempt.iv);
      const decryptedBytes = new Uint8Array(decrypted);
      
      // Check if decrypted data looks valid
      const first4 = decryptedBytes.slice(0, 4);
      console.log(`  Decrypted first 4 bytes: ${Array.from(first4).join(', ')}`);
      
      // Check for Terraria magic or valid version
      const view = new DataView(decryptedBytes.buffer, decryptedBytes.byteOffset, 4);
      const possibleVersion = view.getInt32(0, true);
      console.log(`  Possible version (Int32 LE): ${possibleVersion}`);
      
      // Valid Terraria versions are typically 200-300+
      if (possibleVersion >= 200 && possibleVersion < 1000) {
        console.log(`  ✓ VALID VERSION FOUND: ${possibleVersion}`);
        return decrypted;
      }
      
      // Check for "relogic" magic (Terraria files)
      if (decryptedBytes.slice(4, 11).every((b, i) => b === [0x72, 0x65, 0x6c, 0x6f, 0x67, 0x69, 0x63][i])) {
        console.log(`  ✓ Found "relogic" magic`);
        return decrypted;
      }
      
    } catch (error: any) {
      console.log(`  ✗ Failed: ${error.message}`);
    }
  }
  
  throw new Error('Could not decrypt file with any known key/IV combination');
}
