// Represents a BAM index.
// Code is based heavily on bam.js, part of the Dalliance Genome Explorer,  (c) Thomas Down 2006-2001.

var igv = (function (igv) {


    const BAI_MAGIC = 21578050;
    const TABIX_MAGIC = 21578324;
    const MAX_HEADER_SIZE = 100000000;   // IF the header is larger than this we can't read it !
    const MAX_GZIP_BLOCK_SIZE = (1 << 16);

    /**
     * Read the index.  This method is public to support unit testing.
     * @param continuation
     */
    igv.loadBamIndex = function (indexURL, config, continuation, tabix) {

        var genome = igv.browser ? igv.browser.genome : null;

        igvxhr.loadArrayBuffer(indexURL,
            {
                headers: config.headers,
                success: function (arrayBuffer) {

                    var indices = [],
                        magic, nbin, nintv, nref, parser,
                        blockMin = Number.MAX_VALUE,
                        blockMax = 0,
                        binIndex, linearIndex, binNumber, cs, ce, b, i, ref, sequenceIndexMap;

                    if(!arrayBuffer) {
                        continuation(null);
                        return;
                    }

                    if (tabix) {
                        var inflate = new Zlib.Gunzip(new Uint8Array(arrayBuffer));
                        arrayBuffer = inflate.decompress().buffer;
                    }

                    parser = new igv.BinaryParser(new DataView(arrayBuffer));

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
                                if(genome) seq_name = genome.getChromosomeName(seq_name);

                                sequenceIndexMap[seq_name] = i;
                            }
                        }

                        for (ref = 0; ref < nref; ++ref) {

                            binIndex = {};
                            linearIndex = [];

                            nbin = parser.getInt();

                            for (b = 0; b < nbin; ++b) {

                                binNumber = parser.getInt();
                                binIndex[binNumber] = [];

                                var nchnk = parser.getInt(); // # of chunks for this bin

                                for (i = 0; i < nchnk; i++) {
                                    cs = parser.getVPointer();
                                    ce = parser.getVPointer();
                                    if (cs && ce) {
                                        if (cs.block < blockMin) {
                                            blockMin = cs.block;    // Block containing first alignment
                                        }
                                        if(ce.block > blockMax) {
                                            blockMax = ce.block;
                                        }
                                        binIndex[binNumber].push([cs, ce]);
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
//console.log("Block max =" + blockMax);
                    continuation(new igv.BamIndex(indices, blockMin, blockMax, sequenceIndexMap, tabix));
                }
            });
    }


    igv.BamIndex = function (indices, headerSize, blockMax, sequenceIndexMap, tabix) {
        this.headerSize = headerSize;
        this.indices = indices;
        this.sequenceIndexMap = sequenceIndexMap;
        this.tabix = tabix;
        this.blockMax = blockMax;

    }

    /**
     * Fetch blocks for a particular genomic range.  This method is public so it can be unit-tested.
     *
     * @param refId  the sequence dictionary index of the chromosome
     * @param min  genomic start position
     * @param max  genomic end position
     * @param return an array of {minv: {filePointer, offset}, {maxv: {filePointer, offset}}
     */
    igv.BamIndex.prototype.blocksForRange = function (refId, min, max) {

        var bam = this,
            ba = bam.indices[refId],
            overlappingBins,
            leafChunks,
            otherChunks,
            nintv,
            lowest,
            minLin,
            lb,
            prunedOtherChunks,
            i,
            chnk,
            dif,
            intChunks,
            mergedChunks;

        if (!ba) {
            return [];
        }
        else {

            overlappingBins = reg2bins(min, max);        // List of bin #s that might overlap min, max
            leafChunks = [];
            otherChunks = [];


            overlappingBins.forEach(function (bin) {

                if (ba.binIndex[bin]) {
                    var chunks = ba.binIndex[bin],
                        nchnk = chunks.length;

                    for (var c = 0; c < nchnk; ++c) {
                        var cs = chunks[c][0];
                        var ce = chunks[c][1];
                        (bin < 4681 ? otherChunks : leafChunks).push({minv: cs, maxv: ce, bin: bin});
                    }

                }
            });

            // Use the linear index to find the lowest block that could contain alignments in the region
            nintv = ba.linearIndex.length;
            lowest = null;
            minLin = Math.min(min >> 14, nintv - 1), maxLin = Math.min(max >> 14, nintv - 1);
            for (i = minLin; i <= maxLin; ++i) {
                lb = ba.linearIndex[i];
                if (!lb) {
                    continue;
                }
                if (!lowest || lb.block < lowest.block || lb.offset < lowest.offset) {
                    lowest = lb;
                }
            }

            // Prune chunks that end before the lowest block
            prunedOtherChunks = [];
            if (lowest != null) {
                for (i = 0; i < otherChunks.length; ++i) {
                    chnk = otherChunks[i];
                    if (chnk.maxv.block >= lowest.block && chnk.maxv.offset >= lowest.offset) {
                        prunedOtherChunks.push(chnk);
                    }
                }
            }

            intChunks = [];
            for (i = 0; i < prunedOtherChunks.length; ++i) {
                intChunks.push(prunedOtherChunks[i]);
            }
            for (i = 0; i < leafChunks.length; ++i) {
                intChunks.push(leafChunks[i]);
            }

            intChunks.sort(function (c0, c1) {
                dif = c0.minv.block - c1.minv.block;
                if (dif != 0) {
                    return dif;
                } else {
                    return c0.minv.offset - c1.minv.offset;
                }
            });

            mergedChunks = [];
            if (intChunks.length > 0) {
                var cur = intChunks[0];
                for (var i = 1; i < intChunks.length; ++i) {
                    var nc = intChunks[i];
                    if ((nc.minv.block - cur.maxv.block) < 65000) { // Merge blocks that are withing 65k of each other
                        cur = {minv: cur.minv, maxv: nc.maxv};
                    } else {
                        mergedChunks.push(cur);
                        cur = nc;
                    }
                }
                mergedChunks.push(cur);
            }
            return mergedChunks;
        }

    };


    /**
     * Calculate the list of bins that may overlap with region [beg, end]
     *
     */
    function reg2bins(beg, end) {
        var i = 0, k, list = [];
        if (end >= 1 << 29)   end = 1 << 29;
        --end;
        list.push(0);
        for (k = 1 + (beg >> 26); k <= 1 + (end >> 26); ++k) list.push(k);
        for (k = 9 + (beg >> 23); k <= 9 + (end >> 23); ++k) list.push(k);
        for (k = 73 + (beg >> 20); k <= 73 + (end >> 20); ++k) list.push(k);
        for (k = 585 + (beg >> 17); k <= 585 + (end >> 17); ++k) list.push(k);
        for (k = 4681 + (beg >> 14); k <= 4681 + (end >> 14); ++k) list.push(k);
        return list;
    }


    return igv;

})(igv || {});