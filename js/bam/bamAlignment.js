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


import {StringUtils} from "../../node_modules/igv-utils/src/index.js";

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
const ELEMENT_SIZE = {
    c: 1,
    C: 1,
    s: 2,
    S: 2,
    i: 4,
    I: 4,
    f: 4
}

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

class BamAlignment {

    constructor() {
        this.hidden = false;
    }

    isMapped() {
        return (this.flags & READ_UNMAPPED_FLAG) === 0;
    }

    isPaired() {
        return (this.flags & READ_PAIRED_FLAG) !== 0;
    }

    isProperPair() {
        return (this.flags & PROPER_PAIR_FLAG) !== 0;
    }

    isFirstOfPair() {
        return (this.flags & FIRST_OF_PAIR_FLAG) !== 0;
    }

    isSecondOfPair() {
        return (this.flags & SECOND_OF_PAIR_FLAG) !== 0;
    }

    isSecondary() {
        return (this.flags & SECONDARY_ALIGNMNET_FLAG) !== 0;
    }

    isSupplementary() {
        return (this.flags & SUPPLEMENTARY_ALIGNMENT_FLAG) !== 0;
    }

    isFailsVendorQualityCheck() {
        return (this.flags & READ_FAILS_VENDOR_QUALITY_CHECK_FLAG) !== 0;
    }

    isDuplicate() {
        return (this.flags & DUPLICATE_READ_FLAG) !== 0;
    }

    isMateMapped() {
        return (this.flags & MATE_UNMAPPED_FLAG) === 0;
    }

    isNegativeStrand() {
        return (this.flags & READ_STRAND_FLAG) !== 0;
    }

    isMateNegativeStrand() {
        return (this.flags & MATE_STRAND_FLAG) !== 0;
    }

    tags() {

        if (!this.tagDict) {
            if (this.tagBA) {
                this.tagDict = decodeTags(this.tagBA);
                this.tagBA = undefined;
            } else {
                this.tagDict = {};  // Mark so we don't try again.  The record has no tags
            }
        }
        return this.tagDict;

        function decodeTags(ba) {

            let p = 0;
            const len = ba.length;
            const tags = {};

            while (p < len) {
                const tag = String.fromCharCode(ba[p]) + String.fromCharCode(ba[p + 1]);
                p += 2;

                const type = String.fromCharCode(ba[p++]);
                let value;
                if (type === 'A') {
                    value = String.fromCharCode(ba[p]);
                    p++;
                } else if (type === 'i' || type === 'I') {
                    value = readInt(ba, p);
                    p += 4;
                } else if (type === 'c' || type === 'C') {
                    value = ba[p];
                    p++;
                } else if (type === 's' || type === 'S') {
                    value = readShort(ba, p);
                    p += 2;
                } else if (type === 'f') {
                    value = readFloat(ba, p);
                    p += 4;
                } else if (type === 'Z') {
                    value = '';
                    for (; ;) {
                        var cc = ba[p++];
                        if (cc === 0) {
                            break;
                        } else {
                            value += String.fromCharCode(cc);
                        }
                    }
                } else if (type === 'B') {
                    const elementType = String.fromCharCode(ba[p++]);
                    let elementSize = ELEMENT_SIZE[elementType];
                    if (elementSize === undefined) {
                        tags[tag] = `Error: unknown element type '${elementType}'`;
                        break;
                    }
                    const numElements = readInt(ba, p);
                    p += (4 + numElements * elementSize);
                    value = '[not shown]';
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

    /**
     * Does alignment (or alignment extended by soft clips) contain the genomic location?
     *
     * @param genomicLocation
     * @param showSoftClips
     * @returns {boolean|boolean}
     */
    containsLocation(genomicLocation, showSoftClips) {
        const s = showSoftClips ? this.scStart : this.start;
        const l = showSoftClips ? this.scLengthOnRef : this.lengthOnRef;
        return (genomicLocation >= s && genomicLocation <= (s + l));
    }

    popupData(genomicLocation) {

        // if the user clicks on a base next to an insertion, show just the
        // inserted bases in a popup (like in desktop IGV).
        const nameValues = [];

        // Consert genomic location to int
        genomicLocation = Math.floor(genomicLocation);

        if (this.insertions) {

            const seq = this.seq;

            for (let insertion of this.insertions) {
                var ins_start = insertion.start;
                if (genomicLocation === ins_start || genomicLocation === ins_start - 1) {
                    nameValues.push({name: 'Insertion', value: seq.substr(insertion.seqOffset, insertion.len)});
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
        nameValues.push({name: 'Alignment Start', value: StringUtils.numberFormatter(1 + this.start), borderTop: true});
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

        const tagDict = this.tags();
        let isFirst = true;
        for (let key in tagDict) {

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
        nameValues.push({name: 'Genomic Location: ', value: StringUtils.numberFormatter(1 + genomicLocation)});
        nameValues.push({name: 'Read Base:', value: this.readBaseAt(genomicLocation)});
        nameValues.push({name: 'Base Quality:', value: this.readBaseQualityAt(genomicLocation)});

        return nameValues;


        function yesNo(bool) {
            return bool ? 'Yes' : 'No';
        }
    }

    readBaseAt(genomicLocation) {

        const block = blockAtGenomicLocation(this.blocks, genomicLocation);
        if (block) {
            if ("*" === this.seq) {
                return "*";
            } else {
                const idx = block.seqIndexAt(genomicLocation);
                // if (idx >= 0 && idx < this.seq.length) {
                return this.seq[idx];
                //  }
            }
        } else {
            return undefined;
        }
    }

    readBaseQualityAt(genomicLocation) {

        const block = blockAtGenomicLocation(this.blocks, genomicLocation);
        if (block) {
            if ("*" === this.qual) {
                return 30;
            } else {
                const idx = block.seqIndexAt(genomicLocation);
                if (idx >= 0 && this.qual && idx < this.qual.length) {
                    return this.qual[idx];
                } else {
                    return 30;
                }
            }
        } else {
            return undefined;
        }
    }

    gapSizeAt(genomicLocation) {
        if (this.gaps) {
            for (let gap of this.gaps) {
                if (genomicLocation >= gap.start && genomicLocation < gap.start + gap.len) {
                    return gap.len;
                }
            }
        }
        return 0;
    }
}

function blockAtGenomicLocation(blocks, genomicLocation) {

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (genomicLocation >= block.start && genomicLocation < block.start + block.len) {
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

export default BamAlignment;
