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

// Define a data source that reads from non-indexed data files

var igv = (function (igv) {

    /**
     * @param url - url to a .wig file
     * @constructor
     */
    igv.WIGFeatureSource = function (url) {
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
    igv.WIGFeatureSource.prototype.getFeatures = function (chr, start, end, success) {

        if (this.features) {

            success(this.features[ chr ]);
        } else {

            var thisWIGFeatureSource = this;

            var dataLoader = new igv.DataLoader(this.url);

            dataLoader.loadBinaryString(function (data) {

                var features,
                    lines = data.split("\n");

                thisWIGFeatureSource.features = {};

                lines.forEach(parseLine, thisWIGFeatureSource);

                features = thisWIGFeatureSource.features[ chr ];
                success(features);

            });
        }
    };

    igv.WIGFeatureSource.prototype.isFixedStep = function (line) {

        var index = line.indexOf("fixedStep");
        return 0 == index;
    };

    igv.WIGFeatureSource.prototype.isVariableStep = function  (line) {

        var index = line.indexOf("variableStep");
        return 0 == index;
    }

    igv.WIGFeatureSource.prototype.featureForFixedStepFormat = function(line) {

        var ss, ee, value;

        ss = (this.fixedStepIndex * this.step) + this.start;
        ee = ss + this.span;
        value = parseFloat(line);

        ++(this.fixedStepIndex);

        return { chr: this.chr, start: ss, end: ee, value: value };
    };

    igv.WIGFeatureSource.prototype.featureForVariableStepFormat = function(line) {

        var tokens, ss, ee, value;

        tokens = line.match(/\S+/g);

        ss = parseInt(tokens[0], 10);
        ee = ss + this.span;
        value = parseFloat(tokens[1]);

        return { chr: this.chr, start: ss, end: ee, value: value };
    };

    /**
     * Required function for parsing WIG file.  This is the callback
     * method for lines array method lines.forEach(). This method
     * refers to the 'this' pointer of the featureSource.feature
     * property
     *
     * @param line - current line from line array
     * @param index - line array index
     * @param lines - line array
     */
    function parseLine(line, index, lines) {

        var wigFeature,
            wigFeatures,
            stepFormatHeader,
            cc,
            ss,
            step,
            span,
            dev_null;

        if (igv.isBlank(line)) {
            return;
        }

        if (igv.isComment(line)) {
            return;
        }

        if (this.isFixedStep(line)) {

            stepFormatHeader = line.match(/\S+/g);

            dev_null = stepFormatHeader[0];
            cc = stepFormatHeader[1].split("=")[1];
            ss = parseInt(stepFormatHeader[2].split("=")[1], 10);
            step = parseInt(stepFormatHeader[3].split("=")[1], 10);
            span = (stepFormatHeader.length == 5) ? parseInt(stepFormatHeader[4].split("=")[1], 10) : 1;

            this.stepFormat = { fixedStepIndex: 1, chr: cc, start: ss, step: step, span: span, featureForStepFormat: this.featureForFixedStepFormat };
            return;
        }

        if (this.isVariableStep(line)) {

            stepFormatHeader = line.match(/\S+/g);

            dev_null = stepFormatHeader[0];
            cc = stepFormatHeader[1].split("=")[1];
            span = parseInt(stepFormatHeader[2].split("=")[1], 10);
            this.stepFormat = { chr: cc, span: span, featureForStepFormat: this.featureForVariableStepFormat };
            return;
        }

        wigFeatures = this.features[ this.stepFormat.chr ];
        if (!wigFeatures) {

            wigFeatures = [];
            this.features[ this.stepFormat.chr ] = wigFeatures;
        }

        wigFeature = this.stepFormat.featureForStepFormat(line);
        wigFeatures.featureList.push(wigFeature);
    };

    return igv;

})(igv || {});
