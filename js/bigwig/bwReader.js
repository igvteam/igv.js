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

import ChromTree from "./chromTree.js"
import RPTree from "./rpTree.js"
import BinaryParser from "../binary.js"
import {BGZip, igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions, isDataURL} from "../util/igvUtils.js"
import getDecoder from "./bbDecoders.js"
import {parseAutoSQL} from "../util/ucscUtils.js"
import Trix from "./trix.js"
import BPTree from "./bpTree.js"


const BIGWIG_MAGIC_LTH = 0x888FFC26 // BigWig Magic Low to High
const BIGWIG_MAGIC_HTL = 0x26FC8F66 // BigWig Magic High to Low
const BIGBED_MAGIC_LTH = 0x8789F2EB // BigBed Magic Low to High
const BIGBED_MAGIC_HTL = 0xEBF28987 // BigBed Magic High to Low
const BBFILE_HEADER_SIZE = 64
const BBFILE_EXTENDED_HEADER_HEADER_SIZE = 64
const BUFFER_SIZE = 512000     //  buffer

class BWReader {

    chrAliasTable = new Map()
    rpTreeCache = new Map()

    constructor(config, genome) {
        this.path = config.url
        this.format = config.format || "bigwig"
        this.genome = genome
        this.config = config
        this.bufferSize = BUFFER_SIZE
        this.loader = isDataURL(this.path) ?
            new DataBuffer(BGZip.decodeDataURI(this.path).buffer) :
            igvxhr

        const trixURL = config.trixURL || config.searchTrix
        if (trixURL) {
            this._trix = new Trix(`${trixURL}x`, trixURL)
        }

    }

    /**
     * Preload all the data for this bb file
     * @returns {Promise<void>}
     */
    async preload() {
        const data = await igvxhr.loadArrayBuffer(this.path)
        this.loader = new DataBuffer(data)
    }

    async readWGFeatures(bpPerPixel, windowFunction) {
        await this.loadHeader()
        const chrIdx1 = 0
        const chrIdx2 = this.chromTree.idToName.length - 1
        const chr1 = this.chromTree.idToName[chrIdx1]
        const chr2 = this.chromTree.idToName[chrIdx2]
        return this.readFeatures(chr1, 0, chr2, Number.MAX_VALUE, bpPerPixel, windowFunction)
    }

    async readFeatures(chr1, bpStart, chr2, bpEnd, bpPerPixel, windowFunction = "mean") {

        if (!bpStart) bpStart = 0
        if (!bpEnd) bpEnd = Number.MAX_SAFE_INTEGER

        await this.loadHeader()

        let chrIdx1 = await this.#getIdForChr(chr1)
        let chrIdx2 = await this.#getIdForChr(chr2)

        if (chrIdx1 === undefined || chrIdx2 === undefined) {
            return []
        }

        let treeOffset
        let decodeFunction
        if (this.type === "bigwig") {
            // Select a biwig "zoom level" appropriate for the current resolution.
            const zoomLevelHeaders = await this.getZoomHeaders()
            let zoomLevelHeader = bpPerPixel ? zoomLevelForScale(bpPerPixel, zoomLevelHeaders) : undefined
            if (zoomLevelHeader && windowFunction != "none") {
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
            const features = []
            for (let item of leafItems) {
                const uint8Array = new Uint8Array(arrayBuffer, item.dataOffset - start, item.dataSize)
                let plain
                const isCompressed = this.header.uncompressBuffSize > 0
                if (isCompressed) {
                    plain = BGZip.inflate(uint8Array)
                } else {
                    plain = uint8Array
                }
                decodeFunction.call(this, new DataView(plain.buffer), chrIdx1, bpStart, chrIdx2, bpEnd, features, this.chromTree.idToName, windowFunction, this.littleEndian)
            }

            features.sort(function (a, b) {
                return a.start - b.start
            })

            return features
        }
    }

    /**
     * Return the ID for the given chromosome name.  If there is no direct match, search for a chromosome alias.
     *
     * @param chr
     * @returns {Promise<*>}
     */
    async #getIdForChr(chr) {

        if (this.chrAliasTable.has(chr)) {
            chr = this.chrAliasTable.get(chr)
            if (chr === undefined) {
                return undefined
            }
        }

        let chrIdx = this.chromTree.nameToId.get(chr)

        // Try alias
        if (chrIdx === undefined && this.genome) {
            const aliasRecord = await this.genome.getAliasRecord(chr)
            let alias
            if (aliasRecord) {
                const aliases = Object.keys(aliasRecord)
                    .filter(k => k !== "start" && k !== "end")
                    .map(k => aliasRecord[k])
                    .filter(a => this.chromTree.nameToId.has(a))
                if (aliases.length > 0) {
                    alias = aliases[0]
                    chrIdx = this.chromTree.nameToId.get(aliases[0])
                }
            }
            this.chrAliasTable.set(chr, alias)  // alias may be undefined => no alias exists. Setting prevents repeated attempts
        }
        return chrIdx
    }


