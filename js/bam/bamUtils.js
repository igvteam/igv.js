/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
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

/**
 * Bits of this code are based on the Biodalliance BAM reader by Thomas Down,  2011
 *
 * https://github.com/dasmoth/dalliance/blob/master/js/bam.js
 */

"use strict";

var igv = (function (igv) {

    var SEQ_DECODER = ['=', 'A', 'C', 'x', 'G', 'x', 'x', 'x', 'T', 'x', 'x', 'x', 'x', 'x', 'x', 'N'];
    var CIGAR_DECODER = ['M', 'I', 'D', 'N', 'S', 'H', 'P', '=', 'X', '?', '?', '?', '?', '?', '?', '?'];
    var READ_STRAND_FLAG = 0x10;
    var MATE_STRAND_FLAG = 0x20;

    var BAM1_MAGIC_BYTES = new Uint8Array([0x42, 0x41, 0x4d, 0x01]); // BAM\1
    var BAM1_MAGIC_NUMBER = readInt(BAM1_MAGIC_BYTES, 0);

    const DEFAULT_SAMPLING_WINDOW_SIZE = 100;
    const DEFAULT_SAMPLING_DEPTH = 100;
    const MAXIMUM_SAMPLING_DEPTH = 2500;

    igv.BamUtils = {

        readHeader: function (url, options, genome) {

            return igv.xhr.loadArrayBuffer(url, options)

                .then(function (compressedBuffer) {

                    var header, unc, uncba;

                    unc = igv.unbgzf(compressedBuffer);
                    uncba = new Uint8Array(unc);

                    header = igv.BamUtils.decodeBamHeader(uncba, genome);

                    return header;

                })

        },

        /**
         *
         * @param ba  bytes to decode as a UInt8Array
         * @param genome  optional igv genome object
         * @returns {{ magicNumer: number, size: number, chrNames: Array, chrToIndex: ({}|*), chrAliasTable: ({}|*) }}
         */
        decodeBamHeader: function (ba, genome) {

            var magic, samHeaderLen, samHeader, chrToIndex, chrNames, chrAliasTable, alias;

            magic = readInt(ba, 0);
            if (magic !== BAM1_MAGIC_NUMBER) {
                throw new Error('BAM header errror: bad magic number.  This could be caused by either a corrupt or missing file.');
            }

            samHeaderLen = readInt(ba, 4);
            samHeader = '';

            for (var i = 0; i < samHeaderLen; ++i) {
                samHeader += String.fromCharCode(ba[i + 8]);
            }

            var nRef = readInt(ba, samHeaderLen + 8);
            var p = samHeaderLen + 12;

            chrToIndex = {};
            chrNames = [];
            chrAliasTable = {};

            for (i = 0; i < nRef; ++i) {
                var lName = readInt(ba, p);
                var name = '';
                for (var j = 0; j < lName - 1; ++j) {
                    name += String.fromCharCode(ba[p + 4 + j]);
                }
                var lRef = readInt(ba, p + lName + 4);
                //dlog(name + ': ' + lRef);

                chrToIndex[name] = i;
                chrNames[i] = name;

                if (genome) {
                    alias = genome.getChromosomeName(name);
                    chrAliasTable[alias] = name;
                }

                p = p + 8 + lName;
            }

            return {
                magicNumber: magic,
                size: p,
                chrNames: chrNames,
                chrToIndex: chrToIndex,
                chrAliasTable: chrAliasTable
            };

        },

        bam_tag2cigar: function (ba, block_end, seq_offset, lseq, al, cigarArray) {

            function type2size(x) {
                if (x == 'C' || x == 'c' || x == 'A') return 1;
                else if (x == 'S' || x == 's') return 2;
                else if (x == 'I' || x == 'i' || x == 'f') return 4;
                else return 0;
            }

            // test if the real CIGAR is encoded in a CG:B,I tag
            if (cigarArray.length != 1 || al.start < 0) return false;
            var p = seq_offset + ((lseq + 1) >> 1) + lseq;
            while (p + 4 < block_end) {
                var tag = String.fromCharCode(ba[p]) + String.fromCharCode(ba[p + 1]);
                if (tag == 'CG') break;
                var type = String.fromCharCode(ba[p + 2]);
                if (type == 'B') { // the binary array type
                    type = String.fromCharCode(ba[p + 3]);
                    var size = type2size(type);
                    var len = readInt(ba, p + 4);
                    p += 8 + size * len;
                } else if (type == 'Z' || type == 'H') { // 0-terminated string
                    p += 3;
                    while (ba[p++] != 0) {
                    }
                } else { // other atomic types
                    p += 3 + type2size(type);
                }
            }
            if (p >= block_end) return false; // no CG tag
            if (String.fromCharCode(ba[p + 2]) != 'B' || String.fromCharCode(ba[p + 3]) != 'I') return false; // not of type B,I

            // now we know the real CIGAR length and its offset in the binary array
            var cigar_len = readInt(ba, p + 4);
            var cigar_offset = p + 8; // 4 for "CGBI" and 4 for length
            if (cigar_offset + cigar_len * 4 > block_end) return false; // out of bound

            // decode CIGAR
            var cigar = '';
            var lengthOnRef = 0;
            cigarArray.length = 0; // empty the old array
            p = cigar_offset;
            for (var k = 0; k < cigar_len; ++k, p += 4) {
                var cigop = readInt(ba, p);
                var opLen = (cigop >> 4);
                var opLtr = CIGAR_DECODER[cigop & 0xf];
                if (opLtr == 'M' || opLtr == 'EQ' || opLtr == 'X' || opLtr == 'D' || opLtr == 'N' || opLtr == '=')
                    lengthOnRef += opLen;
                cigar = cigar + opLen + opLtr;
                cigarArray.push({len: opLen, ltr: opLtr});
            }

            // update alignment record. We are not updating bin, as apparently it is not used.
            al.cigar = cigar;
            al.lengthOnRef = lengthOnRef;
            return true;
        },

        /**
         *
         * @param ba                 bytes to decode as an UInt8Array
         * @param offset             offset position of ba array to start decoding
         * @param alignmentContainer container to receive the decoded alignments
         * @param min                minimum genomic position
         * @param max                maximum genomic position
         * @param chrIdx             chromosome index
         * @param chrNames            array of chromosome names
         * @param filter             a igv.BamFilter object
         */
        decodeBamRecords: function (ba, offset, alignmentContainer, chrNames, chrIdx, min, max, filter) {

            while (offset < ba.length) {

                const blockSize = readInt(ba, offset);
                const blockEnd = offset + blockSize + 4;
                const alignment = new igv.BamAlignment();
                const refID = readInt(ba, offset + 4);
                const pos = readInt(ba, offset + 8);

                if (blockEnd > ba.length) {
                    return;
                }
                if (refID < 0) {
                    offset = blockEnd;
                    continue;   // unmapped read
                }
                else if (chrIdx && (refID > chrIdx || pos > max)) {
                    return;    // off right edge, we're done
                }
                else if (chrIdx && (refID < chrIdx)) {
                    offset = blockEnd;
                    continue;   // ref ID to left of start, not sure this is possible
                }

                const bin_mq_nl = readInt(ba, offset + 12);
                const bin = (bin_mq_nl & 0xffff0000) >> 16;
                const mq = (bin_mq_nl & 0xff00) >> 8;
                const nl = bin_mq_nl & 0xff;

                const flag_nc = readInt(ba, offset + 16);
                const flag = (flag_nc & 0xffff0000) >> 16;
                const nc = flag_nc & 0xffff;

                const lseq = readInt(ba, offset + 20);
                const mateChrIdx = readInt(ba, offset + 24);
                const matePos = readInt(ba, offset + 28);
                const tlen = readInt(ba, offset + 32);

                let readName = [];
                for (let j = 0; j < nl - 1; ++j) {
                    readName.push(String.fromCharCode(ba[offset + 36 + j]));
                }
                readName = readName.join('');

                let lengthOnRef = 0;
                let cigar = '';
                let p = offset + 36 + nl;
                const cigarArray = [];
                for (let c = 0; c < nc; ++c) {
                    var cigop = readInt(ba, p);
                    var opLen = (cigop >> 4);
                    var opLtr = CIGAR_DECODER[cigop & 0xf];
                    if (opLtr == 'M' || opLtr == 'EQ' || opLtr == 'X' || opLtr == 'D' || opLtr == 'N' || opLtr == '=')
                        lengthOnRef += opLen;
                    cigar = cigar + opLen + opLtr;
                    p += 4;

                    cigarArray.push({len: opLen, ltr: opLtr});
                }

                alignment.chr = chrNames[refID];
                alignment.start = pos;
                alignment.flags = flag;
                alignment.strand = !(flag & READ_STRAND_FLAG);
                alignment.readName = readName;
                alignment.cigar = cigar;
                alignment.lengthOnRef = lengthOnRef;
                alignment.fragmentLength = tlen;
                alignment.mq = mq;

                igv.BamUtils.bam_tag2cigar(ba, blockEnd, p, lseq, alignment, cigarArray);

                alignment.end = alignment.start + alignment.lengthOnRef;

                if (alignment.end < min) {
                    offset = blockEnd;
                    continue;
                }  // Record out-of-range "to the left", skip to next one


                let seq = [];
                const seqBytes = (lseq + 1) >> 1;
                for (let j = 0; j < seqBytes; ++j) {
                    var sb = ba[p + j];
                    seq.push(SEQ_DECODER[(sb & 0xf0) >> 4]);
                    seq.push(SEQ_DECODER[(sb & 0x0f)]);
                }
                seq = seq.slice(0, lseq).join('');  // seq might have one extra character (if lseq is an odd number)
                p += seqBytes;


                let qualArray;
                if (lseq === 1 && String.fromCharCode(ba[p + j] + 33) === '*') {
                    // TODO == how to represent this?
                } else {
                    qualArray = [];
                    for (let j = 0; j < lseq; ++j) {
                        qualArray.push(ba[p + j]);
                    }
                }
                p += lseq;


                if (mateChrIdx >= 0) {
                    alignment.mate = {
                        chr: chrNames[mateChrIdx],
                        position: matePos,
                        strand: !(flag & MATE_STRAND_FLAG)
                    };
                }

                alignment.seq = seq;
                alignment.qual = qualArray;
                alignment.tagBA = new Uint8Array(ba.buffer.slice(p, blockEnd));  // decode these on demand

                this.setPairOrientation(alignment);

                if ((undefined === filter || filter.pass(alignment))) {
                    makeBlocks(alignment, cigarArray);
                    alignmentContainer.push(alignment);

                }
                offset = blockEnd;
            }
        },

        decodeSamRecords: function (sam, alignmentContainer, chr, min, max, filter) {

            var lines, i, j, len, tokens, blocks, pos, qualString, rnext, pnext, lengthOnRef,
                alignment, cigarArray, started;

            lines = igv.splitLines(sam);
            len = lines.length;
            started = false;

            for (i = 0; i < len; i++) {

                tokens = lines[i].split('\t');

                alignment = new igv.BamAlignment();

                alignment.chr = tokens[2];
                alignment.start = Number.parseInt(tokens[3]) - 1;
                alignment.flags = Number.parseInt(tokens[1]);
                alignment.readName = tokens[0];
                alignment.strand = !(alignment.flags & READ_STRAND_FLAG);
                alignment.mq = Number.parseInt(tokens[4]);
                alignment.cigar = tokens[5];
                alignment.fragmentLength = Number.parseInt(tokens[8]);
                alignment.seq = tokens[9];

                if (alignment.chr === '*' || !alignment.isMapped()) continue;  // Unmapped

                if (alignment.chr !== chr) {
                    if (started) break; // Off the right edge, we're done
                    else continue; // Possibly to the left, skip but keep looping
                } else if (alignment.start > max) {
                    break;    // off right edge, we're done
                }

                lengthOnRef = 0;
                cigarArray = buildOperators(alignment.cigar);
                cigarArray.forEach(function (op) {
                    var opLen = op.len;
                    var opLtr = op.ltr;
                    if (opLtr == 'M' || opLtr == 'EQ' || opLtr == 'X' || opLtr == 'D' || opLtr == 'N' || opLtr == '=')
                        lengthOnRef += opLen;
                });
                alignment.lengthOnRef = lengthOnRef;
                // TODO for lh3: parse the CG:B,I tag in SAM here

                if (alignment.start + lengthOnRef < min) {
                    continue;    // To the left, skip and continue
                }


                qualString = tokens[10];
                alignment.qual = [];
                for (j = 0; j < qualString.length; j++) {
                    alignment.qual[j] = qualString.charCodeAt(j) - 33;
                }
                alignment.tagDict = tokens.length < 11 ? {} : decodeSamTags(tokens.slice(11));

                if (alignment.isMateMapped()) {
                    rnext = tokens[6];
                    alignment.mate = {
                        chr: (rnext === '=') ? alignment.chr : rnext,
                        position: Number.parseInt(tokens[7]),
                        strand: !(alignment.flags & MATE_STRAND_FLAG)
                    };
                }

                this.setPairOrientation(alignment);

                if (undefined === filter || filter.pass(alignment)) {
                    makeBlocks(alignment, cigarArray);
                    alignmentContainer.push(alignment);
                }
            }
        },

        setReaderDefaults: function (reader, config) {

            reader.filter = new igv.BamFilter(config.filter);

            if (config.readgroup) {
                reader.filter.readgroups = new Set([config.readgroup]);
            }


            reader.samplingWindowSize = config.samplingWindowSize === undefined ? DEFAULT_SAMPLING_WINDOW_SIZE : config.samplingWindowSize;
            reader.samplingDepth = config.samplingDepth === undefined ? DEFAULT_SAMPLING_DEPTH : config.samplingDepth;

            if (reader.samplingDepth > MAXIMUM_SAMPLING_DEPTH) {
                igv.log("Warning: attempt to set sampling depth > maximum value of 2500");
                reader.samplingDepth = MAXIMUM_SAMPLING_DEPTH;
            }

            if (config.viewAsPairs) {
                reader.pairsSupported = true;
            }
            else {
                reader.pairsSupported = config.pairsSupported === undefined ? true : config.pairsSupported;
            }
        },

        setPairOrientation: function (alignment) {

            if (alignment.isMapped() && alignment.mate && alignment.isMateMapped() && alignment.mate.chr === alignment.chr) {
                var s1 = alignment.strand ? 'F' : 'R';

                var mate = alignment.mate;
                var s2 = mate.strand ? 'F' : 'R';
                var o1 = ' ';
                var o2 = ' ';
                if (alignment.isFirstOfPair()) {
                    o1 = '1';
                    o2 = '2';
                } else if (alignment.isSecondOfPair()) {
                    o1 = '2';
                    o2 = '1';
                }

                var tmp = [];
                var isize = alignment.fragmentLength;
                var estReadLen = alignment.end - alignment.start;
                if (isize === 0) {
                    //isize not recorded.  Need to estimate.  This calculation was validated against an Illumina
                    // -> <- library bam.
                    var estMateEnd = alignment.start < mate.position ?
                        mate.position + estReadLen : mate.position - estReadLen;
                    isize = estMateEnd - alignment.start;
                }

                //if (isize > estReadLen) {
                if (isize > 0) {
                    tmp[0] = s1;
                    tmp[1] = o1;
                    tmp[2] = s2;
                    tmp[3] = o2;

                } else {
                    tmp[2] = s1;
                    tmp[3] = o1;
                    tmp[0] = s2;
                    tmp[1] = o2;
                }
                // }
                alignment.pairOrientation = tmp.join('');
            }

        }
    };


    /**
     * Split the alignment record into blocks as specified in the cigarArray.  Each aligned block contains
     * its portion of the read sequence and base quality strings.  A read sequence or base quality string
     * of "*" indicates the value is not recorded.  In all other cases the length of the block sequence (block.seq)
     * and quality string (block.qual) must == the block length.
     *
     * @param alignment
     * @param cigarArray
     * @returns array of blocks
     */
    function makeBlocks(alignment, cigarArray) {

        const blocks = [];

        let insertions;
        let seqOffset = 0;
        let pos = alignment.start;
        let gapType;

        alignment.scStart = alignment.start;
        alignment.scLengthOnRef = alignment.lengthOnRef;

        for (let c of cigarArray) {

            switch (c.ltr) {
                case 'H' :
                    break; // ignore hard clips
                case 'P' :
                    break; // ignore pads
                case 'S' :

                    let scPos = pos;
                    alignment.scLengthOnRef += c.len;
                    if(blocks.length === 0) {
                        alignment.scStart -= c.len;
                        scPos -= c.len;
                    }
                    blocks.push(new igv.AlignmentBlock({
                        start: scPos,
                        seqOffset: seqOffset,
                        len: c.len,
                        type: 'S'
                    }));
                    seqOffset += c.len;
                    gapType = 'I';
                    break; // soft clip read bases
                case 'N' :
                    pos += c.len;
                    gapType = 'N';
                    break;  // reference skip
                case 'D' :
                    pos += c.len;
                    gapType = 'D';
                    break;
                case 'I' :

                    if (insertions === undefined) {
                        insertions = [];
                    }
                    insertions.push(new igv.AlignmentBlock({
                        start: pos,
                        len: c.len,
                        seqOffset: seqOffset,
                        type: 'I'
                    }));
                    seqOffset += c.len;
                    gapType = 'I';
                    break;
                case 'M' :
                case 'EQ' :
                case '=' :
                case 'X' :

                    blocks.push(new igv.AlignmentBlock({
                        start: pos,
                        seqOffset: seqOffset,
                        len: c.len,
                        type: 'M',
                        gapType: gapType
                    }));
                    seqOffset += c.len;
                    pos += c.len;

                    break;

                default :
                    console.log('Error processing cigar element: ' + c.len + c.ltr);
            }
        }

        alignment.blocks =  blocks;
        alignment.insertions = insertions;

    }

    function readInt(ba, offset) {
        return (ba[offset + 3] << 24) | (ba[offset + 2] << 16) | (ba[offset + 1] << 8) | (ba[offset]);
    }

    function readShort(ba, offset) {
        return (ba[offset + 1] << 8) | (ba[offset]);
    }

    /**
     * Build a list of cigar operators from a cigarString.  Removes padding operators and concatenates consecutive
     * operators of the same type
     *
     * @param cigarString
     * @return
     */
    function buildOperators(cigarString) {

        var operators, buffer, i, len, prevOp, next, op, nBases;

        operators = [];
        buffer = [];

        // Create list of cigar operators
        prevOp = null;
        len = cigarString.length;
        for (i = 0; i < len; i++) {
            next = cigarString.charAt(i);
            if (isDigit(next)) {
                buffer.push(next);
            } else {
                op = next;
                nBases = Number.parseInt(buffer.join(''));
                buffer = [];

                if (prevOp != null && prevOp.ltr == op) {
                    prevOp.len += nBases;
                } else {
                    prevOp = {len: nBases, ltr: op};
                    operators.push(prevOp);
                }
            }
        }
        return operators;

    }

    function isDigit(a) {
        var charCode = a.charCodeAt(0);
        return (charCode >= 48 && charCode <= 57); // 0-9
    }

    function decodeSamTags(tags) {

        var tagDict = {};
        tags.forEach(function (tag) {
            var tokens = tag.split(':');
            tagDict[tokens[0]] = tokens[2];
        });

        return tagDict;
    }

    return igv;

})
(igv || {});


