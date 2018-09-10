/* Module header based on https://github.com/umdjs/umd/blob/master/templates/returnExports.js
 */

(function (root, factory) {
   
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        if(!root) root = window;   // Neccessary for Babel transform, which changes "this" to void
        root.igv = factory();
    }
 }(this, function () {
//
//     // Just return a value to define the module export.
//     // This example returns an object, but the module
//     // can return a function as the exported value.
//     return igv;
//
// }));


