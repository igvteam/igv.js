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

import BufferedReader from "./bufferedReader.js"
import BinaryParser from "../binary.js"
import {BGZip, igvxhr} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions, isDataURL} from "../util/igvUtils.js"
import getDecoder from "./bbDecoders.js"
import {parseAutoSQL} from "../util/ucscUtils.js"

let BIGWIG_MAGIC_LTH = 0x888FFC26 // BigWig Magic Low to High
let BIGWIG_MAGIC_HTL = 0x26FC8F66 // BigWig Magic High to Low
let BIGBED_MAGIC_LTH = 0x8789F2EB // BigBed Magic Low to High
let BIGBED_MAGIC_HTL = 0xEBF28987 // BigBed Magic High to Low
let BBFILE_HEADER_SIZE = 64
let RPTREE_HEADER_SIZE = 48
let RPTREE_NODE_LEAF_ITEM_SIZE = 32   // leaf item size
let RPTREE_NODE_CHILD_ITEM_SIZE = 24  // child item size
let BUFFER_SIZE = 512000     //  buffer
let BPTREE_HEADER_SIZE = 32

class BWReader {

    constructor(config, genome) {
        this.path = config.url
        this.format = config.format || "bigwig"
        this.genome = genome
        this.rpTreeCache = {}
        this.config = config
        this.loader = isDataURL(this.path) ? new DataBuffer(this.path) : igvxhr
    }

    async readWGFeatures(bpPerPixel, windowFunction) {
        await this.loadHeader()
        const chrIdx1 = 0
        const chrIdx2 = this.chromTree.idToChrom.length - 1
        const chr1 = this.chromTree.idToChrom[chrIdx1]
        const chr2 = this.chromTree.idToChrom[chrIdx2]
        return this.readFeatures(chr1, 0, chr2, Number.MAX_VALUE, bpPerPixel, windowFunction)
    }

    async readFeatures(chr1, bpStart, chr2, bpEnd, bpPerPixel, windowFunction) {

        await this.loadHeader()
        const chrIdx1 = this.chromTree.chromToID[chr1]
        const chrIdx2 = this.chromTree.chromToID[chr2]
        if (chrIdx1 === undefined || chrIdx2 === undefined) {
            return []
        }

        let treeOffset
        let decodeFunction
        if (this.type === "bigwig") {
            // Select a biwig "zoom level" appropriate for the current resolution.
            const zoomLevelHeaders = await this.getZoomHeaders()
            let zoomLevelHeader = bpPerPixel ? zoomLevelForScale(bpPerPixel, zoomLevelHeaders) : undefined
            if (zoomLevelHeader) {
                treeOffset = zoomLevelHeader.indexOffset
                decodeFunction = decodeZoomData
            } else {
                treeOffset = this.header.fullIndexOffset
                decodeFunction = decodeWigData
            }
        } else {
            // bigbed, zoom data is not currently used in igv for bed type features
            treeOffset = this.header.fullIndexOffset
            decodeFunction = getBedDataDecoder.call(this)
        }


        // Load the R Tree and fine leaf items
        const rpTree = await this.loadRPTree(treeOffset)
        const leafItems = await rpTree.findLeafItemsOverlapping(chrIdx1, bpStart, chrIdx2, bpEnd)
        if (!leafItems || leafItems.length === 0) {
            return []
        } else {

            // Consolidate leaf items and get all data at once
            let start = Number.MAX_VALUE
            let end = 0
            for (let item of leafItems) {
                start = Math.min(start, item.dataOffset)
                end = Math.max(end, item.dataOffset + item.dataSize)
            }
            const size = end - start
            const arrayBuffer = await this.loader.loadArrayBuffer(this.config.url, buildOptions(this.config, {
                range: {
                    start: start,
                    size: size
                }
            }))

            // Parse data and return features
            const allFeatures = []
            for (let item of leafItems) {
                const uint8Array = new Uint8Array(arrayBuffer, item.dataOffset - start, item.dataSize)
                let plain
                const isCompressed = this.header.uncompressBuffSize > 0
                if (isCompressed) {
                    plain = BGZip.inflate(uint8Array)
                } else {
                    plain = uint8Array
                }
                decodeFunction.call(this, new DataView(plain.buffer), chrIdx1, bpStart, chrIdx2, bpEnd, allFeatures, this.chromTree.idToChrom, windowFunction)
            }

            allFeatures.sort(function (a, b) {
                return a.start - b.start
            })

            return allFeatures
        }
    }

    async getZoomHeaders() {
        if (this.zoomLevelHeaders) {
            return this.zoomLevelHeaders
        } else {
            await this.loadHeader()
            return this.zoomLevelHeaders
        }
    }

