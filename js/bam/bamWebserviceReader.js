import AlignmentContainer from "./alignmentContainer.js"
import BamUtils from "./bamUtils.js"
import {igvxhr} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions} from "../util/igvUtils.js"

/**
 * Class for reading bam records from an igv.js-flask server backed by pysam.  Deprecated.
 *
 * @param config
 * @constructor
 */
const BamWebserviceReader = function (config, genome) {

    this.config = config
    this.genome = genome
    BamUtils.setReaderDefaults(this, config)

}

// Example http://localhost:5000/alignments/?reference=/Users/jrobinso/hg19mini.fa&file=/Users/jrobinso/cram_with_crai_index.cram&region=1:100-2000

BamWebserviceReader.prototype.readAlignments = function (chr, bpStart, bpEnd) {

    var self = this

    return getHeader.call(self)

        .then(function (header) {

            var queryChr, url

            queryChr = header.chrAliasTable.hasOwnProperty(chr) ? header.chrAliasTable[chr] : chr

            url = self.config.url +
                "?reference=" + self.config.referenceFile +
                "&file=" + self.config.alignmentFile + "" +
                "&region=" + queryChr + ":" + bpStart + "-" + bpEnd


            return igvxhr.loadString(url, buildOptions(self.config))

                .then(function (sam) {

                    var alignmentContainer, chrId, ba

                    chrId = header.chrToIndex[queryChr]

                    alignmentContainer = new AlignmentContainer(chr, bpStart, bpEnd, self.config)

                    BamUtils.decodeSamRecords(sam, alignmentContainer, queryChr, bpStart, bpEnd, self.filter)

                    return alignmentContainer

                })

        })
}


// Example  http://localhost:5000/alignments/?reference=/Users/jrobinso/hg19mini.fa&file=/Users/jrobinso/cram_with_crai_index.cram&options=-b%20-H
function getHeader() {

    const self = this
    const genome = this.genome

    if (this.header) {

        return Promise.resolve(this.header)

    } else {

        const url = this.config.url + "?file=" + this.config.alignmentFile + "&options=-b,-H"
        const options = buildOptions(this.config)

        return BamUtils.readHeader(url, options, genome)

            .then(function (header) {

                self.header = header
                return header

            })
    }

}


function readInt(ba, offset) {
    return (ba[offset + 3] << 24) | (ba[offset + 2] << 16) | (ba[offset + 1] << 8) | (ba[offset])
}

export default BamWebserviceReader


