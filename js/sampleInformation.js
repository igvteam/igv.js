/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014-2015 Broad Institute
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
 * Support for module definition.  This code should be last in the concatenated "igv.js" file.
 *
 */

var igv = (function (igv) {


    var SampleInformation = function () {
        this.attributes = {};
    }

    SampleInformation.prototype.loadPlinkFile = function (url) {

        var self = this;

        return new Promise(function (fullfill, reject) {

            var options = igv.buildOptions(self.config);    // Add oauth token, if any

            igvxhr
                .loadString(self.config.url, options)

                .then(function (data) {

                    var lines = data.splitLines();

                    lines.forEach(function (line) {
                        // TODO - parse file


                    })

                    fulfill(self.attributes);

                })


                .catch(reject);

        });

    }

    /**
     * Return the attributes for the given sample as a map-like object (key-value pairs)
     * @param sample
     */
    SampleInformation.prototype.getAttributes = function (sample) {


    }


    /**
     * Decleare a global singleton SampleInformation object.
     *
     * @type {SampleInformation}
     */
    igv.sampleInformation = new SampleInformation();


    return igv;
})(igv || {});


