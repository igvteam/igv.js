const encodings = new Map([
    ["%09", "\t"],
    ["%0A", "\n"],
    ["%0D", "\r"],
    ["%25", "%"],
    ["%3B", ";"],
    ["%3D", "="],
    ["%26", "&"],
    ["%2C", ","]
])


// GFF3 attributes have specific percent encoding rules, the list below are required, all others are forbidden
/*
tab (%09)
newline (%0A)
carriage return (%0D)
% percent (%25)
control characters (%00 through %1F, %7F)
In addition, the following characters have reserved meanings in column 9 and must be escaped when used in other contexts:
; semicolon (%3B)
= equals (%3D)
& ampersand (%26)
, comma (%2C)
 */

function decodeGFFAttribute(str) {

    if (!str.includes("%")) {
        return str
    }
    let decoded = ""
    for (let i = 0; i < str.length; i++) {

        if (str.charCodeAt(i) === 37 && i < str.length - 2) {
            const key = str.substring(i, i + 3)
            if (encodings.has(key)) {
                decoded += encodings.get(key)
            } else {
                decoded += key
            }
            i += 2
        } else {
            decoded += str.charAt(i)
        }
    }
    return decoded

}

/**
 * Parse the attribute string, returning an array of key-value pairs.  An array is used rather than a map as attribute
 * keys are not required to be unique.
 *
 * @param attributeString
 * @param keyValueDelim
 * @returns {[]}
 */
function parseAttributeString(attributeString, keyValueDelim = "=") {
    // parse 'attributes' string (see column 9 docs in https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md)
    const isGff3 = ('=' === keyValueDelim)
    var attributes = []
    for (let kv of attributeString.split(';')) {
        kv = kv.trim()
        const idx = kv.indexOf(keyValueDelim)
        if (idx > 0 && idx < kv.length - 1) {
            let key = decodeGFFAttribute(kv.substring(0, idx).trim())
            let value = decodeGFFAttribute(kv.substring(idx + 1).trim())
            if (!isGff3) {
                key = stripQuotes(key)
                value = stripQuotes(value)
            }
            attributes.push([key, value])
        }
    }
    return attributes
}

function stripQuotes(value) {
    if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substr(1, value.length - 2)
    }
    return value
}

export {parseAttributeString}
export {decodeGFFAttribute}