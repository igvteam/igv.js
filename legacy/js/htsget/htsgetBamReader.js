import HtsgetReader from "./htsgetReader.js"
import AlignmentContainer from "../bam/alignmentContainer.js"
import BamUtils from "../bam/bamUtils.js"
import {BGZip} from "../../node_modules/igv-utils/src/index.js"
import ChromAliasManager from "../feature/chromAliasManager.js"

class HtsgetBamReader extends HtsgetReader {

    chrNames = new Set()

    constructor(config, genome) {
        super(config, genome)
        BamUtils.setReaderDefaults(this, config)
    }


    async readAlignments(chr, start, end) {

        if('all' === chr) {
            return []    // This should never happen, but just in case
        }

        if (!this.header) {
            const compressedData = await this.readHeaderData()
            const ba = BGZip.unbgzf(compressedData.buffer)
            this.header = BamUtils.decodeBamHeader(ba, this.genome)
            for(let name of this.header.chrNames) {
                this.chrNames.add(name)
            }
            this.chromAliasManager = this.genome ? new ChromAliasManager(this.header.chrNames, this.genome) : null
        }

        // If the chromosome is not in the BAM header, check for an alias.
        let queryChr = chr
        if (this.chrNames.size > 0 && !this.chrNames.has(chr) && this.chromAliasManager) {
            queryChr = await this.chromAliasManager.getAliasName(chr)
        }

        if (!this.chrNames.has(queryChr)) {
            console.warn("Chromosome " + chr + " not found in BAM header")
            return new AlignmentContainer(chr, start, end, this.config)  // Empty container
        }

        const compressedData = await this.readData(queryChr, start, end)

        // BAM decoding
        const ba = BGZip.unbgzf(compressedData.buffer)
        this.header = BamUtils.decodeBamHeader(ba, this.genome)

        const chrIdx = this.header.chrToIndex[chr]
        const alignmentContainer = new AlignmentContainer(chr, start, end, this.config)
        BamUtils.decodeBamRecords(ba, this.header.size, alignmentContainer, this.header.chrNames, chrIdx, start, end, this.filter)
        alignmentContainer.finish()

        return alignmentContainer

    }

}


export default HtsgetBamReader