## Updating the CRAM bundle

`cram-bundle.js` is a vendored, pre-patched copy of the `@gmod/cram` dist bundle.
`@gmod/cram` is **not** in `devDependencies` — install it temporarily when regenerating the bundle.

### Steps

1. Install the package temporarily:
   ```bash
   npm install --no-save @gmod/cram
   ```

2. Copy the dist bundle:
   ```bash
   cp node_modules/@gmod/cram/dist/cram-bundle.js js/cram/cram-bundle.js
   ```

3. Patch `js/cram/cram-bundle.js` to convert from UMD to ES module:

   **At the very start of the file**, add an `export default` before the IIFE:
   ```js
   export default (()=>{ ...
   ```

   **At the very end of the file**, replace the UMD global assignment:
   ```js
   // before:
   window.gmodCram = r(5590); })();
   // after:
   var n = r(5590); return n; })();
   ```

4. Commit the updated `cram-bundle.js`.
