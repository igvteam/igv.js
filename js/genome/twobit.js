/**
 * Note: Some portions of this code adapated from the GMOD two-bit.js project, @Copyright (c) 2017 Robert Buels
 * * https://github.com/GMOD/twobit-js/blob/master/src/twoBitFile.ts*
 */


import {igvxhr} from "../../node_modules/igv-utils/src/index.js"
import BinaryParser from "../binary.js"
import BPTree from "../bigwig/bpTree.js"

const twoBit = ['T', 'C', 'A', 'G']
const byteTo4Bases = []
for (let i = 0; i < 256; i++) {
    byteTo4Bases.push(
        twoBit[(i >> 6) & 3] +
        twoBit[(i >> 4) & 3] +
        twoBit[(i >> 2) & 3] +
        twoBit[i & 3],
    )
}
const maskedByteTo4Bases = byteTo4Bases.map(bases => bases.toLowerCase())

class TwobitSequence {

    littleEndian
    metaIndex = new Map()

    constructor(config) {
        this.url = config.twoBitURL || config.fastaURL
        this.config = config
        if(config.twoBitBptURL) {
            this.bptURL = config.twoBitBptURL
        }
     }

    async init() {
        if(this.bptURL) {
            this.index = await BPTree.loadBpTree(this.bptURL, this.config, 0)
        } else {
            const idx = await this._readIndex()
            this.index = {
                search: async (name) =>  {
                    return idx.has(name) ? {offset: idx.get(name)} : undefined
                }
            }
        }
    }

    async readSequence(seqName, regionStart, regionEnd) {

        if (!this.index) {
            await this.init()
        }

        const record = await this.getSequenceRecord(seqName)
        if (!record) {
            return null
        }

        if (regionStart < 0) {
            throw new TypeError('regionStart cannot be less than 0')
        }
        // end defaults to the end of the sequence
        if (regionEnd === undefined || regionEnd > record.dnaSize) {
            regionEnd = record.dnaSize
        }

        const nBlocks = this._getOverlappingBlocks(
            regionStart,
            regionEnd,
            record.nBlocks
        )
        const maskBlocks = this._getOverlappingBlocks(
            regionStart,
            regionEnd,
            record.maskBlocks
        )

        const baseBytesOffset = Math.floor(regionStart / 4)
        const start = record.packedPos + baseBytesOffset
        const size = Math.floor(regionEnd / 4) - baseBytesOffset + 1

        const baseBytesArrayBuffer = await igvxhr.loadArrayBuffer(this.url, {range: {start, size}})
        const baseBytes = new Uint8Array(baseBytesArrayBuffer)

        let sequenceBases = ''
        for (let genomicPosition = regionStart; genomicPosition < regionEnd; genomicPosition += 1) {

            // function checks if  we are currently masked

            while (maskBlocks.length && maskBlocks[0].end <= genomicPosition) {
                maskBlocks.shift()
            }
            const baseIsMasked = maskBlocks[0] && maskBlocks[0].start <= genomicPosition && maskBlocks[0].end > genomicPosition


            // process the N block if we have one.  Masked "N" ("n")  is not supported
            if (nBlocks[0] && genomicPosition >= nBlocks[0].start && genomicPosition < nBlocks[0].end) {
                const currentNBlock = nBlocks.shift()
                while (genomicPosition < currentNBlock.end && genomicPosition < regionEnd) {
                    sequenceBases += 'N'
                    genomicPosition++
                }
                genomicPosition--
            } else {
                const bytePosition = Math.floor(genomicPosition / 4) - baseBytesOffset
                const subPosition = genomicPosition % 4
                const byte = baseBytes[bytePosition]

                sequenceBases += baseIsMasked
                    ? maskedByteTo4Bases[byte][subPosition]
                    : byteTo4Bases[byte][subPosition]

            }
        }
        return sequenceBases
    }

