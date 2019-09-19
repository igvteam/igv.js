// Represents a BAM index.
// Code is based heavily on bam.js, part of the Dalliance Genome Explorer,  (c) Thomas Down 2006-2001.

import BinaryParser from "../binary.js";
import igvxhr from "../igvxhr.js";
import Zlib from "../vendor/zlib_and_gzip.js";
import {buildOptions} from "../util/igvUtils.js";

const BAI_MAGIC = 21578050;
const TABIX_MAGIC = 21578324;
const MAX_HEADER_SIZE = 100000000;   // IF the header is larger than this we can't read it !
const MAX_GZIP_BLOCK_SIZE = (1 << 16);

/**
 * @param indexURL
 * @param config
 * @param tabix
 *
 */
async function loadBamIndex(indexURL, config, tabix, genome) {

    let arrayBuffer = await igvxhr.loadArrayBuffer(indexURL, buildOptions(config))

    const indices = []
    let blockMin = Number.MAX_VALUE,
        blockMax = 0

    if (!arrayBuffer) {
        return;
    }

    if (tabix) {
        const inflate = new Zlib.Gunzip(new Uint8Array(arrayBuffer))
        arrayBuffer = inflate.decompress().buffer;
    }

    const parser = new BinaryParser(new DataView(arrayBuffer));

    const magic = parser.getInt();
    const sequenceIndexMap = {};
    if (magic === BAI_MAGIC || (tabix && magic === TABIX_MAGIC)) {

        const nref = parser.getInt();
        if (tabix) {
            // Tabix header parameters aren't used, but they must be read to advance the pointer
            const format = parser.getInt()
            const col_seq = parser.getInt()
            const col_beg = parser.getInt()
            const col_end = parser.getInt()
            const meta = parser.getInt()
            const skip = parser.getInt()
            const l_nm = parser.getInt()

            for (let i = 0; i < nref; i++) {
                let seq_name = parser.getString();
                // Translate to "official" chr name.
                if (genome) {
                    seq_name = genome.getChromosomeName(seq_name);
                }
                sequenceIndexMap[seq_name] = i;
            }
        }


        for (let ref = 0; ref < nref; ref++) {

            const binIndex = {};
            const linearIndex = [];
            const nbin = parser.getInt();
            for (let b = 0; b < nbin; b++) {

                const binNumber = parser.getInt();

                if (binNumber === 37450) {
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
                            if (cs.block < blockMin) {
                                blockMin = cs.block;    // Block containing first alignment
                            }
                            if (ce.block > blockMax) {
                                blockMax = ce.block;
                            }
                            binIndex[binNumber].push([cs, ce]);
                        }
                    }
                }
            }

            const nintv = parser.getInt();
            for (let i = 0; i < nintv; i++) {
                const cs = parser.getVPointer();
                linearIndex.push(cs);   // Might be null
            }

            if (nbin > 0) {
                indices[ref] = {
                    binIndex: binIndex,
                    linearIndex: linearIndex
                }
            }
        }

    } else {
        throw new Error(indexURL + " is not a " + (tabix ? "tabix" : "bai") + " file");
    }

    return new BamIndex(indices, blockMin, blockMax, sequenceIndexMap, tabix);

}

const BamIndex = function (indices, blockMin, blockMax, sequenceIndexMap, tabix) {
    this.firstAlignmentBlock = blockMin;
    this.lastAlignmentBlock = blockMax;
    this.indices = indices;
    this.sequenceIndexMap = sequenceIndexMap;
    this.tabix = tabix;

};

/**
 * Fetch blocks for a particular genomic range.  This method is public so it can be unit-tested.
 *
 * @param refId  the sequence dictionary index of the chromosome
 * @param min  genomic start position
 * @param max  genomic end position
 * @param return an array of {minv: {filePointer, offset}, {maxv: {filePointer, offset}}
 */
BamIndex.prototype.blocksForRange = function (refId, min, max) {

    const bam = this;
    const ba = bam.indices[refId];

    if (!ba) {
        return [];
    } else {
        const overlappingBins = reg2bins(min, max);        // List of bin #s that overlap min, max
        const chunks = [];

        // Find chunks in overlapping bins.  Leaf bins (< 4681) are not pruned
        overlappingBins.forEach(function (bin) {
            if (ba.binIndex[bin]) {
                const binChunks = ba.binIndex[bin],
                    nchnk = binChunks.length
                for (let c = 0; c < nchnk; ++c) {
                    const cs = binChunks[c][0]
                    const ce = binChunks[c][1]
                    chunks.push({minv: cs, maxv: ce, bin: bin});
                }
            }
        });

        // Use the linear index to find minimum file position of chunks that could contain alignments in the region
        const nintv = ba.linearIndex.length;
        let lowest = null;
        const minLin = Math.min(min >> 14, nintv - 1);
        const maxLin = Math.min(max >> 14, nintv - 1);
        for (let i = minLin; i <= maxLin; ++i) {
            const vp = ba.linearIndex[i];
            if (vp) {
                // todo -- I think, but am not sure, that the values in the linear index have to be in increasing order.  So the first non-null should be minimum
                if (!lowest || vp.isLessThan(lowest)) {
                    lowest = vp;
                }
            }
        }

        return optimizeChunks(chunks, lowest, min, max);
    }

};

