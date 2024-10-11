
import BamAlignment from "./bamAlignment.js"
import AlignmentBlock from "./alignmentBlock.js"
import {BGZip, igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import BamFilter from "./bamFilter.js"


/**
 * This code is based on the Biodalliance BAM reader by Thomas Down,  2011
 *
 * https://github.com/dasmoth/dalliance/blob/master/js/bam.js
 */
//=ACMGRSVTWYHKDBN
const BAM1_MAGIC_BYTES = new Uint8Array([0x42, 0x41, 0x4d, 0x01]) // BAM\1
const BAM1_MAGIC_NUMBER = readInt(BAM1_MAGIC_BYTES, 0)

const SEQ_DECODER = ['=', 'A', 'C', 'M', 'G', 'R', 'S', 'V', 'T', 'W', 'Y', 'H', 'K', 'D', 'B', 'N']
const CIGAR_DECODER = ['M', 'I', 'D', 'N', 'S', 'H', 'P', '=', 'X', '?', '?', '?', '?', '?', '?', '?']
const READ_STRAND_FLAG = 0x10
const MATE_STRAND_FLAG = 0x20
const ELEMENT_SIZE = {
    c: 1,
    C: 1,
    s: 2,
    S: 2,
    i: 4,
    I: 4,
    f: 4
}

const DEFAULT_ALLELE_FREQ_THRESHOLD = 0.2
const DEFAULT_SAMPLING_WINDOW_SIZE = 100
const DEFAULT_SAMPLING_DEPTH = 500
const MAXIMUM_SAMPLING_DEPTH = 10000

const BamUtils = {

    readHeader: async function (url, options, genome) {

        const compressedBuffer = await igvxhr.loadArrayBuffer(url, options)
        const uncba = BGZip.unbgzf(compressedBuffer)
        return BamUtils.decodeBamHeader(uncba, genome)
    },

    /**
     * @param ba - UInt8Array  bytes to decode
     *
     * @returns {{size: *, chrNames: *[], magicNumber: *, chrToIndex: {}}}
     */
    decodeBamHeader: function (ba) {


        const magic = readInt(ba, 0)
        if (magic !== BAM1_MAGIC_NUMBER) {
            throw new Error('BAM header errror: bad magic number.  This could be caused by either a corrupt or missing file.')
        }

        const samHeaderLen = readInt(ba, 4)
        let samHeader = ''
        for (var i = 0; i < samHeaderLen; ++i) {
            samHeader += String.fromCharCode(ba[i + 8])
        }

        const nRef = readInt(ba, samHeaderLen + 8)
        let p = samHeaderLen + 12

        const chrToIndex = {}
        const chrNames = []

        for (i = 0; i < nRef; ++i) {
            const len = readInt(ba, p)
            let name = ''
            for (var j = 0; j < len - 1; ++j) {
                name += String.fromCharCode(ba[p + 4 + j])
            }

            chrToIndex[name] = i
            chrNames[i] = name

            p = p + 8 + len
        }

        return {
            magicNumber: magic,
            size: p,
            chrNames: chrNames,
            chrToIndex: chrToIndex
        }

    },

    bam_tag2cigar: function (ba, block_end, seq_offset, lseq, al, cigarArray) {

        function type2size(x) {
            if (x === 'C' || x === 'c' || x === 'A') return 1
            else if (x === 'S' || x === 's') return 2
            else if (x === 'I' || x === 'i' || x === 'f') return 4
            else return 0
        }

        // test if the real CIGAR is encoded in a CG:B,I tag
        if (cigarArray.length !== 1 || al.start < 0) return false
        var p = seq_offset + ((lseq + 1) >> 1) + lseq
        while (p + 4 < block_end) {
            var tag = String.fromCharCode(ba[p]) + String.fromCharCode(ba[p + 1])
            if (tag === 'CG') break
            var type = String.fromCharCode(ba[p + 2])
            if (type === 'B') { // the binary array type
                type = String.fromCharCode(ba[p + 3])
                var size = type2size(type)
                var len = readInt(ba, p + 4)
                p += 8 + size * len
            } else if (type === 'Z' || type === 'H') { // 0-terminated string
                p += 3
                while (ba[p++] !== 0) {
                }
            } else { // other atomic types
                p += 3 + type2size(type)
            }
        }
        if (p >= block_end) return false // no CG tag
        if (String.fromCharCode(ba[p + 2]) !== 'B' || String.fromCharCode(ba[p + 3]) !== 'I') return false // not of type B,I

        // now we know the real CIGAR length and its offset in the binary array
        var cigar_len = readInt(ba, p + 4)
        var cigar_offset = p + 8 // 4 for "CGBI" and 4 for length
        if (cigar_offset + cigar_len * 4 > block_end) return false // out of bound

        // decode CIGAR
        var cigar = ''
        var lengthOnRef = 0
        cigarArray.length = 0 // empty the old array
        p = cigar_offset
        for (var k = 0; k < cigar_len; ++k, p += 4) {
            var cigop = readInt(ba, p)
            var opLen = (cigop >> 4)
            var opLtr = CIGAR_DECODER[cigop & 0xf]
            if (opLtr === 'M' || opLtr === 'EQ' || opLtr === 'X' || opLtr === 'D' || opLtr === 'N' || opLtr === '=')
                lengthOnRef += opLen
            cigar = cigar + opLen + opLtr
            cigarArray.push({len: opLen, ltr: opLtr})
        }

        // update alignment record. We are not updating bin, as apparently it is not used.
        al.cigar = cigar
        al.lengthOnRef = lengthOnRef
        return true
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
     * @param filter             a BamFilter object
     *
     * @return true if we have moved beyond the right end of the genomic range.
     */
    decodeBamRecords: function (ba, offset, alignmentContainer, chrNames, chrIdx, min, max, filter) {

        while (offset < ba.length) {

            const blockSize = readInt(ba, offset)
            const blockEnd = offset + blockSize + 4
            const alignment = new BamAlignment()
            const refID = readInt(ba, offset + 4)
            const pos = readInt(ba, offset + 8)

            if (blockEnd > ba.length) {
                return
            }
            if (refID < 0) {
                offset = blockEnd
                continue   // unmapped read
            } else if (chrIdx !== undefined && (refID > chrIdx || pos > max)) {
                return true    // off right edge, we're done
            } else if (chrIdx !== undefined && (refID < chrIdx)) {
                offset = blockEnd
                continue   // ref ID to left of start, not sure this is possible
            }

            const bin_mq_nl = readInt(ba, offset + 12)
            const bin = (bin_mq_nl & 0xffff0000) >> 16
            const mq = (bin_mq_nl & 0xff00) >> 8
            const nl = bin_mq_nl & 0xff

            const flag_nc = readInt(ba, offset + 16)
            const flag = (flag_nc & 0xffff0000) >> 16
            const nc = flag_nc & 0xffff

            const lseq = readInt(ba, offset + 20)
            const mateChrIdx = readInt(ba, offset + 24)
            const matePos = readInt(ba, offset + 28)
            const fragmentLength = readInt(ba, offset + 32)

            let readName = []
            for (let j = 0; j < nl - 1; ++j) {
                readName.push(String.fromCharCode(ba[offset + 36 + j]))
            }
            readName = readName.join('')

            let lengthOnRef = 0
            let cigar = ''
            let p = offset + 36 + nl
            const cigarArray = []
            // concatenate M,=,EQ,and X

            let lastCigRecord
            let mOperators = new Set(['M', 'EQ', 'X', '='])
            for (let c = 0; c < nc; ++c) {
                var cigop = readInt(ba, p)
                var opLen = (cigop >> 4)
                var opLtr = CIGAR_DECODER[cigop & 0xf]
                if (opLtr === 'M' || opLtr === 'EQ' || opLtr === 'X' || opLtr === 'D' || opLtr === 'N' || opLtr === '=')
                    lengthOnRef += opLen
                cigar = cigar + opLen + opLtr
                p += 4

                // if(mOperators.has(opLtr) && mOperators.has(lastCigRecord.ltr)) {
                //     lastCigRecord.len += opLen;
                //     lastCigRecord.ltr = 'M'
                // }
                // else {
                lastCigRecord = {len: opLen, ltr: opLtr}
                cigarArray.push(lastCigRecord)
                //}
            }

            alignment.chr = chrNames[refID]
            alignment.start = pos
            alignment.flags = flag
            alignment.strand = !(flag & READ_STRAND_FLAG)
            alignment.readName = readName
            alignment.cigar = cigar
            alignment.lengthOnRef = lengthOnRef
            alignment.fragmentLength = fragmentLength
            alignment.mq = mq

            BamUtils.bam_tag2cigar(ba, blockEnd, p, lseq, alignment, cigarArray)

            alignment.end = alignment.start + alignment.lengthOnRef

            if (alignment.end < min) {
                offset = blockEnd
                continue
            }  // Record out-of-range "to the left", skip to next one


            let seq = []
            const seqBytes = (lseq + 1) >> 1
            for (let j = 0; j < seqBytes; ++j) {
                var sb = ba[p + j]
                seq.push(SEQ_DECODER[(sb & 0xf0) >> 4])
                seq.push(SEQ_DECODER[(sb & 0x0f)])
            }
            seq = seq.slice(0, lseq).join('')  // seq might have one extra character (if lseq is an odd number)
            p += seqBytes


            const qualArray = []
            for (let j = 0; j < lseq; ++j) {
                qualArray.push(ba[p + j])
            }
            p += lseq

            if (mateChrIdx >= 0) {
                alignment.mate = {
                    chr: chrNames[mateChrIdx],
                    position: matePos,
                    strand: !(flag & MATE_STRAND_FLAG)
                }
            }

            alignment.seq = seq
            alignment.qual = qualArray

            const tagBA = new Uint8Array(ba.buffer.slice(p, blockEnd))
            alignment.tagDict = decodeBamTags(tagBA)

            this.setPairOrientation(alignment)

            if ((undefined === filter || filter.pass(alignment))) {
                makeBlocks(alignment, cigarArray)
                alignmentContainer.push(alignment)
            }
            offset = blockEnd
        }
    },

    decodeSamRecords: function (sam, alignmentContainer, chr, min, max, filter) {

        var lines, i, j, len, tokens, blocks, pos, qualString, rnext, pnext, lengthOnRef,
            alignment, cigarArray, started

        lines = StringUtils.splitLines(sam)
        len = lines.length
        started = false

        for (i = 0; i < len; i++) {

            tokens = lines[i].split('\t')

            alignment = new BamAlignment()

            alignment.chr = tokens[2]
            alignment.start = Number.parseInt(tokens[3]) - 1
            alignment.flags = Number.parseInt(tokens[1])
            alignment.readName = tokens[0]
            alignment.strand = !(alignment.flags & READ_STRAND_FLAG)
            alignment.mq = Number.parseInt(tokens[4])
            alignment.cigar = tokens[5]
            alignment.fragmentLength = Number.parseInt(tokens[8])
            alignment.seq = tokens[9]

            if (alignment.chr === '*' || !alignment.isMapped()) continue  // Unmapped

            if (alignment.chr !== chr) {
                if (started) break // Off the right edge, we're done
                else continue // Possibly to the left, skip but keep looping
            } else if (alignment.start > max) {
                break    // off right edge, we're done
            }

            lengthOnRef = 0
            cigarArray = buildOperators(alignment.cigar)
            cigarArray.forEach(function (op) {
                var opLen = op.len
                var opLtr = op.ltr
                if (opLtr === 'M' || opLtr === 'EQ' || opLtr === 'X' || opLtr === 'D' || opLtr === 'N' || opLtr === '=')
                    lengthOnRef += opLen
            })
            alignment.lengthOnRef = lengthOnRef
            // TODO for lh3: parse the CG:B,I tag in SAM here

            if (alignment.start + lengthOnRef < min) {
                continue    // To the left, skip and continue
            }


            qualString = tokens[10]
            alignment.qual = []
            for (j = 0; j < qualString.length; j++) {
                alignment.qual[j] = qualString.charCodeAt(j) - 33
            }
            alignment.tagDict = tokens.length < 11 ? {} : decodeSamTags(tokens.slice(11))

            if (alignment.isMateMapped()) {
                rnext = tokens[6]
                alignment.mate = {
                    chr: (rnext === '=') ? alignment.chr : rnext,
                    position: Number.parseInt(tokens[7]),
                    strand: !(alignment.flags & MATE_STRAND_FLAG)
                }
            }

            this.setPairOrientation(alignment)

            if (undefined === filter || filter.pass(alignment)) {
                makeBlocks(alignment, cigarArray)
                alignmentContainer.push(alignment)
            }
        }
    },

    setReaderDefaults: function (reader, config) {

        reader.filter = typeof config.filter === 'function' ?
            {pass: config.filter} :
            new BamFilter(config.filter)

        if (config.readgroup) {
            reader.filter.readgroups = new Set([config.readgroup])
        }

        reader.alleleFreqThreshold = config.alleleFreqThreshold === undefined ? DEFAULT_ALLELE_FREQ_THRESHOLD : config.alleleFreqThreshold

        reader.samplingWindowSize = config.samplingWindowSize === undefined ? DEFAULT_SAMPLING_WINDOW_SIZE : config.samplingWindowSize
        reader.samplingDepth = config.samplingDepth === undefined ? DEFAULT_SAMPLING_DEPTH : config.samplingDepth

        if (reader.samplingDepth > MAXIMUM_SAMPLING_DEPTH) {
            console.log("Warning: attempt to set sampling depth > maximum value of " + MAXIMUM_SAMPLING_DEPTH)
            reader.samplingDepth = MAXIMUM_SAMPLING_DEPTH
        }
    },

    setPairOrientation: function (alignment) {

        if (alignment.isMapped() && alignment.mate && alignment.isMateMapped() && alignment.mate.chr === alignment.chr) {
            var s1 = alignment.strand ? 'F' : 'R'

            var mate = alignment.mate
            var s2 = mate.strand ? 'F' : 'R'
            var o1 = ' '
            var o2 = ' '
            if (alignment.isFirstOfPair()) {
                o1 = '1'
                o2 = '2'
            } else if (alignment.isSecondOfPair()) {
                o1 = '2'
                o2 = '1'
            }

            var tmp = []
            var isize = alignment.fragmentLength
            var estReadLen = alignment.end - alignment.start
            if (isize === 0) {
                //isize not recorded.  Need to estimate.  This calculation was validated against an Illumina
                // -> <- library bam.
                var estMateEnd = alignment.start < mate.position ?
                    mate.position + estReadLen : mate.position - estReadLen
                isize = estMateEnd - alignment.start
            }

            //if (isize > estReadLen) {
            if (isize > 0) {
                tmp[0] = s1
                tmp[1] = o1
                tmp[2] = s2
                tmp[3] = o2

            } else {
                tmp[2] = s1
                tmp[3] = o1
                tmp[0] = s2
                tmp[1] = o2
            }
            // }
            alignment.pairOrientation = tmp.join('')
        }
    }
}


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

    const blocks = []

    let insertions
    let gaps
    let seqOffset = 0
    let pos = alignment.start

    alignment.scStart = alignment.start
    alignment.scLengthOnRef = alignment.lengthOnRef

    for (let c of cigarArray) {

        let scPos
        switch (c.ltr) {
            case 'H' :
                break // ignore hard clips
            case 'P' :
                break // ignore pads
            case 'S' :

                scPos = pos
                alignment.scLengthOnRef += c.len
                if (blocks.length === 0) {
                    alignment.scStart -= c.len
                    scPos -= c.len
                }
                blocks.push(new AlignmentBlock({
                    start: scPos,
                    seqOffset: seqOffset,
                    len: c.len,
                    type: 'S'
                }))
                seqOffset += c.len
                break // soft clip read bases
            case 'N' :
            case 'D':
                if (gaps === undefined) {
                    gaps = []
                }
                gaps.push({
                    start: pos,
                    len: c.len,
                    type: c.ltr
                })
                pos += c.len
                break
            case 'I' :

                if (insertions === undefined) {
                    insertions = []
                }
                insertions.push(new AlignmentBlock({
                    start: pos,
                    len: c.len,
                    seqOffset: seqOffset,
                    type: 'I'
                }))
                seqOffset += c.len
                break
            case 'M' :
            case 'EQ' :
            case '=' :
            case 'X' :
                blocks.push(new AlignmentBlock({
                    start: pos,
                    seqOffset: seqOffset,
                    len: c.len,
                    type: 'M'
                }))
                seqOffset += c.len
                pos += c.len

                break

            default :
                console.log('Error processing cigar element: ' + c.len + c.ltr)
        }
    }

    alignment.blocks = blocks
    alignment.insertions = insertions
    alignment.gaps = gaps

}

function readInt(ba, offset) {
    return (ba[offset + 3] << 24) | (ba[offset + 2] << 16) | (ba[offset + 1] << 8) | (ba[offset])
}

/**
 * Build a list of cigar operators from a cigarString.  Removes padding operators and concatenates consecutive
 * operators of the same type
 *
 * @param cigarString
 * @return
 */
function buildOperators(cigarString) {

    var operators, buffer, i, len, prevOp, next, op, nBases

    operators = []
    buffer = []

    // Create list of cigar operators
    prevOp = null
    len = cigarString.length
    for (i = 0; i < len; i++) {
        next = cigarString.charAt(i)
        if (isDigit(next)) {
            buffer.push(next)
        } else {
            op = next
            nBases = Number.parseInt(buffer.join(''))
            buffer = []

            if (prevOp !== null && prevOp.ltr === op) {
                prevOp.len += nBases
            } else {
                prevOp = {len: nBases, ltr: op}
                operators.push(prevOp)
            }
        }
    }
    return operators

}

function isDigit(a) {
    var charCode = a.charCodeAt(0)
    return (charCode >= 48 && charCode <= 57) // 0-9
}

function decodeSamTags(tags) {

    var tagDict = {}
    tags.forEach(function (tag) {
        var tokens = tag.split(':')
        tagDict[tokens[0]] = tokens[2]
    })

    return tagDict
}

/**
 * Decode bam tags from the supplied UInt8Array
 *
 * A [!-~] Printable character
 * i [-+]?[0-9]+ Signed integer16
 * f [-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)? Single-precision floating number
 * Z [ !-~]* Printable string, including space
 * H ([0-9A-F][0-9A-F])* Byte array in the Hex format17
 * B [cCsSiIf](,[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)* Integer or numeric array
 *
 * @param ba A byte array (UInt8Array)
 * @returns {{}}  Tag values
 */
function decodeBamTags(ba) {

    let p = 0
    const len = ba.length
    const tags = {}
    const dataView = new DataView(ba.buffer)

    while (p < len) {
        const tag = String.fromCharCode(ba[p]) + String.fromCharCode(ba[p + 1])
        p += 2

        const type = String.fromCharCode(ba[p++])
        let value
        if (type === 'A') {
            value = String.fromCharCode(ba[p])
            p++
        } else if (type === 'i' || type === 'I') {
            value = dataView.getInt32(p, true)
            p += 4
        } else if (type === 'c') {
            value = dataView.getInt8(p, true)
            p++
        } else if (type === 'C') {
            value = dataView.getUint8(p, true)
            p++
        } else if (type === 's' || type === 'S') {
            value = dataView.getInt16(p, true)
            p += 2
        } else if (type === 'f') {
            value = dataView.getFloat32(p, true)
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
            const numElements = dataView.getInt32(p, true)
            p += 4
            const pEnd = p + numElements * elementSize
            value = []

            while (p < pEnd) {
                switch (elementType) {
                    case 'c':
                        value.push(dataView.getInt8(p, true))
                        break
                    case 'C':
                        value.push(dataView.getUint8(p, true))
                        break
                    case 's':
                        value.push(dataView.getInt16(p, true))
                        break
                    case 'S':
                        value.push(dataView.getUint16(p, true))
                        break
                    case 'i':
                        value.push(dataView.getInt32(p, true))
                        break
                    case 'I':
                        value.push(dataView.getUint32(p, true))
                        break
                    case 'f':
                        value.push(dataView.getFloat32(p, true))
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


export default BamUtils


