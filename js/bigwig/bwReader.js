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
 * Created by jrobinso on 4/7/14.
 */


var igv = (function (igv) {

    var BIGWIG_MAGIC_LTH = 0x888FFC26; // BigWig Magic Low to High
    var BIGWIG_MAGIC_HTL = 0x26FC8F66; // BigWig Magic High to Low
    var BIGBED_MAGIC_LTH = 0x8789F2EB; // BigBed Magic Low to High
    var BIGBED_MAGIC_HTL = 0xEBF28987; // BigBed Magic High to Low
    var BBFILE_HEADER_SIZE = 64;


    igv.BWReader = function (config) {
        this.path = config.url;
        this.headPath = config.headURL || this.path;
        this.rpTreeCache = {};
        this.config = config;
    };

    igv.BWReader.prototype.getZoomHeaders = function () {

        var self = this;

        return new Promise(function (fulfill, reject) {
            if (self.zoomLevelHeaders) {
                fulfill(self.zoomLevelHeaders);
            }
            else {
                self.loadHeader().then(function () {
                    fulfill(self.zoomLevelHeaders);
                }).catch(function (error) {
                    reject(error);
                });
            }
        });
    }

    igv.BWReader.prototype.loadHeader = function () {

        var self = this;

        return new Promise(function (fulfill, reject) {
            igvxhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: {start: 0, size: BBFILE_HEADER_SIZE}}))
                .then(function (data) {

                if (!data) return;

                // Assume low-to-high unless proven otherwise
                self.littleEndian = true;

                var binaryParser = new igv.BinaryParser(new DataView(data));

                var magic = binaryParser.getUInt();

                if (magic === BIGWIG_MAGIC_LTH) {
                    self.type = "BigWig";
                }
                else if (magic == BIGBED_MAGIC_LTH) {
                    self.type = "BigBed";
                }
                else {
                    //Try big endian order
                    self.littleEndian = false;

                    binaryParser.littleEndian = false;
                    binaryParser.position = 0;
                    var magic = binaryParser.getUInt();

                    if (magic === BIGWIG_MAGIC_HTL) {
                        self.type = "BigWig";
                    }
                    else if (magic == BIGBED_MAGIC_HTL) {
                        self.type = "BigBed";
                    }
                    else {
                        // TODO -- error, unknown file type  or BE
                    }

                }
                // Table 5  "Common header for BigWig and BigBed files"
                self.header = {};
                self.header.bwVersion = binaryParser.getUShort();
                self.header.nZoomLevels = binaryParser.getUShort();
                self.header.chromTreeOffset = binaryParser.getLong();
                self.header.fullDataOffset = binaryParser.getLong();
                self.header.fullIndexOffset = binaryParser.getLong();
                self.header.fieldCount = binaryParser.getUShort();
                self.header.definedFieldCount = binaryParser.getUShort();
                self.header.autoSqlOffset = binaryParser.getLong();
                self.header.totalSummaryOffset = binaryParser.getLong();
                self.header.uncompressBuffSize = binaryParser.getInt();
                self.header.reserved = binaryParser.getLong();

                loadZoomHeadersAndChrTree.call(self).then(fulfill).catch(reject);
            }).catch(function (error) {
                    reject(error);
                });

        });
    }


    function loadZoomHeadersAndChrTree() {


        var startOffset = BBFILE_HEADER_SIZE,
            self = this;

        return new Promise(function (fulfill, reject) {

            igvxhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: {start: startOffset, size: (self.header.fullDataOffset - startOffset + 5)}}))
                .then(function (data) {

                var nZooms = self.header.nZoomLevels,
                    binaryParser = new igv.BinaryParser(new DataView(data)),
                    i,
                    len,
                    zoomNumber,
                    zlh;

                self.zoomLevelHeaders = [];

                self.firstZoomDataOffset = Number.MAX_VALUE;
                for (i = 0; i < nZooms; i++) {
                    zoomNumber = nZooms - i;
                    zlh = new ZoomLevelHeader(zoomNumber, binaryParser);
                    self.firstZoomDataOffset = Math.min(zlh.dataOffset, self.firstZoomDataOffset);
                    self.zoomLevelHeaders.push(zlh);
                }

                // Autosql
                if (self.header.autoSqlOffset > 0) {
                    binaryParser.position = self.header.autoSqlOffset - startOffset;
                    self.autoSql = binaryParser.getString();
                }

                // Total summary
                if (self.header.totalSummaryOffset > 0) {
                    binaryParser.position = self.header.totalSummaryOffset - startOffset;
                    self.totalSummary = new igv.BWTotalSummary(binaryParser);
                }

                // Chrom data index
                if (self.header.chromTreeOffset > 0) {
                    binaryParser.position = self.header.chromTreeOffset - startOffset;
                    self.chromTree = new igv.BPTree(binaryParser, 0);
                }
                else {
                    // TODO -- this is an error, not expected
                }

                //Finally total data count
                binaryParser.position = self.header.fullDataOffset - startOffset;
                self.dataCount = binaryParser.getInt();

                fulfill();

            }).catch(reject);
        });
    }

    igv.BWReader.prototype.loadRPTree = function (offset) {

        var self = this;

        return new Promise(function (fulfill, reject) {
            var rpTree = self.rpTreeCache[offset];
            if (rpTree) {
                fulfill(rpTree);
            }
            else {
                rpTree = new igv.RPTree(offset, self.contentLength, self.config, self.littleEndian);
                self.rpTreeCache[offset] = rpTree;
                rpTree.load().then(function () {
                    fulfill(rpTree);
                }).catch(reject);
            }
        });
    }


    var ZoomLevelHeader = function (index, byteBuffer) {
        this.index = index;
        this.reductionLevel = byteBuffer.getInt();
        this.reserved = byteBuffer.getInt();
        this.dataOffset = byteBuffer.getLong();
        this.indexOffset = byteBuffer.getLong();

    }


    return igv;

})
(igv || {});
