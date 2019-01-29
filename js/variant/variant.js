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


/**
 * Parser for VCF files.
 */

var igv = (function (igv) {


    igv.createVCFVariant = function (tokens) {

        var variant = new igv.Variant();

        variant.chr = tokens[0]; // TODO -- use genome aliases
        variant.pos = parseInt(tokens[1]);
        variant.names = tokens[2];    // id in VCF
        variant.referenceBases = tokens[3];
        variant.alternateBases = tokens[4];
        variant.quality = parseInt(tokens[5]);
        variant.filter = tokens[6];
        variant.info = getInfoObject(tokens[7]);

        init(variant);

        return variant;

        //
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

        const refBases = variant.referenceBases;
        const altBases = variant.alternateBases
        let minAltLength = refBases.length;
        let maxAltLength = refBases.length;

        if (variant.info && variant.info["VT"]) {
            variant.type = variant.info["VT"].toLowerCase();
        } else if (variant.info && variant.info["PERIOD"]) {
            variant.type = 'str';
        }

        // Default start and end of variant block.  This can be modified below
        let start = variant.pos - 1;      // convert to 0-based coordinate convention
        let end = start + refBases.length

        // Check for reference block
;
        if (isRef(altBases)) {
            variant.type = "refblock";
            variant.heterozygosity = 0;

        } else {


            if ("." === altBases) {
                // No alternate alleles.  Not sure how to interpret this
            }

            else {


                const altTokens = altBases.split(",");
                variant.alleles = [];

                for(let alt of altTokens) {

                    variant.alleles.push(alt);

                    // Adjust for padding, used for insertions and deletions, unless variant is a short tandem repeat.


                    if ("str" !== variant.type && alt.length > 0) {


                        let diff = refBases.length - alt.length;

                        if (diff > 0) {
                            // deletion, see https://github.com/igvteam/igv.js/issues/849

                            // First base should be padding base
                            if(refBases.charCodeAt(0) === altBases.charCodeAt(0)) {
                                start = variant.pos;

                                // Check remaining bases right to left for padding (ref == alt)
                                const refLength = refBases.length - 1;
                                const altLength = altBases.length - 1;
                                let i;
                                for(i = 0; i < altLength; i++) {
                                    if(refBases.charCodeAt(refLength - i) === altBases.charCodeAt(altLength - i)) {
                                        end--
                                    } else {
                                        break;
                                    }
                                }

                                if(i < altLength) {
                                    // Leftover alt bases, see if we can continue to pad from front.  1st base already padded
                                    let j;
                                    for(j = 1; j < altLength - i; j++) {
                                        if(refBases.charCodeAt(j) === altBases.charCodeAt(j)) {
                                            start++
                                        } else {
                                            break;
                                        }
                                    }
                                    if(j + i !== altBases.length) {
                                        console.log("Non-conforming VCF indel: " + JSON.stringify(variant));
                                    }
                                }

                            } else {
                                // variant is non-compliant, or describes multiple events
                            }
                        } else if (diff < 0) {
                            // Insertion, assume left padded, insertion begins to "right" of last ref base
                            start = variant.pos - 1 + refBases.length;
                            end = start + 1;     // Insertion between s & e
                        } else {
                            start = variant.pos - 1;
                            end= start + 1;
                        }
                    }

                    minAltLength = Math.min(minAltLength, alt.length);
                    maxAltLength = Math.max(maxAltLength, alt.length);


                }
            }

            variant.start = start;
            variant.end = end;

            if (variant.info && variant.info.AC && variant.info.AN) {
                variant.heterozygosity = calcHeterozygosity(variant.info.AC, variant.info.AN).toFixed(3);
            }
        }

        // Alternate allele lengths used for STR color scale.
        variant.minAltLength = minAltLength;
        variant.maxAltLength = maxAltLength;


        function calcHeterozygosity(ac, an) {
            var sum = 0,
                altFreqs = Array.isArray(ac) ? ac : ac.split(','),
                altCount = 0,
                refFrac;

            an = Array.isArray(an) ? parseInt(an[0]) : parseInt(an);
            altFreqs.forEach(function (altFreq) {
                var a = parseInt(altFreq),
                    altFrac = a / an;
                sum += altFrac * altFrac;
                altCount += a;
            });

            refFrac = (an - altCount) / an;
            sum += refFrac * refFrac;
            return 1 - sum;
        };

    }

    igv.Variant = function () {

    }

    igv.Variant.prototype.popupData = function (genomicLocation, genomeId) {

        var self = this,
            fields, gt;

        fields = [
            {name: "Chr", value: this.chr},
            {name: "Pos", value: this.pos},
            {name: "Names", value: this.names ? this.names : ""},
            {name: "Ref", value: this.referenceBases},
            {name: "Alt", value: this.alternateBases},
            {name: "Qual", value: this.quality},
            {name: "Filter", value: this.filter}
        ];

        if (this.referenceBases.length === 1 && !isRef(this.alternateBases)) {
            let ref = this.referenceBases;
            if (ref.length === 1) {
                let altArray = this.alternateBases.split(",");
                fields.push("<hr/>");
                for (let i = 0; i < altArray.length; i++) {
                    let alt = this.alternateBases[i];
                    if (alt.length === 1) {
                        let l = igv.TrackBase.getCravatLink(this.chr, this.pos, ref, alt, genomeId)
                        if (l) {
                            fields.push(l);
                            fields.push('<hr>');
                        }
                    }
                }
            }
        }

        if (this.hasOwnProperty("heterozygosity")) {
            fields.push({name: "Heterozygosity", value: this.heterozygosity});
        }

        // Special case of VCF with a single sample
        if (this.calls && this.calls.length === 1) {
            fields.push('<hr>');
            gt = this.alleles[this.calls[0].genotype[0]] + this.alleles[this.calls[0].genotype[1]];
            fields.push({name: "Genotype", value: gt});
        }


        if (this.info) {
            fields.push('<hr>');
            Object.keys(this.info).forEach(function (key) {
                fields.push({name: key, value: arrayToString(self.info[key])});
            });
        }



        return fields;


    };

    igv.Variant.prototype.isRefBlock = function () {
        return "refblock" === this.type;
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


    /**
     * @deprecated - the GA4GH API has been deprecated.  This code no longer maintained.
     * @param json
     * @returns {Variant}
     */
    igv.createGAVariant = function (json) {

        var variant = new igv.Variant();

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


    return igv;
})(igv || {});
