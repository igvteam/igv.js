import AlignmentContainer from "./alignmentContainer.js"
import BamUtils from "./bamUtils.js"
import {BGZip, igvxhr} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions, isDataURL} from "../util/igvUtils.js"
import ChromAliasManager from "../feature/chromAliasManager.js"
import FeatureCache from "../feature/featureCache.js"

/**
 * Class for reading a bam file
 *
 * @param config
 * @constructor
 */
class BamReaderNonIndexed {

    chrAliasTable = new Map()

    constructor(config, genome) {
        this.config = config
        this.genome = genome
        this.bamPath = config.url
        this.isDataUri = isDataURL(config.url)
        BamUtils.setReaderDefaults(this, config)
    }

    /**
     *
     * @param chr
     * @param bpStart
     * @param bpEnd
     * @returns {Promise<AlignmentContainer>}
     */
    async readAlignments(chr, bpStart, bpEnd) {

        if (!this.alignmentCache) {
            // For a non-indexed BAM file all alignments are read at once and cached.
            let unc
            if (this.isDataUri) {
                const data = decodeDataURI(this.bamPath)
                unc = BGZip.unbgzf(data.buffer)
            } else {
                const arrayBuffer = await igvxhr.loadArrayBuffer(this.bamPath, buildOptions(this.config))
                unc = BGZip.unbgzf(arrayBuffer)
            }
            const alignments = this.#parseAlignments(unc)
            this.alignmentCache = new FeatureCache(alignments)
        }

        const queryChr = this.chromAliasManager ? await this.chromAliasManager.getAliasName(chr) : chr
        const qAlignments = this.alignmentCache.queryFeatures(queryChr, bpStart, bpEnd)
        const alignmentContainer = new AlignmentContainer(chr, bpStart, bpEnd, this.config)
        for (let a of qAlignments) {
            alignmentContainer.push(a)
        }
        alignmentContainer.finish()
        return alignmentContainer
    }

    #parseAlignments(data) {
        const alignments = []
        this.header = BamUtils.decodeBamHeader(data)
        this.chromAliasManager = this.genome ? new ChromAliasManager(this.header.chrNames, this.genome) : null
        BamUtils.decodeBamRecords(data, this.header.size, alignments, this.header.chrNames, undefined, 0, Number.MAX_SAFE_INTEGER, this.filter)
        return alignments
    }

    async #getQueryChr(chr) {

        const ownNames = new Set(this.header.chrNames)
        if (ownNames.has(chr)) {
            return chr
        }

        if (this.chrAliasTable.has(chr)) {
            return this.chrAliasTable.get(chr)
        }

        // Try alias

        if (this.genome) {
            const aliasRecord = await this.genome.getAliasRecord(chr)
            let alias
            if (aliasRecord) {
                const aliases = Object.keys(aliasRecord)
                    .filter(k => k !== "start" && k !== "end")
                    .map(k => aliasRecord[k])
                    .filter(a => ownNames.has(a))
                if (aliases.length > 0) {
                    alias = aliases[0]
                }
            }
            this.chrAliasTable.set(chr, alias)  // alias may be undefined => no alias exists. Setting prevents repeated attempts
            return alias
        }

        return chr
    }

}

function decodeDataURI(dataURI) {

    const split = dataURI.split(',')
    const info = split[0].split(':')[1]
    let dataString = split[1]

    if (info.indexOf('base64') >= 0) {
        dataString = atob(dataString)
    } else {
        dataString = decodeURI(dataString)
    }

    const bytes = new Uint8Array(dataString.length)
    for (var i = 0; i < dataString.length; i++) {
        bytes[i] = dataString.charCodeAt(i)
    }
    return bytes
}


export default BamReaderNonIndexed
