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

import BinaryParser from "../binary.js";
import {igvxhr, Zlib} from "../../node_modules/igv-utils/src/index.js";
import {buildOptions} from "../util/igvUtils.js";

const GZIP_FLAG = 0x1;

class TDFReader {

    constructor(config, genome) {
        this.config = config;
        this.genome = genome;
        this.path = config.url;
        this.groupCache = {};
        this.datasetCache = {};
    }


    async readHeader() {

        if (this.magic !== undefined) {
            return this;   // Already read
        }

        let data = await igvxhr.loadArrayBuffer(this.path, buildOptions(this.config, {range: {start: 0, size: 64000}}))
        let binaryParser = new BinaryParser(new DataView(data));
        this.magic = binaryParser.getInt();
        this.version = binaryParser.getInt();
        this.indexPos = binaryParser.getLong();
        this.indexSize = binaryParser.getInt();
        const headerSize = binaryParser.getInt();


        if (this.version >= 2) {
            let nWindowFunctions = binaryParser.getInt();
            this.windowFunctions = [];
            while (nWindowFunctions-- > 0) {
                this.windowFunctions.push(binaryParser.getString());
            }
        }

        this.trackType = binaryParser.getString();
        this.trackLine = binaryParser.getString();

        let nTracks = binaryParser.getInt();
        this.trackNames = [];
        while (nTracks-- > 0) {
            this.trackNames.push(binaryParser.getString());
        }
        this.genomeID = binaryParser.getString();
        this.flags = binaryParser.getInt();
        this.compressed = (this.flags & GZIP_FLAG) !== 0;

        // Now read index
        data = await igvxhr.loadArrayBuffer(this.path, buildOptions(this.config, {
            range: {
                start: this.indexPos,
                size: this.indexSize
            }
        }))
        binaryParser = new BinaryParser(new DataView(data));
        this.datasetIndex = {};
        let nEntries = binaryParser.getInt();
        while (nEntries-- > 0) {
            const name = binaryParser.getString();
            const pos = binaryParser.getLong();
            const size = binaryParser.getInt();
            this.datasetIndex[name] = {position: pos, size: size};
        }

        this.groupIndex = {};
        nEntries = binaryParser.getInt();
        while (nEntries-- > 0) {
            const name = binaryParser.getString();
            const pos = binaryParser.getLong();
            const size = binaryParser.getInt();
            this.groupIndex[name] = {position: pos, size: size};
        }

        return this;
    }

    async readDataset(chr, windowFunction, zoom) {

        const key = chr + "_" + windowFunction + "_" + zoom;

        if (this.datasetCache[key]) {
            return this.datasetCache[key];

        } else {
            await this.readHeader()
            const wf = (this.version < 2) ? "" : "/" + windowFunction;
            const zoomString = (chr.toLowerCase() === "all" || zoom === undefined) ? "0" : zoom.toString();

            let dsName;
            if (windowFunction === "raw") {
                dsName = "/" + chr + "/raw";
            } else {
                dsName = "/" + chr + "/z" + zoomString + wf;
            }
            const indexEntry = this.datasetIndex[dsName];

            if (indexEntry === undefined) {
                return undefined;
            }

            const data = await igvxhr.loadArrayBuffer(this.path, buildOptions(this.config, {
                range: {
                    start: indexEntry.position,
                    size: indexEntry.size
                }
            }));

            if (!data) {
                return undefined;
            }

            const binaryParser = new BinaryParser(new DataView(data));
            let nAttributes = binaryParser.getInt();
            const attributes = {};
            while (nAttributes-- > 0) {
                attributes[binaryParser.getString()] = binaryParser.getString();
            }
            const dataType = binaryParser.getString();
            const tileWidth = binaryParser.getFloat();
            let nTiles = binaryParser.getInt();
            const tiles = [];
            while (nTiles-- > 0) {
                tiles.push({position: binaryParser.getLong(), size: binaryParser.getInt()});
            }

            const dataset = {
                name: dsName,
                attributes: attributes,
                dataType: dataType,
                tileWidth: tileWidth,
                tiles: tiles
            }

            this.datasetCache[key] = dataset;
            return dataset;
        }
    }

    async readRootGroup() {

        const genome = this.genome;
        const rootGroup = this.groupCache["/"];
        if (rootGroup) {
            return rootGroup;
        } else {

            const group = await this.readGroup("/");
            const names = group["chromosomes"];
            const maxZoomString = group["maxZoom"];

            // Now parse out interesting attributes.
            if (maxZoomString) {
                this.maxZoom = Number(maxZoomString);
            }

            const totalCountString = group["totalCount"];
            if(totalCountString) {
                group.totalCount = Number.parseFloat(totalCountString);
            }

            // Chromosome names
            const chrAliasTable = {};
            if (names) {
                names.split(",").forEach(function (chr) {
                    const canonicalName = genome.getChromosomeName(chr);
                    chrAliasTable[canonicalName] = chr;
                })
            }
            this.chrAliasTable = chrAliasTable;

            this.groupCache["/"] = group;
            return group;
        }
    }

