/*
 * The MIT License (MIT)
 *
 * Copyright (c) $year. Broad Institute
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

    var BAM_MAGIC = 21840194;
    var BAI_MAGIC = 21578050;
    var SECRET_DECODER = ['=', 'A', 'C', 'x', 'G', 'x', 'x', 'x', 'T', 'x', 'x', 'x', 'x', 'x', 'x', 'N'];
    var CIGAR_DECODER = ['M', 'I', 'D', 'N', 'S', 'H', 'P', '=', 'X', '?', '?', '?', '?', '?', '?', '?'];
    var READ_PAIRED_FLAG = 0x1;
    var PROPER_PAIR_FLAG = 0x2;
    var READ_UNMAPPED_FLAG = 0x4;
    var MATE_UNMAPPED_FLAG = 0x8;
    var READ_STRAND_FLAG = 0x10;
    var MATE_STRAND_FLAG = 0x20;
    var FIRST_OF_PAIR_FLAG = 0x40;
    var SECOND_OF_PAIR_FLAG = 0x80;
    var NOT_PRIMARY_ALIGNMENT_FLAG = 0x100;
    var READ_FAILS_VENDOR_QUALITY_CHECK_FLAG = 0x200;
    var DUPLICATE_READ_FLAG = 0x400;
    var SUPPLEMENTARY_ALIGNMENT_FLAG = 0x800;

    /**
     * Decode an array of ga4gh read records
     */
    igv.decodeGa4ghReads = function (jsonRecords) {

        var i,
            len = jsonRecords.length,
            json,
            alignment,
            cigarDecoded,
            alignments = [];

        for (i = 0; i < len; i++) {

            json = jsonRecords[i];
            alignment = new igv.BamAlignment();

            alignment.readName = json.name;
            alignment.flags = json.flags;
            alignment.chr = json.referenceSequenceName;
            alignment.start = json.position - 1;
            alignment.strand = !(json.flags & READ_STRAND_FLAG);
            alignment.matePos = json.matePosition;
            alignment.tlen = json.templateLength;
            alignment.cigar = json.cigar;
            alignment.seq = json.originalBases;
            alignment.qual = json.baseQuality;
            alignment.mq = json.mappingQuality;
            alignment.mateChr = json.mateReferenceSequenceName;
            //alignment.tagBA
            // alignment.blocks

            cigarDecoded = decodeCigar(json.cigar);

            alignment.lengthOnRef = cigarDecoded.lengthOnRef;

            alignment.blocks = makeBlocks(alignment, cigarDecoded.array);

            alignments.push(alignment);

        }

        return alignments;


        function decodeCigar(textCigar) {

            var cigarArray = [],
                i,
                opLen = "",
                opLtr,
                lengthOnRef = 0;

            for (i = 0; i < textCigar.length; ++i) {

                if (isDigit(textCigar.charCodeAt(i))) {
                    opLen = opLen + textCigar.charAt(i);
                }
                else {
                    opLtr = textCigar.charAt(i);

                    if (opLtr == 'M' || opLtr == 'EQ' || opLtr == 'X' || opLtr == 'D' || opLtr == 'N' || opLtr == '=')
                        lengthOnRef += parseInt(opLen);

                    cigarArray.push({len: parseInt(opLen), ltr: opLtr});
                    opLen = "";
                }
            }

            return {lengthOnRef: lengthOnRef, array: cigarArray};
        }


        function isDigit(c) {

            return c >= ZERO_CHAR && c <= NINE_CHAR;
        }
    }


    igv.decodeGa4ghReadset = function(json) {

        var sequenceNames = [],
            fileData = json["fileData"];

         fileData.forEach(function (fileObject) {

            var refSequences = fileObject["refSequences"];

            refSequences.forEach(function (refSequence) {
                sequenceNames.push(refSequence["name"]);
            });
        });

        return sequenceNames;
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
            seqOffset = 0,
            pos = record.start,
            len = cigarArray.length,
            blockSeq,
            blockQuals;

        for (var i = 0; i < len; i++) {

            var c = cigarArray[i];

            switch (c.ltr) {
                case 'H' :
                    break; // ignore hard clips
                case 'P' :
                    break; // ignore pads
                case 'S' :
                    seqOffset += c.len;
                    break; // soft clip read bases
                case 'N' :
                    pos += c.len;
                    break;  // reference skip
                case 'D' :
                    pos += c.len;
                    break;
                case 'I' :
                    seqOffset += c.len;
                    break;
                case 'M' :
                case 'EQ' :
                case '=' :
                case 'X' :
                    blockSeq = record.seq === "*" ? "*" : record.seq.substr(seqOffset, c.len);
                    blockQuals = record.qual === "*" ? "*" : record.qual.substr(seqOffset, c.len);
                    blocks.push({start: pos, len: c.len, seq: blockSeq, qual: blockQuals});
                    seqOffset += c.len;
                    pos += c.len;
                    break;
                default :
                    console.log("Error processing cigar element: " + c.len + c.ltr);
            }
        }

        return blocks;

    }


    const ZERO_CHAR = "0".charCodeAt(0);
    const NINE_CHAR = "9".charCodeAt(0);


    return igv;

})(igv || {});