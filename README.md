# Terraria Research Tracker

A React + TypeScript + Vite app that decrypts and reads `.plr` files (AES-128-CBC) to show research progress against the full 6,199-item database.

## Features
- Load `.plr` files (encrypted with AES-128-CBC, key/IV derived from Steam Cloud format)
- Compare research with full item database (`items.json` with `imageUrl` and `wikiUrl`)
- Filter by missing / partial / done / all
- Search by name / internalName / item id
- Sort by name (A-Z / Z-A) or id (ascending / descending)
- Responsive grid layout (4/6/8 columns) with status-colored borders and images from `terraria.wiki.gg`
- Export JSON data (`?debug` shows console)
- Console panel only visible when `?debug` is present

## Decryption Details
- AES-128-CBC using key/IV: `6800330079005f006700550079005a00`
- Binary parser reads Int32 version, UInt64 metadata (`"relogic"`), and sequential player fields matching `deserializer.js`

## Build & Run
```bash
npm install
npm run dev
npm run build
```

## Data Source
`items.json` extracted from `/tmp/terraria-research-tracker/src/items.js` (`allItems` array).
