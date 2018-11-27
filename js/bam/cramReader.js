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

var igv = (function (igv) {


    var READ_STRAND_FLAG = 0x10;
    var MATE_STRAND_FLAG = 0x20;

    /**
     * Class for reading a bam file
     *
     * @param config
     * @constructor
     */
    igv.CramReader = function (config, genome) {

        this.config = config;

        this.genome = genome;

        this.cramFile = new gmodCRAM.CramFile({
            url: config.url
        })

        this.indexedCramFile = new gmodCRAM.IndexedCramFile({
            cram: this.cramFile,
            index: new gmodCRAM.CraiIndex({
                url: config.indexURL
            }),
            // seqFetch: async (seqId, start, end) => {
            //     // seqFetch should return a promise for a string.
            //     // this one just returns a fake sequence of all A's of the proper length
            //     let fakeSeq = ''
            //     for (let i = start; i <= end; i += 1) {
            //         fakeSeq += 'A'
            //     }
            //     return fakeSeq
            // },
            checkSequenceMD5: false
        });

        igv.BamUtils.setReaderDefaults(this, config);

    }

    igv.CramReader.prototype.readAlignments = function (chr, bpStart, bpEnd) {

        var self = this;

        return this.getHeader()

            .then(function (header) {


                const queryChr = header.chrAliasTable.hasOwnProperty(chr) ? self.chrAliasTable[chr] : chr;

                const chrId = chrToIndex[queryChr];

                const alignmentContainer = new igv.AlignmentContainer(chr, bpStart, bpEnd, self.samplingWindowSize, self.samplingDepth, self.pairsSupported);

                if (chrId === undefined) {
                    return Promise.resolve(alignmentContainer);

                } else {
                    return self.indexedCramFile.getRecordsForRange(chrId, bpStart, bpEnd)

                        .then(function (records) {

                            for (let record of records) {

                                const refID = record.sequenceId;
                                const pos = record.alignmentStart;
                                const alignmentEnd = pos + record.lengthOnRef;

                                if (refID < 0) {
                                    continue;   // unmapped read
                                }
                                else if (chrIdx && (refID > chrIdx || pos > max)) {
                                    return;    // off right edge, we're done
                                }
                                else if (chrIdx && (refID < chrIdx)) {
                                    continue;   // Sequence to left of start, not sure this is possible
                                }
                                if (alignmentEnd < min) {
                                    continue;
                                }  // Record out-of-range "to the left", skip to next one

                                const alignment = decodeCramRecord(record, chr);

                                //  if (filter.pass(alignment)) {
                                alignmentContainer.push(alignment);
                                //  }
                            }

                            return alignmentContainer;
                        });
                }
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

                .then(function (header) {

                    const chrToIndex = {};
                    const chrNames = [];
                    const chrAliasTable = {};

                    for (let line of header) {
                        let i = 0;
                        if ('SQ' === line.tag) {
                            const seq = line.data[0].value;
                            chrToIndex[seq] = i;
                            chrNames.push(seq);
                            if (genome) {
                                const alias = genome.getChromosomeName(seq);
                                chrAliasTable[alias] = seq;
                            }
                            i++;
                        }
                    }

                    self.header = {
                        chrNames: chrNames,
                        chrToIndex: chrToIndex,
                        chrAliasTable: chrAliasTable
                    }

                    return self.header;
                });
        }
    }


    function decodeCramRecord(record, chrNames) {

        const alignment = new igv.BamAlignment();
        alignment.readName = record.readName || record.uniqueId;
        alignment.chr = chrNames[record.sequenceId];
        alignment.start = record.alignmentStart;
        alignment.flags = record.flags;
        alignment.strand = !(record.flags & READ_STRAND_FLAG);
        alignment.fragmentLength = record.templateSize;
        alignment.mq = record.mappingQuality;
        alignment.end = record.alignmentStart + record.lengthOnRef;

        if (record.mate && record.mate.sequenceId !== undefined) {
            alignment.mate = {
                chr: chrNames[record.mate.sequenceId],
                position: record.mate.alignmentStart,
                strand: !(record.flags & MATE_STRAND_FLAG)
            };
        }

        alignment.seq = record.record.readBases;
        alignment.qual = record.qualityScores;
        alignment.tagDict = record.tags;
        alignment.pairOrientation = record.getPairOrientation();

        // TODO -- cigar encoded in tag
        // igv.BamUtils.bam_tag2cigar(ba, blockEnd, p, lseq, alignment, cigarArray);

        makeBlocks(alignment, record);

        return alignment;

    }


    // function makeBlocks(alignment, cramRecord) {
    //
    //     const blocks = [];
    //
    //     let insertions;
    //     let seqOffset = 0;
    //     let pos = record.start;
    //     let gapType;
    //
    //     for (let c of cigarArray) {
    //
    //         let blockSeq, blockQuals;
    //
    //
    //         switch (c.ltr) {
    //             case 'H' :
    //                 break; // ignore hard clips
    //             case 'P' :
    //                 break; // ignore pads
    //             case 'S' :
    //                 seqOffset += c.len;
    //                 gapType = 'S';
    //                 break; // soft clip read bases
    //             case 'N' :
    //                 pos += c.len;
    //                 gapType = 'N';
    //                 break;  // reference skip
    //             case 'D' :
    //                 pos += c.len;
    //                 gapType = 'D';
    //                 break;
    //             case 'I' :
    //
    //                 blockSeq = record.seq === '*' ? '*' : record.seq.substr(seqOffset, c.len);
    //
    //                 blockQuals = (record.qual && record.qual[0] !== '*') ? record.qual.slice(seqOffset, seqOffset + c.len) : undefined;
    //
    //                 if (insertions === undefined) {
    //                     insertions = [];
    //                 }
    //                 insertions.push({start: pos, len: c.len, seq: blockSeq, qual: blockQuals});
    //                 seqOffset += c.len;
    //                 break;
    //             case 'M' :
    //             case 'EQ' :
    //             case '=' :
    //             case 'X' :
    //
    //                 blockSeq = record.seq === '*' ? '*' : record.seq.substr(seqOffset, c.len);
    //                 blockQuals = record.qual ? record.qual.slice(seqOffset, seqOffset + c.len) : undefined;
    //                 blocks.push(new igv.AlignmentBlock({
    //                     start: pos,
    //                     len: c.len,
    //                     seq: blockSeq,
    //                     qual: blockQuals,
    //                     gapType: gapType
    //                 }));
    //                 seqOffset += c.len;
    //                 pos += c.len;
    //
    //                 break;
    //
    //             default :
    //                 console.log('Error processing cigar element: ' + c.len + c.ltr);
    //         }
    //     }
    //
    //     return {blocks: blocks, insertions: insertions};
    //
    // }


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


