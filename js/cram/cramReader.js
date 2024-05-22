import gmodCRAM from "../vendor/cram-bundle.js"
import AlignmentContainer from "../bam/alignmentContainer.js"
import BamUtils from "../bam/bamUtils.js"
import BamAlignment from "../bam/bamAlignment.js"
import AlignmentBlock from "../bam/alignmentBlock.js"
import FileHandler from "./fileHandler.js"


const READ_STRAND_FLAG = 0x10
const MATE_STRAND_FLAG = 0x20

const CRAM_MATE_STRAND_FLAG = 0x1
const CRAM_MATE_MAPPED_FLAG = 0x2

/**
 * Class for reading a cram file.  Wraps the gMOD Cram package.
 *
 * @param config
 * @constructor
 */
class CramReader {

    chrAliasTable = new Map()

    constructor(config, genome, browser) {

        this.config = config
        this.browser = browser
        this.genome = genome

        this.cramFile = new gmodCRAM.CramFile({
            filehandle: config.fileHandle ? config.fileHandle : new FileHandler(config.url, config),
            seqFetch: config.seqFetch || seqFetch.bind(this),
            checkSequenceMD5: config.checkSequenceMD5 !== undefined ? config.checkSequenceMD5 : true
        })

        const indexFileHandle = config.indexFileHandle ? config.indexFileHandle : new FileHandler(config.indexURL, config)
        this.indexedCramFile = new gmodCRAM.IndexedCramFile({
            cram: this.cramFile,
            index: new gmodCRAM.CraiIndex({
                filehandle: indexFileHandle
            }),
            fetchSizeLimit: config.fetchSizeLimit || 1000000000
        })

        BamUtils.setReaderDefaults(this, config)

        async function seqFetch(seqID, start, end) {
            const genome = this.genome
            const header = await this.getHeader()
            const chr = genome.getChromosomeName(header.indexToChr[seqID])
            return this.genome.getSequence(chr, start - 1, end)
        }
    }


    /**
     * Parse the sequence dictionary from the SAM header and build chr name tables.
     */