    async loadHeader() {

        if (this.header) {
            return this.header
        } else {
            let data = await this.loader.loadArrayBuffer(this.path, buildOptions(this.config, {
                range: {
                    start: 0,
                    size: BBFILE_HEADER_SIZE
                }
            }))

            let header

            // Assume low-to-high unless proven otherwise
            this.littleEndian = true

            let binaryParser = new BinaryParser(new DataView(data))
            let magic = binaryParser.getUInt()
            if (magic === BIGWIG_MAGIC_LTH) {
                this.type = "bigwig"
            } else if (magic === BIGBED_MAGIC_LTH) {
                this.type = "bigbed"
            } else {
                //Try big endian order
                this.littleEndian = false

                binaryParser.littleEndian = false
                binaryParser.position = 0
                let magic = binaryParser.getUInt()

                if (magic === BIGWIG_MAGIC_HTL) {
                    this.type = "bigwig"
                } else if (magic === BIGBED_MAGIC_HTL) {
                    this.type = "bigbed"
                } else {
                    // TODO -- error, unknown file type  or BE
                }
            }
            // Table 5  "Common header for bigwig and bigbed files"
            header = {
                bwVersion: binaryParser.getUShort(),
                nZoomLevels: binaryParser.getUShort(),
                chromTreeOffset: binaryParser.getLong(),
                fullDataOffset: binaryParser.getLong(),
                fullIndexOffset: binaryParser.getLong(),
                fieldCount: binaryParser.getUShort(),
                definedFieldCount: binaryParser.getUShort(),
                autoSqlOffset: binaryParser.getLong(),
                totalSummaryOffset: binaryParser.getLong(),
                uncompressBuffSize: binaryParser.getInt(),
                extensionOffset: binaryParser.getLong()
            }

            ///////////

            const startOffset = BBFILE_HEADER_SIZE
            let range = {start: startOffset, size: (header.fullDataOffset - startOffset + 5)}
            data = await this.loader.loadArrayBuffer(this.path, buildOptions(this.config, {range: range}))

            const nZooms = header.nZoomLevels
            binaryParser = new BinaryParser(new DataView(data))

            this.zoomLevelHeaders = []
            this.firstZoomDataOffset = Number.MAX_SAFE_INTEGER
            for (let i = 1; i <= nZooms; i++) {
                const zoomNumber = nZooms - i
                const zlh = new ZoomLevelHeader(zoomNumber, binaryParser)
                this.firstZoomDataOffset = Math.min(zlh.dataOffset, this.firstZoomDataOffset)
                this.zoomLevelHeaders[zoomNumber] = zlh
            }

            // Autosql
            if (header.autoSqlOffset > 0) {
                binaryParser.position = header.autoSqlOffset - startOffset
                const autoSqlString = binaryParser.getString()
                if (autoSqlString) {
                    this.autoSql = parseAutoSQL(autoSqlString)
                }
            }

            // Total summary
            if (header.totalSummaryOffset > 0) {
                binaryParser.position = header.totalSummaryOffset - startOffset
                this.totalSummary = new BWTotalSummary(binaryParser)
            }

            // Chrom data index
            if (header.chromTreeOffset > 0) {
                binaryParser.position = header.chromTreeOffset - startOffset
                this.chromTree = new BPTree(binaryParser, startOffset, this.genome)
            } else {
                // TODO -- this is an error, not expected
                throw "BigWig chromosome tree offset <= 0"
            }

            //Finally total data count
            binaryParser.position = header.fullDataOffset - startOffset
            header.dataCount = binaryParser.getInt()
            ///////////

            this.setDefaultVisibilityWindow(header)

            this.header = header
            return this.header

        }
    }

    async loadRPTree(offset) {

        let rpTree = this.rpTreeCache[offset]
        if (rpTree) {
            return rpTree
        } else {
            rpTree = new RPTree(offset, this.config, this.littleEndian, this.loader)
            await rpTree.load()
            this.rpTreeCache[offset] = rpTree
            return rpTree
        }
    }

    async getType() {
        await this.loadHeader()
        return this.type
    }

    async getTrackType() {
        await this.loadHeader()
        if (this.type === "bigwig") {
            return "wig"
        } else {
            return this.autoSql && this.autoSql.table === "chromatinInteract" ? "interact" : "annotation"
        }
    }