    /**
     * Potentially searchable if a bigbed source.  Bigwig files are not searchable.
     * @returns {boolean}
     */
    get searchable() {
        return "bigbed" === this.type
    }

    /**
     * Search the extended BP tree for the search term, and return any matching features.  This only works
     * for BB sources with an "extended" BP tree for searching
     * @param term
     * @returns {Promise<void>}
     */
    async search(term) {
        if (!this.header) {
            await this.loadHeader()
        }
        if (!(this.header && this.header.extraIndexCount)) {
            return undefined
        }

        const region = await this._searchForRegions(term)   // Either 1 or no (undefined) reginos returned for now
        if (region) {
            const features = await this._loadFeaturesForRange(region.offset, region.length)
            if (features) {
                // Collect all matching features and return the largest
                const matching = features.filter(f => {
                    // We could use the searchIndex parameter to pick an attribute (column),  but we don't know
                    // the names of all the columns and if they match IGV names
                    // TODO -- align all feature attribute names with UCSC, an use specific column
                    for (let key of Object.keys(f)) {
                        const v = f[key]
                        if (StringUtils.isString(v) && v.toLowerCase() === term.toLowerCase()) {
                            return true
                        }
                    }
                    return false
                })
                if (matching.length > 0) {
                    return matching.reduce((l, f) => (l.end - l.start) > (f.end - f.start) ? l : f, features[0])
                } else {
                    return undefined
                }
            }
        }
    }

    async _searchForRegions(term) {
        const searchTrees = await this.#getSearchTrees()
        if (searchTrees) {

            // Use a trix index if we have one to map entered term to indexed value in bb file
            if (this._trix) {
                const termLower = term.toLowerCase()
                const trixResults = await this._trix.search(termLower)
                if (trixResults && trixResults.has(termLower)) {   // <= exact matches only for now
                    term = trixResults.get(termLower)[0]
                }
            }

            // For now take the first match, we don't support multiple results
            for (let bpTree of searchTrees) {
                const result = await bpTree.search(term)
                if (result) {
                    return result
                }
            }
        }
    }

    async #getSearchTrees() {

