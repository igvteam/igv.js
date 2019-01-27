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
        if(json.info) {
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


    function init(variant) {

        //Alleles
        var altTokens = variant.alternateBases.split(","),
            minAltLength = variant.referenceBases.length,
            maxAltLength = variant.referenceBases.length,
            start, end;

        if (variant.info && variant.info["VT"]) {
            variant.type = variant.info["VT"].toLowerCase();
        } else if (variant.info && variant.info["PERIOD"]) {
            variant.type = 'str';
        }


        variant.alleles = [];

        if (isRef(variant.alternateBases)) {
            variant.type = "refblock";
        }

        if (variant.type === "refblock") {     // "." => no alternate alleles
            variant.heterozygosity = 0;

        } else {

            if ("." === variant.alternateBases) {
                // No alternate alleles.  Not sure how to interpret this
                start = variant.pos - 1;
                end = start + variant.referenceBases.length;
            }

            else {
                altTokens.forEach(function (alt, index) {
                    var a, s, e, diff;

                    variant.alleles.push(alt);

                    // Adjust for padding, used for insertions and deletions, unless variant is a short tandem repeat.

                    if ("str" !== variant.type && alt.length > 0) {

                        diff = variant.referenceBases.length - alt.length;

                        if (diff > 0) {
                            // deletion, assume left padded
                            s = variant.pos - 1 + alt.length;
                            e = s + diff;
                        } else if (diff < 0) {
                            // Insertion, assume left padded, insertion begins to "right" of last ref base
                            s = variant.pos - 1 + variant.referenceBases.length;
                            e = s + 1;     // Insertion between s & e
                        } else {
                            s = variant.pos - 1;
                            e = s + 1;
                        }

                        start = start === undefined ? s : Math.min(start, s);
                        end = end === undefined ? e : Math.max(end, e);
                    }

                    minAltLength = Math.min(minAltLength, alt.length);
                    maxAltLength = Math.max(maxAltLength, alt.length);


                });
            }

            if ("str" === variant.type) {
                start = variant.pos - 1;
                end = start + variant.referenceBases.length;
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

        if(this.referenceBases.length === 1 && !isRef(this.alternateBases)) {
            let ref = this.referenceBases;
            if (ref.length === 1) {
                let altArray = this.alternateBases.split(",");
                fields.push("<hr/>");
                for (let i = 0; i < altArray.length; i++) {
                    let alt = this.alternateBases[i];
                    if (alt.length === 1) {
                        let l = igv.TrackBase.getCravatLink(this.chr, this.pos, ref, alt, genomeId)
                        if(l) {
                            fields.push(l);
                        }
                    }
                }
            }
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

    return igv;
})(igv || {});
