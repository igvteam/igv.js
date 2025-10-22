# Migration from Legacy IGV.js

## Overview
This repository has been refactored to focus on the minimal browser architecture. The legacy IGV.js codebase has been moved to `legacy/` for reference.

## What Changed

### Removed Features
- Pan and zoom interactions
- Multi-locus views
- Complex event system
- ROI management
- Sample information panels
- Track menus and configuration UI
- Session management
- Viewport caching

### What Remains
- Static track rendering at specified locus
- Multiple track types (WIG, genes, sequence, ideogram)
- Gene name search
- Responsive layout
- Clean embeddable API

## If You Need Legacy IGV.js

### Option 1: Use Legacy Version
```bash
npm install igv@3.5.3
```

### Option 2: Access Legacy Code
The complete legacy codebase is preserved in `legacy/` directory for reference.

### Option 3: Fork Before This Commit
```bash
git checkout <commit-before-refactor>
```

## API Changes

### Before (Legacy)
```javascript
const igvBrowser = await igv.createBrowser(container, config)
igvBrowser.search('EGFR')
```

### After (Minimal)
```javascript
const browser = await IGV.create(container, config)
await browser.setLocus('EGFR')
```

## Rationale

The minimal browser provides:
- Cleaner, more maintainable architecture
- Easier to understand and extend
- Better separation of concerns
- Modern ES6+ patterns
- Focused feature set