        if (this._searchTrees === undefined &&
            this.header.extraIndexOffsets &&
            this.header.extraIndexOffsets.length > 0) {
            this._searchTrees = []
            for (let offset of this.header.extraIndexOffsets) {
                const bpTree = await BPTree.loadBpTree(this.path, this.config, offset)
                this._searchTrees.push(bpTree)
            }
        }
        return this._searchTrees

    }

    async getZoomHeaders() {
        if (this.zoomLevelHeaders) {
            return this.zoomLevelHeaders
        } else {
            await this.loadHeader()
            return this.zoomLevelHeaders
        }
    }

    /**
     * The BB header consists of
     *  (1) the common header
     *  (2) the zoom headers
     *  (3) autosql
     *  (4) total summary block (version 2 and later)
     *
     *  In addition, we read the chromomsome B+ tree
     * @returns {Promise<*>}
     */
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

            const binaryParser = new BinaryParser(new DataView(data), this.littleEndian)
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

            // Read the next chunk containing zoom headers, autosql, and total summary if present.  TotalSummary size = 40 bytes
            const startOffset = BBFILE_HEADER_SIZE
            const size = header.totalSummaryOffset > 0 ?
                header.totalSummaryOffset - startOffset + 40 :
                Math.min(header.fullDataOffset, header.chromTreeOffset) - startOffset
            let range = {
                start: startOffset,
                size: size
            }
            data = await this.loader.loadArrayBuffer(this.path, buildOptions(this.config, {range: range}))
            const extHeaderParser = new BinaryParser(new DataView(data), this.littleEndian)

            // Load zoom headers, store in order of decreasing reduction level (increasing resolution)
            const nZooms = header.nZoomLevels
            this.zoomLevelHeaders = []
            this.firstZoomDataOffset = Number.MAX_SAFE_INTEGER
            for (let i = 1; i <= nZooms; i++) {
                const zoomNumber = nZooms - i
                const zlh = new ZoomLevelHeader(zoomNumber, extHeaderParser)
                this.firstZoomDataOffset = Math.min(zlh.dataOffset, this.firstZoomDataOffset)
                this.zoomLevelHeaders[zoomNumber] = zlh
            }

            // Autosql
            if (header.autoSqlOffset > 0) {
                extHeaderParser.position = header.autoSqlOffset - startOffset
                const autoSqlString = extHeaderParser.getString()
                if (autoSqlString) {
                    this.autoSql = parseAutoSQL(autoSqlString)
                }
            }

            // Total summary
            if (header.totalSummaryOffset > 0) {
                extHeaderParser.position = header.totalSummaryOffset - startOffset
                this.totalSummary = new BWTotalSummary(extHeaderParser)
            }

            // Chrom data index.  The start is known, size is not, but we can estimate it
            const bufferSize = Math.min(200000, Math.max(10000, header.fullDataOffset - header.chromTreeOffset))
            this.chromTree = await this.#readChromTree(header.chromTreeOffset, bufferSize)
            this.chrNames = new Set(this.chromTree.idToName)

            // Estimate feature density from dataCount (bigbed only)
            if("bigbed" === this.type) {
                const dataCount = await this.#readDataCount(header.fullDataOffset)
                this.featureDensity = dataCount / this.chromTree.sumLengths
            }

            this.header = header

            //extension
            if (header.extensionOffset > 0) {
                await this.loadExtendedHeader(header.extensionOffset)
            }
            return this.header
        }
    }

    async #readDataCount(offset) {
        const data = await this.loader.loadArrayBuffer(this.path, buildOptions(this.config, {
            range: {
                start: offset,
                size: 4
            }
        }))
        const binaryParser = new BinaryParser(new DataView(data), this.littleEndian)
        return binaryParser.getInt()
    }

    /**
     * Used when the chromTreeOffset is > fullDataOffset, that is when the chrom tree is not in the initial chunk
     * read for parsing the header.  We know the start position, but not the total size of the chrom tree
     *
     * @returns {Promise<void>}
     */
    async #readChromTree(chromTreeOffset, bufferSize) {

        let size = bufferSize
        const load = async () => {
            const data = await this.loader.loadArrayBuffer(this.path, buildOptions(this.config, {
                range: {
                    start: chromTreeOffset,
                    size: size
                }
            }))
            const binaryParser = new BinaryParser(new DataView(data), this.littleEndian)
            return ChromTree.parseTree(binaryParser, chromTreeOffset, this.genome)
        }

        let error
        while (size < 1000000) {
            try {
                const chromTree = await load()
                return chromTree
            } catch (e) {
                error = e
                size *= 2
            }
        }
        throw (error)
    }

    async loadExtendedHeader(offset) {

        let data = await this.loader.loadArrayBuffer(this.path, buildOptions(this.config, {
            range: {
                start: offset,
                size: BBFILE_EXTENDED_HEADER_HEADER_SIZE
            }
        }))
        let binaryParser = new BinaryParser(new DataView(data), this.littleEndian)
        const extensionSize = binaryParser.getUShort()
        const extraIndexCount = binaryParser.getUShort()
        const extraIndexListOffset = binaryParser.getLong()
        if (extraIndexCount === 0) return

        let sz = extraIndexCount * (2 + 2 + 8 + 4 + 10 * (2 + 2))
        data = await this.loader.loadArrayBuffer(this.path, buildOptions(this.config, {
            range: {
                start: extraIndexListOffset,
                size: sz
            }
        }))
        binaryParser = new BinaryParser(new DataView(data), this.littleEndian)

        const type = []
        const fieldCount = []
        const reserved = []
        const indexOffset = []
        for (let i = 0; i < extraIndexCount; i++) {

            type.push(binaryParser.getUShort())

            const fc = binaryParser.getUShort()
            fieldCount.push(fc)

            indexOffset.push(binaryParser.getLong())
            reserved.push(binaryParser.getInt())

            for (let j = 0; j < fc; j++) {
                const fieldId = binaryParser.getUShort()

                //const field = this.autoSql.fields[fieldId]
                //console.log(field)

                reserved.push(binaryParser.getUShort())
            }
        }
        this.header.extraIndexCount = extraIndexCount
        this.header.extraIndexOffsets = indexOffset
    }

    async loadRPTree(offset) {

        let rpTree = this.rpTreeCache.get(offset)
        if (rpTree) {
            return rpTree
        } else {
            rpTree = new RPTree(this.path, this.config, offset)
            await rpTree.init()
            this.rpTreeCache.set(offset, rpTree)
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

    /**
     * Directly load features given a file offset and size.  Added to support search index.
     * @param offset
     * @param size
     * @private
     */
    async _loadFeaturesForRange(offset, size) {

        const arrayBuffer = await this.loader.loadArrayBuffer(this.config.url, buildOptions(this.config, {
            range: {
                start: offset,
                size: size
            }
        }))

        const uint8Array = new Uint8Array(arrayBuffer)
        const plain = (this.header.uncompressBuffSize > 0) ? BGZip.inflate(uint8Array) : uint8Array
        const decodeFunction = getBedDataDecoder.call(this)
        const features = []
        decodeFunction.call(this, new DataView(plain.buffer), 0, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER,
            features, this.chromTree.idToName)

        return features

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


function decodeWigData(data, chrIdx1, bpStart, chrIdx2, bpEnd, featureArray, chrDict, windowFunction, littleEndian) {

    const binaryParser = new BinaryParser(data, littleEndian)
    const chromId = binaryParser.getInt()
    const blockStart = binaryParser.getInt()
    let chromStart = blockStart
    let chromEnd = binaryParser.getInt()
    const itemStep = binaryParser.getInt()
    const itemSpan = binaryParser.getInt()
    const type = binaryParser.getByte()
    const reserved = binaryParser.getByte()
    let itemCount = binaryParser.getUShort()

    if (chromId >= chrIdx1 && chromId <= chrIdx2) {

        let idx = 0
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
                    chromStart = blockStart + idx * itemStep
                    chromEnd = chromStart + itemSpan
                    idx++
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
    return function (data, chrIdx1, bpStart, chrIdx2, bpEnd, featureArray, chrDict, windowFunction, littleEndian) {
        const binaryParser = new BinaryParser(data, littleEndian)
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


function decodeZoomData(data, chrIdx1, bpStart, chrIdx2, bpEnd, featureArray, chrDict, windowFunction, littleEndian) {

    const binaryParser = new BinaryParser(data, littleEndian)
    const minSize = 8 * 4  // Minimum # of bytes required for a zoom record


    while (binaryParser.remLength() >= minSize) {
        const chromId = binaryParser.getInt()
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
            const chr = chrDict[chromId]
            featureArray.push({chr: chr, start: chromStart, end: chromEnd, value: value})


        }
    }
}

class DataBuffer {

    constructor(data) {
        this.data = data
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
