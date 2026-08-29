/**
 * Terraria .plr file parser
 * Uses PlayerDeserializer to handle decryption and field-by-field deserialization.
 */
import { PlayerDeserializer } from './deserializer';
import { getAllItems } from './itemsDb';
import type { Item } from './itemsDb';

export interface PlrFile {
  playerName: string;
  research: Record<string, number>;
  version: number;
  items: any[];
}

export function getResearchProgress(research: Record<string, number>, items?: any[]) {
  const allItems = items || getAllItems();
  let complete = 0;
  let total = 0;
  for (const item of allItems) {
    total += item.needed || 1;
    const researched = research[item.internalName] || 0;
    complete += Math.min(researched, item.needed || 1);
  }
  return { progressPercent: total > 0 ? (complete / total) * 100 : 0 };
}

export async function parsePlrFile(arrayBuffer: ArrayBuffer): Promise<PlrFile> {
  const deserializer = new PlayerDeserializer();
  const playerData: any = await deserializer.deserializePlayer(arrayBuffer);

  // The deserializer returns the full player with all fields including inventory, etc.
  // We only need research + name for the tracker.
  const research: Record<string, number> = {};
  const items: Item[] = playerData.researchProgress?.items ?? [];

  for (const item of items) {
    if (item.researched && item.researched > 0) {
      research[item.internalName] = item.researched;
    }
  }

  return {
    playerName: playerData.name,
    research,
    version: playerData.releaseVersion || 0,
    items: playerData.researchProgress?.items || [],
  };
}
