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

var igv = (function (igv) {

    igv.GtexReader = function (config) {

        this.file = config.url;
        this.codec = this.file.endsWith(".bin") ? createEqtlBinary : createEQTL,
            this.cache = {};
        this.binary = this.file.endsWith(".bin");
        this.compressed = this.file.endsWith(".compressed.bin");

    };

    igv.GtexReader.prototype.readFeatures = function (continuation, task, genomicRange) {

        var chr = genomicRange.chr,
            self = this,
            file = this.file,
            index = self.index;


            if (index) {
                loadWithIndex(index, chr, continuation)
            }
            else {
                loadIndex(self.file, function (index) {
                    self.index = index;
                    loadWithIndex(index, chr, continuation);

                });

            }


            function loadWithIndex(index, chr, continuation) {

                var chrIdx = index[chr];
                if (chrIdx) {
                    var blocks = chrIdx.blocks,
                        lastBlock = blocks[blocks.length - 1],
                        endPos = lastBlock.startPos + lastBlock.size,
                        len = endPos - blocks[0].startPos,
                        range = { start: blocks[0].startPos, size: len};


                    igvxhr.loadArrayBuffer(file,
                        {
                            task: task,
                            range: range,
                            success: function (arrayBuffer) {

                                if (arrayBuffer) {

                                    var data = new DataView(arrayBuffer);
                                    var parser = new igv.BinaryParser(data);

                                    var featureList = [];
                                    var lastOffset = parser.offset;
                                    while (parser.hasNext()) {
                                        var feature = createEqtlBinary(parser);
                                        featureList.push(feature);
                                    }

                                    continuation(featureList);
                                }
                                else {
                                    continuation(null);
                                }

                            }
                        });


                }
                else {
                    continuation([]); // Mark with empy array, so we don't try again
                }


                var createEqtlBinary = function (parser) {
                    var snp = parser.getString();
                    var chr = parser.getString();
                    var position = parser.getInt();
                    var geneId = parser.getString();
                    var geneName = parser.getString();
                    //var genePosition = -1;
                    //var fStat = parser.getFloat();
                    var pValue = parser.getFloat();
                    //var qValue = parser.getFloat();
                    return new Eqtl(snp, chr, position, geneId, geneName, pValue);
                }

            }



        //function Eqtl(snp, chr, position, geneId, geneName, genePosition, fStat, pValue) {
        function Eqtl(snp, chr, position, geneId, geneName, pValue) {

            this.snp = snp;
            this.chr = chr;
            this.position = position;
            this.start = position;
            this.end = position + 1;
            this.geneId = geneId;
            this.geneName = geneName;
            //this.genePosition = genePosition;
            //this.fStat = fStat;
            this.pValue = pValue;

        }


        Eqtl.prototype.description = function () {
            return "<b>snp</b>:&nbsp" + this.snp +
                "<br/><b>location</b>:&nbsp" + this.chr + ":" + formatNumber(this.position + 1) +
                "<br/><b>gene</b>:&nbsp" + this.geneName +
                //"<br/><b>fStat</b>:&nbsp" + this.fStat +
                "<br/><b>pValue</b>:&nbsp" + this.pValue +
                "<br/><b>mLogP</b>:&nbsp" + this.mLogP;
        }


        /**
         * Load the index
         *
         * @param continuation function to receive the result
         */
        function loadIndex(url, continuation) {

            var genome = igv.browser ? igv.browser.genome : null;

            igvxhr.loadArrayBuffer(url,
                {
                    range: {start: 0, size: 200},
                    success: function (arrayBuffer) {

                        var data = new DataView(arrayBuffer),
                            parser = new igv.BinaryParser(data),
                            magicNumber = parser.getInt(),
                            version = parser.getInt(),
                            indexPosition = parser.getLong(),
                            indexSize = parser.getInt();

                        igvxhr.loadArrayBuffer(url, {

                            range: {start: indexPosition, size: indexSize},
                            success: function (arrayBuffer2) {

                                var data2 = new DataView(arrayBuffer2);
                                var index = null;


                                var parser = new igv.BinaryParser(data2);
                                var index = {};
                                var nChrs = parser.getInt();
                                while (nChrs-- > 0) {

                                    var chr = parser.getString();
                                    if (genome) chr = genome.getChromosomeName(chr);

                                    var position = parser.getLong();
                                    var size = parser.getInt();
                                    var blocks = new Array();
                                    blocks.push(new Block(position, size));
                                    index[chr] = new ChrIdx(chr, blocks);
                                }

                                continuation(index)
                            }

                        });
                    }

                });

        }


        Block = function (startPos, size) {
            this.startPos = startPos;
            this.size = size;
        }

        ChrIdx = function (chr, blocks) {
            this.chr = chr;
            this.blocks = blocks;
        }
    };

    var createEQTL = function (tokens) {
        var snp = tokens[0];
        var chr = tokens[1];
        var position = parseInt(tokens[2]) - 1;
        var geneId = tokens[3]
        var geneName = tokens[4];
        var genePosition = tokens[5];
        var fStat = parseFloat(tokens[6]);
        var pValue = parseFloat(tokens[7]);
        return new Eqtl(snp, chr, position, geneId, geneName, genePosition, fStat, pValue);
    };

    var createEqtlBinary = function (parser) {

        var snp = parser.getString();
        var chr = parser.getString();
        var position = parser.getInt();
        var geneId = parser.getString();
        var geneName = parser.getString();
        //var genePosition = -1;
        //var fStat = parser.getFloat();
        var pValue = parser.getFloat();
        //var qValue = parser.getFloat();
        //return new Eqtl(snp, chr, position, geneId, geneName, genePosition, fStat, pValue);
        return new Eqtl(snp, chr, position, geneId, geneName, pValue);
    };


    return igv;

})(igv || {});

