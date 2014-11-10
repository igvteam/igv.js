/*
 * The MIT License (MIT)
 *
 * Copyright (c) $year. Broad Institute
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

// Define parsers for bed-like files  (.bed, .gff, .vcf, etc)

var igv = (function (igv) {

    var maxFeatureCount = Number.MAX_VALUE;    // For future use,  controls downsampling

    /**
     * A factory function.  Return a parser for the given file type.
     */
    igv.BedParser = function(type) {

        var decode;

        if (type === "narrowPeak" || type === "broadPeak") {
            decode = decodePeak;
        }
        else {
            decode = decodeBed;
        }

        return {

            parseHeader: function (data) {

                var lines = data.split("\n"),
                    len = lines.length,
                    line,
                    i;

                for (i = 0; i < len; i++) {
                    line = lines[i];
                    if (line.startsWith("track") || line.startsWith("#") || line.startsWith("browser")) {

                        if (line.startsWith("track")) {
                            return parseTrackLine(line);
                        }

                    }
                    else {
                        break;
                    }

                }
            },

            parseFeatures: function (data) {
                var feature,
                    lines = data.split("\n"),
                    len = lines.length,
                    tokens,
                    allFeatures,
                    line,
                    i,
                    cnt = 0,
                    j;

                allFeatures = [];
                for (i = 0; i < len; i++) {
                    line = lines[i];
                    if (line.startsWith("track") || line.startsWith("#") || line.startsWith("browser")) {
                        continue;
                    }
                    tokens = lines[i].split("\t");
                    feature = decode(tokens);

                    if (feature) {
                        if (allFeatures.length < maxFeatureCount) {
                            allFeatures.push(feature);
                        }
                        else {
                            // Resevoir sampling,  conditionally replace existing feature with new one.
                            j = Math.floor(Math.random() * cnt);
                            if (j < maxFeatureCount) {
                                allFeatures[j] = feature;
                            }
                        }
                        cnt++;
                    }
                }

                return allFeatures;
            }

        }

        function decodeBed(tokens) {

            var chr, start, end, id, name, tmp, idName, strand, cdStart, exonCount, exonSizes, exonStarts, exons, feature,
                eStart, eEnd;

            if (tokens.length < 3) return null;

            chr = tokens[0];


            if (!chr.startsWith("chr")) chr = "chr" + chr;  // TODO -- use genome aliases

            start = parseInt(tokens[1]);
            end = tokens.length > 2 ? parseInt(tokens[2]) : start + 1;

            feature = {chr: chr, start: start, end: end};

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
                feature.rgb = tokens[8];
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

            return feature;

        }

        function decodePeak(tokens) {

            var tokenCount, chr, start, end, strand, name, score, qValue, signal, pValue;

            tokenCount = tokens.length;
            if (tokenCount < 9) {
                return null;
            }

            chr = tokens[0];

            if (!chr.startsWith("chr")) chr = "chr" + chr;  // TODO -- use genome aliases


            start = parseInt(tokens[1]);
            end = parseInt(tokens[2]);
            name = tokens[3];
            score = parseFloat(tokens[4]);
            strand = tokens[5].trim();
            signal = parseFloat(tokens[6]);
            pValue = parseFloat(tokens[7]);
            qValue = parseFloat(tokens[8]);

            return {chr: chr, start: start, end: end, name: name, score: score, strand: strand, signal: signal,
                pValue: pValue, qValue: qValue};
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
    }

    return igv;
})(igv || {});