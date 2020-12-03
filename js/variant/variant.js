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

import TrackBase from "../trackBase.js";


const knownAltBases = new Set(["A", "C", "T", "G"].map(c => c.charCodeAt(0)))

function createVCFVariant(tokens) {
    return new Variant(tokens);
}


class Variant {

    constructor(tokens) {
        this.chr = tokens[0]; // TODO -- use genome aliases
        this.pos = parseInt(tokens[1]);
        this.names = tokens[2];    // id in VCF
        this.referenceBases = tokens[3];
        this.alternateBases = tokens[4];
        this.quality = tokens[5];
        this.filter = tokens[6];
        this.info = getInfoObject(tokens[7]);
        this.init();
    }

    init() {

        const ref = this.referenceBases;
        const altBases = this.alternateBases;

        if (this.info) {
            if (this.info["VT"]) {
                this.type = this.info["VT"];
            } else if (this.info["SVTYPE"]) {
                this.type = "SV";
            } else if (this.info["PERIOD"]) {
                this.type = "STR";
            }
        }
        if (this.type === undefined) {
            this.type = determineType(ref, altBases);
        }
        if (this.type === "NONVARIANT") {
            this.heterozygosity = 0;
        }

        // Determine start/end coordinates -- these are the coordinates representing the actual variant,
        // not the leading or trailing reference
        if (this.info["END"]) {
            this.start = this.pos - 1;
            if(this.info["CHR2"] && this.info["CHR2"] !== this.chr) {
                this.end = this.start + 1;
            } else {
                this.end = Number.parseInt(this.info["END"]);
            }
        } else {
            if (this.type === "NONVARIANT") {
                this.start = this.pos - 1;      // convert to 0-based coordinate convention
                this.end = this.start + ref.length;
            } else {

                const altTokens = altBases.split(",").filter(token => token.length > 0);
                this.alleles = [];
                this.start = undefined;
                this.end = undefined;

                for (let alt of altTokens) {

                    this.alleles.push(alt);

                    // We don't yet handle  SV and other special alt representations
                    if ("SV" !== this.type && isKnownAlt(alt)) {

                        let altLength = alt.length;
                        let lengthOnRef = ref.length;

                        // Trim off matching bases.  Try first match, then right -> left,  then any remaining left -> right
                        let s = 0;
                        if (ref.charCodeAt(0) === alt.charCodeAt(0)) {
                            s++;
                            altLength--;
                            lengthOnRef--;
                        }

                        // right -> left from end
                        while (altLength > 0 && lengthOnRef > 0) {
                            const altIdx = s + altLength - 1;
                            const refIdx = s + lengthOnRef - 1;
                            if (alt.charCodeAt(altIdx) === ref.charCodeAt(refIdx)) {
                                altLength--;
                                lengthOnRef--;
                            } else {
                                break;
                            }
                        }

                        // if any remaining, left -> right
                        while (altLength > 0 && lengthOnRef > 0) {
                            const altIdx = s;
                            const refIdx = s;
                            if (alt.charCodeAt(altIdx) === ref.charCodeAt(refIdx)) {
                                s++;
                                altLength--;
                                lengthOnRef--;
                            } else {
                                break;
                            }
                        }

                        const alleleStart = this.pos + s - 1;      // -1 for zero based coordinates
                        const alleleEnd = alleleStart + lengthOnRef;    // insertions have zero length on ref, but we give them 1
                        this.start = this.start === undefined ? alleleStart : Math.min(this.start, alleleStart);
                        this.end = this.end === undefined ? alleleEnd : Math.max(this.end, alleleEnd);
                    }
                }

                // Default to single base representation @ position for variant types not otherwise handled
                if(this.start === undefined) {
                    this.start = this.pos - 1;
                    this.end = this.pos;
                }
            }
        }
    }


