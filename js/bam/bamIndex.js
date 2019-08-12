// Represents a BAM index.
// Code is based heavily on bam.js, part of the Dalliance Genome Explorer,  (c) Thomas Down 2006-2001.

import BinaryParser from "../binary";
import igvxhr from "../igvxhr";
import Zlib from "../../vendor/zlib_and_gzip";
import {buildOptions} from "../util/igvUtils";

const BAI_MAGIC = 21578050;
const TABIX_MAGIC = 21578324;
const MAX_HEADER_SIZE = 100000000;   // IF the header is larger than this we can't read it !
const MAX_GZIP_BLOCK_SIZE = (1 << 16);

/**
 * @param indexURL
 * @param config
 * @param tabix
 *
 * @returns a Promised for the bam or tabix index.  The fulfill function takes the index as an argument.
 */
async function loadBamIndex(indexURL, config, tabix, genome) {

    let arrayBuffer = await igvxhr.loadArrayBuffer(indexURL, buildOptions(config))

    var indices = [],
        magic, nbin, nintv, nref, parser,
        blockMin = Number.MAX_VALUE,
        blockMax = 0,
        binIndex, linearIndex, binNumber, cs, ce, b, i, ref, sequenceIndexMap;

    if (!arrayBuffer) {
        fullfill(null);
        return;
    }

    if (tabix) {
        var inflate = new Zlib.Gunzip(new Uint8Array(arrayBuffer));
        arrayBuffer = inflate.decompress().buffer;
    }

    parser = new BinaryParser(new DataView(arrayBuffer));

    magic = parser.getInt();

    if (magic === BAI_MAGIC || (tabix && magic === TABIX_MAGIC)) {

        nref = parser.getInt();

        if (tabix) {
            // Tabix header parameters aren't used, but they must be read to advance the pointer
            var format = parser.getInt();
            var col_seq = parser.getInt();
            var col_beg = parser.getInt();
            var col_end = parser.getInt();
            var meta = parser.getInt();
            var skip = parser.getInt();
            var l_nm = parser.getInt();

            sequenceIndexMap = {};
            for (i = 0; i < nref; i++) {
                var seq_name = parser.getString();

                // Translate to "official" chr name.
                if (genome) {
                    seq_name = genome.getChromosomeName(seq_name);
                }

                sequenceIndexMap[seq_name] = i;
            }
        }

        for (ref = 0; ref < nref; ref++) {

            binIndex = {};
            linearIndex = [];

            nbin = parser.getInt();

            for (b = 0; b < nbin; b++) {

                binNumber = parser.getInt();

                if (binNumber === 37450) {
                    // This is a psuedo bin, not used but we have to consume the bytes
                    nchnk = parser.getInt(); // # of chunks for this bin
                    cs = parser.getVPointer();   // unmapped beg
                    ce = parser.getVPointer();   // unmapped end
                    var n_maped = parser.getLong();
                    var nUnmapped = parser.getLong();

                } else {

                    binIndex[binNumber] = [];
                    var nchnk = parser.getInt(); // # of chunks for this bin

                    for (i = 0; i < nchnk; i++) {
                        cs = parser.getVPointer();    //chunk_beg
                        ce = parser.getVPointer();    //chunk_end
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


            nintv = parser.getInt();
            for (i = 0; i < nintv; i++) {
                cs = parser.getVPointer();
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

    var bam = this,
        ba = bam.indices[refId],
        overlappingBins,
        chunks,
        nintv,
        lowest,
        minLin,
        maxLin,
        vp,
        i;


    if (!ba) {
        return [];
    } else {

        overlappingBins = reg2bins(min, max);        // List of bin #s that overlap min, max
        chunks = [];

        // Find chunks in overlapping bins.  Leaf bins (< 4681) are not pruned
        overlappingBins.forEach(function (bin) {
            if (ba.binIndex[bin]) {
                var binChunks = ba.binIndex[bin],
                    nchnk = binChunks.length;
                for (var c = 0; c < nchnk; ++c) {
                    var cs = binChunks[c][0];
                    var ce = binChunks[c][1];
                    chunks.push({minv: cs, maxv: ce, bin: bin});
                }
            }
        });

        // Use the linear index to find minimum file position of chunks that could contain alignments in the region
        nintv = ba.linearIndex.length;
        lowest = null;
        minLin = Math.min(min >> 14, nintv - 1);
        maxLin = Math.min(max >> 14, nintv - 1);
        for (i = minLin; i <= maxLin; ++i) {
            vp = ba.linearIndex[i];
            if (vp) {
                // todo -- I think, but am not sure, that the values in the linear index have to be in increasing order.  So the first non-null should be minimum
                if (!lowest || vp.isLessThan(lowest)) {
                    lowest = vp;
                }
            }
        }

        return optimizeChunks(chunks, lowest);
    }

};

function optimizeChunks(chunks, lowest) {

    var mergedChunks = [],
        lastChunk = null;

    if (chunks.length === 0) return chunks;

    chunks.sort(function (c0, c1) {
        var dif = c0.minv.block - c1.minv.block;
        if (dif != 0) {
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
 * Calculate the list of bins that overlap with region [beg, end]
 *
 */
function reg2bins(beg, end) {
    var i = 0, k, list = [];
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