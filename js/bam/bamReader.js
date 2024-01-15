import {loadIndex} from "./indexFactory.js"
import AlignmentContainer from "./alignmentContainer.js"
import BamUtils from "./bamUtils.js"
import {BGZip, igvxhr} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions} from "../util/igvUtils.js"
import BGZBlockLoader from "./bgzBlockLoader.js"

/**
 * Class for reading a bam file
 *
 * @param config
 * @constructor
 */
class BamReader {

    chrAliasTable = new Map()

    constructor(config, genome) {
        this.config = config
        this.genome = genome
        this.bamPath = config.url
        this.baiPath = config.indexURL
        BamUtils.setReaderDefaults(this, config)

        this._blockLoader = new BGZBlockLoader(config)
    }

    async readAlignments(chr, bpStart, bpEnd) {

        const chrId = await this.#getRefId(chr)
        const alignmentContainer = new AlignmentContainer(chr, bpStart, bpEnd, this.config)

        if (chrId === undefined) {
            return alignmentContainer

        } else {

            const bamIndex = await this.getIndex()
            const chunks = bamIndex.chunksForRange(chrId, bpStart, bpEnd)

            if (!chunks || chunks.length === 0) {
                return alignmentContainer
            }

            for (let c of chunks) {
                const ba = await this._blockLoader.getData(c.minv, c.maxv)
                const done = BamUtils.decodeBamRecords(ba, c.minv.offset, alignmentContainer, this.header.chrNames, chrId, bpStart, bpEnd, this.filter)
                if (done) {
                    break
                }
            }
            alignmentContainer.finish()
            return alignmentContainer
        }
    }

    async #getRefId(chr) {

        await this.getHeader()

        if (this.chrAliasTable.has(chr)) {
            chr = this.chrAliasTable.get(chr)
            if (chr === undefined) {
                return undefined
            }
        }

        let refId = this.header.chrToIndex[chr]

        // Try alias
        if (refId === undefined) {
            const aliasRecord = await this.genome.getAliasRecord(chr)
            let alias
            if (aliasRecord) {
                const aliases = Object.keys(aliasRecord)
                    .filter(k => k !== "start" && k !== "end")
                    .map(k => aliasRecord[k])
                    .filter(a => undefined !== this.header.chrToIndex[a])
                if (aliases.length > 0) {
                    alias = aliases[0]
                    refId = this.header.chrToIndex[aliases[0]]
                }
            }
            this.chrAliasTable.set(chr, alias)  // alias may be undefined => no alias exists. Setting prevents repeated attempts
        }
        return refId
    }

    /**
     *
     * @returns {Promise<{magicNumer: number, size: number, chrNames: Array, chrToIndex: ({}|*), chrAliasTable: ({}|*)}>}
     */
    async getHeader() {
        if (!this.header) {
            const genome = this.genome
            const index = await this.getIndex()
            let start
            let len
            if (index.firstBlockPosition) {
                const bsizeOptions = buildOptions(this.config, {range: {start: index.firstBlockPosition, size: 26}})
                const abuffer = await igvxhr.loadArrayBuffer(this.bamPath, bsizeOptions)
                const bsize = BGZip.bgzBlockSize(abuffer)
                len = index.firstBlockPosition + bsize   // Insure we get the complete compressed block containing the header
            } else {
                len = 64000
            }

            const options = buildOptions(this.config, {range: {start: 0, size: len}})
            this.header = await BamUtils.readHeader(this.bamPath, options, genome)
        }
        return this.header
    }

    async getIndex() {
        if (!this.index) {
            this.index = await loadIndex(this.baiPath, this.config)
        }
        return this.index
    }

    async getChrIndex() {
        if (this.chrToIndex) {
            return this.chrToIndex
        } else {
            const header = await this.getHeader()
            this.chrToIndex = header.chrToIndex
            this.indexToChr = header.chrNames
            this.chrNames = new Set(header.chrNames)
            return this.chrToIndex

        }
    }
}

export default BamReader

