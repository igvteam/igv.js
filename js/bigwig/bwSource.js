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

    igv.BWSource = function (config) {

        this.reader = new igv.BWReader(config);
        this.bufferedReader = new igv.BufferedReader(config);
    };

    igv.BWSource.prototype.getFeatures = function (chr, bpStart, bpEnd, bpPerPixel) {

        var self = this;

        return new Promise(function (fulfill, reject) {

            self.reader.getZoomHeaders().then(function (zoomLevelHeaders) {

                // Select a biwig "zoom level" appropriate for the current resolution
                var bwReader = self.reader,
                    bufferedReader = self.bufferedReader,
                    zoomLevelHeader = zoomLevelForScale(bpPerPixel, zoomLevelHeaders),
                    treeOffset,
                    decodeFunction;

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

                bwReader.loadRPTree(treeOffset).then(function (rpTree) {

                    var chrIdx = self.reader.chromTree.dictionary[chr];
                    if (chrIdx === undefined) {
                        fulfill(null);
                    }
                    else {

                        rpTree.findLeafItemsOverlapping(chrIdx, bpStart, bpEnd).then(function (leafItems) {

                            var promises = [];

                            if (!leafItems || leafItems.length == 0) fulfill([]);

                            leafItems.forEach(function (item) {

                                promises.push(new Promise(function (fulfill, reject) {
                                    var features = [];

                                    bufferedReader.dataViewForRange({
                                        start: item.dataOffset,
                                        size: item.dataSize
                                    }, true).then(function (uint8Array) {

                                        var inflate = new Zlib.Inflate(uint8Array);
                                        var plain = inflate.decompress();
                                        decodeFunction(new DataView(plain.buffer), chr, chrIdx, bpStart, bpEnd, features);

                                        fulfill(features);

                                    }).catch(reject);
                                }));
                            });


                            Promise.all(promises).then(function (featureArrays) {

                                var i, allFeatures = featureArrays[0];
                                if(featureArrays.length > 1) {
                                   for(i=1; i<featureArrays.length; i++) {
                                       allFeatures = allFeatures.concat(featureArrays[i]);
                                   }
                                }  
                                allFeatures.sort(function (a, b) {
                                    return a.start - b.start;
                                })

                                fulfill(allFeatures)
                            }).catch(reject);

                        }).catch(reject);
                    }
                }).catch(reject);
            }).catch(reject);


        });
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

        return (level && level.reductionLevel < 4 * bpPerPixel) ? level : null;
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
            itemCount = binaryParser.getUShort(),
            value;

        if (chromId === chrIdx) {

            while (itemCount-- > 0) {

                switch (type) {
                    case 1:
                        chromStart = binaryParser.getInt();
                        chromEnd = binaryParser.getInt();
                        value = binaryParser.getFloat();
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
                } else if (chromEnd > bpStart && Number.isFinite(value)) {
                    featureArray.push({chr: chr, start: chromStart, end: chromEnd, value: value});
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

                } else if (chromEnd > bpStart && Number.isFinite(value)) {
                    featureArray.push({chr: chr, start: chromStart, end: chromEnd, value: value});
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
                    if (tokens[5] !== "." && tokens[5] !== "0")
                        feature.color = igv.createColorString(tokens[5]);
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
