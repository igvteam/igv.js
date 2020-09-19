/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import getDataWrapper from "../feature/dataWrapper.js";
import {IGVColor} from "../../node_modules/igv-utils/src/index.js";

/**
 *  Define parsers for bed-like files  (.bed, .gff, .vcf, etc).  A parser should implement 2 methods
 *
 *     parseHeader(data) - return an object representing a header or metadata.  Details are format specific
 *
 *     parseFeatures(data) - return an array of features
 *
 */

var aedRegexpNoNamespace = new RegExp("([^:]*)\\(([^)]*)\\)"); // name(type) for AED parsing (namespace undefined)
var aedRegexpNamespace = new RegExp("([^:]*):([^(]*)\\(([^)]*)\\)"); // namespace:name(type) for AED parsing


class AEDParser {

    constructor(format, decode, config) {
        this.nameField = config ? config.nameField : undefined;
        this.skipRows = 0;   // The number of fixed header rows to skip.  Override for specific types as needed
        if (decode) {
            this.decode = decode;
        } else {
            this.decode = decodeAed;
        }
        this.delimiter = "\t";
    }

    parseHeader(data) {
        let line;
        let header;
        const dataWrapper = getDataWrapper(data);
        while (line = dataWrapper.nextLine()) {
            if (line.startsWith("track") || line.startsWith("#") || line.startsWith("browser")) {
                if (line.startsWith("track") || line.startsWith("#track")) {
                    let h = parseTrackLine(line);
                    if (header) {
                        Object.assign(header, h);
                    } else {
                        header = h;
                    }
                } else if (line.startsWith("#columns")) {
                    let h = parseColumnsDirective(line);
                    if (header) {
                        Object.assign(header, h);
                    } else {
                        header = h;
                    }
                } else if (line.startsWith("##gff-version 3")) {
                    this.format = "gff3";
                    if (!header) header = {};
                    header["format"] = "gff3";
                }
            } else {
                break;
            }
        }
        this.header = header;    // Directives might be needed for parsing lines
        return header;
    }

    parseFeatures(data) {

        if (!data) return null;

        const dataWrapper = getDataWrapper(data);
        const nextLine = dataWrapper.nextLineNoTrim.bind(dataWrapper);
        const allFeatures = [];
        let cnt = 0;
        const decode = this.decode;
        const delimiter = this.delimiter || "\t";
        let i = 0;
        let line;
        let wig;

        while ((line = nextLine()) !== undefined) {
            i++;
            if (i <= this.skipRows || line.startsWith("track") || line.startsWith("#") || line.startsWith("browser")) {
                continue;
            }

            let tokens = readTokensAed();
            if (tokens.length < 1) {
                continue;
            }

            if (!this.aed) {
                // Store information about the aed header in the parser itself
                // This is done only once - on the first row
                this.aed = parseAedHeaderRow(tokens);
                continue;
            }

            const feature = decode.call(this, tokens, wig);
            if (feature) {
                allFeatures.push(feature);
                cnt++;
            }
        }

        return allFeatures;

        // Double quoted strings can contain newlines in AED
        // "" is an escape for a ".
        // Parse all this, clean it up, split into tokens in a custom way
        function readTokensAed() {
            var tokens = [],
                token = "",
                quotedString = false,
                n,
                c;

            while (line || line === '') {
                for (n = 0; n < line.length; n++) {
                    c = line.charAt(n);
                    if (c === delimiter) {
                        if (!quotedString) {
                            tokens.push(token);
                            token = "";
                        } else {
                            token += c;
                        }
                    } else if (c === "\"") {
                        // Look ahead to the next character
                        if (n + 1 < line.length && line.charAt(n + 1) === "\"") {
                            if (quotedString) {
                                // Turn "" into a single " in the output string
                                token += "\"";
                            } else {
                                // "" on its own means empty string, ignore
                            }
                            // Skip the next double quote
                            n++;
                        } else {
                            // We know the next character is NOT a double quote, flip our state
                            quotedString = !quotedString;
                        }
                    } else {
                        token += c;
                    }
                }
                // We are at the end of the line
                if (quotedString) {
                    token += '\n'; // Add newline to the token
                    line = nextLine(); // Keep going
                } else {
                    // We can end the loop
                    break;
                }
            }
            // Push the last token
            tokens.push(token);
            return tokens;
        }
    }
}


