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

import TrackBase from "../trackBase";

/**
 * Parser for VCF files.
 */

function createVCFVariant (tokens) {

        var variant = new Variant();

        variant.chr = tokens[0]; // TODO -- use genome aliases
        variant.pos = parseInt(tokens[1]);
        variant.names = tokens[2];    // id in VCF
        variant.referenceBases = tokens[3];
        variant.alternateBases = tokens[4];
        variant.quality = tokens[5];
        variant.filter = tokens[6];
        variant.info = getInfoObject(tokens[7]);
        init(variant);
        return variant;

        function getInfoObject(infoStr) {

            if (!infoStr) return undefined;

            var info = {};
            infoStr.split(';').forEach(function (elem) {
                var element = elem.split('=');
                info[element[0]] = element[1];
            });

            return info;
        };

    }

    function init(variant) {

        if (variant.info) {
            if (variant.info["VT"]) {
                variant.type = variant.info["VT"];
            } else if (variant.info["SVTYPE"]) {
                variant.type = "SV";
            }
            else if (variant.info["PERIOD"]) {
                variant.type = "STR";
            }
        }

        const ref = variant.referenceBases;
        const altBases = variant.alternateBases

        // Check for reference block
        if (isRef(altBases) || "." === altBases) {
            variant.type = "REFBLOCK";
            variant.heterozygosity = 0;
            variant.start = variant.pos - 1;      // convert to 0-based coordinate convention
            variant.end = variant.start + ref.length

        } else if ("SV" === variant.type && variant.info["END"]) {
            variant.start = variant.pos - 1;
            variant.end = Number.parseInt(variant.info["END"]);

        } else {
            const altTokens = altBases.split(",").filter(token => token.length > 0);
            variant.alleles = [];
            variant.start = variant.pos;
            variant.end = variant.pos;

            for (let alt of altTokens) {

                variant.alleles.push(alt);
                let alleleStart
                let alleleEnd

                // We don't yet handle  SV and other special alt representations
                if ("SV" !== variant.type && isKnownAlt(alt)) {

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
                        if (alt.charCodeAt(s + altLength - 1) === ref.charCodeAt(s + lengthOnRef - 1)) {
                            altLength--;
                            lengthOnRef--;
                        } else {
                            break;
                        }
                    }

                    // if any remaining, left -> right
                    while (altLength > 0 && lengthOnRef > 0) {
                        if (alt.charCodeAt(s + altLength - 1) === ref.charCodeAt(s + lengthOnRef - 1)) {
                            s++;
                            altLength--;
                            lengthOnRef--;
                        } else {
                            break;
                        }
                    }

                    alleleStart = variant.pos + s - 1;      // -1 for zero based coordinates
                    alleleEnd = alleleStart + Math.max(1, lengthOnRef)     // insertions have zero length on ref, but we give them 1
                }

                variant.start = Math.min(variant.start, alleleStart);
                variant.end = Math.max(variant.end, alleleEnd);

            }
        }
    }

    const knownAltBases = new Set(["A", "C", "T", "G"].map(c => c.charCodeAt(0)))

    function isKnownAlt(alt) {
        for (let i = 0; i < alt.length; i++) {
            if (!knownAltBases.has(alt.charCodeAt(i))) {
                return false;
            }
        }
        return true;

    }

    const Variant = function () {

    }

    Variant.prototype.popupData = function (genomicLocation, genomeId) {

        var self = this,
            fields, gt;

        fields = [
            {name: "Chr", value: this.chr},
            {name: "Pos", value: this.pos},
            {name: "Names", value: this.names ? this.names : ""},
            {name: "Ref", value: this.referenceBases},
            {name: "Alt", value: this.alternateBases.replace("<", "&lt;")},
            {name: "Qual", value: this.quality},
            {name: "Filter", value: this.filter}
        ];

        if (this.referenceBases.length === 1 && !isRef(this.alternateBases)) {
            let ref = this.referenceBases;
            if (ref.length === 1) {
                let altArray = this.alternateBases.split(",");
                for (let i = 0; i < altArray.length; i++) {
                    let alt = this.alternateBases[i];
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

    Variant.prototype.isRefBlock = function () {
        return "REFBLOCK" === this.type;
    }

    function isRef(altAlleles) {

        return !altAlleles ||
            altAlleles.trim().length === 0 ||
            altAlleles === "<NON_REF>" ||
            altAlleles === "<*>";

    }

    function arrayToString(value, delim) {

        if (delim === undefined) delim = ",";

        if (!(Array.isArray(value))) {
            return value;
        }
        return value.join(delim);
    }


export default createVCFVariant;