    async readGroup(name) {

        const group = this.groupCache[name];
        if (group) {
            return group;
        } else {

            await this.readHeader()
            const indexEntry = this.groupIndex[name];
            if (indexEntry === undefined) {
                return undefined;
            }

            const data = await igvxhr.loadArrayBuffer(this.path, buildOptions(this.config, {
                range: {
                    start: indexEntry.position,
                    size: indexEntry.size
                }
            }))

            if (!data) {
                return undefined;
            }

            const binaryParser = new BinaryParser(new DataView(data));
            const group = {name: name};
            let nAttributes = binaryParser.getInt();
            while (nAttributes-- > 0) {
                const key = binaryParser.getString();
                const value = binaryParser.getString();
                group[key] = value;
            }
            this.groupCache[name] = group;
            return group;
        }
    }


    async readTiles(tileIndeces, nTracks) {

        tileIndeces.sort(function (a, b) {
            return a.position - b.position;
        })

        tileIndeces = tileIndeces.filter(function (idx) {
            return idx.size > 0;
        });

        if (tileIndeces.length === 0) {
            return Promise.resolve([]);
        }

        const firstEntry = tileIndeces[0];
        const lastEntry = tileIndeces[tileIndeces.length - 1];
        const position = firstEntry.position;
        const size = (lastEntry.position + lastEntry.size) - position;
        const data = await igvxhr.loadArrayBuffer(this.path, buildOptions(this.config, {
            range: {
                start: position,
                size: size
            }
        }))

        const tiles = [];

        // Loop through and decode tiles
        for (let indexEntry of tileIndeces) {
            const start = indexEntry.position - position;
            const size = indexEntry.size;
            if (size > 0) {
                let tileData;
                if (this.compressed) {
                    const inflate = new Zlib.Inflate(new Uint8Array(data, start, size));
                    const plain = inflate.decompress();
                    tileData = plain.buffer;
                } else {
                    tileData = data.slice(start, start + size);
                }

                const binaryParser = new BinaryParser(new DataView(tileData));
                const type = binaryParser.getString();
                let tile;
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
        }
        return tiles;
    }

    async readTile(indexEntry, nTracks) {

        let data = await igvxhr.loadArrayBuffer(this.path, buildOptions(this.config, {
            range: {
                start: indexEntry.position,
                size: indexEntry.size
            }
        }))

        if (this.compressed) {
            const inflate = new Zlib.Inflate(new Uint8Array(data));
            const plain = inflate.decompress();
            data = plain.buffer;
        }

        const binaryParser = new BinaryParser(new DataView(data));
        const type = binaryParser.getString();
        switch (type) {
            case "fixedStep":
                return createFixedStep(binaryParser, nTracks);
            case "variableStep":
                return createVariableStep(binaryParser, nTracks);
            case "bed":
            case "bedWithName":
                return createBed(binaryParser, nTracks, type);
            default:
                throw "Unknown tile type: " + type;
        }
    }

}

function createFixedStep(binaryParser, nTracks) {
    const nPositions = binaryParser.getInt();
    const start = binaryParser.getInt();
    const span = binaryParser.getFloat();

    const data = [];
    let nt = nTracks;
    while (nt-- > 0) {
        let np = nPositions;
        const dtrack = [];
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

    const tileStart = binaryParser.getInt();
    const span = binaryParser.getFloat();
    const nPositions = binaryParser.getInt();
    const start = [];

    let np = nPositions;
    while (np-- > 0) {
        start.push(binaryParser.getInt());
    }
    const nS = binaryParser.getInt();  // # of samples, ignored but should === nTracks

    const data = [];
    let nt = nTracks;
    while (nt-- > 0) {
        np = nPositions;
        const dtrack = [];
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

    const nPositions = binaryParser.getInt();

    let n = nPositions;
    const start = [];
    while (n-- > 0) {
        start.push(binaryParser.getInt());
    }

    n = nPositions;
    const end = [];
    while (n-- > 0) {
        end.push(binaryParser.getInt());
    }

    const nS = binaryParser.getInt();  // # of samples, ignored but should === nTracks
    const data = [];
    let nt = nTracks;
    while (nt-- > 0) {
        let np = nPositions;
        const dtrack = [];
        while (np-- > 0) {
            dtrack.push(binaryParser.getFloat());
        }
        data.push(dtrack);
    }

    if (type === "bedWithName") {
        n = nPositions;
        const name = [];
        while (n-- > 0) {
            name.push(binaryParser.getString());
        }
    }

    return {
        type: type,
        start: start,
        end: end,
        data: data,
        nTracks: nTracks,
        nPositions: nPositions
    }

}

export default TDFReader;