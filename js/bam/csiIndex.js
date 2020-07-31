// Represents a BAM index.
// Code is based heavily on bam.js, part of the Dalliance Genome Explorer,  (c) Thomas Down 2006-2001.

import BinaryParser from "../binary.js";
import igvxhr from "../igvxhr.js";
import Zlib from "../vendor/zlib_and_gzip.js";
import {buildOptions} from "../util/igvUtils.js";

const CSI1_MAGIC = 21582659 // CSI\1
const CSI2_MAGIC = 38359875 // CSI\2

/**
 * @param indexURL
 * @param config
 * @param tabix
 *
 */
async function loadCsiIndex(indexURL, config, tabix, genome) {

    let arrayBuffer = await igvxhr.loadArrayBuffer(indexURL, buildOptions(config))
    const inflate = new Zlib.Gunzip(new Uint8Array(arrayBuffer))
    arrayBuffer = inflate.decompress().buffer;
    const idx = new CSIIndex(tabix);
    idx.parse(arrayBuffer, genome);
    return idx;
}

class CSIIndex {

    constructor(tabix) {
        this.tabix = tabix;
    }

    parse(arrayBuffer, genome) {
        const parser = new BinaryParser(new DataView(arrayBuffer));

        const magic = parser.getInt();

        if(magic !== CSI1_MAGIC) {
            if(magic === CSI2_MAGIC) {
                throw Error("CSI version 2 is not supported.  Please enter an issue at https://github.com/igvteam/igv.js");
            } else {
                throw Error("Not a CSI index");
            }
        }

        this.indices = []
        this.blockMin = Number.MAX_SAFE_INTEGER;
        this.blockMax = 0;
        this.sequenceIndexMap = {};

        this.minShift = parser.getInt();
        this.depth = parser.getInt();
        const lAux = parser.getInt();

        if (lAux >= 28) {
            // Tabix header parameters aren't used, but they must be read to advance the pointer
            const format = parser.getInt()
            const col_seq = parser.getInt()
            const col_beg = parser.getInt()
            const col_end = parser.getInt()
            const meta = parser.getInt()
            const skip = parser.getInt()
            const l_nm = parser.getInt()
            const nameEndPos = parser.position + l_nm;
            let i = 0;
            while (parser.position < nameEndPos) {
                let seq_name = parser.getString();
                // Translate to "official" chr name.
                if (genome) {
                    seq_name = genome.getChromosomeName(seq_name);
                }
                this.sequenceIndexMap[seq_name] = i;
                i++;
            }
        }

        const MAX_BIN = bin_limit(this.minShift, this.depth) + 1;
        const nref = parser.getInt();
        for (let ref = 0; ref < nref; ref++) {

            const binIndex = [];
            const loffset = [];
            const nbin = parser.getInt();
            for (let b = 0; b < nbin; b++) {

                const binNumber = parser.getInt();
                loffset[binNumber] = parser.getVPointer();

                if (binNumber > MAX_BIN) {
                    // This is a psuedo bin, not used but we have to consume the bytes
                    const nchnk = parser.getInt(); // # of chunks for this bin
                    const cs = parser.getVPointer();   // unmapped beg
                    const ce = parser.getVPointer();   // unmapped end
                    const n_maped = parser.getLong()
                    const nUnmapped = parser.getLong()

                } else {

                    binIndex[binNumber] = [];
                    const nchnk = parser.getInt(); // # of chunks for this bin

                    for (let i = 0; i < nchnk; i++) {
                        const cs = parser.getVPointer();    //chunk_beg
                        const ce = parser.getVPointer();    //chunk_end
                        if (cs && ce) {
                            if (cs.block < this.blockMin) {
                                this.blockMin = cs.block;    // Block containing first alignment
                            }
                            if (ce.block > this.blockMax) {
                                this.blockMax = ce.block;
                            }
                            binIndex[binNumber].push([cs, ce]);
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
    }

    /**
     * Fetch blocks for a particular genomic range.  This method is public so it can be unit-tested.
     *
     * @param refId  the sequence dictionary index of the chromosome
     * @param min  genomic start position
     * @param max  genomic end position
     * @param return an array of {minv: {filePointer, offset}, {maxv: {filePointer, offset}}
     */
    blocksForRange(refId, min, max) {

        const ba = this.indices[refId];
        if (!ba) {
            return [];
        } else {
            const overlappingBins = reg2bins(min, max, this.minShift, this.depth);        // List of bin #s that overlap min, max
            if (overlappingBins.length == 0) return [];

            const chunks = [];
            // Find chunks in overlapping bins.  Leaf bins (< 4681) are not pruned
            for (let bin of overlappingBins) {
                if (ba.binIndex[bin]) {
                    const binChunks = ba.binIndex[bin];
                    const nchnk = binChunks.length
                    for (let c = 0; c < nchnk; ++c) {
                        const cs = binChunks[c][0]
                        const ce = binChunks[c][1]
                        chunks.push({minv: cs, maxv: ce, bin: bin});
                    }
                }
            }

            const lowestOffset = ba.loffset[overlappingBins[0]];

            return optimizeChunks(chunks, lowestOffset);
        }

    };


}


/* calculate the list of bins that may overlap with region [beg,end) (zero-based) */
function reg2bins(beg, end, min_shift, depth) {
    let l, t, n, s = min_shift + depth * 3;
    const bins = [];
    for (--end, l = n = t = 0; l <= depth; s -= 3, t += 1 << l * 3, ++l) {
        let b = t + (beg >> s), e = t + (end >> s), i;
        for (i = b; i <= e; ++i) bins[n++] = i;
    }
    return bins;
}

/* calculate maximum bin number -- valid bin numbers range within [0,bin_limit) */
function bin_limit(min_shift, depth) {
    return ((1 << (depth + 1) * 3) - 1) / 7;
}

function optimizeChunks(chunks, lowest) {

    const mergedChunks = []
    let lastChunk = null

    if (chunks.length === 0) return chunks;

    chunks.sort(function (c0, c1) {
        const dif = c0.minv.block - c1.minv.block
        if (dif !== 0) {
            return dif;
        } else {
            return c0.minv.offset - c1.minv.offset;
        }
    });

    chunks.forEach(function (chunk) {

        if (!lowest || chunk.maxv.isGreaterThan(lowest)) {
            if (lastChunk === null) {
                mergedChunks.push(chunk);
                lastChunk = chunk;
            } else {
                if (canMerge(lastChunk, chunk)) {
                    if (chunk.maxv.isGreaterThan(lastChunk.maxv)) {
                        lastChunk.maxv = chunk.maxv;
                    }
                } else {
                    mergedChunks.push(chunk);
                    lastChunk = chunk;
                }
            }
        } else {
            console.log(`skipping chunk ${chunk.minv.block} - ${chunk.maxv.block}`)
        }
    });

    return mergedChunks;
}

function canMerge(chunk1, chunk2) {
    return (chunk2.minv.block - chunk1.maxv.block) < 65000 &&
        (chunk2.maxv.block - chunk1.minv.block) < 5000000;
    // lastChunk.minv.block === lastChunk.maxv.block &&
    // lastChunk.maxv.block === chunk.minv.block &&
    // chunk.minv.block === chunk.maxv.block

}


export default loadCsiIndex;