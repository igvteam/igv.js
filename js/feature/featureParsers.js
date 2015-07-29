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
 *  Define parsers for bed-like files  (.bed, .gff, .vcf, etc).  A parser should implement 2 methods
 *
 *     parseHeader(data) - return an object representing a header or metadata.  Details are format specific
 *
 *     parseFeatures(data) - return an array of features
 *
 */


var igv = (function (igv) {

    var maxFeatureCount = Number.MAX_VALUE;    // For future use,  controls downsampling

    /**
     * A factory function.  Return a parser for the given file type.
     */
    igv.FeatureParser = function (format, decode) {

        var customFormat;

        this.type = format;
        this.skipRows = 0;   // The number of fixed header rows to skip.  Override for specific types as needed

        if (decode) {
            this.decode = decode;
        }


        switch (format) {
            case "narrowPeak":
            case "broadPeak":
            case "peaks":
                this.decode = decodePeak;
                this.delimiter = /\s+/;
                break;
            case "bedgraph":
                this.decode = decodeBedGraph;
                this.delimiter = /\s+/;
                break;
            case "wig":
                this.decode = decodeWig;
                this.delimiter = /\s+/;
                break;
            case "gff" :
                this.decode = decodeGFF;
                this.delimiter = "\t";
                break;
            case "aneu":
                this.decode = decodeAneu;
                this.delimiter = "\t";
                break;
            case "FusionJuncSpan":
                // bhaas, needed for FusionInspector view
                this.decode = decodeFusionJuncSpan;
                this.delimiter = /\s+/;
                break;
            case "gtexGWAS":
                this.skipRows = 1;
                this.decode = decodeGtexGWAS;
                this.delimiter = "\t";
                break;
            case "refflat":
                this.decode = decodeRefflat;
                this.delimiter = "\t";
                break;
            default:

                customFormat = igv.browser.getFormat(format);
                if (customFormat !== undefined) {
                    this.decode = decodeCustom;
                    this.format = customFormat;
                    this.delimiter = customFormat.delimiter || "\t";
                }

                else {
                    this.decode = decodeBed;
                    this.delimiter = /\s+/;
                }

        }

    };

    igv.FeatureParser.prototype.parseHeader = function (data) {

        var lines = data.splitLines(),
            len = lines.length,
            line,
            i,
            header;

        for (i = 0; i < len; i++) {
            line = lines[i];
            if (line.startsWith("track") || line.startsWith("#") || line.startsWith("browser")) {

                if (line.startsWith("track")) {
                    header = parseTrackLine(line);
                }
            }
            else {
                break;
            }
        }
        return header;
    };

    igv.FeatureParser.prototype.parseFeatures = function (data) {

        if (!data) return null;

        var wig,
            feature,
            lines = data.splitLines(),
            len = lines.length,
            tokens,
            allFeatures = [],
            line,
            i,
            cnt = 0,
            j,
            decode = this.decode,
            type = this.type,
            delimiter = this.delimiter || "\t";


        for (i = this.skipRows; i < len; i++) {
            line = lines[i];
            if (line.startsWith("track") || line.startsWith("#") || line.startsWith("browser")) {
                continue;
            }
            else if (type === "wig" && line.startsWith("fixedStep")) {
                wig = parseFixedStep(line);
                continue;
            }
            else if (type === "wig" && line.startsWith("variableStep")) {
                wig = parseVariableStep(line);
                continue;
            }

            tokens = lines[i].split(delimiter);
            if (tokens.length < 1) continue;

            feature = decode.call(this, tokens, wig);

            if (feature) {
                if (allFeatures.length < maxFeatureCount) {
                    allFeatures.push(feature);
                }
                else {
                    // Reservoir sampling,  conditionally replace existing feature with new one.
                    j = Math.floor(Math.random() * cnt);
                    if (j < maxFeatureCount) {
                        allFeatures[j] = feature;
                    }
                }
                cnt++;
            }
        }

        return allFeatures;
    };


    function parseFixedStep(line) {

        var tokens = line.split(/\s+/),
            cc = tokens[1].split("=")[1],
            ss = parseInt(tokens[2].split("=")[1], 10),
            step = parseInt(tokens[3].split("=")[1], 10),
            span = (tokens.length > 4) ? parseInt(tokens[4].split("=")[1], 10) : 1;

        return {type: "fixedStep", chrom: cc, start: ss, step: step, span: span, index: 0};

    }

    function parseVariableStep(line) {

        var tokens = line.split(/\s+/),
            cc = tokens[1].split("=")[1],
            span = tokens.length > 2 ? parseInt(tokens[2].split("=")[1], 10) : 1;
        return {type: "variableStep", chrom: cc, span: span}

    }

    function parseTrackLine(line) {
        var properties = {},
            tokens = line.split(/(?:")([^"]+)(?:")|([^\s"]+)(?=\s+|$)/g),
            tmp = [],
            i, tk, curr;

        // Clean up tokens array
        for (i = 1; i < tokens.length; i++) {
            if (!tokens[i] || tokens[i].trim().length === 0) continue;

            tk = tokens[i].trim();

            if (tk.endsWith("=") > 0) {
                curr = tk;
            }
            else if (curr) {
                tmp.push(curr + tk);
                curr = undefined;
            }
            else {
                tmp.push(tk);
            }

        }


        tmp.forEach(function (str) {
            if (!str) return;
            var kv = str.split('=', 2);
            if (kv.length == 2) {
                properties[kv[0]] = kv[1];
            }

        });

        return properties;
    }

    /**
     * Decode the "standard" UCSC bed format
     * @param tokens
     * @param ignore
     * @returns decoded feature, or null if this is not a valid record
     */
    function decodeBed(tokens, ignore) {

        var chr, start, end, id, name, tmp, idName, exonCount, exonSizes, exonStarts, exons, feature,
            eStart, eEnd;

        if (tokens.length < 3) return null;

        chr = tokens[0];
        start = parseInt(tokens[1]);
        end = tokens.length > 2 ? parseInt(tokens[2]) : start + 1;

        feature = {chr: chr, start: start, end: end, score: 1000};

        if (tokens.length > 3) {
            // Note: these are very special rules for the gencode gene files.
            tmp = tokens[3].replace(/"/g, '');
            idName = tmp.split(';');
            for (var i = 0; i < idName.length; i++) {
                var kv = idName[i].split('=');
                if (kv[0] == "gene_id") {
                    id = kv[1];
                }
                if (kv[0] == "gene_name") {
                    name = kv[1];
                }
            }
            feature.id = id ? id : tmp;
            feature.name = name ? name : tmp;
        }

        if (tokens.length > 4) {
            feature.score = parseFloat(tokens[4]);
        }
        if (tokens.length > 5) {
            feature.strand = tokens[5];
        }
        if (tokens.length > 6) {
            feature.cdStart = parseInt(tokens[6]);
        }
        if (tokens.length > 7) {
            feature.cdEnd = parseInt(tokens[7]);
        }
        if (tokens.length > 8) {
            if(tokens[8] !== "." && tokens[8] !== "0")
            feature.rgb = "rgb(" + tokens[8] + ")";
        }
        if (tokens.length > 11) {
            exonCount = parseInt(tokens[9]);
            exonSizes = tokens[10].split(',');
            exonStarts = tokens[11].split(',');
            exons = [];

            for (var i = 0; i < exonCount; i++) {
                eStart = start + parseInt(exonStarts[i]);
                eEnd = eStart + parseInt(exonSizes[i]);
                exons.push({start: eStart, end: eEnd});
            }

            feature.exons = exons;
        }

        feature.popupData = function () {
            var data = [];
            if(feature.name) data.push({name: "Name", value: feature.name});
            if("+" === feature.strand || "-" === feature.strand) data.push({name: "Strand", value: feature.strand});
            return data;
        };

        return feature;

    }

    /**
     * Decode a UCSC "refflat" record
     * @param tokens
     * @param ignore
     * @returns {*}
     */
    function decodeRefflat(tokens, ignore) {

        if (tokens.length < 10) return null;

        var feature = {
                chr: tokens[2],
                start: parseInt(tokens[4]),
                end: parseInt(tokens[5]),
                id: tokens[0],
                name: tokens[1],
                strand: tokens[3],
                cdStart: parseInt(tokens[6]),
                cdEnd: parseInt(tokens[7])
            },
            exonCount = parseInt(tokens[8]),
            exonStarts = tokens[9].split(','),
            exonEnds = tokens[10].split(','),
            exons = [];

        for (var i = 0; i < exonCount; i++) {
            exons.push({start: parseInt(exonStarts[i]), end: parseInt(exonEnds[i])});
        }

        feature.exons = exons;

        feature.popupData = function () {
            return [{name: "Name", value: feature.name}];
        };

        return feature;

    }

    function decodePeak(tokens, ignore) {

        var tokenCount, chr, start, end, strand, name, score, qValue, signal, pValue;

        tokenCount = tokens.length;
        if (tokenCount < 9) {
            return null;
        }

        chr = tokens[0];
        start = parseInt(tokens[1]);
        end = parseInt(tokens[2]);
        name = tokens[3];
        score = parseFloat(tokens[4]);
        strand = tokens[5].trim();
        signal = parseFloat(tokens[6]);
        pValue = parseFloat(tokens[7]);
        qValue = parseFloat(tokens[8]);

        if (score === 0) score = signal;

        return {
            chr: chr, start: start, end: end, name: name, score: score, strand: strand, signal: signal,
            pValue: pValue, qValue: qValue
        };
    }

    function decodeBedGraph(tokens, ignore) {

        var chr, start, end, value;

        if (tokens.length < 3) return null;

        chr = tokens[0];
        start = parseInt(tokens[1]);
        end = parseInt(tokens[2]);

        value = parseFloat(tokens[3]);

        return {chr: chr, start: start, end: end, value: value};
    }

    function decodeWig(tokens, wig) {

        var ss,
            ee,
            value;

        if (wig.type === "fixedStep") {

            ss = (wig.index * wig.step) + wig.start;
            ee = ss + wig.span;
            value = parseFloat(tokens[0]);
            ++(wig.index);
            return isNaN(value) ? null : {chr: wig.chrom, start: ss, end: ee, value: value};
        }
        else if (wig.type === "variableStep") {

            if (tokens.length < 2) return null;

            ss = parseInt(tokens[0], 10);
            ee = ss + wig.span;
            value = parseFloat(tokens[1]);
            return isNaN(value) ? null : {chr: wig.chrom, start: ss, end: ee, value: value};

        }
        else {
            return decodeBedGraph(tokens);
        }
    }

    function decodeAneu(tokens, ignore) {

        var chr, start, end, feature;


        if (tokens.length < 4) return null;

        // console.log("Decoding aneu.tokens="+JSON.stringify(tokens));
        chr = tokens[1];
        start = parseInt(tokens[2]);
        end = tokens.length > 3 ? parseInt(tokens[3]) : start + 1;

        feature = {chr: chr, start: start, end: end};

        if (tokens.length > 4) {
            feature.score = parseFloat(tokens[4]);
            feature.value = feature.score;
        }


        feature.popupData = function () {
            return [{name: "Name", value: feature.name}];
        };

        return feature;

    }

    function decodeFusionJuncSpan(tokens, ignore) {

        /*
         Format:

         0       #scaffold
         1       fusion_break_name
         2       break_left
         3       break_right
         4       num_junction_reads
         5       num_spanning_frags
         6       spanning_frag_coords

         0       B3GNT1--NPSR1
         1       B3GNT1--NPSR1|2203-10182
         2       2203
         3       10182
         4       189
         5       1138
         6       1860-13757,1798-13819,1391-18127,1443-17174,...

         */


        //console.log("decoding fusion junc spans");

        var chr = tokens[0];
        var fusion_name = tokens[1];
        var junction_left = parseInt(tokens[2]);
        var junction_right = parseInt(tokens[3]);
        var num_junction_reads = parseInt(tokens[4]);
        var num_spanning_frags = parseInt(tokens[5]);

        var spanning_frag_coords_text = tokens[6];

        var feature = {
            chr: chr,
            name: fusion_name,
            junction_left: junction_left,
            junction_right: junction_right,
            num_junction_reads: num_junction_reads,
            num_spanning_frags: num_spanning_frags,
            spanning_frag_coords: [],

            start: -1,
            end: -1
        }; // set start and end later based on min/max of span coords

        var min_coord = junction_left;
        var max_coord = junction_right;

        if (num_spanning_frags > 0) {

            var coord_pairs = spanning_frag_coords_text.split(',');

            for (var i = 0; i < coord_pairs.length; i++) {
                var split_coords = coord_pairs[i].split('-');

                var span_left = split_coords[0];
                var span_right = split_coords[1];

                if (span_left < min_coord) {
                    min_coord = span_left;
                }
                if (span_right > max_coord) {
                    max_coord = span_right;
                }
                feature.spanning_frag_coords.push({left: span_left, right: span_right});

            }
        }

        feature.start = min_coord;
        feature.end = max_coord;


        feature.popupData = function () {
            return [{name: "Name", value: feature.name}];
        };

        return feature;

    }

    function decodeGtexGWAS(tokens, ignore) {


        var tokenCount, chr, start, end, strand, name, score, qValue, signal, pValue;

        tokenCount = tokens.length;
        if (tokenCount < 8) {
            return null;
        }

        chr = tokens[0];
        start = parseInt(tokens[1]) - 1;
        end = parseInt(tokens[3].split(':')[1]);
        //name = tokens[3];
        //score = parseFloat(tokens[4]);
        //strand = tokens[5].trim();
        //signal = parseFloat(tokens[6]);
        pValue = parseFloat(tokens[5]);
        //qValue = parseFloat(tokens[8]);

        //return {chr: chr, start: start, end: end, name: name, score: score, strand: strand, signal: signal,
        //    pValue: pValue, qValue: qValue};
        return {chr: chr, start: start, end: end, pvalue: pValue};
    }

    /**
     * Decode a single gff record (1 line in file).  Aggregations such as gene models are constructed at a higher level.
     *      ctg123 . mRNA            1050  9000  .  +  .  ID=mRNA00001;Parent=gene00001
     * @param tokens
     * @param ignore
     * @returns {*}
     */
    function decodeGFF(tokens, ignore) {

        var tokenCount, chr, start, end, strand, type, score, phase, attributeString, id, parent;

        tokenCount = tokens.length;
        if (tokenCount < 9) {
            return null;      // Not a valid gff record
        }

        chr = tokens[0];
        type = tokens[2];
        start = parseInt(tokens[3]) - 1;
        end = parseInt(tokens[4]);
        score = "." === tokens[5] ? 0 : parseFloat(tokens[5]);
        strand = tokens[6];
        phase = "." === tokens[7] ? 0 : parseInt(tokens[7]);
        attributeString = tokens[8];

        // Find ID and Parent
        attributeString.split(';').forEach(function (kv) {
            var t = kv.split('=', 2);
            if (t.length == 2) {
                if ("ID" === t[0]) id = t[1];
                else if ("Parent" === t[0]) parent = t[1];
            }

        });

        return {
            id: id,
            parent: parent,
            type: type,
            chr: chr,
            start: start,
            end: end,
            score: score,
            strand: strand,
            attributeString: attributeString,
            popupData: function () {
                var kvs = this.attributeString.split(';'),
                    pd = [];
                kvs.forEach(function (kv) {
                    var t = kv.split('=', 2);
                    if (t.length === 2)
                        pd.push({name: t[0], value: t[1]});
                });
                return pd;
            }

        };
    }

    /**
     * Decode the "standard" UCSC bed format
     * @param tokens
     * @param ignore
     * @returns decoded feature, or null if this is not a valid record
     */
    function decodeCustom(tokens, ignore) {

        var feature,
            chr, start, end,
            format = this.format,         // "this" refers to FeatureParser instance
            coords = format.coords || 0;

        if (tokens.length < 3) return null;

        chr = tokens[format.chr];
        start = parseInt(tokens[format.start]) - coords;
        end = format.end !== undefined ? parseInt(tokens[format.end]) : start + 1;

        feature = {chr: chr, start: start, end: end};

        if (format.fields) {
            format.fields.forEach(function (field, index) {
                if (index != format.chr && index != format.start && index != format.end) {
                    feature[field] = tokens[index];
                }
            });
        }

        return feature;

    }


    return igv;
})
(igv || {});
