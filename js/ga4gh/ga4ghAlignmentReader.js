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

import AlignmentContainer from "../bam/alignmentContainer.js"
import BamAlignment from "../bam/bamAlignment.js"
import AlignmentBlock from "../bam/alignmentBlock.js"
import {ga4ghGet, ga4ghSearch} from './ga4ghHelper.js'
import BamFilter from "../bam/bamFilter.js"

var CigarOperationTable = {
    "ALIGNMENT_MATCH": "M",
    "INSERT": "I",
    "DELETE": "D",
    "SKIP": "N",
    "CLIP_SOFT": "S",
    "CLIP_HARD": "H",
    "PAD": "P",
    "SEQUENCE_MATCH": "=",
    "SEQUENCE_MISMATCH": "X"
}

const Ga4ghAlignmentReader = function (config, genome) {

    this.config = config
    this.genome = genome
    this.url = config.url
    this.filter = new BamFilter(config.filter)
    this.readGroupSetIds = config.readGroupSetIds
    this.authKey = config.authKey   // Might be undefined or nill

    this.samplingWindowSize = config.samplingWindowSize === undefined ? 100 : config.samplingWindowSize
    this.samplingDepth = config.samplingDepth === undefined ? 1000 : config.samplingDepth
    if (config.viewAsPairs) {
        this.pairsSupported = true
    } else {
        this.pairsSupported = config.pairsSupported === undefined ? true : config.pairsSupported
    }
}


