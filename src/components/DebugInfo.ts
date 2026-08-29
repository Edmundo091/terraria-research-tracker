/**
 * Stores the last decrypted .plr data for export
 */
let lastDecryptedData: ArrayBuffer | null = null;

export function setLastDecryptedData(data: ArrayBuffer | null) {
  lastDecryptedData = data;
}

export function getLastDecryptedData(): ArrayBuffer | null {
  return lastDecryptedData;
}