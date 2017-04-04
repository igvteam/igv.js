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
        this.groupCache = {};
    };


    igv.TDFReader.prototype.readHeader = function () {

        var self = this;

        if (this.magic !== undefined) {
            return Promise.resolve(this);   // Already read
        }

        return new Promise(function (fulfill, reject) {

            igvxhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: {start: 0, size: 64000}}))
                .then(function (data) {

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

                // Now read index
                igvxhr.loadArrayBuffer(self.path,igv.buildOptions(self.config, {range: {start: self.indexPos, size: self.indexSize}}))
                    .then(function (data) {


                    if (!data) {
                        reject("no data");
                        return;
                    }

                    binaryParser = new igv.BinaryParser(new DataView(data));

                    self.datasetIndex = {};
                    var nEntries = binaryParser.getInt();
                    while (nEntries-- > 0) {
                        var name = binaryParser.getString();
                        var pos = binaryParser.getLong();
                        var size = binaryParser.getInt();
                        self.datasetIndex[name] = {position: pos, size: size};
                    }

                    self.groupIndex = {};
                    nEntries = binaryParser.getInt();
                    while (nEntries-- > 0) {
                        name = binaryParser.getString();
                        pos = binaryParser.getLong();
                        size = binaryParser.getInt();
                        self.groupIndex[name] = {position: pos, size: size};
                    }

                    fulfill(self);

                }).catch(reject);

            }).catch(reject)

        });
    }

    igv.TDFReader.prototype.readDataset = function (chr, windowFunction,  zoom) {

        var self = this;

        return new Promise(function (fulfill, reject) {


            self.readHeader().then(function (reader) {

                var wf = (self.version < 2) ? "" : "/" + windowFunction,
                    zoomString = (chr === "all" || zoom === undefined) ? "0" : zoom.toString(),
                    dsName,
                    indexEntry;

                if (windowFunction === "raw") {
                    dsName = "/" + chr + "/raw";
                }
                else {
                    dsName = "/" + chr + "/z" + zoomString + wf;
                }
                indexEntry = self.datasetIndex[dsName];

                if (indexEntry === undefined) {
                    fulfill(null);
                }
                else {


                    igvxhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: {start: indexEntry.position, size: indexEntry.size}}))
                        .then(function (data) {

                        if (!data) {
                            reject("no data");
                            return;
                        }

                        var binaryParser = new igv.BinaryParser(new DataView(data));

                        var nAttributes = binaryParser.getInt();
                        var attributes = {};
                        while (nAttributes-- > 0) {
                            attributes[binaryParser.getString()] = binaryParser.getString();
                        }

                        var dataType = binaryParser.getString();
                        var tileWidth = binaryParser.getFloat();

                        var nTiles = binaryParser.getInt();
                        var tiles = [];
                        while (nTiles-- > 0) {
                            tiles.push({position: binaryParser.getLong(), size: binaryParser.getInt()});
                        }

                        var dataset = {
                            name: dsName,
                            attributes: attributes,
                            dataType: dataType,
                            tileWidth: tileWidth,
                            tiles: tiles
                        };

                        fulfill(dataset);

                    }).catch(reject);
                }
            }).catch(reject);
        });
    }

    igv.TDFReader.prototype.readRootGroup = function () {

        var self = this,
            rootGroup = this.groupCache["/"];

        if (rootGroup) {
            return Promise.resolve(rootGroup);
        }
        else {
            return new Promise(function (fulfill, reject) {

                self.readGroup("/").then(function (group) {

                    var genome = igv.browser.genome,
                        names = group["chromosomes"],
                        maxZoomString = group["maxZoom"];

                    // Now parse out interesting attributes.  This is a side effect, and bad bad bad,  but the alternative is messy as well.
                    if(maxZoomString) {
                        self.maxZoom = Number(maxZoomString);
                    }

                    // Chromosome names
                    self.chrNameMap = {};
                    if(names) {
                        _.each(names.split(","), function (chr) {
                            var canonicalName = genome.getChromosomeName(chr);
                            self.chrNameMap[canonicalName] = chr;
                        })
                    }

                    fulfill(group);


                }).catch(reject);
            });

        }
    }

    igv.TDFReader.prototype.readGroup = function (name) {

        var self = this;

        return new Promise(function (fulfill, reject) {


            self.readHeader().then(function (reader) {

                var group = self.groupCache[name],
                    indexEntry = self.groupIndex[name];

                if (group) {
                    fulfill(group);
                }
                else if (indexEntry === undefined) {
                    return fulfill(null);
                }
                else {


                    igvxhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: {start: indexEntry.position, size: indexEntry.size}}))
                        .then(function (data) {

                        if (!data) {
                            reject("no data");
                            return;
                        }

                        var binaryParser = new igv.BinaryParser(new DataView(data));

                        var nAttributes = binaryParser.getInt();
                        var group = {name: name};
                        while (nAttributes-- > 0) {
                            group[binaryParser.getString()] = binaryParser.getString();
                        }

                        self.groupCache[name] = group;

                        fulfill(group);

                    }).catch(reject);
                }
            }).catch(reject);
        });
    }




    function createFixedStep(binaryParser, nTracks) {
        var nPositions = binaryParser.getInt(),
            start = binaryParser.getInt(),
            span = binaryParser.getFloat(),
            np = nPositions,
            nt = nTracks,
            data,
            dtrack;


        data = [];
        while (nt-- > 0) {
            np = nPositions;
            dtrack = [];
            while (np-- > 0) {
                dtrack.push(binaryParser.getFloat());
            }
            data.push(dtrack);
        }

        return {
            type: "fixedStep",
            start: start,
            span: span,
            data: data,
            nTracks: nTracks,
            nPositions: nPositions
        }
    }

    function createVariableStep(binaryParser, nTracks) {

        var tileStart = binaryParser.getInt(),
            span = binaryParser.getFloat(),
            nPositions = binaryParser.getInt(),
            np = nPositions,
            nt = nTracks,
            start = [],
            data,
            dtrack;

        while (np-- > 0) {
            start.push(binaryParser.getInt());
        }

        var nS = binaryParser.getInt();  // # of samples, ignored but should === nTracks

        data = [];
        while (nt-- > 0) {
            np = nPositions;
            dtrack = [];
            while (np-- > 0) {
                dtrack.push(binaryParser.getFloat());
            }
            data.push(dtrack);
        }

        return {
            type: "variableStep",
            tileStart: tileStart,
            span: span,
            start: start,
            data: data,
            nTracks: nTracks,
            nPositions: nPositions
        }
    }

    function createBed(binaryParser, nTracks, type) {
        var nPositions, start, end, nS, data, name, n, nt;

        nPositions = binaryParser.getInt();

        n = nPositions;
        start = [];
        while (n-- > 0) {
            start.push(binaryParser.getInt());
        }

        n = nPositions;
        end = [];
        while (n-- > 0) {
            end.push(binaryParser.getInt());
        }

        var nS = binaryParser.getInt();  // # of samples, ignored but should === nTracks

        data = [];
        nt = nTracks;
        while (nt-- > 0) {
            np = nPositions;
            dtrack = [];
            while (np-- > 0) {
                dtrack.push(binaryParser.getFloat());
            }
            data.push(dtrack);
        }

        if (type === "bedWithName") {
            n = nPositions;
            name = [];
            while (n-- > 0) {
                name.push(binaryParser.getString());
            }
        }

        return {
            type: type,
            start: start,
            end: end,
            data: data,
            name: name,
            nTracks: nTracks,
            nPositions: nPositions
        }

    }


    igv.TDFReader.prototype.readTile = function (indexEntry, nTracks) {

        var self = this;

        return new Promise(function (fulfill, reject) {

            igvxhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: {start: indexEntry.position, size: indexEntry.size}}))
                .then(function (data) {

                if (!data) {
                    reject("no data");
                    return;
                }

                if (self.compressed) {
                    var inflate = new Zlib.Inflate(new Uint8Array(data));
                    var plain = inflate.decompress();
                    data = plain.buffer;
                }

                var binaryParser = new igv.BinaryParser(new DataView(data));

                var type = binaryParser.getString();

                switch (type) {
                    case "fixedStep":
                        fulfill(createFixedStep(binaryParser, nTracks));
                        break;
                    case "variableStep":
                        fulfill(createVariableStep(binaryParser, nTracks));
                        break;
                    case "bed":
                    case "bedWithName":
                        fulfill(createBed(binaryParser, nTracks, type));
                        break;
                    default:
                        reject("Unknown tile type: " + type);
                }


            }).catch(reject);

        });

    }

    return igv;

})
(igv || {});
