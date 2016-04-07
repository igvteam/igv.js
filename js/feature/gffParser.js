/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 University of California San Diego
 * Author: Jim Robinson
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
 * Created by jrobinso on 4/6/16.
 */


var igv = (function (igv) {

    var maxFeatureCount = Number.MAX_VALUE;    // For future use,  controls downsampling

    /**
     * A factory function.  Return a parser for the given file type.
     */
    igv.GFFParser = function (format) {

        this.format = format;  // one of  gff, gff3, gtf
        this.decode = decodeGFF;
    };

    igv.GFFParser.prototype.parseHeader = function (data) {

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

    igv.GFFParser.prototype.parseFeatures = function (data) {

        if (!data) return null;

        var wig,
            feature,
            lines = data.splitLines(),
            len = lines.length,
            tokens,
            line,
            i,
            cnt = 0,
            j,
            decode = this.decode,
            type = this.type,
            delimiter = this.delimiter || "\t",
            transcripts = {},
            transcriptParts = [],
            allFeatures = [];


        for (i = this.skipRows; i < len; i++) {
            line = lines[i];
            if (line.startsWith("track") || line.startsWith("#") || line.startsWith("browser")) {
                continue;
            }

            tokens = lines[i].split(delimiter);
            if (tokens.length < 1) continue;

            feature = decode.call(this, tokens);

            if (feature) {
                if ("transcript" === feature.type) {
                    transcripts[feature.id] = feature;
                }
                else if (feature.parent !== undefined) {
                    transcriptParts.push(feature);
                }
                else {
                    allFeatures.push(feature);
                }
            }
        }

        // Assemble transcripts

        return allFeatures;
    };


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
     * Decode a single gff record (1 line in file).  Aggregations such as gene models are constructed at a higher level.
     *      ctg123 . mRNA            1050  9000  .  +  .  ID=mRNA00001;Parent=gene00001
     * @param tokens
     * @param ignore
     * @returns {*}
     */
    function decodeGFF(tokens, ignore) {

        var tokenCount, chr, start, end, strand, type, score, phase, attributeString, id, parent, color, name;

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
                else if ("name" === t[0].toLowerCase()) name = t[1];
                else if ("color" === t[0].toLowerCase()) color = igv.createColorString(t[1]);
                else if ("transcipt_id" == t[0]) {
                    if ("transcript" === type) {
                        id = t[1];
                    }
                    else {
                        parent = t[1];
                    }
                }
            }

        });

        return {
            id: id,
            parent: parent,
            name: name,
            type: type,
            chr: chr,
            start: start,
            end: end,
            score: score,
            strand: strand,
            color: color,
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


    return igv;
})
(igv || {});