    async getHeader() {

        if (!this.header) {
            const samHeader = await this.cramFile.getSamHeader()
            const chrToIndex = {}
            const indexToChr = []
            const readGroups = []

            for (let line of samHeader) {
                if ('SQ' === line.tag) {
                    for (let d of line.data) {
                        if (d.tag === "SN") {
                            const seq = d.value
                            chrToIndex[seq] = indexToChr.length
                            indexToChr.push(seq)
                            break
                        }
                    }
                } else if ('RG' === line.tag) {
                    readGroups.push(line.data)
                }
            }

            this.header = {
                indexToChr: indexToChr,
                chrToIndex: chrToIndex,
                chrNames: Object.keys(chrToIndex),
                readGroups: readGroups

            }
        }

        return this.header
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


    async readAlignments(chr, bpStart, bpEnd) {
const t0 = Date.now()
        const header = await this.getHeader()

        const chrIdx = await this.#getRefId(chr)

        const alignmentContainer = new AlignmentContainer(chr, bpStart, bpEnd, this.config)

        if (chrIdx === undefined) {
            return alignmentContainer

        } else {

            try {
                const records = await this.indexedCramFile.getRecordsForRange(chrIdx, bpStart, bpEnd)

                for (let record of records) {

                    const refID = record.sequenceId
                    const pos = record.alignmentStart
                    const alignmentEnd = pos + record.lengthOnRef

                    if (refID < 0) {
                        continue   // unmapped read
                    } else if (refID > chrIdx || pos > bpEnd) {
                        return    // off right edge, we're done
                    } else if (refID < chrIdx) {
                        continue   // Sequence to left of start, not sure this is possible
                    }
                    if (alignmentEnd < bpStart) {
                        continue
                    }  // Record out-of-range "to the left", skip to next one

                    const alignment = decodeCramRecord(record, header.chrNames)

                    if (this.filter.pass(alignment)) {
                        alignmentContainer.push(alignment)
                    }
                }

                alignmentContainer.finish()
const dt = Date.now() - t0
console.log(`${alignmentContainer.alignments.length} loaded in ${dt} ms`)
                return alignmentContainer
            } catch (error) {
                let message = error.message
                if (message && message.indexOf("MD5") >= 0) {
                    message = "Sequence mismatch. Is this the correct genome for the loaded CRAM?"
                }
                this.browser.alert.present(new Error(message))
                throw error
            }
        }

        function decodeCramRecord(record, chrNames) {

            const alignment = new BamAlignment()

            alignment.chr = chrNames[record.sequenceId]
            alignment.start = record.alignmentStart - 1
            alignment.lengthOnRef = record.lengthOnRef
            alignment.flags = record.flags
            alignment.strand = !(record.flags & READ_STRAND_FLAG)
            alignment.fragmentLength = record.templateLength || record.templateSize
            alignment.mq = record.mappingQuality
            alignment.end = record.alignmentStart + record.lengthOnRef
            alignment.readGroupId = record.readGroupId

            if (record.mate && record.mate.sequenceId !== undefined) {
                const strand = record.mate.flags !== undefined ?
                    !(record.mate.flags & CRAM_MATE_STRAND_FLAG) :
                    !(record.flags & MATE_STRAND_FLAG)

                alignment.mate = {
                    chr: chrNames[record.mate.sequenceId],
                    position: record.mate.alignmentStart,
                    strand: strand
                }
            }

            alignment.seq = record.getReadBases()
            alignment.qual = record.qualityScores
            alignment.tagDict = record.tags
            alignment.readName = record.readName

            // TODO -- cigar encoded in tag?
            // BamUtils.bam_tag2cigar(ba, blockEnd, p, lseq, alignment, cigarArray);

            makeBlocks(record, alignment)

            if (alignment.mate && alignment.start > alignment.mate.position && alignment.fragmentLength > 0) {
                alignment.fragmentLength = -alignment.fragmentLength
            }

            BamUtils.setPairOrientation(alignment)

            return alignment

        }

        function makeBlocks(cramRecord, alignment) {

            const blocks = []
            let insertions
            let gaps
            let basesUsed = 0
            let cigarString = ''

            alignment.scStart = alignment.start
            alignment.scLengthOnRef = alignment.lengthOnRef

            if (cramRecord.readFeatures) {

                for (let feature of cramRecord.readFeatures) {

                    const code = feature.code
                    const data = feature.data
                    const readPos = feature.pos - 1
                    const refPos = feature.refPos - 1

                    switch (code) {
                        case 'S' :
                        case 'I':
                        case 'i':
                        case 'N':
                        case 'D':
                            if (readPos > basesUsed) {
                                const len = readPos - basesUsed
                                blocks.push(new AlignmentBlock({
                                    start: refPos - len,
                                    seqOffset: basesUsed,
                                    len: len,
                                    type: 'M'
                                }))
                                basesUsed += len
                                cigarString += len + 'M'
                            }

                            if ('S' === code) {
                                let scPos = refPos
                                alignment.scLengthOnRef += data.length
                                if (readPos === 0) {
                                    alignment.scStart -= data.length
                                    scPos -= data.length
                                }
                                const len = data.length
                                blocks.push(new AlignmentBlock({
                                    start: scPos,
                                    seqOffset: basesUsed,
                                    len: len,
                                    type: 'S'
                                }))
                                basesUsed += len
                                cigarString += len + code
                            } else if ('I' === code || 'i' === code) {
                                if (insertions === undefined) {
                                    insertions = []
                                }
                                const len = 'i' === code ? 1 : data.length
                                insertions.push(new AlignmentBlock({
                                    start: refPos,
                                    len: len,
                                    seqOffset: basesUsed,
                                    type: 'I'
                                }))
                                basesUsed += len
                                cigarString += len + code
                            } else if ('D' === code || 'N' === code) {
                                if (!gaps) {
                                    gaps = []
                                }
                                gaps.push({
                                    start: refPos,
                                    len: data,
                                    type: code
                                })
                                cigarString += data + code
                            }
                            break

                        case 'H':
                        case 'P':
                            cigarString += data + code
                            break
                        default :
                        //  Ignore
                    }
                }
            }

            // Last block
            const len = cramRecord.readLength - basesUsed
            if (len > 0) {
                blocks.push(new AlignmentBlock({
                    start: cramRecord.alignmentStart + cramRecord.lengthOnRef - len - 1,
                    seqOffset: basesUsed,
                    len: len,
                    type: 'M'
                }))

                cigarString += len + 'M'
            }

            alignment.blocks = blocks
            alignment.insertions = insertions
            alignment.gaps = gaps
            alignment.cigar = cigarString

        }

    }
}





// From https://github.com/sindresorhus/quick-lru
// MIT License
//
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict'

class QuickLRU {
    constructor(options = {}) {
        if (!(options.maxSize && options.maxSize > 0)) {
            throw new TypeError('`maxSize` must be a number greater than 0')
        }

        this.maxSize = options.maxSize
        this.cache = new Map()
        this.oldCache = new Map()
        this._size = 0
    }

    _set(key, value) {
        this.cache.set(key, value)
        this._size++

        if (this._size >= this.maxSize) {
            this._size = 0
            this.oldCache = this.cache
            this.cache = new Map()
        }
    }

    get(key) {
        if (this.cache.has(key)) {
            return this.cache.get(key)
        }

        if (this.oldCache.has(key)) {
            const value = this.oldCache.get(key)
            this._set(key, value)
            return value
        }
    }

    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.set(key, value)
        } else {
            this._set(key, value)
        }

        return this
    }

    has(key) {
        return this.cache.has(key) || this.oldCache.has(key)
    }

    peek(key) {
        if (this.cache.has(key)) {
            return this.cache.get(key)
        }

        if (this.oldCache.has(key)) {
            return this.oldCache.get(key)
        }
    }

    delete(key) {
        const deleted = this.cache.delete(key)
        if (deleted) {
            this._size--
        }

        return this.oldCache.delete(key) || deleted
    }

    clear() {
        this.cache.clear()
        this.oldCache.clear()
        this._size = 0
    }

    * keys() {
        for (const [key] of this) {
            yield key
        }
    }

    * values() {
        for (const [, value] of this) {
            yield value
        }
    }

    * [Symbol.iterator]() {
        for (const item of this.cache) {
            yield item
        }

        for (const item of this.oldCache) {
            const [key] = item
            if (!this.cache.has(key)) {
                yield item
            }
        }
    }

    get size() {
        let oldCacheSize = 0
        for (const key of this.oldCache.keys()) {
            if (!this.cache.has(key)) {
                oldCacheSize++
            }
        }

        return this._size + oldCacheSize
    }
}

export default CramReader


