const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./src/data/items.json', 'utf8'));

for (const item of data) {
  const pageName = item.name.replace(/ /g, '_').replace(/'/g, '%27');
  const imageName = encodeURIComponent(item.name.replace(/ /g, '_'));
  item.imageUrl = `https://terraria.wiki.gg/images/${imageName}.png`;
  item.wikiUrl = `https://terraria.wiki.gg/wiki/${pageName}`;
}

fs.writeFileSync('./src/data/items.json', JSON.stringify(data, null, 2));
console.log('Added imageUrl and wikiUrl to', data.length, 'items');
