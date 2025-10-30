To update the cram-js bundle

(1)  update the @gmod/cram package to the latest version in package.json

```bash

(2)  update the @gmod/cram package by running the following command in the igv.js root directory

```bash
npm install
```

(3) copy `node_modules/@gmod/cram/dist/cram-bundle.js`  to `js/cram/cram-bundle.js`

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



