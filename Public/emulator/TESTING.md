# Testing the GBA-Supabase Integration

## Quick Test (No ROM Modification)

Now that the system is running, you can test it using the browser console:

### Step 1: Load the Emulator
Navigate to: http://localhost:8080/emulator

### Step 2: Wait for Initialization
Open the browser console (F12) and wait for this message:
```
Memory watcher initialized and started
```

### Step 3: Trigger a Question Manually
In the console, run:
```javascript
// Write trigger value to memory
window.EJS_emulator.Module.HEAPU8[0x0203FFFF] = 1;
```

### Step 4: Observe
- Game should pause
- Question overlay should appear
- Question fetched from Supabase
- Answer and see result

### Step 5: Check Result Written Back
After answering, check what was written to memory:
```javascript
// Check the result (1=correct, 0=wrong)
console.log('Result:', window.EJS_emulator.Module.HEAPU8[0x0203FFFE]);
```

---

## Debugging Commands

### Check if emulator is loaded:
```javascript
console.log('Emulator:', window.EJS_emulator);
console.log('Module:', window.EJS_emulator?.Module);
console.log('Memory (HEAPU8):', window.EJS_emulator?.Module?.HEAPU8);
```

### Read any memory address:
```javascript
const address = 0x0203FFFF;
const value = window.EJS_emulator.Module.HEAPU8[address];
console.log(`Address 0x${address.toString(16)}: ${value}`);
```

### Write to memory:
```javascript
window.EJS_emulator.Module.HEAPU8[0x0203FFFF] = 1;  // Trigger question
window.EJS_emulator.Module.HEAPU8[0x0203FFFD] = 2;  // Set type to Analytical
```

---

## Expected Console Output

When working correctly, you should see:
```
EmulatorJS loaded successfully from CDN
Emulator ready, initializing memory watcher...
Memory watcher initialized and started
Memory trigger detected at 0x0203FFFF: 1
Question trigger detected!
Emulator paused
Question type from memory: 0 => Math
Wrote 1 to 0x0203FFFE
Emulator resumed
```
