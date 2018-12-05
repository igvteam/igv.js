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

"use strict";

var igv = (function (igv) {


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
    igv.CramReader = function (config, genome) {

        const self = this;

        this.config = config;

        this.genome = genome;

        this.cramFile = new gmodCRAM.CramFile({
            url: config.url,
            seqFetch: config.seqFetch || seqFetch.bind(this),
            checkSequenceMD5: config.checkSequenceMD5 !== undefined ? config.checkSequenceMD5 : true
        })

        this.indexedCramFile = new gmodCRAM.IndexedCramFile({
            cram: this.cramFile,
            index: new gmodCRAM.CraiIndex({
                url: config.indexURL
            })
        });

        igv.BamUtils.setReaderDefaults(this, config);

    }


    function seqFetch(seqID, start, end) {

        const sequence = this.genome.sequence;

        return this.getHeader()

            .then(function (header) {

                const chrName = header.chrNames[seqID];

                return sequence.getSequence(chrName, start - 1, end);

            });
    }


    /**
     * Parse the sequence dictionary from the SAM header and build chr name tables.  This function
     * is public so it can be unit tested.
     *
     * @returns {PromiseLike<chrName, chrToIndex, chrAliasTable}>}
     */

    igv.CramReader.prototype.getHeader = function () {

        if (this.header) {
            return Promise.resolve(this.header);
        }

        else {
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
                            const seq = line.data[0].value;
                            chrToIndex[seq] = chrNames.length;
                            chrNames.push(seq);
                            if (genome) {
                                const alias = genome.getChromosomeName(seq);
                                chrAliasTable[alias] = seq;
                            }
                        }
                        else if ('RG' === line.tag) {
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


    igv.CramReader.prototype.readAlignments = function (chr, bpStart, bpEnd) {

        var self = this;

        return this.getHeader()

            .then(function (header) {

                const readNames = {};   // Hash for recording generated read names for intra slice pairs (lossy crams)

                const queryChr = header.chrAliasTable.hasOwnProperty(chr) ? header.chrAliasTable[chr] : chr;
                const chrIdx = header.chrToIndex[queryChr];
                const alignmentContainer = new igv.AlignmentContainer(chr, bpStart, bpEnd, self.samplingWindowSize, self.samplingDepth, self.pairsSupported);

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
                                }
                                else if (refID > chrIdx || pos > bpEnd) {
                                    return;    // off right edge, we're done
                                }
                                else if (refID < chrIdx) {
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
                        });
                }

                function decodeCramRecord(record, chrNames) {

                    const alignment = new igv.BamAlignment();

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

                    if(undefined !== record.readName) {
                        alignment.readName = record.readName;
                    }
                    else {
                        if(record.uniqueId && readNames[record.uniqueId]) {
                            alignment.readName = readNames[record.uniqueId];
                            // optional -  delete readNames[record.uniqueId]
                        }
                        else if (record.mate) {
                            if (record.mate.readName !== undefined) {
                                alignment.readName = record.mate.readName;
                            }
                            else if(record.mate.uniqueId) {
                                alignment.readName = uniqueID();
                                readNames[record.mate.uniqueId] = alignment.readName;
                            }
                        }
                    }

                    // TODO -- cigar encoded in tag?
                    // igv.BamUtils.bam_tag2cigar(ba, blockEnd, p, lseq, alignment, cigarArray);

                    makeBlocks(record, alignment);

                    if(alignment.start > alignment.mate.position && alignment.fragmentLength > 0) {
                        alignment.fragmentLength = -alignment.fragmentLength
                    }

                    igv.BamUtils.setPairOrientation(alignment);

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

                            if(alignment.readName === 'SRR062635.16695874') {
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
                                        blocks.push(new igv.AlignmentBlock({
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
                                        blocks.push(new igv.AlignmentBlock({
                                            start: scPos,
                                            seqOffset: basesUsed,
                                            len: len,
                                            type: 'S'
                                        }));
                                        basesUsed += len;
                                        gapType = 'S';
                                        cigarString += len + code;
                                    }
                                    else if ('I' === code || 'i' === code) {
                                        if (insertions === undefined) {
                                            insertions = [];
                                        }
                                        const len = 'i' === code ? 1 : data.length;
                                        insertions.push(new igv.AlignmentBlock({
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

                                default :
                                //  Ignore
                            }
                        }
                    }

                    // Last block
                    const len = cramRecord.readLength - basesUsed;
                    if (len > 0) {
                        blocks.push(new igv.AlignmentBlock({
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


    function uniqueID() {
        return Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 9);
    }

    /*
    flags
    cramFlags
    sequenceId
    readLength
    alignmentStart
    readGroupId
    readName
    templateSize =
    tags[tagName]
    lengthOnRef = lengthOnRef
    mappingQuality
    qualityScores
    readBases
    mate

    mate
      flags
      sequenceId
      alignmentStart
      uniqueId
      readName

   */

    return igv;
})
(igv || {});


