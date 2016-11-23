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

        this.fragmentSitesCache = {};
        this.blockIndexMap = {};
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
                while (nAttributes-- > 0) {
                    self.attributes[binaryParser.getString()] = binaryParser.getString();
                }

                self.chromosomes = [];
                var nChrs = binaryParser.getInt();
                while (nChrs-- > 0) {
                    self.chromosomes.push({name: binaryParser.getString(), size: binaryParser.getInt()});
                }

                self.bpResolutions = [];
                var nBpResolutions = binaryParser.getInt();
                while (nBpResolutions-- > 0) {
                    self.bpResolutions.push(binaryParser.getInt());
                }

                self.fragResolutions = [];
                var nFragResolutions = binaryParser.getInt();
                while (nFragResolutions-- > 0) {
                    self.fragResolutions.push(binaryParser.getInt());
                }

                if (nFragResolutions > 0) {
                    self.sites = [];
                    var nSites = binaryParser.getInt();
                    while (nSites-- > 0) {
                        self.sites.push(binaryParser.getInt());
                    }
                }


                fulfill(self);

            }).catch(function (error) {
                reject(error);
            });

        });
    }

    igv.HiCReader.prototype.readFooter = function (key) {

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
                while (nEntries-- > 0) {
                    key = binaryParser.getString();
                    pos = binaryParser.getLong();
                    size = binaryParser.getInt();
                    self.masterIndex[key] = {start: pos, size: size};
                }

                self.expectedValueVectors = {};
                nEntries = binaryParser.getInt();
                while (nEntries-- > 0) {
                    var type = "NONE";
                    var unit = binaryParser.getString();
                    var binSize = binaryParser.getInt();
                    var nValues = binaryParser.getInt();
                    var values = [];
                    while (nValues-- > 0) {
                        values.push(binaryParser.getDouble());
                    }
                    var nChrScaleFactors = binaryParser.getInt();
                    var normFactors = {};
                    while (nChrScaleFactors-- > 0) {
                        normFactors[binaryParser.getInt()] = binaryParser.getDouble();
                    }
                    var key = unit + "_" + binSize + "_" + type;
                    self.expectedValueVectors[key] =
                        new ExpectedValueFunction(type, unit, binSize, values, normFactors);
                }

                if (self.version >= 6) {
                    self.normalizedExpectedValueVectors = {};
                    nEntries = binaryParser.getInt();
                    while (nEntries-- > 0) {
                        var type = binaryParser.getString();
                        var unit = binaryParser.getString();
                        var binSize = binaryParser.getInt();
                        var nValues = binaryParser.getInt();
                        var values = [];
                        while (nValues-- > 0) {
                            values.push(binaryParser.getDouble());
                        }
                        var nChrScaleFactors = binaryParser.getInt();
                        var normFactors = {};
                        while (nChrScaleFactors-- > 0) {
                            normFactors[binaryParser.getInt()] = binaryParser.getDouble();
                        }
                        var key = unit + "_" + binSize + "_" + type;
                        self.normalizedExpectedValueVectors[key] =
                            new ExpectedValueFunction(type, unit, binSize, values, normFactors);
                    }

                    // Normalization vector index
                    self.normVectorIndex = {};
                    self.normalizationTypes = [];
                    nEntries = binaryParser.getInt();
                    while (nEntries-- > 0) {
                        type = binaryParser.getString();
                        var chrIdx = binaryParser.getInt();
                        unit = binaryParser.getString();
                        binSize = binaryParser.getInt();
                        var filePosition = binaryParser.getLong();
                        var sizeInBytes = binaryParser.getInt();
                        key = NormalizationVector.getKey(type, chrIdx, unit.binSize);

                        if (_.contains(self.normalizationTypes, type) === false) {
                            self.normalizationTypes.push(type);
                        }
                        self.normVectorIndex[key] = {filePosition: filePosition, sizeInByes: sizeInBytes};
                    }

                }
                fulfill(self);

            }).catch(function (error) {
                reject(error);
            });

        });
    }


    igv.HiCReader.prototype.readMatrix = function (key) {

        var self = this;
        var idx = self.masterIndex[key];
        if (idx == null) {
            fulfill(undefined);
        }

        return new Promise(function (fulfill, reject) {

            igvxhr.loadArrayBuffer(self.path,
                {
                    headers: self.config.headers,
                    range: {start: position, size: idx.size},
                    withCredentials: self.config.withCredentials
                }).then(function (data) {

                if (!data) return;


                var dis = new igv.BinaryParser(new DataView(data));


                var c1 = dis.getInt();
                var c2 = dis.getInt();

                var chr1 = self.chromosomes[c1];
                var chr2 = self.chromosomes[c2];

                // # of resolution levels (bp and frags)
                var nResolutions = dis.getInt();

                var zdList = [];

                var p1 = getSites.call(self, chr1.name);
                var p2 = getSites.call(self, chr2.name);

                Promise.all([p1, p2]).then(function (results) {
                    var sites1 = results[0];
                    var sites2 = results[1];

                    while (nResolutions-- > 0) {
                        var zd = readMatrixZoomData(chr1, chr2, sites1, sites2, dis);
                        zdList.push(zd);
                    }

                    fulfill(new Matrix(c1, c2, zdList)); 
                    
                }).catch(reject);


            }).catch(reject)
        });
    }

    function getSites(chrName) {

        var self = this;

        return new Promise(function (fulfill, reject) {

            var sites = self.fragmentSitesCache[chrName];
            if (sites) {
                fulfill(sites);
            }
            else if (self.fragmentSitesIndex) {
                var entry = self.fragmentSitesIndex[chrName];
                if (entry !== undefined && entry.nSites > 0) {
                    readSites(entry.position, entry.nSites).then(function (sites) {
                        self.fragmentSitesCache[chrName] = sites;
                        fulfill(sites);

                    }).catch(reject);
                }
            }
            else {
                fulfill(undefined);
            }
        });
    }
    
    function readMatrixZoomData(chr1, chr2, chr1Sites, chr2Sites, dis) {
        
        var unit = dis.getString();
        dis.readInt();                // Old "zoom" index -- not used

        // Stats.  Not used yet, but we need to read them anyway
        var sumCounts = dis.getDouble();
        var occupiedCellCount = dis.getFloat();
        var stdDev = dis.getFloat();
        var percent95 = dis.getFloat();

        var binSize = dis.getInt();
        var zoom = {unit: unit, binSize: binSize};

        var blockBinCount = dis.getInt();
        var blockColumnCount = dis.getInt();

        var zd = new MatrixZoomData(chr1, chr2, zoom, blockBinCount, blockColumnCount, chr1Sites, chr2Sites, this);

        var nBlocks = dis.getInt();
        var blockIndex = {};

        while (nBlocks-- > 0) {
            var blockNumber = dis.getInt();
            var filePosition = dis.getLong();
            var blockSizeInBytes = dis.getInt();
            blockIndex[blockNumber] = {filePosition: filePosition, size: blockSizeInBytes};
        }
        self.blockIndexMap.put(zd.getKey(), blockIndex);

        var nBins1 = chr1.size / binSize;
        var nBins2 = chr2.size / binSize;
        var avgCount = (sumCounts / nBins1) / nBins2;   // <= trying to avoid overflows
        zd.averageCount = avgCount;

        return zd;
    }


    function ExpectedValueFunction(normType, unit, binSize, values, normFactors) {
        this.normType = normType;
        this.unit = unit;
        this.binSize = binSize;
        this.values = values;
        this.normFactors = normFactors;
    }

    function NormalizationVector(type, chrIdx, unit, binSize, data) {
        this.type = type;
        this.chrIdx = chrIdx;
        this.unit = unit;
        this.binSize = binSize;
        this.data = data;
    }
    NormalizationVector.getKey = function (type, chrIdx, unit, binSize) {
        return type + "_" + chrIdx + "_" + unit + "_" + binSize;
    }
    
    function MatrixZoomData(chr1, chr2, zoom, blockBinCount, blockColumnCount, chr1Sites, chr2Sites, reader) {
        this.chr1 = chr1;
        
    }
    
    return igv;

})
(igv || {});
