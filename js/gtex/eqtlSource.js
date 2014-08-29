var igv = (function (igv) {


    igv.EqtlSource = function (file, codec) {
        this.file = file;
        this.codec = codec;
        this.cache = {};
        this.binary = file.endsWith(".bin");
        this.compressed = file.endsWith(".compressed.bin");

    }


    igv.EqtlSource.prototype.getFeatures = function (chr, bpStart, bpEnd, continuation, task) {


        var source = this,
            cache = this.cache,
            features = cache[chr];
        if (features) {
            continuation(features);

        } else {
            loadFeatures(this.file, chr, function (features) {

                if (features) {
                    cache[chr] = features;
                }
                continuation(features);

            });
        }


        function loadFeatures(file, chr, continuation) {

            var dataLoader = new igv.DataLoader(file),
                index = source.index;


            if (index) {
                loadWithIndex(index, chr, continuation)
            }
            else {
                loadIndex(source.file, function (index) {
                    source.index = index;
                    loadWithIndex(index, chr, continuation);

                });

            }


            function loadWithIndex(index, chr, continuation) {

                var chrIdx = index[chr];
                if (chrIdx) {
                    var blocks = chrIdx.blocks,
                        lastBlock = blocks[blocks.length - 1],
                        endPos = lastBlock.startPos + lastBlock.size,
                        len = endPos - blocks[0].startPos + 1;
                    dataLoader.range = { start: blocks[0].startPos, size: len};

                    dataLoader.loadArrayBuffer(function (arrayBuffer) {

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

                        },
                        task);

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
        }


        //function Eqtl(snp, chr, position, geneId, geneName, genePosition, fStat, pValue) {
        function Eqtl(snp, chr, position, geneId, geneName, pValue) {

            this.snp = snp;
            this.chr = chr;
            this.position = position;
            this.geneId = geneId;
            this.geneName = geneName;
            //this.genePosition = genePosition;
            //this.fStat = fStat;
            this.pValue = pValue;

            this.mLogP = -Math.log(pValue) / Math.LN10;
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


            var dataLoader = new igv.DataLoader(url);

            dataLoader.range = {start: 0, size: 200};

            dataLoader.loadArrayBuffer(function (arrayBuffer) {

                var data = new DataView(arrayBuffer);
                var parser = new igv.BinaryParser(data);
                var magicNumber = parser.getInt();
                var version = parser.getInt();
                var indexPosition = parser.getLong();
                var indexSize = parser.getInt();
                var dataLoader2 = new igv.DataLoader(url);

                console.log("magic # " + magicNumber);

                dataLoader2.range = {start: indexPosition, size: indexSize};

                dataLoader2.loadArrayBuffer(function (arrayBuffer2) {

                    var data2 = new DataView(arrayBuffer2);
                    var test = [],
                        index = null;

                    test.push(data2.getUint8(0));
                    test.push(data2.getUint8(8));

                    var parser = new igv.BinaryParser(data2);
                    var index = {};
                    var nChrs = parser.getInt();
                    while (nChrs-- > 0) {
                        var chr = parser.getString();

                        if (!chr.startsWith("chr")) chr = "chr" + chr;

                        var position = parser.getLong();
                        var size = parser.getInt();
                        var blocks = new Array();
                        blocks.push(new Block(position, size));
                        index[chr] = new ChrIdx(chr, blocks);
                    }

                    continuation(index)
                });
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
    }

    return igv;


    return igv;

})(igv || {});

