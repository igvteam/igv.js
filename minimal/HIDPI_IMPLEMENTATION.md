# HiDPI (Retina Display) Implementation

## Overview

The minimal genome browser now includes full support for high-DPI displays (Retina, 4K, etc.), ensuring crisp, pixel-perfect rendering of all genomic data.

## What is HiDPI?

**Device Pixel Ratio (DPR)** is the ratio between physical pixels and CSS pixels on a display:
- **Standard displays**: DPR = 1 (1 CSS pixel = 1 physical pixel)
- **Retina displays**: DPR = 2 (1 CSS pixel = 4 physical pixels, 2×2)
- **4K displays**: DPR = 2-3+ depending on resolution and scaling

Without HiDPI support, canvas content appears blurry on high-resolution displays because the browser stretches 1 pixel across 2-3 physical pixels.

## How It Works

### 1. **Canvas Scaling** (`minimal/ui/canvas.js`)

The `createCanvas()` function:
```javascript
export function createCanvas(width, height) {
    const canvas = document.createElement('canvas')
    const dpr = window.devicePixelRatio || 1
    
    // CSS size (visual size on screen)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    
    // Memory size (scaled for HiDPI)
    canvas.width = width * dpr
    canvas.height = height * dpr
    
    // Apply scale transform so draw calls use CSS pixels
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    
    return canvas
}
```

**Example**: On a 2x Retina display with a 1000px wide canvas:
- CSS size: `1000px × 100px` (how it looks on screen)
- Memory size: `2000px × 200px` (actual pixel buffer)
- All draw calls still use CSS coordinates (e.g., `ctx.fillRect(0, 0, 10, 10)`)

### 2. **Dimension Helpers**

**`getCanvasDimensions(canvas)`**: Converts canvas memory size back to CSS pixels
```javascript
const dimensions = getCanvasDimensions(canvas)
// Returns: { width: 1000, height: 100 } (CSS pixels, not memory pixels)
```

**`getDevicePixelRatio()`**: Returns the current display's DPR
```javascript
const dpr = getDevicePixelRatio()
// Returns: 1 (standard), 2 (Retina), 3 (4K), etc.
```

### 3. **Renderer Integration** (`minimal/core/browser.js`)

Renderers receive CSS pixel dimensions, not memory dimensions:
```javascript
render() {
    for (const viewModel of this.viewModels) {
        const { canvas } = this.ui.createTrackUI(viewModel)
        const ctx = canvas.getContext('2d')
        
        // Get CSS pixel dimensions for rendering
        const dimensions = getCanvasDimensions(canvas)
        
        const renderer = RendererRegistry.get(viewModel.type)
        renderer.render(ctx, viewModel, dimensions)
    }
}
```

### 4. **Resize Handling**

On browser resize:
1. Old canvases are destroyed (`ui.cleanup()`)
2. New canvases are created with `createCanvas()` at the new width
3. HiDPI scaling is automatically reapplied

This is safe because **setting `canvas.width` or `canvas.height` resets the context**, so we must create fresh canvases anyway.

## Implementation Details

### Key Files

1. **`minimal/ui/canvas.js`**
   - `createCanvas()` - Creates HiDPI-scaled canvas
   - `getCanvasDimensions()` - Converts memory size to CSS pixels
   - `getDevicePixelRatio()` - Gets current DPR

2. **`minimal/core/browser.js`**
   - Imports `getCanvasDimensions`
   - Passes CSS dimensions to renderers

3. **`minimal.html`**
   - Displays DPR badge in header
   - Shows "HiDPI rendering enabled" message

### Important Rules

✅ **DO:**
- Use `createCanvas()` to create all canvases
- Use `getCanvasDimensions()` to get CSS pixel dimensions
- Draw using CSS pixel coordinates (the context handles scaling)
- Create new canvases on resize (don't reuse)

❌ **DON'T:**
- Manually set `canvas.width` or `canvas.height` after creation
- Use `canvas.width / window.devicePixelRatio` manually (use helper instead)
- Assume `canvas.width` equals CSS width (it's scaled!)
- Try to preserve canvases on resize (context resets anyway)

## Testing

### Visual Verification

1. **On Retina/HiDPI Display:**
   - All text should be crisp and clear
   - Gene annotations should have sharp edges
   - Ruler tick marks should be 1-pixel thin
   - No blurry or fuzzy rendering

2. **On Standard Display:**
   - Everything should render normally
   - No performance impact
   - Canvas sizes should match expectations

### DPR Badge

The test page (`minimal.html`) shows your current DPR:
- **1x Display** = Standard DPI (gray badge)
- **2x Display** = Retina/HiDPI (green badge)
- **3x Display** = Ultra high-DPI (green badge)

### Console Verification

The canvas module logs DPR on startup. Check console for:
```
Canvas: Creating HiDPI canvas - CSS: 1200x50px, Memory: 2400x100px, DPR: 2
```

## Performance

### Memory Usage
- **Standard (1x)**: 1200px × 50px = 60,000 pixels
- **Retina (2x)**: 2400px × 100px = 240,000 pixels (4× more)
- **4K (3x)**: 3600px × 150px = 540,000 pixels (9× more)

### Rendering Performance
- Context scaling is handled by GPU (very fast)
- No additional CPU cost for draw calls
- Slightly more memory bandwidth needed
- Overall: imperceptible performance impact

## Browser Support

- **Chrome**: Full support (DPR = 2-3 on Retina)
- **Firefox**: Full support (DPR = 2-3 on Retina)
- **Safari**: Full support (DPR = 2 on Retina)
- **Edge**: Full support (DPR = 2-3 on Retina)

All modern browsers support `window.devicePixelRatio` and canvas scaling.

## References

- [MDN: Window.devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio)
- [HTML5 Canvas HiDPI Tutorial](https://www.html5rocks.com/en/tutorials/canvas/hidpi/)
- [Canvas Cheatsheet: HiDPI](https://dev.opera.com/articles/canvas-cheat-sheet/)

