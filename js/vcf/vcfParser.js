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

// Define a feature source that reads from non-indexed bed files

var igv = (function (igv) {

    igv.vcfParser = function () {

        return  {

            parseHeader: function (data) {

                var lines = data.split("\n"),
                    len = lines.length,
                    line,
                    i;

                for (i = 0; i < len; i++) {
                    line = lines[i];
                    if (line.startsWith("##")) {

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
                            allFeatures.push(decode(tokens));
                        }

                    }
                }

                return allFeatures;


                function decode(tokens) {

                    var variant,
                        pos = parseInt(tokens[1]);

                    if (tokens.length < 8) return null;

                    variant = {

                        chr: tokens[0], // TODO -- use genome aliases
                        pos: pos,
                        start: pos - 1,
                        end: pos,
                        id: tokens[2],
                        ref: tokens[3],
                        alt: tokens[4],
                        qual: parseInt(tokens[5]),
                        filter: tokens[6],
                        info: tokens[7]

                        // TODO -- genotype fields

                    };


                    return variant;

                }


            }
        }
    }


    return igv;
})(igv || {});