function parseAedToken(value) {
    // Example: refseq:accessionNumber(aed:String)
    // refseq - namespace, will be declared later
    // accessionNumber - name of the field
    // aed:String - type of the field
    // The namespace part may be missing
    var match = aedRegexpNamespace.exec(value);
    if (match) {
        return {
            namespace: match[1],
            name: match[2],
            type: match[3]
        }
    }

    match = aedRegexpNoNamespace.exec(value);
    if (match) {
        return {
            namespace: '?',
            name: match[1],
            type: match[2]
        }
    } else {
        throw new Error("Error parsing the header row of AED file - column not in ns:name(ns:type) format");
    }
}

function parseAedHeaderRow(tokens) {
    // First row of AED file defines column names
    // Each header item is an aed token - see parseAedToken
    var aed,
        k,
        token,
        aedToken;

    // Initialize aed section to be filled in
    aed = {
        columns: [ // Information about the namespace, name and type of each column
            // Example entry:
            // { namespace: 'bio', name: 'start', type: 'aed:Integer' }
        ],
        metadata: { // Metadata about the entire AED file
            // Example:
            // {
            //    aed: {
            //       application: { value: "CHaS Browser 3.3.0.139 (r10838)", type: "aed:String" },
            //       created: { value: "2018-01-02T10:20:30.123+01:00", type: "aed:DateTime" },
            //       modified: { value: "2018-03-04T11:22:33.456+01:00", type: "aed:DateTime" },
            //    }
            //    affx: {
            //       ucscGenomeVersion: { value: "hg19", type: "aed:String" }
            //    },
            //    namespace: {
            //       omim: { value: "http://affymetrix.com/ontology/www.ncbi.nlm.nih.gov/omim/", type: "aed:URI" },
            //       affx: { value: "http://affymetrix.com/ontology/", type: "aed:URI" },
            //       refseq: { value: "http://affymetrix.com/ontology/www.ncbi.nlm.nih.gov/RefSeq/", type: "aed:URI" }
            //    }
            // }
        }
    };
    for (k = 0; k < tokens.length; k++) {
        token = tokens[k];
        aedToken = parseAedToken(token);
        aed.columns.push(aedToken);
    }

    return aed;
}

function parseTrackLine(line) {

    const properties = {};
    const tokens = line.split(/(?:")([^"]+)(?:")|([^\s"]+)(?=\s+|$)/g);


    // Clean up tokens array
    let curr;
    const tmp = [];
    for (let tk of tokens) {
        if (!tk || tk.trim().length === 0) continue;
        if (tk.endsWith("=") > 0) {
            curr = tk;
        } else if (curr) {
            tmp.push(curr + tk);
            curr = undefined;
        } else {
            tmp.push(tk);
        }
    }
    for (let str of tmp) {
        if (!str) return;
        var kv = str.split('=', 2);
        if (kv.length === 2) {
            const key = kv[0].trim();
            const value = kv[1].trim();
            properties[key] = value;
        }

    }

    return properties;
}

function parseColumnsDirective(line) {

    let properties = {};
    let t1 = line.split(/\s+/);

    if (t1.length === 2) {

        let t2 = t1[1].split(";");

        t2.forEach(function (keyValue) {

            let t = keyValue.split("=");

            if (t[0] === "color") {
                properties.colorColumn = Number.parseInt(t[1]) - 1;
            } else if (t[0] === "thickness") {
                properties.thicknessColumn = Number.parseInt(t[1]) - 1;
            }
        })
    }

    return properties;
}

function decodeBedGraph(tokens, ignore) {

    var chr, start, end, value;

    if (tokens.length < 3) return null;

    chr = tokens[0];
    start = parseInt(tokens[1]);
    end = parseInt(tokens[2]);
    value = parseFloat(tokens[3]);
    const feature = {chr: chr, start: start, end: end, value: value};

    // Optional extra columns
    if (this.header) {
        let colorColumn = this.header.colorColumn;
        if (colorColumn && colorColumn < tokens.length) {
            feature.color = IGVColor.createColorString(tokens[colorColumn])
        }
    }

    return feature;
}

function parseAttributeString(attributeString, keyValueDelim) {
    // parse 'attributes' string (see column 9 docs in https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md)
    var attributes = {};
    for (let kv of attributeString.split(';')) {
        const t = kv.trim().split(keyValueDelim, 2)
        if (t.length === 2) {
            const key = t[0].trim();
            let value = t[1].trim();
            //Strip off quotes, if any
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substr(1, value.length - 2);
            }
            attributes[key] = value;
        }
    }
    return attributes
}

