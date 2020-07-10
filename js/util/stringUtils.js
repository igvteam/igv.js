import Zlib from "../vendor/zlib_and_gzip.js"

/**
 * Covers string literals and String objects
 * @param x
 * @returns {boolean}
 */
function isString(x) {
    return typeof x === "string" || x instanceof String
}


// StackOverflow: http://stackoverflow.com/a/10810674/116169
function numberFormatter(rawNumber) {

    var dec = String(rawNumber).split(/[.,]/),
        sep = ',',
        decsep = '.';

    return dec[0].split('').reverse().reduce(function (prev, now, i) {
        return i % 3 === 0 ? prev + sep + now : prev + now;
    }).split('').reverse().join('') + (dec[1] ? decsep + dec[1] : '');
}


const splitLines = function (string) {
    return string.split(/\n|\r\n|\r/g);
}

function splitStringRespectingQuotes(string, delim) {

    var tokens = [],
        len = string.length,
        i,
        n = 0,
        quote = false,
        c;

    if (len > 0) {

        tokens[n] = string.charAt(0);
        for (i = 1; i < len; i++) {
            c = string.charAt(i);
            if (c === '"') {
                quote = !quote;
            } else if (!quote && c === delim) {
                n++;
                tokens[n] = "";
            } else {
                tokens[n] += c;
            }
        }
    }
    return tokens;
}

function stripQuotes(str) {
    if(str === undefined) {
        return str;
    }
    if(str.startsWith("'") || str.startsWith('"')) {
        str = str.substring(1);
    }
    if(str.endsWith("'") || str.endsWith('"')) {
        str = str.substring(0, str.length - 1);
    }
    return str;
}

function hashCode(s) {
    return s.split("").reduce(function (a, b) {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a
    }, 0);
}

/**
 * Compress string and encode in a url safe form
 * @param s
 */
function compressString(str) {
    const bytes = [];
    for (var i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i));
    }
    const compressedBytes = new Zlib.RawDeflate(bytes).compress();            // UInt8Arry
    const compressedString = String.fromCharCode.apply(null, compressedBytes);      // Convert to string
    let enc = btoa(compressedString);
    return enc.replace(/\+/g, '.').replace(/\//g, '_').replace(/=/g, '-');   // URL safe
}

/**
 * Uncompress the url-safe encoded compressed string, presumably created by compressString above
 *
 * @param enc
 * @returns {string}
 */
function uncompressString(enc) {
    enc = enc.replace(/\./g, '+').replace(/_/g, '/').replace(/-/g, '=')

    const compressedString = atob(enc);
    const compressedBytes = [];
    for (let i = 0; i < compressedString.length; i++) {
        compressedBytes.push(compressedString.charCodeAt(i));
    }
    const bytes = new Zlib.RawInflate(compressedBytes).decompress();

    let str = ''
    for (let b of bytes) {
        str += String.fromCharCode(b)
    }
    return str;
}

function capitalize(str) {
    return str.length > 0 ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

export {isString, numberFormatter, splitLines, splitStringRespectingQuotes, stripQuotes, hashCode, compressString, uncompressString, capitalize};