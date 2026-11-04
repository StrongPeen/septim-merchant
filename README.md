# Merchant's Assistant

A small, standalone Windows calculator for Daedric Online merchants. It is separate from the Daedric Online website.

## Using the EXE

1. Double-click `Merchants-Assistant-1.0.0.exe`.
2. Enter one item name, such as `Iron Sword`—do not include the stack count in the name.
3. Enter the **price per item**, then set the quantity with the quantity control.
4. Pick a markup from the **Add markup** dropdown. Options run from 10% through 100%.
5. Click **Calculate asking price**.

The app starts **always on top**, so it can sit over Daedric Online while you trade. Click the pin button in the upper-right corner if you want to turn that behavior off temporarily. Drag the app by its top bar to move it anywhere on your screen.

## History

Every calculation is saved in the **Recent calculations** section on this computer. Click a history row to load it again. **Clear all** removes the saved local history.

The **Copy asking price** button copies the item name, total, and markup to your clipboard.

Deleted ledger entries are kept in a local recovery tray. Choose 1–5 and click **Restore deleted** to bring back the most recently deleted entries.

Inside the pricing book, each entry has a category selector so you can correct an automatic category. Options also includes **Download backup** for a complete local JSON backup and **Open Excel sheet** for a spreadsheet-compatible CSV of every saved calculation.

## Options

Open **Options** to choose the Daedric Online theme or a race theme: Altmer, Argonian, Bosmer, Breton, Dunmer, Dagoth, Imperial, Khajiit, Nord, Orc, Redguard, or Goblin. The selected theme is saved locally.

The **Giggles the Unstable** theme uses the included Giggles portrait and adds a soundboard button. Press **Giggles** whenever you want to play the included sound.

The **Open when Skyrim Special Edition starts** option is off by default. When enabled on Windows, the app starts quietly with Windows and opens itself when Skyrim Special Edition launches.

## Pricing book

Click **Open pricing book** to browse every saved calculation by Skyrim-style category. Item names are sorted automatically from words such as sword, ingot, potion, poison, scroll, soul gem, ring, and firewood.

Check multiple entries to build a bundle. Each selected entry has its own quantity control, so you can price combinations such as four Iron Swords and 700 Firewood. The book shows the price for each selected item, the combined total, and an optional 10–100% upsell applied across the whole selection.

## Building the EXE from source

Requirements: Windows, Node.js 20 or newer, and npm.

From this folder, run:

```powershell
npm install
npm run check
npm run build
```

The included portable EXE is `Merchants-Assistant.exe` in this folder. A fresh build creates a versioned portable EXE in the `release` folder.

To run the app without building it:

```powershell
npm start
```
