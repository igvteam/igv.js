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

    igv.BWReader.prototype.getZoomHeaders = function (continuation) {

        var reader = this;
        if (this.zoomLevelHeaders) {
            continuation(reader.zoomLevelHeaders);
        }
        else {
            this.loadHeader(function () {
                continuation(reader.zoomLevelHeaders);
            });
        }
    }

    igv.BWReader.prototype.loadHeader = function(continuation) {

        var that = this;

        igvxhr.getContentLength(this.headPath,
            {
                headers: that.config.headers,

                success: function (contentLength) {

                    that.contentLength = contentLength;

                    igvxhr.loadArrayBuffer(that.path,
                        {
                            headers: that.config.headers,

                            range: {start: 0, size: BBFILE_HEADER_SIZE},

                            success: function (data) {

                                if (!data) return;

                                // Assume low-to-high unless proven otherwise
                                that.littleEndian = true;

                                var binaryParser = new igv.BinaryParser(new DataView(data));

                                var magic = binaryParser.getUInt();

                                if (magic === BIGWIG_MAGIC_LTH) {
                                    that.type = "BigWig";
                                }
                                else if (magic == BIGBED_MAGIC_LTH) {
                                    that.type = "BigBed";
                                }
                                else {
                                    //Try big endian order
                                    that.littleEndian = false;

                                    binaryParser.littleEndian = false;
                                    binaryParser.position = 0;
                                    var magic = binaryParser.getUInt();

                                    if (magic === BIGWIG_MAGIC_HTL) {
                                        that.type = "BigWig";
                                    }
                                    else if (magic == BIGBED_MAGIC_HTL) {
                                        that.type = "BigBed";
                                    }
                                    else {
                                        // TODO -- error, unknow file type
                                    }

                                }
                                // Table 5  "Common header for BigWig and BigBed files"
                                that.header = {};
                                that.header.bwVersion = binaryParser.getShort();
                                that.header.nZoomLevels = binaryParser.getShort();
                                that.header.chromTreeOffset = binaryParser.getLong();
                                that.header.fullDataOffset = binaryParser.getLong();
                                that.header.fullIndexOffset = binaryParser.getLong();
                                that.header.fieldCount = binaryParser.getShort();
                                that.header.definedFieldCount = binaryParser.getShort();
                                that.header.autoSqlOffset = binaryParser.getLong();
                                that.header.totalSummaryOffset = binaryParser.getLong();
                                that.header.uncompressBuffSize = binaryParser.getInt();
                                that.header.reserved = binaryParser.getLong();

                                // Get content length
                                // HttpResponse *resp = [URLDataLoader loadHeaderSynchronousWithPath:self.path];
                                // self.filesize = resp.contentLength;


                                that.loadZoomHeadersAndChrTree(continuation);
                            }

                        });

                }

            });

    }

    igv.BWReader.prototype.loadZoomHeadersAndChrTree = function (continutation) {


        var startOffset = BBFILE_HEADER_SIZE,
            bwReader = this;

        igvxhr.loadArrayBuffer(this.path,
            {
                headers: this.config.headers,
                range: {start: startOffset, size: (this.header.fullDataOffset - startOffset + 5)},
                success: function (data) {

                    var nZooms = bwReader.header.nZoomLevels,
                        binaryParser = new igv.BinaryParser(new DataView(data)),
                        i,
                        len,
                        zoomNumber,
                        zlh;

                    bwReader.zoomLevelHeaders = [];

                    for (i = 0; i < nZooms; i++) {
                        zoomNumber = nZooms - i;
                        zlh = new ZoomLevelHeader(zoomNumber, binaryParser);
                        bwReader.zoomLevelHeaders.push(zlh);
                    }

                    // Autosql
                    if (bwReader.header.autoSqlOffset > 0) {
                        binaryParser.position = bwReader.header.autoSqlOffset - startOffset;
                        bwReader.autoSql = binaryParser.getString();
                    }

                    // Total summary
                    if (bwReader.header.totalSummaryOffset > 0) {
                        binaryParser.position = bwReader.header.totalSummaryOffset - startOffset;
                        bwReader.totalSummary = new igv.BWTotalSummary(binaryParser);
                    }

                    // Chrom data index
                    if (bwReader.header.chromTreeOffset > 0) {
                        binaryParser.position = bwReader.header.chromTreeOffset - startOffset;
                        bwReader.chromTree = new igv.BPTree(binaryParser, 0);
                    }
                    else {
                        // TODO -- this is an error, not expected
                    }

                    //Finally total data count
                    binaryParser.position = bwReader.header.fullDataOffset - startOffset;
                    bwReader.dataCount = binaryParser.getInt();

                    continutation();
                }
            });

    }

    igv.BWReader.prototype.loadRPTree = function (offset, continuation) {

        var rpTree = this.rpTreeCache[offset];
        if (rpTree) {
            continuation(rpTree);
        }
        else {

            rpTree = new igv.RPTree(offset, this.contentLength, this.config, this.littleEndian);
            this.rpTreeCache[offset] = rpTree;
            rpTree.load(function () {
                continuation(rpTree);
            });
        }
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