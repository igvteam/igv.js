
import {StringUtils} from "../../node_modules/igv-utils/src/index.js"
import {createSupplementaryAlignments} from "./supplementaryAlignment.js"
import {byteToUnsignedInt, getBaseModificationSets, modificationName} from "./mods/baseModificationUtils.js"
import orientationTypes from "./orientationTypes.js"


const READ_PAIRED_FLAG = 0x1
const PROPER_PAIR_FLAG = 0x2
const READ_UNMAPPED_FLAG = 0x4
const MATE_UNMAPPED_FLAG = 0x8
const READ_STRAND_FLAG = 0x10
const MATE_STRAND_FLAG = 0x20
const FIRST_OF_PAIR_FLAG = 0x40
const SECOND_OF_PAIR_FLAG = 0x80
const SECONDARY_ALIGNMNET_FLAG = 0x100
const READ_FAILS_VENDOR_QUALITY_CHECK_FLAG = 0x200
const DUPLICATE_READ_FLAG = 0x400
const SUPPLEMENTARY_ALIGNMENT_FLAG = 0x800
const ELEMENT_SIZE = {
    c: 1,
    C: 1,
    s: 2,
    S: 2,
    i: 4,
    I: 4,
    f: 4
}

const MAX_CIGAR = 50

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
        this.hidden = false
    }

    isMapped() {
        return (this.flags & READ_UNMAPPED_FLAG) === 0
    }

    isPaired() {
        return (this.flags & READ_PAIRED_FLAG) !== 0
    }

    isProperPair() {
        return (this.flags & PROPER_PAIR_FLAG) !== 0
    }

    isFirstOfPair() {
        return (this.flags & FIRST_OF_PAIR_FLAG) !== 0
    }

    isSecondOfPair() {
        return (this.flags & SECOND_OF_PAIR_FLAG) !== 0
    }

    isSecondary() {
        return (this.flags & SECONDARY_ALIGNMNET_FLAG) !== 0
    }

    isSupplementary() {
        return (this.flags & SUPPLEMENTARY_ALIGNMENT_FLAG) !== 0
    }

    isFailsVendorQualityCheck() {
        return (this.flags & READ_FAILS_VENDOR_QUALITY_CHECK_FLAG) !== 0
    }

    isDuplicate() {
        return (this.flags & DUPLICATE_READ_FLAG) !== 0
    }

    isMateMapped() {
        return (this.flags & MATE_UNMAPPED_FLAG) === 0
    }

    isNegativeStrand() {
        return (this.flags & READ_STRAND_FLAG) !== 0
    }
    
    isMateNegativeStrand() {
        return (this.flags & MATE_STRAND_FLAG) !== 0
    }

    hasTag(tag) {
        const tmpTags = this.tagDict || decodeTags(this.tagBA)
        return tmpTags.hasOwnProperty(tag)
    }

    tags() {
        return this.tagDict
    }

    getTag(key) {
        return this.tags()[key]
    }


    /**
     * @returns a boolean indicating strand of first in pair, true for forward, false for reverse, and undefined
     * if this is not paired or is not first and mate is not mapped.
     */
    get firstOfPairStrand() {
        if (this.isPaired()) {
            if (this.isFirstOfPair()) {
                return this.strand
            } else if (this.isMateMapped()) {
                return this.mate.strand
            }
        }
        return undefined
    }


    /**
     * Does alignment (or alignment extended by soft clips) contain the genomic location?
     *
     * @param genomicLocation
     * @param showSoftClips
     * @returns {boolean|boolean}
     */
    containsLocation(genomicLocation, showSoftClips) {
        const s = showSoftClips ? this.scStart : this.start
        const l = showSoftClips ? this.scLengthOnRef : this.lengthOnRef
        return (genomicLocation >= s && genomicLocation <= (s + l))
    }

    popupData(genomicLocation) {

        // if the user clicks on a base next to an insertion, show just the
        // inserted bases in a popup (like in desktop IGV).
        const nameValues = []

        // Consert genomic location to int
        genomicLocation = Math.floor(genomicLocation)

        if (this.insertions) {

            const seq = this.seq

            for (let insertion of this.insertions) {
                var ins_start = insertion.start
                if (genomicLocation === ins_start || genomicLocation === ins_start - 1) {
                    nameValues.push({name: 'Insertion', value: seq.substr(insertion.seqOffset, insertion.len)})
                    nameValues.push({name: 'Location', value: ins_start})
                    return nameValues
                }
            }
        }

        nameValues.push({name: 'Read Name', value: this.readName})

        // Sample
        // Read group
        nameValues.push('<hr/>')

        // Add 1 to genomic location to map from 0-based computer units to user-based units
        nameValues.push({name: 'Alignment Start', value: StringUtils.numberFormatter(1 + this.start), borderTop: true})
        nameValues.push({name: 'Read Strand', value: (true === this.strand ? '(+)' : '(-)'), borderTop: true})

        // Abbreviate long cigar strings, keeping the beginning and end to show cliping
        let cigar = this.cigar
        if (cigar && cigar.length > MAX_CIGAR) {
            const half = MAX_CIGAR / 2
            cigar = `${cigar.substring(0, half - 2)} ... ${cigar.substring(cigar.length - half + 2)}`
        }
        nameValues.push({name: 'Cigar', value: cigar})

        nameValues.push({name: 'Mapping Quality', value: this.mq})
        nameValues.push({name: 'Secondary', value: yesNo(this.isSecondary())})
        nameValues.push({name: 'Supplementary', value: yesNo(this.isSupplementary())})
        nameValues.push({name: 'Duplicate', value: yesNo(this.isDuplicate())})
        nameValues.push({name: 'Failed QC', value: yesNo(this.isFailsVendorQualityCheck())})

        if (this.isPaired()) {
            nameValues.push('<hr/>')
            nameValues.push({name: 'First in Pair', value: !this.isSecondOfPair(), borderTop: true})
            nameValues.push({name: 'Mate is Mapped', value: yesNo(this.isMateMapped())})
            if (this.pairOrientation) {
                nameValues.push({name: 'Pair Orientation', value: this.pairOrientation})
            }
            if (this.isMateMapped()) {
                nameValues.push({name: 'Mate Chromosome', value: this.mate.chr})
                nameValues.push({name: 'Mate Start', value: (this.mate.position + 1)})
                nameValues.push({name: 'Mate Strand', value: (true === this.mate.strand ? '(+)' : '(-)')})
                nameValues.push({name: 'Insert Size', value: this.fragmentLength})
                // Mate Start
                // Mate Strand
                // Insert Size
            }
            // First in Pair
            // Pair Orientation

        }

        const tagDict = this.tags()

        if (tagDict.hasOwnProperty('SA')) {
            nameValues.push('<hr/>')
            nameValues.push({name: 'Supplementary Alignments', value: ''})
            const sa = createSupplementaryAlignments(tagDict['SA'])
            if (sa) {
                nameValues.push('<ul>')
                for (let s of sa) {
                    nameValues.push(`<li>${s.printString()}</li>`)
                }
                nameValues.push('</ul>')
            }
        }

        const hiddenTags = new Set(['SA', 'MD'])
        nameValues.push('<hr/>')
        for (let key in tagDict) {
            if (!hiddenTags.has(key)) {
                nameValues.push({name: key, value: tagDict[key]})
            }
        }

        nameValues.push({name: 'Hidden Tags', value: 'SA, MD'})

        nameValues.push('<hr/>')
        nameValues.push({name: 'Genomic Location: ', value: StringUtils.numberFormatter(1 + genomicLocation)})
        nameValues.push({name: 'Read Base:', value: this.readBaseAt(genomicLocation)})
        nameValues.push({name: 'Base Quality:', value: this.readBaseQualityAt(genomicLocation)})

        const bmSets = this.getBaseModificationSets()
        if(bmSets) {
            const i = this.positionToReadIndex(genomicLocation)
            if(undefined !== i) {
                let found = false
                for (let bmSet of bmSets) {
                    if (bmSet.containsPosition(i)) {
                        if(!found) {
                            nameValues.push('<hr/>')
                            nameValues.push('<b>Base modifications:</b>')
                            found = true
                        }
                        const lh = Math.round((100/255) * byteToUnsignedInt(bmSet.likelihoods.get(i)))
                        nameValues.push(`${bmSet.fullName()} @ likelihood =  ${lh}%`)
                    }
                }
            }
        }

        return nameValues


        function yesNo(bool) {
            return bool ? 'Yes' : 'No'
        }
    }

    readBaseAt(genomicLocation) {

        const block = blockAtGenomicLocation(this.blocks, genomicLocation)
        if (block) {
            if ("*" === this.seq) {
                return "*"
            } else {
                const idx = block.seqIndexAt(genomicLocation)
                // if (idx >= 0 && idx < this.seq.length) {
                return this.seq[idx]
                //  }
            }
        } else {
            return undefined
        }
    }

    readBaseQualityAt(genomicLocation) {

        const block = blockAtGenomicLocation(this.blocks, genomicLocation)
        if (block) {
            if ("*" === this.qual) {
                return 30
            } else {
                const idx = block.seqIndexAt(genomicLocation)
                if (idx >= 0 && this.qual && idx < this.qual.length) {
                    return this.qual[idx]
                } else {
                    return 30
                }
            }
        } else {
            return undefined
        }
    }

    gapSizeAt(genomicLocation) {
        if (this.gaps) {
            for (let gap of this.gaps) {
                if (genomicLocation >= gap.start && genomicLocation < gap.start + gap.len) {
                    return gap.len
                }
            }
        }
        return 0
    }

    /**
     * Return soft clipped blocks, if they exist, keyed by alignment end (left or right)
     */
    softClippedBlocks() {
        let left
        let right
        let interiorSeen
        for (let b of this.blocks) {
            if ('S' === b.type) {
                if (interiorSeen) {
                    right = b
                } else {
                    left = b
                }
            } else if ('H' !== b.type) {
                interiorSeen = true
            }
        }
        return {left, right}
    }

    getBaseModificationSets() {

        if (!this.baseModificationSets && (this.tagDict["MM"] || this.tagDict["Mm"])) {

            const mm = this.tagDict["MM"] || this.tagDict["Mm"]
            const ml = this.tagDict["ML"] || this.tagDict["Ml"]

            if (StringUtils.isString(mm) && (!ml || Array.isArray(ml))) { // minimal validation, 10X uses these reserved tags for something completely different
                if (mm.length === 0) {
                    this.baseModificationSets = EMPTY_SET
                } else {
                    //getBaseModificationSets(mm, ml, sequence, isNegativeStrand)
                    this.baseModificationSets = getBaseModificationSets(mm, ml, this.seq, this.isNegativeStrand())
                }
                //}
            }
        }
        return this.baseModificationSets
    }

     getGroupValue( groupBy, tag, expectedPairOrientation) {

        const al = this
        switch (groupBy) {
            // case 'HAPLOTYPE':
            //     return al.getHaplotypeName();
            case 'strand':
                return al.strand ? '+' : '-'
            case 'firstOfPairStrand':
                const strand = al.firstOfPairStrand
                return strand === undefined ? "" : strand ? '+' : '-'
            case 'mateChr':
                return (al.mate && al.isMateMapped()) ? al.mate.chr : ""
            case 'pairOrientation':
                return orientationTypes[expectedPairOrientation][al.pairOrientation] || ""
            case 'chimeric':
                return al.tags()['SA'] ? "chimeric" : ""
            case 'supplementary':
                return al.isSupplementary ? "supplementary" : ""
            case 'readOrder':
                if (al.isPaired() && al.isFirstOfPair()) {
                    return "first"
                } else if (al.isPaired() && al.isSecondOfPair()) {
                    return "second"
                } else {
                    return ""
                }
            case 'phase':
                return al.tags()['HP'] || ""
            case 'tag':
                return al.tags()[tag] || ""
            // Add cases for other options as needed
            default:
                return undefined
        }
    }

    positionToReadIndex( position) {
        const block = blockAtGenomicLocation(this.blocks, position)
        if (block) {
            return (position - block.start) + block.seqOffset
        } else {
            return undefined
        }
    }


}

