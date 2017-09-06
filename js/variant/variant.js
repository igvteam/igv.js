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


        var self = this,
            altTokens;


        variant.chr = tokens[0]; // TODO -- use genome aliases
        variant.pos = parseInt(tokens[1]);
        variant.names = tokens[2];    // id in VCF
        variant.referenceBases = tokens[3];
        variant.alternateBases = tokens[4];
        variant.quality = parseInt(tokens[5]);
        variant.filter = tokens[6];
        variant.info = getInfoObject(tokens[7]);

        variant.str = variant.info["PERIOD"] !== undefined;

        initAlleles(variant);


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


    igv.createGAVariant = function (json) {

        var variant = new igv.Variant();

        variant.chr = json.referenceName;
        variant.pos = parseInt(json.start);
        variant.names = arrayToCommaString(json.names);
        variant.referenceBases = json.referenceBases + '';
        variant.alternateBases = json.alternateBases + '';
        variant.quality = json.quality;
        variant.filter = arrayToCommaString(json.filter);
        variant.info = json.info;

        variant.str = variant.info["PERIOD"] !== undefined;


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

        initAlleles(variant);

        return variant;

    }


    function initAlleles(variant) {

        //Alleles
        var altTokens = variant.alternateBases.split(","),
            minAltLength = variant.referenceBases.length,
            maxAltLength = variant.referenceBases.length;


        variant.alleles = [];

        // If an STR define start and end based on reference allele.  Otherwise start and end computed below based
        // on alternate allele type (snp, insertion, deletion)

        if(variant.str) {
            variant.start = variant.pos - 1;
            variant.end = variant.start + variant.referenceBases.length;
        }

        if (variant.alternateBases === ".") {     // "." => no alternate alleles
            variant.heterozygosity = 0;
        } else {
            altTokens.forEach(function (alt) {
                var a, s, e, diff;

                variant.alleles.push(alt);

                // Adjust for padding, used for insertions and deletions, unless variant is a short tandem repeat.

                if (!variant.str && alt.length > 0) {

                    diff = variant.referenceBases.length - alt.length;

                    if (diff > 0) {
                        // deletion, assume left padded
                        s = variant.pos - 1 + alt.length;
                        e = s + diff;
                    } else if (diff < 0) {
                        // Insertion, assume left padded, insertion begins to "right" of last ref base
                        s = variant.pos - 1 + variant.referenceBases.length;
                        e = s + 1;     // Insertion between s & 3
                    } else {
                        s = variant.pos - 1;
                        e = s + 1;
                    }
                    variant.start = variant.start === undefined ? s : Math.min(variant.start, s);
                    variant.end = variant.end === undefined ? e : Math.max(variant.end, e);
                }

                minAltLength = Math.min(minAltLength, alt.length);
                maxAltLength = Math.max(maxAltLength, alt.length);

            });
            if (variant.info.AC && variant.info.AN) {
                variant.heterozygosity = calcHeterozygosity(variant.info.AC, variant.info.AN).toFixed(3);
            }
        }

        // Alternate allele lengths used for STR color scale.
        variant.minAltLength = minAltLength;
        variant.maxAltLength = maxAltLength;


        function calcHeterozygosity(ac, an) {
            var sum = 0,
                altFreqs = ac.split(','),
                altCount = 0,
                refFrac;

            an = parseInt(an);
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

    igv.Variant.prototype.popupData = function (genomicLocation) {

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
                fields.push({name: key, value: arrayToCommaString(self.info[key])});
            });
        }
        return fields;

    };

    function arrayToCommaString(array) {
        if (!array instanceof Array) return '';
        return array.join(',');

    }

    return igv;
})(igv || {});
