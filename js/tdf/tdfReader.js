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
 * Created by jrobinso on 11/22/2016.
 */


var igv = (function (igv) {


    var GZIP_FLAG = 0x1;

    igv.TDFReader = function (config) {
        this.config = config;
        this.path = config.url;
    };


    igv.TDFReader.prototype.readHeader = function () {

        var self = this;

        return new Promise(function (fulfill, reject) {

            igvxhr.loadArrayBuffer(self.path,
                {
                    headers: self.config.headers,
                    range: {start: 0, size: 64000},
                    withCredentials: self.config.withCredentials
                }).then(function (data) {

                if (!data) {
                    reject("no data");
                    return;
                }

                var binaryParser = new igv.BinaryParser(new DataView(data));

                self.magic = binaryParser.getInt();
                self.version = binaryParser.getInt();
                self.indexPos = binaryParser.getLong();
                self.indexSize = binaryParser.getInt();
                var headerSize = binaryParser.getInt();


                if (self.version >= 2) {
                    var nWindowFunctions = binaryParser.getInt();
                    self.windowFunctions = [];
                    while (nWindowFunctions-- > 0) {
                        self.windowFunctions.push(binaryParser.getString());
                    }
                }

                self.trackType = binaryParser.getString();
                self.trackLine = binaryParser.getString();

                var nTracks = binaryParser.getInt();
                self.trackNames = [];
                while (nTracks-- > 0) {
                    self.trackNames.push(binaryParser.getString());
                }

                self.genomeID = binaryParser.getString();
                self.flags = binaryParser.getInt();

                self.compressed = (self.flags & GZIP_FLAG) != 0;

                fulfill(self);


            }).catch(reject)

        });
    }

    igv.TDFReader.prototype.readMasterIndex = function () {

        var self = this;

        return new Promise(function (fulfill, reject) {
            igvxhr.loadArrayBuffer(self.path,
                {
                    headers: self.config.headers,
                    range: {start: self.indexPos, size: self.indexSize},
                    withCredentials: self.config.withCredentials
                }).then(function (data) {


                if (!data) {
                    reject("no data");
                    return;
                }

                var binaryParser = new igv.BinaryParser(new DataView(data));

                self.datasetIndex = {};
                var nEntries = binaryParser.getInt();
                while (nEntries-- > 0) {
                    var name = binaryParser.getString();
                    var pos = binaryParser.getLong();
                    var size = binaryParser.getInt();
                    self.datasetIndex[name] = {start: pos, size: size};
                }

                self.groupIndex = {};
                nEntries = binaryParser.getInt();
                while (nEntries-- > 0) {
                    name = binaryParser.getString();
                    pos = binaryParser.getLong();
                    size = binaryParser.getInt();
                    self.datasetIndex[name] = {start: pos, size: size};
                }

                fulfill(self);

            }).catch(reject);

        });

    }


    return igv;

})
(igv || {});