    async _readIndex() {

        const index = new Map()

        const loadRange = {start: 0, size: 64}
        let arrayBuffer = await igvxhr.loadArrayBuffer(this.url, {range: loadRange})
        let dataView = new DataView(arrayBuffer)

        let ptr = 0
        const magicLE = dataView.getUint32(ptr, true)
        const magicBE = dataView.getUint32(ptr, false)
        ptr += 4

        const magic = 0x1A412743
        if (magicLE === magic) {
            this.littleEndian = true
        } else if (magicBE === magic) {
            this.littleEndian = false
        } else {
            throw Error(`Bad magic number ${magic}`)
        }

        this.version = dataView.getUint32(ptr, this.littleEndian)
        ptr += 4

        this.sequenceCount = dataView.getUint32(ptr, this.littleEndian)
        ptr += 4

        this.reserved = dataView.getUint32(ptr, this.littleEndian)
        ptr += 4

        // Loop through sequences loading name and file offset.  We don't know the precise size in bytes in advance.
        let estSize
        let binaryBuffer

        let estNameLength = 20
        for (let i = 0; i < this.sequenceCount; i++) {

            if (!binaryBuffer || binaryBuffer.available() < 1) {
                estSize = (this.sequenceCount - i) * estNameLength
                binaryBuffer = await this._loadBinaryBuffer(ptr, estSize)
            }
            const len = binaryBuffer.getByte()
            ptr += 1

            if (binaryBuffer.available() < len + 5) {
                estSize = (this.sequenceCount - i) * estNameLength + 100
                binaryBuffer = await this._loadBinaryBuffer(ptr, estSize)
            }
            const name = binaryBuffer.getString(len)
            const offset = binaryBuffer.getUInt()
            ptr += len + 4
            index.set(name, offset)

            estNameLength = Math.floor(estNameLength * (i / (i + 1)) + name.length / (i + 1))
        }
        return index
    }

    /**
     * Fetch the sequence metadata for the given seq name *
     *
     * @param seqName
     * @returns {Promise<void>}
     */
    async getSequenceRecord(seqName) {

        if (!this.metaIndex.has(seqName)) {

            if (!this.index) {
                throw Error("TwobitSequence object must be initialized before accessing sequence")
            }

            let result = await this.index.search(seqName)
            if (!result) {
                return
            }
            let offset = result.offset

            // Read size of dna data & # of "N" blocks
            let size = 8
            let binaryBuffer = await this._loadBinaryBuffer(offset, size)
            const dnaSize = binaryBuffer.getUInt()
            const nBlockCount = binaryBuffer.getUInt()
            offset += size

            // Read "N" blocks and # of mask blocks
            size = nBlockCount * (4 + 4) + 4
            binaryBuffer = await this._loadBinaryBuffer(offset, size)
            const nBlockStarts = []
            for (let i = 0; i < nBlockCount; i++) {
                nBlockStarts.push(binaryBuffer.getUInt())
            }
            const nBlockSizes = []
            for (let i = 0; i < nBlockCount; i++) {
                nBlockSizes.push(binaryBuffer.getUInt())
            }
            const maskBlockCount = binaryBuffer.getUInt()
            offset += size

            // Read "mask" blocks
            size = maskBlockCount * (4 + 4) + 4
            binaryBuffer = await this._loadBinaryBuffer(offset, size)
            const maskBlockStarts = []
            for (let i = 0; i < maskBlockCount; i++) {
                maskBlockStarts.push(binaryBuffer.getUInt())
            }
            const maskBlockSizes = []
            for (let i = 0; i < maskBlockCount; i++) {
                maskBlockSizes.push(binaryBuffer.getUInt())
            }

            //Transform "N" and "mask" block data into something more useful
            const nBlocks = []
            for (let i = 0; i < nBlockCount; i++) {
                nBlocks.push(new Block(nBlockStarts[i], nBlockSizes[i]))
            }
            const maskBlocks = []
            for (let i = 0; i < maskBlockCount; i++) {
                maskBlocks.push(new Block(maskBlockStarts[i], maskBlockSizes[i]))
            }

            const reserved = binaryBuffer.getUInt()
            if (reserved != 0) {
                throw Error("Bad 2-bit file")
            }
            offset += size
            const packedPos = offset

            const meta = {
                dnaSize,
                nBlocks,
                maskBlocks,
                packedPos,
                bpLength: dnaSize
            }
            this.metaIndex.set(seqName, meta)


        }
        return this.metaIndex.get(seqName)
    }

    /**
     * Return blocks overlapping the genome region [start, end]
     *
     * TODO -- optimize this, currently it uses linear search
     * * *
     * @param start
     * @param end
     * @param blocks
     * @returns {*[]}
     * @private
     */
    _getOverlappingBlocks(start, end, blocks) {

        const overlappingBlocks = []
        for (let block of blocks) {
            if (block.start > end) {
                break
            } else if (block.end < start) {
                continue
            } else {
                overlappingBlocks.push(block)
            }
        }
        return overlappingBlocks
    }

    async _loadBinaryBuffer(start, size) {
        const arrayBuffer = await igvxhr.loadArrayBuffer(this.url, {range: {start, size}})
        return new BinaryParser(new DataView(arrayBuffer), this.littleEndian)
    }
}

class Block {

    constructor(start, size) {
        this.start = start
        this.size = size
    }

    get end() {
        return this.start + this.size

    }
}


export default TwobitSequence