function optimizeChunks(chunks, lowest, min, max) {

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

        if (!lowest || chunk.maxv.isGreaterThan(lowest) && chunkCouldOverlapWithRange(chunk, min, max)) {
            if (lastChunk === null) {
                mergedChunks.push(chunk);
                lastChunk = chunk;
            } else {
                if ((chunk.minv.block - lastChunk.maxv.block) < 65000) { // Merge chunks that are withing 65k of each other
                    if (chunk.maxv.isGreaterThan(lastChunk.maxv)) {
                        lastChunk.maxv = chunk.maxv;
                    }
                } else {
                    mergedChunks.push(chunk);
                    lastChunk = chunk;
                }
            }
        }
    });

    return mergedChunks;
}

/**
 * Returns the number of basepairs that a bin spans.
 */
function binSpan(bin) {
    if (bin === 0) {
        return Math.pow(2, 29);
    } else if (1 <= bin && bin <= 8) {
        return Math.pow(2, 26);
    } else if (9 <= bin && bin <= 72) {
        return Math.pow(2, 23);
    } else if (73 <= bin && bin <= 584) {
        return Math.pow(2, 20);
    } else if (585 <= bin && bin <= 4680) {
        return Math.pow(2, 17);
    } else {
        return Math.pow(2, 14);
    }
}

/**
 * Returns the basepairs where a bin's children intersect
 */
function bpsWhereChildrenIntersect(bin) {
    const childSpan = binSpan(bin) / Math.pow(2, 3);
    const numBinsAtLvl = Math.pow(2, 29) / childSpan;
    const numIntersectionPoints = numBinsAtLvl - 1;

    let ret = [];
    let offset = childSpan;
    for (let i = 0; i < numIntersectionPoints; ++i) {
        ret.push(offset);
        offset += childSpan;
    }

    return ret;
}

/**
 * Returns true if the given chunk could overlap with the genomic
 * range [min, max].
 */
function chunkCouldOverlapWithRange(chunk, min, max) {
    // If the chunk begins and ends with a different `coffset`
    // (see bam spec) then it must intersect multiple bgzf
    // blocks. In this case, the uncompressed span cannot be
    // calculated, so pessimistically assume that the chunk
    // *could* overlap with the query range.
    if (chunk.minv.block !== chunk.maxv.block) {
        return true;
    }

    // If the chunk is in a "leaf" bin of the rtree, we
    // pessimistically assume that the chunk *could* overlap with
    // the query range (it's a leaf bin, so it *probably* does
    // intersect the query range anyway).
    if (4681 <= chunk.bin && chunk.bin <= 37448) {
        return true;
    }

    // Because all of the data is in one bgzf block (see above),
    // we can compute the uncompressed span of the chunk
    const uncompressedSize = chunk.maxv.offset - chunk.minv.offset;

    // Assuming *all* of the data in the span is, in fact, purely
    // 4-bit basepairs with no quality scores, tag names,
    // etc. then the theoretical maximum number of base pairs the
    // chunk may contain can be calculated from its size.
    const BPS_IN_BYTE = 2;
    const maxBpsInChunk = BPS_IN_BYTE * uncompressedSize;

    // Because the chunk is in a non-leaf bin (see above) then,
    // logically, it *must* have intersected a child bin. The
    // points within a bin that children intersect are specified
    // in the BAI spec.
    const intersectionPoints = bpsWhereChildrenIntersect(chunk.bin);

    // In the worst possible case, a chunk could represent one
    // read that is `maxBpsInChunk` base pairs away from an
    // intersection point. Therefore, if the queried genomic range
    // is more than `maxBpsInChunk` away from *all* intersection
    // points then the data in the chunk cannot possibly represent
    // something in the query range.
    const queryRangeOverlapsAnRtreeIntersectionPoint =
          intersectionPoints.some(intersectionPoint => {
              const intersectStart = intersectionPoint - maxBpsInChunk;
              const intersectEnd = intersectionPoint + maxBpsInChunk;

              const noOverlap =
                    (chunk.maxv.offset < intersectStart || intersectEnd < chunk.minv.offset);

              return !noOverlap;
          });

    return queryRangeOverlapsAnRtreeIntersectionPoint;
}

/**
 * Calculate the list of bins that overlap with region [beg, end]
 *
 */
function reg2bins(beg, end) {
    const i = 0
    let k
    const list = []
    if (end >= 1 << 29) end = 1 << 29;
    --end;
    list.push(0);
    for (k = 1 + (beg >> 26); k <= 1 + (end >> 26); ++k) list.push(k);
    for (k = 9 + (beg >> 23); k <= 9 + (end >> 23); ++k) list.push(k);
    for (k = 73 + (beg >> 20); k <= 73 + (end >> 20); ++k) list.push(k);
    for (k = 585 + (beg >> 17); k <= 585 + (end >> 17); ++k) list.push(k);
    for (k = 4681 + (beg >> 14); k <= 4681 + (end >> 14); ++k) list.push(k);
    return list;
}

export default loadBamIndex;
