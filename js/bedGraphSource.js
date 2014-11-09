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

var igv = (function (igv) {

    /**
     * @param url - url to a .bedgraph file
     * @constructor
     */
    igv.BEDGraphFeatureSource = function (url) {
        this.url = url;
    };

    /**
     * Required function fo all data source objects.  Fetches features for the
     * range requested and passes them on to the continuation function.  Usually this is
     * a method that renders the features on the canvas
     *
     * @param chr
     * @param start
     * @param end
     * @param success -- function that takes an array of features as an argument
     */
    igv.BEDGraphFeatureSource.prototype.getFeatures = function (chr, start, end, success) {

        if (this.features) {

            success(this.features[ chr ]);
        } else {

            var myself = this;

            var dataLoader = new igv.DataLoader(this.url);

            dataLoader.loadBinaryString(function (data) {

                var features,
                    lines = data.split("\n");

                myself.features = {};

                lines.forEach(parseLine, myself);

                features = myself.features[ chr ];
                success(features);

            });
        }
    };

    /**
     * Required function for parsing BEDGraph file.  This is the callback
     * method for lines array method lines.forEach(). This method
     * refers to the 'this' pointer of the featureSource.feature
     * property
     *
     * @param line - current line from line array
     * @param index - line array index
     * @param lines - line array
     */
    function parseLine(line, index, lines) {

        var chr,
            parts,
            feature,
            features;

        if (igv.isBlank(line)) {
            return;
        }

        if (igv.isComment(line)) {
            return;
        }

        if(line.startsWith("track")) {
            parseTrackLine(line);
        }

        parts = line.split("\t");

        if (!parts || parts.length < 3) {
            return;
        }

        chr = parts[0];

        features = this.features[ chr ];
        if (!features) {

            features = [];
            this.features[ chr ] = features;
        }

        feature = {
            start: parseInt(parts[ 1 ]),
            end: parseInt(parts[ 2 ]),
            value: parseFloat(parts[ 3 ])
        };

        features.push(feature);

        function parseTrackLine(line) {

            var trackLineArray = line.split(" "),
                trackLine = {},
                moreStuff,
                item;

            item = trackLineArray.shift();
            trackLine.format = item.split("=")[ 1 ];
            if ("bedGraph" !== trackLine.format) {
                return trackLine;
            }


            // bail for now
            return trackLine;



            if (0 === trackLineArray.length) {
                return trackLine;
            }




            trackLine.moreStuff = [];
            trackLineArray.forEach(function (thang, thangs, index) {

                var key = thang.split("=")[ 0 ],
                    val = thang.split("=")[ 1 ];

                trackLine.moreStuff.push({ key: key, value: val});
            });

            return trackLine;
        }


    }

    return igv;

})(igv || {});