    setDefaultVisibilityWindow(header) {
        if (this.type === "bigwig") {
            this.visibilityWindow = -1
        } else {
            // bigbed
            let genomeSize = this.genome ? this.genome.getGenomeLength() : 3088286401
            // Estimate window size to return ~ 1,000 features, assuming even distribution across the genome
            this.visibilityWindow = header.dataCount < 1000 ? -1 : 1000 * (genomeSize / header.dataCount)

        }
    }
}


class ZoomLevelHeader {
    constructor(index, byteBuffer) {
        this.index = index
        this.reductionLevel = byteBuffer.getInt()
        this.reserved = byteBuffer.getInt()
        this.dataOffset = byteBuffer.getLong()
        this.indexOffset = byteBuffer.getLong()
    }
}

class RPTree {

    constructor(fileOffset, config, littleEndian, loader) {

        this.config = config
        this.loader = loader
        this.fileOffset = fileOffset // File offset to beginning of tree
        this.path = config.url
        this.littleEndian = littleEndian
    }

    async load() {
        const rootNodeOffset = this.fileOffset + RPTREE_HEADER_SIZE
        const bufferedReader = isDataURL(this.path) ?
            this.loader :
            new BufferedReader(this.config, BUFFER_SIZE)
        this.rootNode = await this.readNode(rootNodeOffset, bufferedReader)
        return this
    }

    async readNode(filePosition, bufferedReader) {

        let dataView = await bufferedReader.dataViewForRange({start: filePosition, size: 4}, false)
        let binaryParser = new BinaryParser(dataView, this.littleEndian)
        const type = binaryParser.getByte()
        const isLeaf = (type === 1)
        const reserved = binaryParser.getByte()
        const count = binaryParser.getUShort()
        filePosition += 4

        let bytesRequired = count * (isLeaf ? RPTREE_NODE_LEAF_ITEM_SIZE : RPTREE_NODE_CHILD_ITEM_SIZE)
        let range2 = {start: filePosition, size: bytesRequired}
        dataView = await bufferedReader.dataViewForRange(range2, false)
        const items = new Array(count)
        binaryParser = new BinaryParser(dataView)

        if (isLeaf) {
            for (let i = 0; i < count; i++) {
                let item = {
                    isLeaf: true,
                    startChrom: binaryParser.getInt(),
                    startBase: binaryParser.getInt(),
                    endChrom: binaryParser.getInt(),
                    endBase: binaryParser.getInt(),
                    dataOffset: binaryParser.getLong(),
                    dataSize: binaryParser.getLong()
                }
                items[i] = item

            }
            return new RPTreeNode(items)
        } else { // non-leaf
            for (let i = 0; i < count; i++) {

                let item = {
                    isLeaf: false,
                    startChrom: binaryParser.getInt(),
                    startBase: binaryParser.getInt(),
                    endChrom: binaryParser.getInt(),
                    endBase: binaryParser.getInt(),
                    childOffset: binaryParser.getLong()
                }
                items[i] = item
            }

            return new RPTreeNode(items)
        }

    }

    async findLeafItemsOverlapping(chrIdx1, startBase, chrIdx2, endBase) {

        let self = this

        return new Promise(function (fulfill, reject) {

            let leafItems = [],
                processing = new Set(),
                bufferedReader = isDataURL(self.path) ?
                    self.loader :
                    new BufferedReader(self.config, BUFFER_SIZE)

            processing.add(0)  // Zero represents the root node
            findLeafItems(self.rootNode, 0)

            function findLeafItems(node, nodeId) {

                if (overlaps(node, chrIdx1, startBase, chrIdx2, endBase)) {

                    let items = node.items

                    items.forEach(function (item) {

                        if (overlaps(item, chrIdx1, startBase, chrIdx2, endBase)) {

                            if (item.isLeaf) {
                                leafItems.push(item)
                            } else {
                                if (item.childNode) {
                                    findLeafItems(item.childNode)
                                } else {
                                    processing.add(item.childOffset)  // Represent node to-be-loaded by its file position

                                    self.readNode(item.childOffset, bufferedReader)
                                        .then(function (node) {
                                            item.childNode = node
                                            findLeafItems(node, item.childOffset)
                                        })
                                        .catch(reject)
                                }
                            }
                        }
                    })

                }

                if (nodeId !== undefined) processing.delete(nodeId)

                // Wait until all nodes are processed
                if (processing.size === 0) {
                    fulfill(leafItems)
                }
            }
        })
    }
}

class RPTreeNode {

