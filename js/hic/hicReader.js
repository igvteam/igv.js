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
 * Created by jrobinso on 4/7/14.
 */


var igv = (function (igv) {


    igv.HiCReader = function (config) {
        this.path = config.url;
        this.headPath = config.headURL || this.path;
        this.config = config;

        this.bufferedReader = new igv.BufferedReader(config, 0, 64000);
    };


    igv.HiCReader.prototype.readHeader = function () {

        var self = this;

        return new Promise(function (fulfill, reject) {

            igvxhr.loadArrayBuffer(self.path,
                {
                    headers: self.config.headers,
                    range: {start: 0, size: 64000},                     // TODO -- a guess, what if not enough ?
                    withCredentials: self.config.withCredentials
                }).then(function (data) {

                if (!data) return;


                var binaryParser = new igv.BinaryParser(new DataView(data));

                self.magic = binaryParser.getString();
                self.version = binaryParser.getInt();
                self.masterIndexPos = binaryParser.getLong();
                self.genomeId = binaryParser.getString();

                self.attributes = {};
                var nAttributes = binaryParser.getInt();
                while(nAttributes-- > 0) {
                    self.attributes[binaryParser.getString()] = binaryParser.getString();
                }

                self.chrs = {};
                var nChrs = binaryParser.getInt();
                while(nChrs-- > 0) {
                    self.chrs[binaryParser.getString()] = binaryParser.getInt();
                }

                self.bpResolutions = [];
                var nBpResolutions = binaryParser.getInt();
                while(nBpResolutions-- > 0) {
                    self.bpResolutions.push(binaryParser.getInt());
                }

                self.fragResolutions = [];
                var nFragResolutions = binaryParser.getInt();
                while(nFragResolutions-- > 0) {
                    self.fragResolutions.push(binaryParser.getInt());
                }

                if(nFragResolutions > 0) {
                    self.sites = [];
                    var nSites = binaryParser.getInt();
                    while(nSites-- > 0) {
                        self.sites.push(binaryParser.getInt());
                    }
                }



                fulfill(self);

            }).catch(function (error) {
                reject(error);
            });

        });
    }

    igv.HiCReader.prototype.readFooter = function () {

        var self = this,
            range = {start: this.masterIndexPos, size: 100000000};   // Size is large to get rest of file.  Actual bytes returned will be less

        return new Promise(function (fulfill, reject) {

            igvxhr.loadArrayBuffer(self.path,
                {
                    headers: self.config.headers,
                    range: range,
                    withCredentials: self.config.withCredentials
                }).then(function (data) {

                var key, pos, size;

                if (!data) return;

                var binaryParser = new igv.BinaryParser(new DataView(data));

                var nBytes = binaryParser.getInt();


                self.masterIndex = {};
                var nEntries = binaryParser.getInt();
                while(nEntries-- > 0) {
                    key = binaryParser.getString();
                    pos = binaryParser.getLong();
                    size = binaryParser.getInt();
                    self.masterIndex[key] = {start: pos, size: size};
                }

                self.expectedValueVectors = {};
                var nExpectedValueVectors = binaryParser.getInt();
                while(nExpectedValueVectors-- > 0) {
                    var unit = binaryParser.getString();
                    var binSize = binaryParser.getInt();
                    var nValues = binaryParser.getInt();
                    var values = [];
                    while(nValues-- > 0) {
                        values.push(binaryParser.getDouble());
                    }
                    var nChrScaleFactors = binaryParser.getInt();
                    var normFactors = {};
                    while(nChrScaleFactors-- > 0) {
                        normFactors[binaryParser.getInt()] = binaryParser.getDouble();
                    }
                    var key = unit + "_" + binSize + "_NONE";
                    self.expectedValueVectors[key] =
                        new ExpectedValueFunction("NONE", unit, binSize, values, normFactors);
                }

                fulfill(self);

            }).catch(function (error) {
                reject(error);
            });

        });
    }


    function ExpectedValueFunction(normType, unit, binSize, values, normFactors) {
        this.normType = normType;
        this.unit = unit;
        this.binSize = binSize;
        this.values = values;
        this.normFactors = normFactors;
    }


    return igv;

})
(igv || {});
