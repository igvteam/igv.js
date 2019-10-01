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

function hashCode(s) {
    return s.split("").reduce(function (a, b) {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a
    }, 0);
}

export {isString, numberFormatter, splitLines, splitStringRespectingQuotes, hashCode};