# EmulatorJS Files Required

Place these files in `public/emulator/data/`:

## Core Files
- `loader.js` - The main EmulatorJS loader
- `gba.wasm` - Game Boy Advance WebAssembly core (mGBA)
- `gba.js` - JavaScript wrapper for the GBA core

## Download Instructions

### Option 1: Official GitHub Release
Visit: https://github.com/EmulatorJS/EmulatorJS
- Download the latest release
- Extract the `data/` folder contents to your `public/emulator/data/` directory

### Option 2: Direct CDN Links (for testing)
You can temporarily use CDN links by modifying the script src:
```html
<script src="https://cdn.emulatorjs.org/stable/data/loader.js"></script>
```

And update the config:
```javascript
EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
```

## File Structure After Setup
```
public/
├── emulator/
│   └── data/
│       ├── loader.js          (Required)
│       ├── gba.wasm           (Required for GBA)
│       ├── gba.js             (Required for GBA)
│       ├── data/
│       │   ├── cores/
│       │   ├── localization/
│       │   └── textures/
│       └── (additional support files)
└── games/
    └── your-rom-file.gba
```

## Estimated Download Size
- loader.js: ~200KB
- gba.wasm: ~3-5MB
- Additional data files: ~10-15MB total

## Important Notes
1. **Legal ROMs Only**: Only use ROM files you legally own
2. **File Permissions**: Ensure files are readable by your web server
3. **CORS**: If hosting separately, ensure CORS headers are set correctly
4. **Performance**: WebAssembly cores perform best in modern browsers (Chrome, Firefox, Edge)

## Testing
After placing files, test by:
1. Opening the emulator page
2. Check browser console for errors
3. Verify the game loads
4. Test save/load functionality
