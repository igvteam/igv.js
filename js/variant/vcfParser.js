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


    igv.VcfParser = function () {

    }

    igv.VcfParser.prototype.parseHeader = function (data) {

        var lines = data.splitLines(),
            len = lines.length,
            line,
            i,
            j,
            tokens,
            header = {},
            id,
            values,
            ltIdx,
            gtIdx,
            type;

        // First line must be file format
        if (lines[0].startsWith("##fileformat")) {
            header.version = lines[0].substr(13);
        }
        else {
            throw new Error("Invalid VCF file: missing fileformat line");
        }

        for (i = 1; i < len; i++) {
            line = lines[i].trim();
            if (line.startsWith("#")) {

                id = null;
                values = {};

                if (line.startsWith("##")) {

                    if (line.startsWith("##INFO") || line.startsWith("##FILTER") || line.startsWith("##FORMAT")) {

                        ltIdx = line.indexOf("<");
                        gtIdx = line.lastIndexOf(">");

                        if (!(ltIdx > 2 && gtIdx > 0)) {
                            console.log("Malformed VCF header line: " + line);
                            continue;
                        }

                        type = line.substring(2, ltIdx - 1);
                        if (!header[type])  header[type] = {};

                        //##INFO=<ID=AF,Number=A,Type=Float,Description="Allele frequency based on Flow Evaluator observation counts">
                        // ##FILTER=<ID=NOCALL,Description="Generic filter. Filtering details stored in FR info tag.">
                        // ##FORMAT=<ID=AF,Number=A,Type=Float,Description="Allele frequency based on Flow Evaluator observation counts">

                        tokens = igv.splitStringRespectingQuotes(line.substring(ltIdx + 1, gtIdx - 1), ",");

                        tokens.forEach(function (token) {
                            var kv = token.split("=");
                            if (kv.length > 1) {
                                if (kv[0] === "ID") {
                                    id = kv[1];
                                }
                                else {
                                    values[kv[0]] = kv[1];
                                }
                            }
                        });

                        if (id) {
                            header[type][id] = values;
                        }
                    }
                    else {
                        // Ignoring other ## header lines
                    }
                }
                else if (line.startsWith("#CHROM")) {
                    tokens = line.split("\t");

                    if (tokens.length > 8) {

                        // call set names -- use column index for id
                        header.callSets = [];
                        for (j = 9; j < tokens.length; j++) {
                            header.callSets.push({id: j, name: tokens[j]});
                        }
                    }
                }

            }
            else {
                break;
            }

        }

        this.header = header;  // Will need to intrepret genotypes and info field

        return header;
    }

    function extractCallFields(tokens) {

        var callFields = {
                genotypeIndex: -1,
                genotypeLikelihoodIndex: -1,
                phasesetIndex: -1,
                fields: tokens
            },
            i;

        for (i = 0; i < tokens.length; i++) {

            if ("GT" === tokens[i]) {
                callFields.genotypeIndex = i;
            }
            else if ("GL" === tokens[i]) {
                callFields.genotypeLikelihoodIndex = i;
            }
            else if ("PS" === tokens[i]) {
                callFields.phasesetIndex = i;
            }
        }
        return callFields;

    }

    /**
     * Parse data as a collection of Variant objects.
     *
     * @param data
     * @returns {Array}
     */
    igv.VcfParser.prototype.parseFeatures = function (data) {

        var lines = data.split("\n"),
            allFeatures = [],
            callSets = this.header.callSets;

        lines.forEach(function (line) {

            var variant,
                tokens,
                callFields,
                index,
                token;

            if (!line.startsWith("#")) {

                tokens = line.split("\t");

                if (tokens.length >= 8) {
                    variant = new Variant(tokens);
                    variant.header = this.header;       // Keep a pointer to the header to interpret fields for popup text
                    allFeatures.push(variant);

                    if (tokens.length > 9) {

                        // Format
                        callFields = extractCallFields(tokens[8].split(":"));

                        variant.calls = {};

                        for (index = 9; index < tokens.length; index++) {

                            token = tokens[index];

                            var callSet = callSets[index - 9],
                                call = {
                                    callSetName: callSet.name,
                                    info: {}
                                };

                            variant.calls[callSet.id] = call;

                            token.split(":").forEach(function (callToken, index) {
                                switch (index) {
                                    case callFields.genotypeIndex:
                                        call.genotype = [];
                                        callToken.split(/[\|\/]/).forEach(function (s) {
                                            call.genotype.push(parseInt(s));
                                        });
                                        break;

                                    case callFields.genotypeLikelihoodIndex:
                                        call.genotypeLikelihood = [];
                                        callToken.split(",").forEach(function (s) {
                                            call.genotype.push(parseFloat(s));
                                        });
                                        break;

                                    case callFields.phasesetIndex:
                                        call.phaseset = callToken;
                                        break;

                                    default:
                                        call.info[callFields.fields[index]] = callToken;
                                }
                            });
                        }

                    }

                }
            }
        });

        return allFeatures;

    }


    function Variant(tokens) {

        var self = this,
            altTokens;

        this.chr = tokens[0]; // TODO -- use genome aliases
        this.pos = parseInt(tokens[1]);
        this.names = tokens[2];    // id in VCF
        this.referenceBases = tokens[3];
        this.alternateBases = tokens[4];
        this.quality = parseInt(tokens[5]);
        this.filter = tokens[6];
        this.info = tokens[7];

        // "ids" ("names" in ga4gh)

        //Alleles
        altTokens = this.alternateBases.split(",");

        if (altTokens.length > 0) {

            this.alleles = [];

            this.start = Number.MAX_VALUE;
            this.end = 0;

            altTokens.forEach(function (alt) {
                var a, s, e, diff;
                if (alt.length > 0) {

                    diff = self.referenceBases.length - alt.length;

                    if (diff > 0) {
                        // deletion, assume left padded
                        s = self.pos - 1 + alt.length;
                        e = s + diff;
                    } else if (diff < 0) {
                        // Insertion, assume left padded, insertion begins to "right" of last ref base
                        s = self.pos - 1 + self.referenceBases.length;
                        e = s + 1;     // Insertion between s & 3
                    }
                    else {
                        // Substitution, SNP if seq.length == 1
                        s = self.pos - 1;
                        e = s + alt.length;
                    }
                    self.alleles.push({allele: alt, start: s, end: e});
                    self.start = Math.min(self.start, s);
                    self.end = Math.max(self.end, e);
                }

            });
        }
        else {
            // Is this even legal VCF?  (NO alt alleles)
            this.start = this.pos - 1;
            this.end = this.pos;
        }

        // TODO -- genotype fields
    }

    Variant.prototype.popupData = function (genomicLocation) {

        var fields, infoFields, nameString;

        //infoFields = this.info.split(";");
        var info = this.getInfoObj(this.info);

        fields = [
            {name: "Names", value: this.names},
            {name: "Ref", value: this.referenceBases},
            {name: "Alt", value: this.alternateBases},
            {name: "Qual", value: this.quality},
            {name: "Filter", value: this.filter},
            {name: "Heterozygosity", value: (info.AC && info.AN) ? this.calcHeterozygosity(info.AC, info.AN).toFixed(3) : 1},
            "<hr>"
        ];

        // infoFields.forEach(function (f) {
        //     var tokens = f.split("=");
        //     if (tokens.length > 1) {
        //         fields.push({name: tokens[0], value: tokens[1]});   // TODO -- use header to add descriptive tooltip
        //     }
        // });

        Object.keys(info).forEach(function (key) {
           fields.push({name: key, value: info[key]});
        });


        return fields;

    };

    Variant.prototype.getInfoObj = function(infoStr) {
        var info = {};
        infoStr.split(';').forEach(function(elem) {
            var element = elem.split('=');
            info[element[0]] = element[1];
        });
        return info;
    };

    Variant.prototype.calcHeterozygosity = function(ac, an){
        var sum = 0;
        an = parseInt(an);
        var altFreqs = ac.split(',');
        altFreqs.forEach(function (altFreq) {
            var altFrac = parseInt(altFreq) / an;
            sum += altFrac * altFrac;
        });
        return 1 - sum;
    };


    return igv;
})(igv || {});
