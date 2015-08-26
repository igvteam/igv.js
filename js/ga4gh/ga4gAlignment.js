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


    var CigarOperationTable = {
        ALIGNMENT_MATCH: "M",
        INSERT: "I",
        DELETE: "D",
        SKIP: "N",
        CLIP_SOFT: "S",
        CLIP_HARD: "H",
        PAD: "P",
        SEQUENCE_MATCH: "=",
        SEQUENCE_MISMATCH: "X"
    }


    igv.Ga4ghAlignment = function (json, genome) {

        this.readName = json.fragmentName;
        this.properPlacement = json.properPlacement;
        this.duplicateFragment = json.duplicateFragment;
        this.numberReads = json.numberReads;
        this.fragmentLength = json.fragmentLength;
        this.readNumber = json.readNumber;
        this.failedVendorQualityChecks = json.failedVendorQualityChecks;
        this.secondaryAlignment = json.secondaryAlignment;
        this.supplementaryAlignment = json.supplementaryAlignment;

        this.seq = json.alignedSequence;
        this.qual = json.alignedQuality;
        this.tagDict = json.info;

        //this.flags = encodeFlags(json);


        alignment = json.alignment;
        if (alignment) {
            this.mapped = true;

            this.chr = json.alignment.position.referenceName;
            if (genome) this.chr = genome.getChromosomeName(this.chr);

            this.start = parseInt(json.alignment.position.position);
            this.strand = !(json.alignment.position.reverseStrand);
            this.mq = json.alignment.mappingQuality;
            //this.cigar = encodeCigar(json.alignment.cigar);
            cigarDecoded = translateCigar(json.alignment.cigar);

            this.lengthOnRef = cigarDecoded.lengthOnRef;

            this.blocks = makeBlocks(this, cigarDecoded.array);
        }
        else {
            this.mapped = false;
        }

        if (json.nextMatePosition) {
            this.mate = {
                chr: json.nextMatePosition.referenceFrame,
                position: parseInt(json.nextMatePosition.position),
                strand: !json.nextMatePosition.reverseStrand
            };

            this.info = json.info;
        }

    }


    igv.Ga4ghAlignment.prototype.isMapped = function () {
        return this.mapped;
    }

    igv.Ga4ghAlignment.prototype.isPaired = function () {
        return this.numberReads && this.numberReads > 1;
    }

    igv.Ga4ghAlignment.prototype.isProperPair = function () {
        return this.properPlacement === undefined || this.properPlacement;       // Assume true
    }

    igv.Ga4ghAlignment.prototype.isFistOfPair = function () {
        return this.readNumber && this.readNumber === 0;
    }

    igv.Ga4ghAlignment.prototype.isSecondOfPair = function () {
        return this.readNumber && this.readNumber === 1;
    }

    igv.Ga4ghAlignment.prototype.isNotPrimary = function () {
        return this.secondaryAlignment;
    }

    igv.Ga4ghAlignment.prototype.isSupplementary = function () {
        return this.supplementaryAlignment;
    }

    igv.Ga4ghAlignment.prototype.isFailsVendorQualityCheck = function () {
        return this.failedVendorQualityChecks;
    }

    igv.Ga4ghAlignment.prototype.isDuplicate = function () {
        return this.duplicateFragment;
    }

    igv.Ga4ghAlignment.prototype.isMateMapped = function () {
        return this.mate;
    }

    igv.Ga4ghAlignment.prototype.mateStrand = function () {
        return this.mate && this.mate.strand;
    }

    igv.Ga4ghAlignment.prototype.tags = function () {
        return this.info;
    }

    igv.Ga4ghAlignment.prototype.popupData = function (genomicLocation) {

        var isFirst;

        nameValues = [];

        nameValues.push({name: 'Read Name', value: this.readName});
        // Sample
        // Read group
        nameValues.push("<hr>");

        // Add 1 to genomic location to map from 0-based computer units to user-based units
        nameValues.push({name: 'Alignment Start', value: igv.numberFormatter(1 + this.start), borderTop: true});

        nameValues.push({name: 'Read Strand', value: (true === this.strand ? '(+)' : '(-)'), borderTop: true});
        nameValues.push({name: 'Cigar', value: this.cigar});
        nameValues.push({name: 'Mapped', value: yesNo(this.isMapped())});
        nameValues.push({name: 'Mapping Quality', value: this.mq});
        nameValues.push({name: 'Secondary', value: yesNo(this.isNotPrimary())});
        nameValues.push({name: 'Supplementary', value: yesNo(this.isSupplementary())});
        nameValues.push({name: 'Duplicate', value: yesNo(this.isDuplicate())});
        nameValues.push({name: 'Failed QC', value: yesNo(this.isFailsVendorQualityCheck())});


        if (this.isPaired()) {
            nameValues.push("<hr>");
            nameValues.push({name: 'First in Pair', value: !this.isSecondOfPair(), borderTop: true});
            nameValues.push({name: 'Mate is Mapped', value: yesNo(this.isMateMapped())});
            if (this.isMapped()) {
                nameValues.push({name: 'Mate Start', value: this.matePos});
                nameValues.push({name: 'Mate Strand', value: (this.mateStrand() ? '(-)' : '(+)')});
                nameValues.push({name: 'Insert Size', value: this.fragmentLength});
                // Mate Start
                // Mate Strand
                // Insert Size
            }
            // First in Pair
            // Pair Orientation

        }

        nameValues.push("<hr>");
        this.tags();
        isFirst = true;
        for (var key in this.tagDict) {

            if (this.tagDict.hasOwnProperty(key)) {

                if (isFirst) {
                    nameValues.push({name: key, value: this.tagDict[key], borderTop: true});
                    isFirst = false;
                } else {
                    nameValues.push({name: key, value: this.tagDict[key]});
                }

            }
        }

        return nameValues;


        function yesNo(bool) {
            return bool ? 'Yes' : 'No';
        }
    }


    function translateCigar(cigar) {

        var cigarUnit, opLen, opLtr,
            lengthOnRef = 0,
            cigarArray = [];

        for (i = 0; i < cigar.length; i++) {

            cigarUnit = cigar[i];

            opLtr = CigarOperationTable[cigarUnit.operation];
            opLen = parseInt(cigarUnit.operationLength);    // TODO -- this should be a long by the spec

            if (opLtr == 'M' || opLtr == 'EQ' || opLtr == 'X' || opLtr == 'D' || opLtr == 'N' || opLtr == '=')
                lengthOnRef += opLen;

            cigarArray.push({len: opLen, ltr: opLtr});

        }

        return {lengthOnRef: lengthOnRef, array: cigarArray};
    }



    function translateCigar(cigar) {

        var cigarUnit, opLen, opLtr,
            lengthOnRef = 0,
            cigarArray = [];

        for (i = 0; i < cigar.length; i++) {

            cigarUnit = cigar[i];

            opLtr = CigarOperationTable[cigarUnit.operation];
            opLen = parseInt(cigarUnit.operationLength);    // TODO -- this should be a long by the spec

            if (opLtr == 'M' || opLtr == 'EQ' || opLtr == 'X' || opLtr == 'D' || opLtr == 'N' || opLtr == '=')
                lengthOnRef += opLen;

            cigarArray.push({len: opLen, ltr: opLtr});

        }

        return {lengthOnRef: lengthOnRef, array: cigarArray};
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
                    blockQuals = record.qual === "*" ? "*" : record.qual.slice(seqOffset, c.len);
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

    return igv;


})(igv || {});
