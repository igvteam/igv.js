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
    var ZOOM_LEVEL_HEADER_SIZE = 24;
    var BUFFER_SIZE = 512000;     //  buffer


    igv.BWReader = function (path) {
        this.path = path;
        this.rpTreeCache = {};
    };

    igv.BWReader.prototype.getZoomHeaders = function(continuation) {

        var reader = this;

        if(this.zoomLevelHeaders) {
            continuation(this.zoomLevelHeaders);
        }
        else {
            this.loadHeader(function() {
                continuation(reader.zoomLevelHeaders);
            });
        }

    }

    igv.BWReader.prototype.loadHeader = function (continuation) {

        var loader = new igv.DataLoader(this.path),
            bwReader = this;

        loader.getContentLength(function (contentLength) {

            bwReader.contentLength = contentLength;

            loader.range = {start: 0, size: BBFILE_HEADER_SIZE};

            loader.loadArrayBuffer(function (data) {

                // Assume low-to-high unless proven otherwise
                bwReader.littleEndian = true;

                var binaryParser = new igv.BinaryParser(new DataView(data));

                var magic = binaryParser.getUInt();

                if (magic === BIGWIG_MAGIC_LTH) {
                    bwReader.type = "BigWig";
                }
                else if (magic == BIGBED_MAGIC_LTH) {
                    bwReader.type = "BigBed";
                }
                else {
                    //Try big endian order
                    bwReader.littleEndian = false;

                    binaryParser.littleEndian = false;
                    binaryParser.position = 0;
                    var magic = binaryParser.getUInt();

                    if (magic === BIGWIG_MAGIC_HTL) {
                        bwReader.type = "BigWig";
                    }
                    else if (magic == BIGBED_MAGIC_HTL) {
                        bwReader.type = "BigBed";
                    }
                    else {
                        // TODO -- error, unknow file type
                    }

                }
                // Table 5  "Common header for BigWig and BigBed files"
                bwReader.header = {};
                bwReader.header.bwVersion = binaryParser.getShort();
                bwReader.header.nZoomLevels = binaryParser.getShort();
                bwReader.header.chromTreeOffset = binaryParser.getLong();
                bwReader.header.fullDataOffset = binaryParser.getLong();
                bwReader.header.fullIndexOffset = binaryParser.getLong();
                bwReader.header.fieldCount = binaryParser.getShort();
                bwReader.header.definedFieldCount = binaryParser.getShort();
                bwReader.header.autoSqlOffset = binaryParser.getLong();
                bwReader.header.totalSummaryOffset = binaryParser.getLong();
                bwReader.header.uncompressBuffSize = binaryParser.getInt();
                bwReader.header.reserved = binaryParser.getLong();

                // Get content length
                // HttpResponse *resp = [URLDataLoader loadHeaderSynchronousWithPath:self.path];
                // self.filesize = resp.contentLength;


                bwReader.loadZoomHeadersAndChrTree(continuation);
            });
        });

    }

    igv.BWReader.prototype.loadZoomHeadersAndChrTree = function (continutation) {


        var loader = new igv.DataLoader(this.path),
            startOffset = BBFILE_HEADER_SIZE,
            that = this;

        loader.range = {start: startOffset, size: (this.header.fullDataOffset - startOffset + 5)};

        loader.loadArrayBuffer(function (data) {

            var nZooms = that.header.nZoomLevels,
                binaryParser = new igv.BinaryParser(new DataView(data)),
                i,
                len,
                zoomNumber,
                zlh;

            that.zoomLevelHeaders = [];

            for (i = 0; i < nZooms; i++) {
                zoomNumber = nZooms - i;
                zlh = new ZoomLevelHeader(zoomNumber, binaryParser);
                that.zoomLevelHeaders.push(zlh);
            }

            // Autosql
            if (that.header.autoSqlOffset > 0) {
                binaryParser.position = that.header.autoSqlOffset - startOffset;
                that.autoSql = binaryParser.getString();
            }

            // Total summary
            if (that.header.totalSummaryOffset > 0) {
                binaryParser.position = that.header.totalSummaryOffset - startOffset;
                that.totalSummary = new igv.BWTotalSummary(binaryParser);
            }

            // Chrom data index
            if (that.header.chromTreeOffset > 0) {
                binaryParser.position = that.header.chromTreeOffset - startOffset;
                that.chromTree = new igv.BPTree(binaryParser, 0);
            }
            else {
                // TODO -- this is an error, not expected
            }

            //Finally total data count
            binaryParser.position = that.header.fullDataOffset - startOffset;
            that.dataCount = binaryParser.getInt();

            continutation();
        });

    }

    igv.BWReader.prototype.loadRPTree = function (offset, continuation) {

        var rpTree = this.rpTreeCache[offset];
        if (rpTree) {
            continuation(rpTree);
        }
        else {

            rpTree = new igv.RPTree(offset, this.contentLength, this.path, this.littleEndian);
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