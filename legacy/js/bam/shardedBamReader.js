import BamReader from "./bamReader.js"
import AlignmentContainer from "./alignmentContainer.js"
import BamUtils from "./bamUtils.js"

class ShardedBamReader {

    constructor(config, genome) {

        this.config = config
        this.genome = genome

        const bamReaders = {}
        const chrAliasTable = {}

        config.sources.sequences.forEach(function (chr) {
            const queryChr = genome ? genome.getChromosomeName(chr) : chr
            bamReaders[queryChr] = getReader(config, genome, chr)
        })

        this.bamReaders = bamReaders

        BamUtils.setReaderDefaults(this, config)
    }

    async readAlignments(chr, start, end) {

        if (!this.bamReaders.hasOwnProperty(chr)) {
            return new AlignmentContainer(chr, start, end, this.config)
        } else {

            let reader = this.bamReaders[chr]
            const a = await reader.readAlignments(chr, start, end)
            return a
        }
    }
}

function getReader(config, genome, chr) {
    const tmp = {
        url: config.sources.url.replace("$CHR", chr)
    }
    if (config.sources.indexURL) {
        tmp.indexURL = config.sources.indexURL.replace("$CHR", chr)
    }
    const bamConfig = Object.assign(config, tmp)

    // TODO -- support non-indexed, htsget, etc
    return new BamReader(bamConfig, genome)
}

export default ShardedBamReader
