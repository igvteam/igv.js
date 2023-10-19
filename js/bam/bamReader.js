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

    chrAliasTable =  new Map()

    constructor(config, genome) {
        this.config = config
        this.genome = genome
        this.bamPath = config.url
        this.baiPath = config.indexURL
        BamUtils.setReaderDefaults(this, config)

        this._blockLoader = new BGZBlockLoader(config)
    }

    async readAlignments(chr, bpStart, bpEnd) {

        const chrToIndex = await this.getChrIndex()

        if(!this.chrAliasTable.has(chr)) {
            const chromosome = this.genome.getChromosome(chr)
            if(chromosome) {
                const aliases = chromosome.altNames
                for(let a of aliases) {
                    if(this.chrNames.has(a)) {
                        this.chrAliasTable.set(chr, a)
                    }
                }
            }
            if(!this.chrAliasTable.has(chr)) this.chrAliasTable.set(chr, chr)
        }

        const queryChr = this.chrAliasTable.get(chr) || chr

        const chrId = chrToIndex[queryChr]
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
                const done = BamUtils.decodeBamRecords(ba, c.minv.offset, alignmentContainer, this.indexToChr, chrId, bpStart, bpEnd, this.filter)
                if (done) {
                    break
                }
            }
            alignmentContainer.finish()
            return alignmentContainer
        }
    }

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
        const genome = this.genome
        if (!this.index) {
            this.index = await loadIndex(this.baiPath, this.config, genome)
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

