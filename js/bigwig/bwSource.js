/**
 * Created by jrobinso on 4/7/14.
 */


var igv = (function (igv) {

    igv.BWSource = function (path) {

        this.reader = new igv.BWReader(path);
        this.bufferedReader = new igv.BufferedReader(path);
    };

    igv.BWSource.prototype.getFeatures = function (chr, bpStart, bpEnd, bpPerPixel, continuation) {

        // Select a biwig "zoom level" appropriate for the current resolution
        var bwReader = this.reader,
            bufferedReader = this.bufferedReader,
            bwSource = this;

        if (!bwReader.zoomLevelHeaders) {

            // Load zoom headers and try again
            bwReader.loadHeader(function () {
                getFeatures(chr, bpStart, bpEnd, bpPerPixel, continuation);
            })

        }

        else {
            // We have zoom headers
            getFeatures(chr, bpStart, bpEnd, bpPerPixel, continuation);

        }

        function getFeatures(chr, bpStart, bpEnd, bpPerPixel, continuation) {

            // Check resolution against requested resolution.  If too course use "raw" wig data.
            var zoomLevelHeader = zoomLevelForScale(bpPerPixel, bwReader.zoomLevelHeaders),
                treeOffset,
                decodeFunction,
                features = [];

            if (zoomLevelHeader) {
                treeOffset = zoomLevelHeader.indexOffset;
                decodeFunction = decodeZoomData;
            } else {
                treeOffset = bwReader.header.fullIndexOffset;
                if (bwReader.type === "BigWig") {
                    decodeFunction = decodeWigData;
                }
                else {
                    decodeFunction = decodeBedData;
                }
            }

            bwReader.loadRPTree(treeOffset, function (rpTree) {

                var chrIdx = bwSource.reader.chromTree.dictionary[chr];
                if (chrIdx === undefined) {
                    continuation(nil);
                }
                else {

                    rpTree.findLeafItemsOverlapping(chrIdx, bpStart, bpEnd, function (leafItems) {

                        if (!leafItems || leafItems.length == 0) continuation([]);

                        var leafItemsCount = leafItems.length;

                        leafItems.sort(function (i1, i2) {
                            return i1.startBase - i2.startBase;
                        });

                        leafItems.forEach(function (item) {

                            bufferedReader.dataViewForRange({start: item.dataOffset, size: item.dataSize}, function (uint8Array) {

                                var inflate = new Zlib.Inflate(uint8Array);
                                var plain = inflate.decompress();
                                decodeFunction(new DataView(plain.buffer), chr, chrIdx, bpStart, bpEnd, features);
                                leafItemsCount--;

                                if (leafItemsCount == 0) {
                                    continuation(features);
                                }

                            }, true);
                        });


                    });

                }
            });

        }
    }


    function zoomLevelForScale(bpPerPixel, zoomLevelHeaders) {

        var level = null, i, zl;

        for (i = 0; i < zoomLevelHeaders.length; i++) {

            zl = zoomLevelHeaders[i];

            if (zl.reductionLevel > bpPerPixel) {
                level = zl;
                break;
            }
        }

        if (null == level) {
            level = zoomLevelHeaders[zoomLevelHeaders.length - 1];
        }

        return (level.reductionLevel < 4 * bpPerPixel) ? level : null;
    }


    function decodeWigData(data, chr, chrIdx, bpStart, bpEnd, featureArray) {

        var binaryParser = new igv.BinaryParser(data),
            chromId = binaryParser.getInt(),
            chromStart = binaryParser.getInt(),
            chromEnd = binaryParser.getInt(),
            itemStep = binaryParser.getInt(),
            itemSpan = binaryParser.getInt(),
            type = binaryParser.getByte(),
            reserved = binaryParser.getByte(),
            itemCount = binaryParser.getShort(),
            value;

        if (chromId === chrIdx) {

            while (itemCount-- > 0) {

                switch (type) {
                    case 1:
                        chromStart = binaryParser.getInt();
                        chromEnd = binaryParser.getInt();
                        value = binaryParser.getFloat();
                        chromEnd = chromStart + itemSpan;
                        break;
                    case 2:

                        chromStart = binaryParser.getInt();
                        value = binaryParser.getFloat();
                        chromEnd = chromStart + itemSpan;
                        break;
                    case 3:  // Fixed step
                        value = binaryParser.getFloat();
                        chromEnd = chromStart + itemSpan;
                        chromStart += itemStep;
                        break;

                }

                if (chromStart >= bpEnd) {
                    break; // Out of interval
                } else if (chromEnd > bpStart) {
                    featureArray.push({ chr: chr, start: chromStart, end: chromEnd, value: value });
                }


            }
        }

    }

    function decodeZoomData(data, chr, chrIdx, bpStart, bpEnd, featureArray) {

        var binaryParser = new igv.BinaryParser(data),
            minSize = 8 * 4,   // Minimum # of bytes required for a zoom record
            chromId,
            chromStart,
            chromEnd,
            validCount,
            minVal,
            maxVal,
            sumData,
            sumSquares,
            value;

        while (binaryParser.remLength() >= minSize) {
            chromId = binaryParser.getInt();
            if (chromId === chrIdx) {

                chromStart = binaryParser.getInt();
                chromEnd = binaryParser.getInt();
                validCount = binaryParser.getInt();
                minVal = binaryParser.getFloat();
                maxVal = binaryParser.getFloat();
                sumData = binaryParser.getFloat();
                sumSquares = binaryParser.getFloat();
                value = validCount == 0 ? 0 : sumData / validCount;

                if (chromStart >= bpEnd) {
                    break; // Out of interval

                } else if (chromEnd > bpStart) {
                    featureArray.push({ chr: chr, start: chromStart, end: chromEnd, value: value });
                }

            }
        }

    }


    function decodeBedData(data, chr, chrIdx, bpStart, bpEnd, featureArray) {

        var binaryParser = new igv.BinaryParser(data),
            minSize = 3 * 4 + 1,   // Minimum # of bytes required for a bed record
            chromId,
            chromStart,
            chromEnd,
            rest,
            tokens,
            feature,
            exonCount, exonSizes, exonStarts, exons, eStart, eEnd;


        while (binaryParser.remLength() >= minSize) {

            chromId = binaryParser.getInt();
            if (chromId != chrIdx) continue;

            chromStart = binaryParser.getInt();
            chromEnd = binaryParser.getInt();
            rest = binaryParser.getString();

            feature = {chr: chr, start: chromStart, end: chromEnd};

            if (chromStart < bpEnd && chromEnd >= bpStart) {
                featureArray.push(feature);

                tokens = rest.split("\t");

                if (tokens.length > 0) {
                    feature.name = tokens[0];
                }

                if (tokens.length > 1) {
                    feature.score = parseFloat(tokens[1]);
                }
                if (tokens.length > 2) {
                    feature.strand = tokens[2];
                }
                if (tokens.length > 3) {
                    feature.cdStart = parseInt(tokens[3]);
                }
                if (tokens.length > 4) {
                    feature.cdEnd = parseInt(tokens[4]);
                }
                if (tokens.length > 5) {
                    feature.rgb = tokens[5];
                }
                if (tokens.length > 8) {
                    exonCount = parseInt(tokens[6]);
                    exonSizes = tokens[7].split(',');
                    exonStarts = tokens[8].split(',');
                    exons = [];

                    for (var i = 0; i < exonCount; i++) {
                        eStart = start + parseInt(exonStarts[i]);
                        eEnd = eStart + parseInt(exonSizes[i]);
                        exons.push({start: eStart, end: eEnd});
                    }

                    feature.exons = exons;
                }
            }
        }

    }


    return igv;


})
    (igv || {});