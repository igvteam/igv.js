To update the cram-js bundle

(1)  clone the GMode cram-js repository:  https://github.com/GMOD/cram-js

(2)  build dist bundle

```bash
yarn install
npm run build
```

(3) copy `<cram-js repo>/dist/cram-bundle.js`  to `<igv.js-repo>/js/cram/cram-bundle.js`

Edit `cram-bundle.js` as follows. (The gmod distribution bundle sets a windows global, and does not provide an ES6
export.  The modification below will convert the bundle to an ES6 module, required by igv.js)

(4) Add an export default statment to the beginning of the file

```js
 export default ....
```

(5) replace ```window.gmodCram= ``` at the end of the file with ```return ```,  e.g.

```js
var n = r(5590);return n})();
```



