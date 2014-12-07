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
            tokens,
            header = {},
            id,
            values,
            ltIdx,
            gtIdx,
            type;

        this.header = header;

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
                    // TODO -- parse this to get sample names
                }

            }
            else {
                break;
            }

        }
        return header;
    }

    igv.VcfParser.prototype.parseFeatures = function (data) {

        var lines = data.split("\n"),
            len = lines.length,
            tokens,
            allFeatures,
            line,
            i,
            variant;


        allFeatures = [];
        for (i = 0; i < len; i++) {
            line = lines[i];
            if (line.startsWith("#")) {
                continue;
            }
            else {
                tokens = lines[i].split("\t");
                variant = decode(tokens);
                if (variant != null) {
                    variant.header = this.header;       // Keep a pointer to the header to interpret fields for popup text
                    allFeatures.push(variant);
                }

            }
        }

        return allFeatures;


        function decode(tokens) {

            if (tokens.length < 8) {
                return null;
            }
            else {
                return new Variant(tokens);
            }

        }
    }


    function Variant(tokens) {

        this.chr = tokens[0]; // TODO -- use genome aliases
        this.pos = parseInt(tokens[1]);
        this.start = this.pos - 1;
        this.end = this.pos;
        this.id = tokens[2];
        this.ref = tokens[3];
        this.alt = tokens[4];
        this.qual = parseInt(tokens[5]);
        this.filter = tokens[6];
        this.info = tokens[7];
        // TODO -- genotype fields
    }

    Variant.prototype.popupData = function (genomicLocation) {

        var fields, infoFields;

        fields = [
            {name: "ID", value: this.id},
            {name: "Ref", value: this.ref},
            {name: "Alt", value: this.alt},
            {name: "Qual", value: this.qual},
            {name: "Filter", value: this.filter},
            "---------"
        ];

        infoFields = this.info.split(";");
        infoFields.forEach(function (f) {
            var tokens = f.split("=");
            if (tokens.length > 1) {
                fields.push({name: tokens[0], value: tokens[1]});   // TODO -- use header to add descriptive tooltip
            }
        });


        return fields;

    }


    return igv;
})(igv || {});
