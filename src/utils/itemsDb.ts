import itemsData from '../data/items.json';

export interface Item {
  id: number;
  name: string;
  internalName: string;
  needed: number;
}

const itemsByName: Map<string, Item> = new Map();
for (const item of itemsData as Item[]) {
  itemsByName.set(item.internalName, item);
}

export function getItemByName(internalName: string): Item | undefined {
  return itemsByName.get(internalName);
}

export function getAllItems(): Item[] {
  return itemsData as Item[];
}

export function getItemName(internalName: string): string {
  return itemsByName.get(internalName)?.name ?? internalName;
}

export function getItemNeeded(internalName: string): number {
  return itemsByName.get(internalName)?.needed ?? 1;
}

export function getItemInternalName(itemId: number): string | undefined {
  for (const item of itemsData as Item[]) {
    if (item.id === itemId) return item.internalName;
  }
  return undefined;
}
