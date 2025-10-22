// Represents a CSI Bam or Tabix index

import BinaryParser from "../binary.js"
import {optimizeChunks} from "./indexUtils.js"

const CSI1_MAGIC = 21582659 // CSI\1
const CSI2_MAGIC = 38359875 // CSI\2

async function parseCsiIndex(arrayBuffer) {

    const idx = new CSIIndex()
    idx.parse(arrayBuffer)
    return idx
}

class CSIIndex {

    constructor() {
        this.tabix = true  // => i.e. not a tribble index.   This is important, if obtuse
    }

    parse(arrayBuffer) {
        const parser = new BinaryParser(new DataView(arrayBuffer))

        const magic = parser.getInt()

        if (magic !== CSI1_MAGIC) {
            if (magic === CSI2_MAGIC) {
                throw Error("CSI version 2 is not supported.  Please enter an issue at https://github.com/igvteam/igv.js")
            } else {
                throw Error("Not a CSI index")
            }
        }

        this.indices = []
        this.blockMin = Number.MAX_SAFE_INTEGER
        this.lastBlockPosition = []
        this.sequenceIndexMap = {}

        this.minShift = parser.getInt()
        this.depth = parser.getInt()
        const lAux = parser.getInt()
        const seqNames = []
        let bmax = 0

        if (lAux >= 28) {
            // Tabix header parameters aren't used, but they must be read to advance the pointer
            const format = parser.getInt()
            const col_seq = parser.getInt()
            const col_beg = parser.getInt()
            const col_end = parser.getInt()
            const meta = parser.getInt()
            const skip = parser.getInt()
            const l_nm = parser.getInt()
            const nameEndPos = parser.position + l_nm
            let i = 0
            while (parser.position < nameEndPos) {
                let seq_name = parser.getString()
                this.sequenceIndexMap[seq_name] = i
                seqNames[i] = seq_name
                i++
            }
        }

        const MAX_BIN = this.bin_limit() + 1
        const nref = parser.getInt()
        for (let ref = 0; ref < nref; ref++) {
            const binIndex = []
            const loffset = []
            const nbin = parser.getInt()
            for (let b = 0; b < nbin; b++) {

                const binNumber = parser.getInt()
                loffset[binNumber] = parser.getVPointer()

                if (binNumber > MAX_BIN) {
                    // This is a psuedo bin, not used but we have to consume the bytes
                    const nchnk = parser.getInt() // # of chunks for this bin
                    const cs = parser.getVPointer()   // unmapped beg
                    const ce = parser.getVPointer()   // unmapped end
                    const n_maped = parser.getLong()
                    const nUnmapped = parser.getLong()

                } else {

                    binIndex[binNumber] = []
                    const nchnk = parser.getInt() // # of chunks for this bin

                    for (let i = 0; i < nchnk; i++) {
                        const cs = parser.getVPointer()    //chunk_beg
                        const ce = parser.getVPointer()    //chunk_end
                        if (cs && ce) {
                            if (cs.block < this.blockMin) {
                                this.blockMin = cs.block    // Block containing first alignment
                            }
                            if (ce.block > bmax) {
                                bmax = ce.block
                            }
                            binIndex[binNumber].push([cs, ce])
                        }
                    }
                }
            }

            if (nbin > 0) {
                this.indices[ref] = {
                    binIndex: binIndex,
                    loffset: loffset
                }
            }
        }
        this.lastBlockPosition = bmax
    }

    get sequenceNames() {
        return Object.keys(this.sequenceIndexMap)
    }

    /**
     * Fetch blocks for a particular genomic range.  This method is public so it can be unit-tested.
     *
     * @param refId  the sequence dictionary id of the chromosome
     * @param min  genomic start position
     * @param max  genomic end position
     * @param return an array of {minv: {filePointer, offset}, {maxv: {filePointer, offset}}
     */
    chunksForRange(refId, min, max) {

        const ba = this.indices[refId]
        if (!ba) {
            return []
        } else {
            const overlappingBins = this.reg2bins(min, max)        // List of bin #s that overlap min, max
            if (overlappingBins.length == 0) return []

            const chunks = []
            // Find chunks in overlapping bins.  Leaf bins (< 4681) are not pruned
            for (let binRange of overlappingBins) {
                for (let bin = binRange[0]; bin <= binRange[1]; bin++) {
                    if (ba.binIndex[bin]) {
                        const binChunks = ba.binIndex[bin]
                        for (let c of binChunks) {
                            const cs = c[0]
                            const ce = c[1]
                            chunks.push({minv: cs, maxv: ce, bin: bin})
                        }
                    }
                }
            }

            // Find from the lowest bin level
            let bin = overlappingBins[this.depth][0]
            do {
                const target = ba.binIndex[bin]
                if (target) {
                    break
                }
                const firstBin = (this.getParentBin(bin) << 3) + 1
                if (bin > firstBin) {
                    bin--
                } else {
                    bin = this.getParentBin(bin)
                }
            } while (bin != 0)
            
            const lowestOffset = ba.loffset[bin]
            
            return optimizeChunks(chunks, lowestOffset)
        }
    }

    getParentBin(bin) {
        if (bin == 0) {
            return 0;
        }
        return (bin - 1) >> 3;
    }

    // reg2bins implementation adapted from GMOD/tabix-js  https://github.com/GMOD/tabix-js/blob/master/src/csi.ts
    reg2bins(beg, end) {
        beg -= 1 // < convert to 1-based closed
        if (beg < 1) beg = 1
        if (end > 2 ** 34) end = 2 ** 34 // 17 GiB ought to be enough for anybody
        end -= 1
        let l = 0
        let t = 0
        let s = this.minShift + this.depth * 3
        const bins = []
        for (; l <= this.depth; s -= 3, t += (1 << l * 3), l += 1) {
            const b = t + (beg >> s)
            const e = t + (end >> s)
            //
            // ITS NOT CLEAR WHERE THIS TEST CAME FROM,  but maxBinNumber is never set, and its not clear what it represents.
            // if (e - b + bins.length > this.maxBinNumber)
            //     throw new Error(
            //         `query ${beg}-${end} is too large for current binning scheme (shift ${this.minShift}, depth ${this.depth}), try a smaller query or a coarser index binning scheme`,
            //     )
            //
            bins.push([b, e])
        }
        return bins
    }


    bin_limit() {
        return ((1 << (this.depth + 1) * 3) - 1) / 7
    }

}

export {parseCsiIndex}