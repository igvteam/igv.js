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

"use strict";

var igv = (function (igv) {

    const READ_PAIRED_FLAG = 0x1;
    const PROPER_PAIR_FLAG = 0x2;
    const READ_UNMAPPED_FLAG = 0x4;
    const MATE_UNMAPPED_FLAG = 0x8;
    const READ_STRAND_FLAG = 0x10;
    const MATE_STRAND_FLAG = 0x20;
    const FIRST_OF_PAIR_FLAG = 0x40;
    const SECOND_OF_PAIR_FLAG = 0x80;
    const SECONDARY_ALIGNMNET_FLAG = 0x100;
    const READ_FAILS_VENDOR_QUALITY_CHECK_FLAG = 0x200;
    const DUPLICATE_READ_FLAG = 0x400;
    const SUPPLEMENTARY_ALIGNMENT_FLAG = 0x800;

    /**
     * readName
     * chr
     * cigar
     * lengthOnRef
     * start
     * seq
     * qual
     * mq
     * strand
     * blocks
     */

    igv.BamAlignment = function () {
        this.hidden = false;
    }

    igv.BamAlignment.prototype.isMapped = function () {
        return (this.flags & READ_UNMAPPED_FLAG) == 0;
    }

    igv.BamAlignment.prototype.isPaired = function () {
        return (this.flags & READ_PAIRED_FLAG) != 0;
    }

    igv.BamAlignment.prototype.isProperPair = function () {
        return (this.flags & PROPER_PAIR_FLAG) != 0;
    }

    igv.BamAlignment.prototype.isFirstOfPair = function () {
        return (this.flags & FIRST_OF_PAIR_FLAG) != 0;
    }

    igv.BamAlignment.prototype.isSecondOfPair = function () {
        return (this.flags & SECOND_OF_PAIR_FLAG) != 0;
    }

    igv.BamAlignment.prototype.isSecondary = function () {
        return (this.flags & SECONDARY_ALIGNMNET_FLAG) != 0;
    }

    igv.BamAlignment.prototype.isSupplementary = function () {
        return (this.flags & SUPPLEMENTARY_ALIGNMENT_FLAG) != 0;
    }

    igv.BamAlignment.prototype.isFailsVendorQualityCheck = function () {
        return (this.flags & READ_FAILS_VENDOR_QUALITY_CHECK_FLAG) != 0;
    }

    igv.BamAlignment.prototype.isDuplicate = function () {
        return (this.flags & DUPLICATE_READ_FLAG) != 0;
    }

    igv.BamAlignment.prototype.isMateMapped = function () {
        return (this.flags & MATE_UNMAPPED_FLAG) == 0;
    }

    igv.BamAlignment.prototype.isNegativeStrand = function () {
        return (this.flags & READ_STRAND_FLAG) != 0;
    }

    igv.BamAlignment.prototype.isMateNegativeStrand = function () {
        return (this.flags & MATE_STRAND_FLAG) != 0;
    }

    igv.BamAlignment.prototype.tags = function () {

        if (!this.tagDict) {
            if (this.tagBA) {
                this.tagDict = decodeTags(this.tagBA);
                this.tagBA = undefined;
            } else {
                this.tagDict = {};  // Mark so we don't try again.  The record has not tags
            }
        }
        return this.tagDict;

        function decodeTags(ba) {

            var p = 0,
                len = ba.length,
                tags = {};

            while (p < len) {
                var tag = String.fromCharCode(ba[p]) + String.fromCharCode(ba[p + 1]);
                var type = String.fromCharCode(ba[p + 2]);
                var value;

                if (type == 'A') {
                    value = String.fromCharCode(ba[p + 3]);
                    p += 4;
                } else if (type === 'i' || type === 'I') {
                    value = readInt(ba, p + 3);
                    p += 7;
                } else if (type === 'c' || type === 'C') {
                    value = ba[p + 3];
                    p += 4;
                } else if (type === 's' || type === 'S') {
                    value = readShort(ba, p + 3);
                    p += 5;
                } else if (type === 'f') {
                    value = readFloat(ba, p + 3);
                    p += 7;
                } else if (type === 'Z') {
                    p += 3;
                    value = '';
                    for (; ;) {
                        var cc = ba[p++];
                        if (cc === 0) {
                            break;
                        } else {
                            value += String.fromCharCode(cc);
                        }
                    }
                } else {
                    //'Unknown type ' + type;
                    value = 'Error unknown type: ' + type;
                    tags[tag] = value;
                    break;
                }
                tags[tag] = value;
            }
            return tags;
        }

    }

    igv.BamAlignment.prototype.getSoftStart = function () {
        var start = this.start,
            blocks = this.blocks;
        if (blocks.length > 0 && blocks[0].gapType === "s")
            start = blocks[0].start;
        return start;
    }   

    igv.BamAlignment.prototype.getSoftEnd = function () {
        var end = this.start + this.lengthOnRef,
            blocks = this.blocks;
        if (blocks.length > 1 && blocks[blocks.length-1].gapType === "s")
            end = blocks[blocks.length-1].start + blocks[blocks.length-1].len;
        return end;
    } 

    igv.BamAlignment.prototype.popupData = function (genomicLocation) {

        // if the user clicks on a base next to an insertion, show just the
        // inserted bases in a popup (like in desktop IGV).
        var nameValues = [],
            isFirst,
            tagDict;

        // Consert genomic location to int
        genomicLocation = Math.floor(genomicLocation);

        if (this.insertions) {
            for (var i = 0; i < this.insertions.length; i += 1) {
                var ins_start = this.insertions[i].start;
                if (genomicLocation === ins_start || genomicLocation === ins_start - 1) {
                    nameValues.push({name: 'Insertion', value: this.insertions[i].seq});
                    nameValues.push({name: 'Location', value: ins_start});
                    return nameValues;
                }
            }
        }

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
        nameValues.push({name: 'Secondary', value: yesNo(this.isSecondary())});
        nameValues.push({name: 'Supplementary', value: yesNo(this.isSupplementary())});
        nameValues.push({name: 'Duplicate', value: yesNo(this.isDuplicate())});
        nameValues.push({name: 'Failed QC', value: yesNo(this.isFailsVendorQualityCheck())});

        if (this.isPaired()) {
            nameValues.push("<hr>");
            nameValues.push({name: 'First in Pair', value: !this.isSecondOfPair(), borderTop: true});
            nameValues.push({name: 'Mate is Mapped', value: yesNo(this.isMateMapped())});
            if (this.pairOrientation) {
                nameValues.push({name: 'Pair Orientation', value: this.pairOrientation});
            }
            if (this.isMateMapped()) {
                nameValues.push({name: 'Mate Chromosome', value: this.mate.chr});
                nameValues.push({name: 'Mate Start', value: (this.mate.position + 1)});
                nameValues.push({name: 'Mate Strand', value: (true === this.mate.strand ? '(+)' : '(-)')});
                nameValues.push({name: 'Insert Size', value: this.fragmentLength});
                // Mate Start
                // Mate Strand
                // Insert Size
            }
            // First in Pair
            // Pair Orientation

        }

        nameValues.push("<hr>");
        tagDict = this.tags();
        isFirst = true;
        for (var key in tagDict) {

            if (tagDict.hasOwnProperty(key)) {

                if (isFirst) {
                    nameValues.push({name: key, value: tagDict[key], borderTop: true});
                    isFirst = false;
                } else {
                    nameValues.push({name: key, value: tagDict[key]});
                }

            }
        }

        nameValues.push("<hr>");
        nameValues.push({name: 'Genomic Location: ', value: igv.numberFormatter(1 + genomicLocation)});
        nameValues.push({name: 'Read Base:', value: this.readBaseAt(genomicLocation)});
        nameValues.push({name: 'Base Quality:', value: this.readBaseQualityAt(genomicLocation)});

        return nameValues;


        function yesNo(bool) {
            return bool ? 'Yes' : 'No';
        }
    }


    igv.BamAlignment.prototype.readBaseAt = function (genomicLocation) {

        const block = blockAtGenomicLocation(this.blocks, genomicLocation);

        if (block) {
            return block.baseAt(genomicLocation);
        }
        else {
            return undefined;
        }
    }

    igv.BamAlignment.prototype.readBaseQualityAt = function (genomicLocation) {

        const block = blockAtGenomicLocation(this.blocks, genomicLocation);

        if (block) {
            return block.qualityAt(genomicLocation);
        }
        else {
            return undefined;
        }

    }

    function blockAtGenomicLocation(blocks, genomicLocation) {

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            if (genomicLocation >= block.start && genomicLocation <= block.start + block.len) {
                return block;
            }
        }
        return undefined;
    }

    function readInt(ba, offset) {
        return (ba[offset + 3] << 24) | (ba[offset + 2] << 16) | (ba[offset + 1] << 8) | (ba[offset]);
    }

    function readShort(ba, offset) {
        return (ba[offset + 1] << 8) | (ba[offset]);
    }

    function readFloat(ba, offset) {

        var dataView = new DataView(ba.buffer),
            littleEndian = true;

        return dataView.getFloat32(offset, littleEndian);

    }


    igv.BamFilter = function (options) {

        if (!options) options = {};
        this.vendorFailed = options.vendorFailed === undefined ? true : options.vendorFailed;
        this.duplicates = options.duplicates === undefined ? true : options.duplicates;
        this.secondary = options.secondary || false;
        this.supplementary = options.supplementary || false;
        this.mqThreshold = options.mqThreshold === undefined ? 0 : options.mqThreshold;
        if(options.readgroups) {
            this.readgroups = new Set(options.readgroups);
        }
    }

    igv.BamFilter.prototype.pass = function (alignment) {

        if (this.vendorFailed && alignment.isFailsVendorQualityCheck()) return false;
        if (this.duplicates && alignment.isDuplicate()) return false;
        if (this.secondary && alignment.isSecondary()) return false;
        if (this.supplementary && alignment.isSupplementary()) return false;
        if (alignment.mq < this.mqThreshold) return false;

        if(this.readgroups) {
            var rg = alignment.tags()['RG'];
            return this.readgroups.has(rg);
        }

        return true;


    }

    return igv;

})(igv || {});