const EMPTY_SET = new Set()

function blockAtGenomicLocation(blocks, genomicLocation) {

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i]
        if (genomicLocation >= block.start && genomicLocation < block.start + block.len) {
            return block
        }
    }
    return undefined
}

function decodeTags(ba) {

    let p = 0
    const len = ba.length
    const tags = {}

    while (p < len) {
        const tag = String.fromCharCode(ba[p]) + String.fromCharCode(ba[p + 1])
        p += 2

        const type = String.fromCharCode(ba[p++])
        let value
        if (type === 'A') {
            value = String.fromCharCode(ba[p])
            p++
        } else if (type === 'i' || type === 'I') {
            value = readInt(ba, p)
            p += 4
        } else if (type === 'c') {
            value = readInt8(ba, p)
            p++
        } else if (type === 'C') {
            value = readUInt8(ba, p)
            p++
        } else if (type === 's' || type === 'S') {
            value = readShort(ba, p)
            p += 2
        } else if (type === 'f') {
            value = readFloat(ba, p)
            p += 4
        } else if (type === 'Z') {
            value = ''
            for (; ;) {
                var cc = ba[p++]
                if (cc === 0) {
                    break
                } else {
                    value += String.fromCharCode(cc)
                }
            }
        } else if (type === 'B') {
            //‘cCsSiIf’, corresponding to int8 , uint8 t, int16 t, uint16 t, int32 t, uint32 t and float
            const elementType = String.fromCharCode(ba[p++])
            let elementSize = ELEMENT_SIZE[elementType]
            if (elementSize === undefined) {
                tags[tag] = `Error: unknown element type '${elementType}'`
                break
            }
            const numElements = readInt(ba, p)
            p += 4
            const pEnd = p + numElements * elementSize
            value = []
            const dataView = new DataView(ba.buffer)
            while (p < pEnd) {
                switch (elementType) {
                    case 'c':
                        value.push(dataView.getInt8(p))
                        break
                    case 'C':
                        value.push(dataView.getUint8(p))
                        break
                    case 's':
                        value.push(dataView.getInt16(p))
                        break
                    case 'S':
                        value.push(dataView.getUint16(p))
                        break
                    case 'i':
                        value.push(dataView.getInt32(p))
                        break
                    case 'I':
                        value.push(dataView.getUint32(p))
                        break
                    case 'f':
                        value.push(dataView.getFloat32(p))
                }
                p += elementSize
            }
        } else {
            //'Unknown type ' + type;
            value = 'Error unknown type: ' + type
            tags[tag] = value
            break
        }
        tags[tag] = value
    }
    return tags
}


function readInt(ba, offset) {
    return (ba[offset + 3] << 24) | (ba[offset + 2] << 16) | (ba[offset + 1] << 8) | (ba[offset])
}

function readShort(ba, offset) {
    return (ba[offset + 1] << 8) | (ba[offset])
}

function readFloat(ba, offset) {
    const dataView = new DataView(ba.buffer)
    return dataView.getFloat32(offset)
}

function readInt8(ba, offset) {
    const dataView = new DataView(ba.buffer)
    return dataView.getInt8(offset)
}

function readUInt8(ba, offset) {
    const dataView = new DataView(ba.buffer)
    return dataView.getUint8(offset)
}


export default BamAlignment