    popupData(genomicLocation, genomeId) {

        var self = this,
            fields, gt;

        const posString = this.end === this.pos ? this.pos : `${this.pos}-${this.end}`;
        fields = [
            {name: "Chr", value: this.chr},
            {name: "Pos", value: posString},
            {name: "Names", value: this.names ? this.names : ""},
            {name: "Ref", value: this.referenceBases},
            {name: "Alt", value: this.alternateBases.replace("<", "&lt;")},
            {name: "Qual", value: this.quality},
            {name: "Filter", value: this.filter}
        ];

        if ("SNP" === this.type) {
            let ref = this.referenceBases;
            if (ref.length === 1) {
                let altArray = this.alternateBases.split(",");
                for (let alt of altArray) {
                    if (alt.length === 1) {
                        let l = TrackBase.getCravatLink(this.chr, this.pos, ref, alt, genomeId)
                        if (l) {
                            fields.push("<hr/>");
                            fields.push(l);
                        }
                    }
                }
            }
        }

        if (this.hasOwnProperty("heterozygosity")) {
            fields.push({name: "Heterozygosity", value: this.heterozygosity});
        }

        if (this.info) {
            fields.push('<hr>');
            Object.keys(this.info).forEach(function (key) {
                fields.push({name: key, value: arrayToString(self.info[key])});
            });
        }


        // Special case of VCF with a single sample
        if (this.calls && this.calls.length === 1) {
            fields.push('<hr>');
            gt = this.alleles[this.calls[0].genotype[0]] + this.alleles[this.calls[0].genotype[1]];
            fields.push({name: "Genotype", value: gt});
        }


        return fields;


    };

    isRefBlock() {
        return "NONVARIANT" === this.type;
    }

}

function getInfoObject(infoStr) {
    var info = {};
    if (infoStr) {
        infoStr.split(';').forEach(function (elem) {
            var element = elem.split('=');
            info[element[0]] = element[1];
        });
    }
    return info;
}


function isKnownAlt(alt) {
    for (let i = 0; i < alt.length; i++) {
        if (!knownAltBases.has(alt.charCodeAt(i))) {
            return false;
        }
    }
    return true;
}


function determineType(ref, altAlleles) {
    const refLength = ref.length;
    if (altAlleles === undefined) {
        return "UNKNOWN";
    } else if (altAlleles.trim().length === 0 ||
        altAlleles === "<NON_REF>" ||
        altAlleles === "<*>" ||
        altAlleles === ".") {
        return "NONVARIANT";
    } else {
        const alleles = altAlleles.split(",");
        const types = alleles.map(function (a) {
            if (refLength === 1 && a.length === 1) {
                return "SNP";
            } else {
                return "<NON_REF>" === a ? "NONVARIANT" : "OTHER";
            }
        });
        let type = types[0];
        for (let t of types) {
            if (t !== type) {
                return "MIXED";
            }
        }
        return type;
    }
}

function arrayToString(value, delim) {

    if (delim === undefined) delim = ",";

    if (!(Array.isArray(value))) {
        return value;
    }
    return value.join(delim);
}


/**
 * @deprecated - the GA4GH API has been deprecated.  This code no longer maintained.
 * @param json
 * @returns {Variant}
 */
function createGAVariant(json) {

    var variant = new Variant();

    variant.chr = json.referenceName;
    variant.start = parseInt(json.start);  // Might get overriden below
    variant.end = parseInt(json.end);      // Might get overriden below
    variant.pos = variant.start + 1;       // GA4GH is 0 based.
    variant.names = arrayToString(json.names, "; ");
    variant.referenceBases = json.referenceBases;
    variant.alternateBases = arrayToString(json.alternateBases);
    variant.quality = json.quality;
    variant.filter = arrayToString(json.filter);


    // Flatten GA4GH attributes array
    variant.info = {};
    if (json.info) {
        Object.keys(json.info).forEach(function (key) {
            var value,
                valueArray = json.info[key];

            if (Array.isArray(valueArray)) {
                value = valueArray.join(",");
            } else {
                value = valueArray;
            }
            variant.info[key] = value;
        });
    }


    // Need to build a hash of calls for fast lookup
    // Note from the GA4GH spec on call ID:
    //
    // The ID of the call set this variant call belongs to. If this field is not present,
    // the ordering of the call sets from a SearchCallSetsRequest over this GAVariantSet
    // is guaranteed to match the ordering of the calls on this GAVariant.
    // The number of results will also be the same.
    variant.calls = {};
    var order = 0, id;
    if (json.calls) {
        json.calls.forEach(function (call) {
            id = call.callSetId;
            variant.calls[id] = call;
            order++;

        })
    }

    init(variant);

    return variant;

}

export {createVCFVariant, createGAVariant};

