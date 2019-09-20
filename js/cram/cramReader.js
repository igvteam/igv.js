/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 The Regents of the University of California
 * Author: Jim Robinson
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

import gmodCRAM from "../vendor/cram-bundle.js"
import AlignmentContainer from "../bam/alignmentContainer.js";
import BamUtils from "../bam/bamUtils.js";
import BamAlignment from "../bam/bamAlignment.js";
import AlignmentBlock from "../bam/alignmentBlock.js";
import igvxhr from "../igvxhr.js";
import {buildOptions} from "../util/igvUtils.js";

const READ_STRAND_FLAG = 0x10;
const MATE_STRAND_FLAG = 0x20;

const CRAM_MATE_STRAND_FLAG = 0x1;
const CRAM_MATE_MAPPED_FLAG = 0x2;

/**
 * Class for reading a bam file
 *
 * @param config
 * @constructor
 */
const CramReader = function (config, genome, browser) {

    const self = this;

    this.config = config;
    this.browser = browser;
    this.genome = genome;

    this.cramFile = new gmodCRAM.CramFile({
        filehandle: new FileHandler(config.url),
        seqFetch: config.seqFetch || seqFetch.bind(this),
        checkSequenceMD5: config.checkSequenceMD5 !== undefined ? config.checkSequenceMD5 : true
    });

    const indexFileHandle = new FileHandler(config.indexURL);
    this.indexedCramFile = new gmodCRAM.IndexedCramFile({
        cram: this.cramFile,
        index: new gmodCRAM.CraiIndex({
            filehandle: indexFileHandle
        }),
        fetchSizeLimit: 30000000
    });

    BamUtils.setReaderDefaults(this, config);

}


function seqFetch(seqID, start, end) {

    const sequence = this.genome.sequence;
    const genome = this.genome;

    return this.getHeader()
        .then(function (header) {
            const chrName = genome.getChromosomeName(header.chrNames[seqID])
            return sequence.getSequence(chrName, start - 1, end);
        });
}


/**
 * Parse the sequence dictionary from the SAM header and build chr name tables.  This function
 * is public so it can be unit tested.
 *
 * @returns {PromiseLike<chrName, chrToIndex, chrAliasTable}>}
 */

CramReader.prototype.getHeader = function () {

    if (this.header) {
        return Promise.resolve(this.header);
    } else {
        const self = this;
        const genome = this.genome;

        return this.cramFile.getSamHeader()

            .then(function (samHeader) {

                const chrToIndex = {};
                const chrNames = [];
                const chrAliasTable = {};
                const readGroups = [];

                for (let line of samHeader) {

                    if ('SQ' === line.tag) {
                        for (let d of line.data) {
                            if (d.tag === "SN") {
                                const seq = d.value;
                                chrToIndex[seq] = chrNames.length;
                                chrNames.push(seq);
                                if (genome) {
                                    const alias = genome.getChromosomeName(seq);
                                    chrAliasTable[alias] = seq;
                                }
                                break;
                            }
                        }
                    } else if ('RG' === line.tag) {
                        readGroups.push(line.data);
                    }
                }

                self.header = {
                    chrNames: chrNames,
                    chrToIndex: chrToIndex,
                    chrAliasTable: chrAliasTable,
                    readGroups: readGroups
                }

                return self.header;
            });
    }
}


