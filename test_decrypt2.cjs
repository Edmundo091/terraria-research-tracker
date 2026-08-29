const fs = require('fs');
const crypto = require('crypto');

const encryptedPath = '/var/home/edmundo/.local/share/Terraria/Players/Papito.plr';
const buffer = fs.readFileSync(encryptedPath);

// The string from hex: "68 00 33 00 79 00 5F 00 67 00 55 00 79 00 5A 00"
// Decoded as UTF-16LE: "h3y_gUyZ"
const password = "h3y_gUyZ";
console.log(`Password: "${password}" (length ${password.length})`);

// Try various common encryption methods
function tryDecrypt(algorithm, key, iv, options = {}) {
  try {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    if (options.autoPadding !== undefined) decipher.setAutoPadding(options.autoPadding);
    let decrypted = Buffer.concat([decipher.update(buffer), decipher.final()]);
    return { success: true, data: decrypted, length: decrypted.length };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Try different key derivations from password
const algorithms = ['aes-128-cbc', 'aes-192-cbc', 'aes-256-cbc', 'aes-128-ecb', 'aes-192-ecb', 'aes-256-ecb'];
const ivs = [
  { name: 'zeros', iv: Buffer.alloc(16, 0) },
  { name: 'password', iv: Buffer.from(password, 'utf8').slice(0, 16) },
  { name: 'password_padded', iv: Buffer.from(password.padEnd(16, '\0'), 'utf8') },
];

// Try password as raw key (padded to 16/24/32 bytes)
for (const algo of algorithms) {
  const keyLength = parseInt(algo.split('-')[1], 10) / 8;
  let key = Buffer.from(password, 'utf8');
  if (key.length < keyLength) {
    key = Buffer.concat([key, Buffer.alloc(keyLength - key.length, 0)]);
  } else if (key.length > keyLength) {
    key = key.slice(0, keyLength);
  }
  for (const iv of ivs) {
    const result = tryDecrypt(algo, key, iv.iv);
    if (result.success) {
      console.log(`Success with ${algo}, key="${password}", iv=${iv.name}, len=${result.length}`);
      // Check if it looks like valid .plr
      const dl = result.data.readUInt32LE(0);
      console.log(`  Decompressed length: ${dl}`);
      // Check if there's a player name
      if (result.data.length >= 6) {
        const nameLen = result.data.readInt16LE(4);
        console.log(`  Name length: ${nameLen}`);
      }
    }
  }
}

// Try MD5 hash of password as key
const md5Key = crypto.createHash('md5').update(password).digest();
console.log(`\nMD5 key: ${md5Key.toString('hex')}`);
for (const algo of algorithms) {
  const keyLength = parseInt(algo.split('-')[1], 10) / 8;
  const key = md5Key.slice(0, keyLength);
  for (const iv of ivs) {
    const result = tryDecrypt(algo, key, iv.iv);
    if (result.success) {
      console.log(`Success with ${algo}, MD5 key, iv=${iv.name}, len=${result.length}`);
      const dl = result.data.readUInt32LE(0);
      console.log(`  Decompressed length: ${dl}`);
    }
  }
}

// Try SHA256 hash of password as key
const sha256Key = crypto.createHash('sha256').update(password).digest();
console.log(`\nSHA256 key: ${sha256Key.toString('hex')}`);
for (const algo of algorithms) {
  const keyLength = parseInt(algo.split('-')[1], 10) / 8;
  const key = sha256Key.slice(0, keyLength);
  for (const iv of ivs) {
    const result = tryDecrypt(algo, key, iv.iv);
    if (result.success) {
      console.log(`Success with ${algo}, SHA256 key, iv=${iv.name}, len=${result.length}`);
    }
  }
}

// Try PBKDF2
const salt = Buffer.from('terraria', 'utf8');
const pbkdf2Key = crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256');
console.log(`\nPBKDF2 key: ${pbkdf2Key.toString('hex')}`);
for (const algo of algorithms) {
  const keyLength = parseInt(algo.split('-')[1], 10) / 8;
  const key = pbkdf2Key.slice(0, keyLength);
  for (const iv of ivs) {
    const result = tryDecrypt(algo, key, iv.iv);
    if (result.success) {
      console.log(`Success with ${algo}, PBKDF2 key, iv=${iv.name}, len=${result.length}`);
    }
  }
}