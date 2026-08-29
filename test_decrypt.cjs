const fs = require('fs');
const crypto = require('crypto');

const encryptedPath = '/var/home/edmundo/.local/share/Terraria/Players/Papito.plr';
const buffer = fs.readFileSync(encryptedPath);
console.log(`Encrypted file size: ${buffer.length} bytes`);

// The provided hex string: "68 00 33 00 79 00 5F 00 67 00 55 00 79 00 5A 00"
// Remove spaces and convert to Buffer
const hexKey = "6800330079005F006700550079005A00";
const key = Buffer.from(hexKey, 'hex');
console.log(`Key (${key.length} bytes):`, key.toString('hex'));

// Try IV of all zeros (16 bytes for AES)
const iv = Buffer.alloc(16, 0); // all zeros
console.log(`IV (${iv.length} bytes):`, iv.toString('hex'));

try {
  // Create decipher
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  // Set autoPadding to false initially; we can try both
  decipher.setAutoPadding(false);
  
  let decrypted = Buffer.concat([decipher.update(buffer), decipher.final()]);
  
  console.log(`Decrypted length: ${decrypted.length} bytes`);
  console.log('First 32 bytes decrypted:', decrypted.slice(0, 32).toString('hex'));
  
  // Check if it looks like a valid .plr: first 4 bytes should be decompressed length (little endian)
  if (decrypted.length >= 4) {
    const decompressedLength = decrypted.readUInt32LE(0);
    console.log(`Decompressed length (LE): ${decompressedLength}`);
    // Reasonable length? Terraria .plr decompressed is maybe a few hundred KB to a few MB.
    if (decompressedLength > 100 && decompressedLength < 50*1024*1024) { // less than 50MB
      console.log('Decompressed length looks plausible.');
      
      // Next, try to read player name length (int16) at offset 4
      if (decrypted.length >= 6) {
        const playerNameLength = decrypted.readInt16LE(4);
        console.log(`Player name length: ${playerNameLength}`);
        if (playerNameLength > 0 && playerNameLength < 100) {
          // Try to read player name as UTF-16LE
          const nameStart = 6;
          const nameBytes = decrypted.slice(nameStart, nameStart + playerNameLength * 2);
          let playerName = '';
          for (let i = 0; i < nameBytes.length; i += 2) {
            const charCode = nameBytes.readUInt16LE(i);
            if (charCode === 0) break;
            playerName += String.fromCharCode(charCode);
          }
          console.log(`Player name: "${playerName}"`);
          
          if (playerName.length > 0) {
            console.log('SUCCESS: Likely valid decryption!');
            // Save decrypted file for inspection
            fs.writeFileSync('/tmp/Papito_decrypted.plr', decrypted);
            console.log('Decrypted saved to /tmp/Papito_decrypted.plr');
          } else {
            console.log('Player name empty or invalid.');
          }
        } else {
          console.log('Player name length implausible.');
        }
      }
    } else {
      console.log('Decompressed length implausible.');
    }
  } else {
    console.log('Decrypted file too short.');
  }
} catch (e) {
  console.error('Error during decryption:', e.message);
}

// Also try with padding true
try {
  const decipher2 = crypto.createDecipheriv('aes-128-cbc', key, iv);
  decipher2.setAutoPadding(true);
  let decrypted2 = Buffer.concat([decipher2.update(buffer), decipher2.final()]);
  console.log(`\\nWith padding: Decrypted length: ${decrypted2.length} bytes`);
  console.log('First 32 bytes:', decrypted2.slice(0, 32).toString('hex'));
} catch (e) {
  console.error('Error with padding:', e.message);
}

// Try AES-256? Key is 16 bytes, so AES-128.
// Maybe the key is actually 32 bytes? The hex string is 16 bytes though.
// Could be that the IV is also part of the string? Let's try splitting: first 16 bytes key, next 16 bytes IV? But string is only 16 bytes total.
