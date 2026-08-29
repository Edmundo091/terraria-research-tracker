const fs = require('fs');
const content = fs.readFileSync('/tmp/terraria-research-tracker/src/items.js', 'utf8');
const start = content.indexOf('const allItems = [');
const end = content.indexOf('];\nconst allItemsCount');
const itemsCode = content.substring(start, end + 2);
const code = itemsCode.replace('const allItems = ', '');
const allItems = eval(code);
console.log('Total items:', allItems.length);
const simple = allItems.map(i => ({
  id: i.id,
  name: i.name,
  internalName: i.internalName,
  needed: i.neededForResearch
}));
fs.writeFileSync('/home/edmundo/terraria-research-tracker/src/data/items.json', JSON.stringify(simple));
console.log('Wrote', simple.length, 'items to items.json');