CramReader.prototype.readAlignments = function (chr, bpStart, bpEnd) {

    var self = this;
    const browser = this.browser

    return this.getHeader()

        .then(function (header) {

            const queryChr = header.chrAliasTable.hasOwnProperty(chr) ? header.chrAliasTable[chr] : chr;
            const chrIdx = header.chrToIndex[queryChr];
            const alignmentContainer = new AlignmentContainer(chr, bpStart, bpEnd, self.samplingWindowSize, self.samplingDepth, self.pairsSupported, self.alleleFreqThreshold);

            if (chrIdx === undefined) {
                return Promise.resolve(alignmentContainer);

            } else {
                return self.indexedCramFile.getRecordsForRange(chrIdx, bpStart, bpEnd)

                    .then(function (records) {

                        for (let record of records) {

                            const refID = record.sequenceId;
                            const pos = record.alignmentStart;
                            const alignmentEnd = pos + record.lengthOnRef;

                            if (refID < 0) {
                                continue;   // unmapped read
                            } else if (refID > chrIdx || pos > bpEnd) {
                                return;    // off right edge, we're done
                            } else if (refID < chrIdx) {
                                continue;   // Sequence to left of start, not sure this is possible
                            }
                            if (alignmentEnd < bpStart) {
                                continue;
                            }  // Record out-of-range "to the left", skip to next one

                            const alignment = decodeCramRecord(record, header.chrNames);

                            //  if (filter.pass(alignment)) {
                            alignmentContainer.push(alignment);
                            //  }
                        }

                        alignmentContainer.finish();
                        return alignmentContainer;
                    })
                    .catch(function (error) {
                        let message = error.message;
                        if (message && message.indexOf("MD5") >= 0) {
                            message = "Sequence mismatch. Is this the correct genome for the loaded CRAM?"
                        }
                        browser.presentAlert(message)
                        throw error
                    })
            }

            function decodeCramRecord(record, chrNames) {

                const alignment = new BamAlignment();

                alignment.chr = chrNames[record.sequenceId];
                alignment.start = record.alignmentStart - 1;
                alignment.lengthOnRef = record.lengthOnRef;
                alignment.flags = record.flags;
                alignment.strand = !(record.flags & READ_STRAND_FLAG);
                alignment.fragmentLength = record.templateLength || record.templateSize;
                alignment.mq = record.mappingQuality;
                alignment.end = record.alignmentStart + record.lengthOnRef;
                alignment.readGroupId = record.readGroupId;

                if (record.mate && record.mate.sequenceId !== undefined) {
                    const strand = record.mate.flags !== undefined ?
                        !(record.mate.flags & CRAM_MATE_STRAND_FLAG) :
                        !(record.flags & MATE_STRAND_FLAG);

                    alignment.mate = {
                        chr: chrNames[record.mate.sequenceId],
                        position: record.mate.alignmentStart,
                        strand: strand
                    };
                }

                alignment.seq = record.getReadBases();
                alignment.qual = record.qualityScores;
                alignment.tagDict = record.tags;
                alignment.readName = record.readName;

                // TODO -- cigar encoded in tag?
                // BamUtils.bam_tag2cigar(ba, blockEnd, p, lseq, alignment, cigarArray);

                makeBlocks(record, alignment);

                if (alignment.mate && alignment.start > alignment.mate.position && alignment.fragmentLength > 0) {
                    alignment.fragmentLength = -alignment.fragmentLength
                }

                BamUtils.setPairOrientation(alignment);

                return alignment;

            }

            function makeBlocks(cramRecord, alignment) {

                const blocks = [];
                let insertions;
                let gapType;
                let basesUsed = 0;
                let cigarString = '';

                alignment.scStart = alignment.start;
                alignment.scLengthOnRef = alignment.lengthOnRef;

                if (cramRecord.readFeatures) {

                    for (let feature of cramRecord.readFeatures) {

                        const code = feature.code;
                        const data = feature.data;
                        const readPos = feature.pos - 1;
                        const refPos = feature.refPos - 1;

                        if (alignment.readName === 'SRR062635.16695874') {
                            console.log("");
                        }

                        switch (code) {
                            case 'S' :
                            case 'I':
                            case 'i':
                            case 'N':
                            case 'D':
                                if (readPos > basesUsed) {
                                    const len = readPos - basesUsed;
                                    blocks.push(new AlignmentBlock({
                                        start: refPos - len,
                                        seqOffset: basesUsed,
                                        len: len,
                                        type: 'M',
                                        gapType: gapType
                                    }));
                                    basesUsed += len;

                                    cigarString += len + 'M';
                                }


                                if ('S' === code) {
                                    let scPos = refPos;

                                    alignment.scLengthOnRef += data.length;
                                    if (readPos === 0) {
                                        alignment.scStart -= data.length;
                                        scPos -= data.length;
                                    }

                                    const len = data.length;
                                    blocks.push(new AlignmentBlock({
                                        start: scPos,
                                        seqOffset: basesUsed,
                                        len: len,
                                        type: 'S'
                                    }));
                                    basesUsed += len;
                                    gapType = 'S';
                                    cigarString += len + code;
                                } else if ('I' === code || 'i' === code) {
                                    if (insertions === undefined) {
                                        insertions = [];
                                    }
                                    const len = 'i' === code ? 1 : data.length;
                                    insertions.push(new AlignmentBlock({
                                        start: refPos - 1,
                                        len: len,
                                        seqOffset: basesUsed,
                                        type: 'I'
                                    }));
                                    basesUsed += len;
                                    gapType = 'I';
                                    cigarString += len + code;
                                } else if ('D' === code || 'N' === code) {
                                    gapType = code;
                                    cigarString += data + code;
                                }
                                break;

                            case 'H':
                            case 'P':
                                cigarString += data + code;
                                break;
                            default :
                            //  Ignore
                        }
                    }
                }

                // Last block
                const len = cramRecord.readLength - basesUsed;
                if (len > 0) {
                    blocks.push(new AlignmentBlock({
                        start: cramRecord.alignmentStart + cramRecord.lengthOnRef - len - 1,
                        seqOffset: basesUsed,
                        len: len,
                        type: 'M',
                        gapType: gapType
                    }));

                    cigarString += len + 'M';
                }

                alignment.blocks = blocks;
                alignment.insertions = insertions;
                alignment.cigar = cigarString;

            }

        });
}

class FileHandler {

    constructor(source) {
        this.position = 0
        this.url = source
        this.cache = new BufferCache({
            fetch: (start, length) => this._fetch(start, length),
        })
    }

