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

import BinaryParser from "../binary";
import igvxhr from "../igvxhr";

const GZIP_FLAG = 0x1;

const TDFReader = function (config, genome) {
    this.config = config;
    this.genome = genome;
    this.path = config.url;
    this.groupCache = {};
    this.datasetCache = {};
};


TDFReader.prototype.readHeader = function () {

    var self = this;

    if (this.magic !== undefined) {
        return Promise.resolve(this);   // Already read
    }

    return igvxhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: {start: 0, size: 64000}}))

        .then(function (data) {

            var binaryParser = new BinaryParser(new DataView(data));

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
            return igvxhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {
                range: {
                    start: self.indexPos,
                    size: self.indexSize
                }
            }))
        })
        .then(function (data) {

            var binaryParser = new BinaryParser(new DataView(data));

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

            return self;   // The header data is stored in "self"

        })

}

TDFReader.prototype.readDataset = function (chr, windowFunction, zoom) {

    var self = this,
        dsName,
        key;

    key = chr + "_" + windowFunction + "_" + zoom;

    if (self.datasetCache[key]) {
        return Promise.resolve(self.datasetCache[key]);
    } else {
        return self.readHeader()

            .then(function (ignore) {

                var wf = (self.version < 2) ? "" : "/" + windowFunction,
                    zoomString = (chr.toLowerCase() === "all" || zoom === undefined) ? "0" : zoom.toString(),
                    indexEntry;

                if (windowFunction === "raw") {
                    dsName = "/" + chr + "/raw";
                } else {
                    dsName = "/" + chr + "/z" + zoomString + wf;
                }
                indexEntry = self.datasetIndex[dsName];

                if (indexEntry === undefined) {
                    return undefined;
                } else {

                    return igvxhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {
                        range: {
                            start: indexEntry.position,
                            size: indexEntry.size
                        }
                    }))
                }
            })
            .then(function (data) {

                if (!data) {
                    return undefined;
                }

                var binaryParser = new BinaryParser(new DataView(data));

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

                self.datasetCache[key] = dataset;

                return dataset;

            })
    }


}

TDFReader.prototype.readRootGroup = function () {

    const self = this;
    const genome = this.genome;
    const rootGroup = this.groupCache["/"];

    if (rootGroup) {
        return Promise.resolve(rootGroup);
    } else {
        return self.readGroup("/").then(function (group) {

            const names = group["chromosomes"];
            const maxZoomString = group["maxZoom"];

            // Now parse out interesting attributes.  This is a side effect, and bad bad bad,  but the alternative is messy as well.
            if (maxZoomString) {
                self.maxZoom = Number(maxZoomString);
            }

            // Chromosome names
            self.chrAliasTable = {};
            if (names) {
                names.split(",").forEach(function (chr) {
                    var canonicalName = genome.getChromosomeName(chr);
                    self.chrAliasTable[canonicalName] = chr;
                })
            }
            return group;
        })
    }
}

TDFReader.prototype.readGroup = function (name) {

    var self = this, group;

    var group = self.groupCache[name];
    if (group) {
        return Promise.resolve(group);
    } else {
        return self.readHeader()

            .then(function (reader) {

                var indexEntry = self.groupIndex[name];

                if (indexEntry === undefined) {
                    return undefined;
                } else {

                    return igvxhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {
                        range: {
                            start: indexEntry.position,
                            size: indexEntry.size
                        }
                    }))
                }
            })
            .then(function (data) {

                if (!data) {
                    return undefined;
                }

                var binaryParser = new BinaryParser(new DataView(data));

                var nAttributes = binaryParser.getInt();
                var group = {name: name};
                while (nAttributes-- > 0) {
                    group[binaryParser.getString()] = binaryParser.getString();
                }

                self.groupCache[name] = group;

                return group;
            })
    }
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
    var nPositions, start, end, nS, data, name, n, nt, np, dtrack;

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

TDFReader.prototype.readTiles = function (tileIndeces, nTracks) {

    var self = this;

    tileIndeces.sort(function (a, b) {
        return a.position - b.position;
    })

    tileIndeces = tileIndeces.filter(function (idx) {
        return idx.size > 0;
    });

    if (tileIndeces.length === 0) {
        return Promise.resolve([]);
    }

    var firstEntry = tileIndeces[0];
    var lastEntry = tileIndeces[tileIndeces.length - 1];
    var position = firstEntry.position;
    var size = (lastEntry.position + lastEntry.size) - position;


    return igvxhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {
        range: {
            start: position,
            size: size
        }
    }))
        .then(function (data) {

            var tiles = [];

            // Loop through and decode tiles
            tileIndeces.forEach(function (indexEntry) {

                var start = indexEntry.position - position;
                var size = indexEntry.size;
                if (size > 0) {
                    var tileData;

                    if (self.compressed) {
                        var inflate = new Zlib.Inflate(new Uint8Array(data, start, size));
                        var plain = inflate.decompress();
                        tileData = plain.buffer;
                    } else {
                        tileData = data.slice(start, start + size);
                    }


                    var binaryParser = new BinaryParser(new DataView(tileData));
                    var type = binaryParser.getString();
                    var tile;

                    switch (type) {
                        case "fixedStep":
                            tile = createFixedStep(binaryParser, nTracks);
                            break;
                        case "variableStep":
                            tile = createVariableStep(binaryParser, nTracks);
                            break;
                        case "bed":
                        case "bedWithName":
                            tile = createBed(binaryParser, nTracks, type);
                            break;
                        default:
                            throw "Unknown tile type: " + type;
                    }

                    tiles.push(tile);
                }
            });

            return tiles;

        });

    // Read raw data for all tiles into a buffer
}

TDFReader.prototype.readTile = function (indexEntry, nTracks) {

    var self = this;

    return igvxhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {
        range: {
            start: indexEntry.position,
            size: indexEntry.size
        }
    }))
        .then(function (data) {

            if (self.compressed) {
                var inflate = new Zlib.Inflate(new Uint8Array(data));
                var plain = inflate.decompress();
                data = plain.buffer;
            }

            var binaryParser = new BinaryParser(new DataView(data));

            var type = binaryParser.getString();

            switch (type) {
                case "fixedStep":
                    return createFixedStep(binaryParser, nTracks);
                    break;
                case "variableStep":
                    return createVariableStep(binaryParser, nTracks);
                    break;
                case "bed":
                case "bedWithName":
                    return createBed(binaryParser, nTracks, type);
                    break;
                default:
                    throw "Unknown tile type: " + type;
            }
        });

}

export default TDFReader;