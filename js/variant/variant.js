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
        variant.pos = parseInt(tokens[1]) - 1;
        variant.names = tokens[2];    // id in VCF
        variant.ref = tokens[3];
        variant.alt = tokens[4];
        variant.qual = parseInt(tokens[5]);
        variant.filter = tokens[6];
        variant.info = tokens[7];

        computeStart(variant);

        return variant;

    }

    igv.createGAVariant = function (json) {

        var variant = new igv.Variant();

        variant.chr = json.referenceName;
        variant.pos = parseInt(json.start);
        variant.names = arrayToCommaString(json.names);
        variant.ref = json.referenceBases + '';
        variant.alt = json.alternateBases + '';
        variant.qual = json.quality;
        variant.filter = arrayToCommaString(json.filter);
        variant.info = json.info;
        variant.calls = json.calls;

        computeStart(variant);

        function arrayToCommaString(array) {
            if (!array) return;
            var str = '', i;
            if (array.length > 0)
                str = array[0];
            for (i = 1; i < array.length; i++) {
                str += ", " + array[1];
            }
            return str;

        }

        return variant;

    }


    function computeStart(variant) {
        //Alleles
        altTokens = variant.alt.split(",");

        if (altTokens.length > 0) {

            variant.alleles = [];
            variant.alleles.push(variant.ref);

            variant.start = Number.MAX_VALUE;
            variant.end = 0;

            altTokens.forEach(function (alt) {
                var a, s, e, diff;

                variant.alleles.push(alt);

                if (alt.length > 0) {

                    diff = variant.ref.length - alt.length;

                    if (diff > 0) {
                        // deletion, assume left padded
                        s = variant.pos + alt.length;
                        e = s + diff;
                    } else if (diff < 0) {
                        // Insertion, assume left padded, insertion begins to "right" of last ref base
                        s = variant.pos + variant.ref.length;
                        e = s + 1;     // Insertion between s & 3
                    }
                    else {
                        // Substitution, SNP if seq.length == 1
                        s = variant.pos;
                        e = s + alt.length;
                    }
                    // variant.alleles.push({allele: alt, start: s, end: e});
                    variant.start = Math.min(variant.start, s);
                    variant.end = Math.max(variant.end, e);
                }

            });
        }
        else {
            // Is this even legal VCF?  (NO alt alleles)
            variant.start = variant.pos - 1;
            variant.end = variant.pos;
        }
    }


    igv.Variant = function () {

    }

    igv.Variant.prototype.popupData = function (genomicLocation) {

        var fields, gt;

        fields = [
            {name: "Names", value: this.names ? this.names : ""},
            {name: "Ref", value: this.ref},
            {name: "Alt", value: this.alt},
            {name: "Qual", value: this.qual},
            {name: "Filter", value: this.filter},
         ];

        if(this.calls && this.calls.length === 1) {
            gt = this.alleles[this.calls[0].genotype[0]] + this.alleles[this.calls[0].genotype[1]];
            fields.push({name: "Genotype", value: gt});
        }

        //infoFields = this.info.split(";");
        //infoFields.forEach(function (f) {
        //    var tokens = f.split("=");
        //    if (tokens.length > 1) {
        //        fields.push({name: tokens[0], value: tokens[1]});   // TODO -- use header to add descriptive tooltip
        //    }
        //});


        return fields;

    }


    return igv;
})(igv || {});