    constructor(items) {

        this.items = items

        let minChromId = Number.MAX_SAFE_INTEGER,
            maxChromId = 0,
            minStartBase = Number.MAX_SAFE_INTEGER,
            maxEndBase = 0,
            i,
            item

        for (i = 0; i < items.length; i++) {
            item = items[i]
            minChromId = Math.min(minChromId, item.startChrom)
            maxChromId = Math.max(maxChromId, item.endChrom)
            minStartBase = Math.min(minStartBase, item.startBase)
            maxEndBase = Math.max(maxEndBase, item.endBase)
        }

        this.startChrom = minChromId
        this.endChrom = maxChromId
        this.startBase = minStartBase
        this.endBase = maxEndBase
    }
}

class BPTree {

    constructor(binaryParser, startOffset, genome) {

        let magic = binaryParser.getInt()
        let blockSize = binaryParser.getInt()
        let keySize = binaryParser.getInt()
        let valSize = binaryParser.getInt()
        let itemCount = binaryParser.getLong()
        let reserved = binaryParser.getLong()
        let chromToId = {}
        let idToChrom = []

        this.header = {
            magic: magic,
            blockSize: blockSize,
            keySize: keySize,
            valSize: valSize,
            itemCount: itemCount,
            reserved: reserved
        }
        this.chromToID = chromToId
        this.idToChrom = idToChrom

        // Recursively walk tree to populate dictionary
        readTreeNode(binaryParser, -1)


        function readTreeNode(byteBuffer, offset) {

            if (offset >= 0) byteBuffer.position = offset

            let type = byteBuffer.getByte(),
                reserved = byteBuffer.getByte(),
                count = byteBuffer.getUShort(),
                i,
                key,
                chromId,
                chromSize,
                childOffset,
                bufferOffset,
                currOffset


            if (type === 1) {

                for (i = 0; i < count; i++) {

                    key = byteBuffer.getFixedLengthTrimmedString(keySize)
                    chromId = byteBuffer.getInt()
                    chromSize = byteBuffer.getInt()

                    if (genome) key = genome.getChromosomeName(key)  // Translate to canonical chr name
                    chromToId[key] = chromId
                    idToChrom[chromId] = key

                }
            } else { // non-leaf

                for (i = 0; i < count; i++) {

                    key = byteBuffer.getFixedLengthTrimmedString(keySize)
                    childOffset = byteBuffer.getLong()
                    bufferOffset = childOffset - startOffset
                    currOffset = byteBuffer.position
                    readTreeNode(byteBuffer, bufferOffset)
                    byteBuffer.position = currOffset
                }
            }

        }
    }
}

/**
 * Return true if {chrIdx1:startBase-chrIdx2:endBase} overlaps item's interval
 * @returns {boolean}
 */
function overlaps(item, chrIdx1, startBase, chrIdx2, endBase) {

    if (!item) {
        console.log("null item for " + chrIdx1 + " " + startBase + " " + endBase)
        return false
    }

    return ((chrIdx2 > item.startChrom) || (chrIdx2 === item.startChrom && endBase >= item.startBase)) &&
        ((chrIdx1 < item.endChrom) || (chrIdx1 === item.endChrom && startBase <= item.endBase))


}

class BWTotalSummary {

    constructor(byteBuffer) {
        if (byteBuffer) {
            this.basesCovered = byteBuffer.getLong()
            this.minVal = byteBuffer.getDouble()
            this.maxVal = byteBuffer.getDouble()
            this.sumData = byteBuffer.getDouble()
            this.sumSquares = byteBuffer.getDouble()
            computeStats.call(this)
        } else {
            this.basesCovered = 0
            this.minVal = 0
            this.maxVal = 0
            this.sumData = 0
            this.sumSquares = 0
            this.mean = 0
            this.stddev = 0
        }
    }
}

function computeStats() {
    let n = this.basesCovered
    if (n > 0) {
        this.mean = this.sumData / n
        this.stddev = Math.sqrt(this.sumSquares / (n - 1))

        let min = this.minVal < 0 ? this.mean - 2 * this.stddev : 0,
            max = this.maxVal > 0 ? this.mean + 2 * this.stddev : 0

        this.defaultRange = {
            min: min,
            max: max
        }
    }
}

function zoomLevelForScale(bpPerPixel, zoomLevelHeaders) {
    let level
    for (let i = 0; i < zoomLevelHeaders.length; i++) {
        const zl = zoomLevelHeaders[i]
        if (zl.reductionLevel < bpPerPixel) {
            level = zl
            break
        }
    }
    return level
}