Ga4ghAlignmentReader.prototype.readAlignments = function (chr, bpStart, bpEnd) {

    const genome = this.genome
    const self = this

    return getChrAliasTable()

        .then(function (chrAliasTable) {

            var queryChr = chrAliasTable.hasOwnProperty(chr) ? chrAliasTable[chr] : chr,
                readURL = self.url + "/reads/search"

            return ga4ghSearch({
                url: readURL,
                body: {
                    "readGroupSetIds": [self.readGroupSetIds],
                    "referenceName": queryChr,
                    "start": bpStart,
                    "end": bpEnd,
                    "pageSize": "10000"
                },
                decode: decodeGa4ghReads,
                results: new AlignmentContainer(chr, bpStart, bpEnd, self.config)
            })
        })


    function getChrAliasTable() {

        if (self.chrAliasTable) {

            return Promise.resolve(self.chrAliasTable)

        } else {

            return self.readMetadata()

                .then(function (json) {

                    self.chrAliasTable = {}

                    if (genome && json.readGroups && json.readGroups.length > 0) {

                        var referenceSetId = json.readGroups[0].referenceSetId

                        if (referenceSetId) {

                            // Query for reference names to build an alias table (map of genome ref names -> dataset ref names)
                            var readURL = self.url + "/references/search"

                            return ga4ghSearch({
                                url: readURL,
                                body: {
                                    "referenceSetId": referenceSetId
                                },
                                decode: function (j) {
                                    return j.references
                                }
                            })
                                .then(function (references) {


                                    references.forEach(function (ref) {
                                        var refName = ref.name,
                                            alias = genome.getChromosomeName(refName)
                                        self.chrAliasTable[alias] = refName
                                    })


                                    return self.chrAliasTable

                                })
                        } else {

                            // Try hardcoded constants -- workaround for non-compliant data at Google
                            populateChrAliasTable(self.chrAliasTable, self.config.datasetId)

                            return self.chrAliasTable
                        }
                    } else {
                        // No browser object, can't build map.  This can occur when run from unit tests
                        return self.chrAliasTable
                    }
                })
        }
    }

    /**
     * Decode an array of ga4gh read records
     *

     */
    function decodeGa4ghReads(j) {

        var i,
            jsonRecords = j.alignments,
            len = jsonRecords.length,
            alignment,
            jsonAlignment,
            cigarDecoded,
            alignments = [],
            mate,
            blocks

        for (i = 0; i < len; i++) {

            let record = jsonRecords[i]

            alignment = new BamAlignment()

            alignment.readName = record.fragmentName
            alignment.properPlacement = record.properPlacement
            alignment.duplicateFragment = record.duplicateFragment
            alignment.numberReads = record.numberReads
            alignment.tlen = record.tlen
            alignment.readNumber = record.readNumber
            alignment.failedVendorQualityChecks = record.failedVendorQualityChecks
            alignment.secondaryAlignment = record.secondaryAlignment
            alignment.supplementaryAlignment = record.supplementaryAlignment
            alignment.seq = record.alignedSequence
            alignment.qual = record.alignedQuality
            alignment.matePos = record.nextMatePosition
            alignment.tagDict = record.info
            alignment.flags = encodeFlags(record)


            jsonAlignment = record.alignment
            if (jsonAlignment) {
                alignment.mapped = true

                alignment.chr = record.alignment.position.referenceName
                if (genome) alignment.chr = genome.getChromosomeName(alignment.chr)

                alignment.start = parseInt(record.alignment.position.position)
                alignment.strand = !(record.alignment.position.reverseStrand)
                alignment.mq = record.alignment.mappingQuality
                alignment.cigar = encodeCigar(record.alignment.cigar)
                cigarDecoded = translateCigar(record.alignment.cigar)

                alignment.lengthOnRef = cigarDecoded.lengthOnRef

                blocks = makeBlocks(alignment, cigarDecoded.array)
                alignment.blocks = blocks.blocks
                alignment.insertions = blocks.insertions

            } else {
                alignment.mapped = false
            }

            mate = record.nextMatePosition
            if (mate) {
                alignment.mate = {
                    chr: mate.referenceFrame,
                    position: parseInt(mate.position),
                    strand: !mate.reverseStrand
                }
            }

            if (self.filter.pass(alignment)) {
                alignments.push(alignment)
            }


        }

        return alignments


        // Encode a cigar string -- used for popup text
        function encodeCigar(cigarArray) {

            var cigarString = ""
            cigarArray.forEach(function (cigarUnit) {
                var op = CigarOperationTable[cigarUnit.operation],
                    len = cigarUnit.operationLength
                cigarString = cigarString + (len + op)
            })

            return cigarString
        }

        // TODO -- implement me
        function encodeFlags(json) {
            return 0
        }

        function translateCigar(cigar) {

            var cigarUnit, opLen, opLtr,
                lengthOnRef = 0,
                cigarArray = [],
                i

            for (i = 0; i < cigar.length; i++) {

                cigarUnit = cigar[i]

                opLtr = CigarOperationTable[cigarUnit.operation]
                opLen = parseInt(cigarUnit.operationLength)    // Google represents long as a String

                if (opLtr === 'M' || opLtr === 'EQ' || opLtr === 'X' || opLtr === 'D' || opLtr === 'N' || opLtr === '=')
                    lengthOnRef += opLen

                cigarArray.push({len: opLen, ltr: opLtr})

            }

            return {lengthOnRef: lengthOnRef, array: cigarArray}
        }


        /**
         * Split the alignment record into blocks as specified in the cigarArray.  Each aligned block contains
         * its portion of the read sequence and base quality strings.  A read sequence or base quality string
         * of "*" indicates the value is not recorded.  In all other cases the length of the block sequence (block.seq)
         * and quality string (block.qual) must == the block length.
         *
         * NOTE: Insertions are not yet treated // TODO
         *
         * @param record
         * @param cigarArray
         * @returns array of blocks
         */
        function makeBlocks(record, cigarArray) {


            var blocks = [],
                gaps,
                insertions,
                seqOffset = 0,
                pos = record.start,
                len = cigarArray.length,
                gapType

            for (var i = 0; i < len; i++) {

                var c = cigarArray[i]

                switch (c.ltr) {
                    case 'H' :
                        break // ignore hard clips
                    case 'P' :
                        break // ignore pads
                    case 'S' :
                        seqOffset += c.len
                        gapType = 'S'
                        break // soft clip read bases
                    case 'N' :
                    case 'D' :
                        if (gaps === undefined) {
                            gaps = []
                        }
                        gaps.push({
                            start: pos,
                            len: c.len,
                            type: c.ltr
                        })
                        pos += c.len
                        break
                    case 'I' :
                        if (insertions === undefined) insertions = []
                        insertions.push(new AlignmentBlock({
                            start: pos,
                            len: c.len,
                            seqOffset: seqOffset
                        }))
                        seqOffset += c.len
                        break
                    case 'M' :
                    case 'EQ' :
                    case '=' :
                    case 'X' :
                        blocks.push(
                            new AlignmentBlock({
                                start: pos,
                                len: c.len,
                                seqOffset: seqOffset,
                                gapType: gapType
                            }))
                        seqOffset += c.len
                        pos += c.len

                        break

                    default :
                        console.log("Error processing cigar element: " + c.len + c.ltr)
                }
            }

            return {blocks: blocks, insertions: insertions, gaps: gaps}
        }
    }
}


Ga4ghAlignmentReader.prototype.readMetadata = function () {

    return ga4ghGet({
        url: this.url,
        entity: "readgroupsets",
        entityId: this.readGroupSetIds
    })
}

/**
 * Hardcoded hack to work around some non-compliant google datasets
 *
 * @param chrAliasTable
 * @param datasetId
 */
function populateChrAliasTable(chrAliasTable, datasetId) {
    var i
    if ("461916304629" === datasetId || "337315832689" === datasetId) {
        for (i = 1; i < 23; i++) {
            chrAliasTable["chr" + i] = i
        }
        chrAliasTable["chrX"] = "X"
        chrAliasTable["chrY"] = "Y"
        chrAliasTable["chrM"] = "MT"
    }
}

export default Ga4ghAlignmentReader