    async _fetch(position, length) {

        const loadRange = {start: position, size: length};
        this._stat = {size: undefined}
        return igvxhr.loadArrayBuffer(this.url, buildOptions({}, {range: loadRange}))
            .then(function (arrayBuffer) {
                const nodeBuffer = Buffer.from(arrayBuffer)
                return nodeBuffer
            })
    }

    async read(buffer, offset = 0, length = Infinity, position = 0) {
        let readPosition = position
        if (readPosition === null) {
            readPosition = this.position
            this.position += length
        }
        return this.cache.get(buffer, offset, length, position)
    }

    async readFile() {
        const arrayBuffer = await igvxhr.loadArrayBuffer(this.url, buildOptions({}))
        return Buffer.from(arrayBuffer)
    }

    async stat() {
        if (!this._stat) {
            const buf = Buffer.allocUnsafe(10)
            await this.read(buf, 0, 10, 0)
            if (!this._stat)
                throw new Error(`unable to determine size of file at ${this.url}`)
        }
        return this._stat
    }
}

class BufferCache {

    constructor({fetch, size = 10000000, chunkSize = 32768}) {

        this.fetch = fetch
        this.chunkSize = chunkSize
        this.lruCache = new QuickLRU({maxSize: Math.floor(size / chunkSize)})
    }

    async get(outputBuffer, offset, length, position) {
        if (outputBuffer.length < offset + length)
            throw new Error('output buffer not big enough for request')

        // calculate the list of chunks involved in this fetch
        const firstChunk = Math.floor(position / this.chunkSize)
        const lastChunk = Math.floor((position + length) / this.chunkSize)

        // fetch them all as necessary
        const fetches = new Array(lastChunk - firstChunk + 1)
        for (let chunk = firstChunk; chunk <= lastChunk; chunk += 1) {
            fetches[chunk - firstChunk] = this._getChunk(chunk).then(data => ({
                data,
                chunkNumber: chunk,
            }))
        }

        // stitch together the response buffer using them
        const chunks = await Promise.all(fetches)
        const chunksOffset = position - chunks[0].chunkNumber * this.chunkSize
        chunks.forEach(({data, chunkNumber}) => {
            const chunkPositionStart = chunkNumber * this.chunkSize
            let copyStart = 0
            let copyEnd = this.chunkSize
            let copyOffset =
                offset + (chunkNumber - firstChunk) * this.chunkSize - chunksOffset

            if (chunkNumber === firstChunk) {
                copyOffset = offset
                copyStart = chunksOffset
            }
            if (chunkNumber === lastChunk) {
                copyEnd = position + length - chunkPositionStart
            }

            data.copy(outputBuffer, copyOffset, copyStart, copyEnd)
        })
    }

    _getChunk(chunkNumber) {
        const cachedPromise = this.lruCache.get(chunkNumber)
        if (cachedPromise) return cachedPromise

        const freshPromise = this.fetch(
            chunkNumber * this.chunkSize,
            this.chunkSize,
        )
        this.lruCache.set(chunkNumber, freshPromise)
        return freshPromise
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

'use strict';

class QuickLRU {
    constructor(options = {}) {
        if (!(options.maxSize && options.maxSize > 0)) {
            throw new TypeError('`maxSize` must be a number greater than 0');
        }

        this.maxSize = options.maxSize;
        this.cache = new Map();
        this.oldCache = new Map();
        this._size = 0;
    }

    _set(key, value) {
        this.cache.set(key, value);
        this._size++;

        if (this._size >= this.maxSize) {
            this._size = 0;
            this.oldCache = this.cache;
            this.cache = new Map();
        }
    }

    get(key) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        if (this.oldCache.has(key)) {
            const value = this.oldCache.get(key);
            this._set(key, value);
            return value;
        }
    }

    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.set(key, value);
        } else {
            this._set(key, value);
        }

        return this;
    }

    has(key) {
        return this.cache.has(key) || this.oldCache.has(key);
    }

    peek(key) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        if (this.oldCache.has(key)) {
            return this.oldCache.get(key);
        }
    }

    delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this._size--;
        }

        return this.oldCache.delete(key) || deleted;
    }

    clear() {
        this.cache.clear();
        this.oldCache.clear();
        this._size = 0;
    }

    * keys() {
        for (const [key] of this) {
            yield key;
        }
    }

    * values() {
        for (const [, value] of this) {
            yield value;
        }
    }

    * [Symbol.iterator]() {
        for (const item of this.cache) {
            yield item;
        }

        for (const item of this.oldCache) {
            const [key] = item;
            if (!this.cache.has(key)) {
                yield item;
            }
        }
    }

    get size() {
        let oldCacheSize = 0;
        for (const key of this.oldCache.keys()) {
            if (!this.cache.has(key)) {
                oldCacheSize++;
            }
        }

        return this._size + oldCacheSize;
    }
}

export default CramReader;