function decodeWigData(data, chrIdx1, bpStart, chrIdx2, bpEnd, featureArray, chrDict) {

    const binaryParser = new BinaryParser(data)
    const chromId = binaryParser.getInt()
    let chromStart = binaryParser.getInt()
    let chromEnd = binaryParser.getInt()
    const itemStep = binaryParser.getInt()
    const itemSpan = binaryParser.getInt()
    const type = binaryParser.getByte()
    const reserved = binaryParser.getByte()
    let itemCount = binaryParser.getUShort()

    if (chromId >= chrIdx1 && chromId <= chrIdx2) {

        while (itemCount-- > 0) {
            let value
            switch (type) {
                case 1:
                    chromStart = binaryParser.getInt()
                    chromEnd = binaryParser.getInt()
                    value = binaryParser.getFloat()
                    break
                case 2:
                    chromStart = binaryParser.getInt()
                    value = binaryParser.getFloat()
                    chromEnd = chromStart + itemSpan
                    break
                case 3:  // Fixed step
                    value = binaryParser.getFloat()
                    chromEnd = chromStart + itemSpan
                    chromStart += itemStep
                    break
            }

            if (chromId < chrIdx1 || (chromId === chrIdx1 && chromEnd < bpStart)) continue
            else if (chromId > chrIdx2 || (chromId === chrIdx2 && chromStart >= bpEnd)) break

            if (Number.isFinite(value)) {
                const chr = chrDict[chromId]
                featureArray.push({chr: chr, start: chromStart, end: chromEnd, value: value})

            }
        }
    }
}

function getBedDataDecoder() {

    const minSize = 3 * 4 + 1   // Minimum # of bytes required for a bed record
    const decoder = getDecoder(this.header.definedFieldCount, this.header.fieldCount, this.autoSql, this.format)
    return function (data, chrIdx1, bpStart, chrIdx2, bpEnd, featureArray, chrDict) {
        const binaryParser = new BinaryParser(data)
        while (binaryParser.remLength() >= minSize) {

            const chromId = binaryParser.getInt()
            const chr = chrDict[chromId]
            const chromStart = binaryParser.getInt()
            const chromEnd = binaryParser.getInt()
            const rest = binaryParser.getString()
            if (chromId < chrIdx1 || (chromId === chrIdx1 && chromEnd < bpStart)) continue
            else if (chromId > chrIdx2 || (chromId === chrIdx2 && chromStart >= bpEnd)) break

            if (chromEnd > 0) {
                const feature = {chr: chr, start: chromStart, end: chromEnd}
                featureArray.push(feature)
                const tokens = rest.split("\t")
                decoder(feature, tokens)
            }
        }
    }
}


function decodeZoomData(data, chrIdx1, bpStart, chrIdx2, bpEnd, featureArray, chrDict, windowFunction) {

    const binaryParser = new BinaryParser(data)
    const minSize = 8 * 4  // Minimum # of bytes required for a zoom record


    while (binaryParser.remLength() >= minSize) {
        const chromId = binaryParser.getInt()
        const chr = chrDict[chromId]
        const chromStart = binaryParser.getInt()
        const chromEnd = binaryParser.getInt()
        const validCount = binaryParser.getInt()
        const minVal = binaryParser.getFloat()
        const maxVal = binaryParser.getFloat()
        const sumData = binaryParser.getFloat()
        const sumSquares = binaryParser.getFloat()
        let value
        switch (windowFunction) {
            case "min":
                value = minVal
                break
            case "max":
                value = maxVal
                break
            default:
                value = validCount === 0 ? 0 : sumData / validCount
        }

        if (chromId < chrIdx1 || (chromId === chrIdx1 && chromEnd < bpStart)) continue
        else if (chromId > chrIdx2 || (chromId === chrIdx2 && chromStart >= bpEnd)) break


        if (Number.isFinite(value)) {
            featureArray.push({chr: chr, start: chromStart, end: chromEnd, value: value})


        }
    }
}

class DataBuffer {

    constructor(dataURI) {
        this.data = BGZip.decodeDataURI(dataURI).buffer
    }

    /**
     * igvxhr interface
     * @param ignore
     * @param options
     * @returns {any}
     */
    loadArrayBuffer(ignore, options) {
        const range = options.range
        return range ? this.data.slice(range.start, range.start + range.size) : this.data
    }

    /**
     * BufferedReader interface
     *
     * @param requestedRange - byte rangeas {start, size}
     * @param fulfill - function to receive result
     * @param asUint8 - optional flag to return result as an UInt8Array
     */
    async dataViewForRange(requestedRange, asUint8) {
        const len = Math.min(this.data.byteLength - requestedRange.start, requestedRange.size)
        return asUint8 ?
            new Uint8Array(this.data, requestedRange.start, len) :
            new DataView(this.data, requestedRange.start, len)
    }
}

export default BWReader