/**
 * AED file feature.
 *
 * @param aed link to the AED file object containing file-level metadata and column descriptors
 * @param allColumns All columns as parsed from the AED
 *
 * Other values are parsed one by one
 */
function AedFeature(aed, allColumns) {
    var token, aedColumn, aedColumns = aed.columns;

    // Link to AED file (for metadata)
    this.aed = aed;

    // Unparsed columns from AED file
    this.allColumns = allColumns;

    // Prepare space for the parsed values
    this.chr = null;
    this.start = null;
    this.end = null;
    this.score = 1000;
    this.strand = '.';
    this.cdStart = null;
    this.cdEnd = null;
    this.name = null;
    this.color = null;

    for (let i = 0; i < allColumns.length; i++) {
        token = allColumns[i];
        if (!token) {
            // Skip empty fields
            continue;
        }
        aedColumn = aedColumns[i];
        if (aedColumn.type === 'aed:Integer') {
            token = parseInt(token);
        }
        var arr=[];
        if(aedColumn.namespace.length > 0) {
            for (let j = 0; j < aedColumn.namespace.length; j++) {
                arr.push(aedColumn.namespace.charCodeAt(j))
            }
        }
        if (aedColumn.namespace.trim() === 'bio') {
            if (aedColumn.name === 'sequence') {
                this.chr = token;
            } else if (aedColumn.name === 'start') {
                this.start = token;
            } else if (aedColumn.name === 'end') {
                this.end = token;
            } else if (aedColumn.name === 'cdsMin') {
                this.cdStart = token;
            } else if (aedColumn.name === 'cdsMax') {
                this.cdEnd = token;
            } else if (aedColumn.name === 'strand') {
                this.strand = token;
            }
        } else if (aedColumn.namespace === 'aed') {
            if (aedColumn.name === 'name') {
                this.name = token;
            }
        } else if (aedColumn.namespace === 'style') {
            if (aedColumn.name === 'color') {
                this.color = IGVColor.createColorString(token);
            }
        }
    }
}

AedFeature.prototype.popupData = function () {
    var data = [],
        aed = this.aed;
    // Just dump everything we have for now
    for (var i = 0; i < this.allColumns.length; i++) {
        var featureValue = this.allColumns[i];
        var name = aed.columns[i].name;
        // Skip columns that are not interesting - you know the sequence, and you can see color
        if (name !== 'sequence' && name !== 'color') {
            if (featureValue) {
                data.push({name: name, value: featureValue});
            }
        }
    }
    return data;
};

/**
 * Decode the AED file format
 * @param tokens
 * @param ignore
 * @returns decoded feature, or null if this is not a valid record
 */
function decodeAed(tokens, ignore) {
    var name, value, token,
        nonEmptyTokens = 0,
        aedColumns = this.aed.columns,
        aedColumn,
        aedKey,
        i;

    // Each aed row must match the exact number of columns or we skip it
    if (tokens.length !== aedColumns.length) {
        console.log('Corrupted AED file row: ' + tokens.join(','));
        return undefined;
    }

    for (i = 0; i < tokens.length; i++) {
        aedColumn = aedColumns[i];
        token = tokens[i];
        if (token !== '') {
            nonEmptyTokens++;
        }
        if (aedColumn.name === 'name' && aedColumn.namespace === 'aed') {
            name = token;
        } else if (aedColumn.name === 'value' && aedColumn.namespace === 'aed') {
            value = token;
        }
    }

    if (nonEmptyTokens === 2 && name && value) {
        // Special row that defines metadata for the entire file
        aedKey = parseAedToken(name);
        // Store in the metadata section
        if (!this.aed.metadata[aedKey.namespace]) {
            this.aed.metadata[aedKey.namespace] = {};
        }
        if (!this.aed.metadata[aedKey.namespace][aedKey.name]) {
            this.aed.metadata[aedKey.namespace][aedKey.name] = {
                type: aedKey.type,
                value: value
            };
        }
        // Ignore this value
        return undefined;
    }

    var feature = new AedFeature(this.aed, tokens);

    if (!feature.chr || (!feature.start && feature.start !== 0) || !feature.end) {
        console.log('Cannot parse feature: ' + tokens.join(','));
        return undefined;
    }

    return feature;
}


export default AEDParser;
