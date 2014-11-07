var igv = (function (igv) {


    const BAI_MAGIC = 21578050;
    const MAX_HEADER_SIZE = 100000000;   // IF the header is larger than this we can't read it !

    /**
     * Read the index.  This method is public to support unit testing.
     * @param continuation
     */
    igv.loadBamIndex = function (indexUrl, continuation) {


        igvxhr.loadArrayBuffer(indexUrl,
            {
                success: function (arrayBuffer) {

                    var indices = [],
                        ba = new Uint8Array(arrayBuffer),
                        p = 0,
                        blockMin = MAX_HEADER_SIZE,
                        baiMagic, blockStart, nbin, nintv, nref, block, i,

                    baiMagic = readInt(ba, p);
                    p += 4;

                    if (baiMagic === BAI_MAGIC) {

                        nref = readInt(ba, p);
                        p += 4;

                        for (var ref = 0; ref < nref; ++ref) {

                            blockStart = p;

                            nbin = readInt(ba, p);
                            p += 4;

                            for (var b = 0; b < nbin; ++b) {

                                var bin = readInt(ba, p);
                                p += 4;

                                var nchnk = readInt(ba, p); // # of chunks for this bin
                                p += 4;

                                // Find the minimum file offset => position of first alignment
                                for(i=0; i<nchnk; i++) {
                                    var cs = readVob(ba, p + i*8);
                                    if(cs && cs.block < blockMin) {
                                        blockMin = cs.block;
                                    }
                                }

                                p += nchnk * 16;
                            }

                            nintv = readInt(ba, p);  // # of intervals
                            p += 4;

                            p += nintv * 8;  // advance pointer to end  for this sequence

                            if (nbin > 0) {
                                // Store index for this sequence as byte array
                                block = new Uint8Array(arrayBuffer, blockStart, p - blockStart);
                                indices[ref] = block;
                            }
                        }

                    } else {
                        // TODO -- throw error
                        console.log("Not a BAI file");
                    }

                    continuation(new igv.BamIndex(indices, blockMin));
                }
            });
    }


    igv.BamIndex = function (indices, headerSize) {
        this.headerSize = headerSize;
        this.indices = indices;

    }

    /**
     * Fetch blocks for a particular genomic range.  This method is public so it can be unit-tested.
     *
     * @param refId  the sequence dictionary index of the chromosome
     * @param min  genomic start position
     * @param max  genomic end position
     * @param continuation
     */
    igv.BamIndex.prototype.blocksForRange = function (refId, min, max, continuation) {

        var bam = this,
            ba = bam.indices[refId],
            ba;

        if (!ba) {
            continuation([]);
        }
        else {

            var intBinsL = reg2bins(min, max);
            var intBins = [];
            for (var i = 0; i < intBinsL.length; ++i) {
                intBins[intBinsL[i]] = true;
            }
            var leafChunks = [],
                otherChunks = [];

            var nbin = readInt(ba, 0);
            var p = 4;
            for (var b = 0; b < nbin; ++b) {
                var bin = readInt(ba, p);
                var nchnk = readInt(ba, p + 4);
                // dlog('bin=' + bin + '; nchnk=' + nchnk);
                p += 8;
                if (intBins[bin]) {
                    for (var c = 0; c < nchnk; ++c) {
                        var cs = readVob(ba, p);
                        var ce = readVob(ba, p + 8);
                        (bin < 4681 ? otherChunks : leafChunks).push({minv: cs, maxv: ce});
                        p += 16;
                    }
                } else {
                    p += (nchnk * 16);
                }
            }

            var nintv = readInt(ba, p);
            var lowest = null;
            var minLin = Math.min(min >> 14, nintv - 1), maxLin = Math.min(max >> 14, nintv - 1);
            for (var i = minLin; i <= maxLin; ++i) {
                var lb = readVob(ba, p + 4 + (i * 8));
                if (!lb) {
                    continue;
                }
                if (!lowest || lb.block < lowest.block || lb.offset < lowest.offset) {
                    lowest = lb;
                }
            }

            var prunedOtherChunks = [];
            if (lowest != null) {
                for (var i = 0; i < otherChunks.length; ++i) {
                    var chnk = otherChunks[i];
                    if (chnk.maxv.block >= lowest.block && chnk.maxv.offset >= lowest.offset) {
                        prunedOtherChunks.push(chnk);
                    }
                }
            }
            otherChunks = prunedOtherChunks;

            var intChunks = [];
            for (var i = 0; i < otherChunks.length; ++i) {
                intChunks.push(otherChunks[i]);
            }
            for (var i = 0; i < leafChunks.length; ++i) {
                intChunks.push(leafChunks[i]);
            }

            intChunks.sort(function (c0, c1) {
                var dif = c0.minv.block - c1.minv.block;
                if (dif != 0) {
                    return dif;
                } else {
                    return c0.minv.offset - c1.minv.offset;
                }
            });
            var mergedChunks = [];
            if (intChunks.length > 0) {
                var cur = intChunks[0];
                for (var i = 1; i < intChunks.length; ++i) {
                    var nc = intChunks[i];
                    if (cur.maxv != null && cur.minv != null && nc.minv.block == cur.maxv.block) { // no point splitting mid-block
                        cur = {minv: cur.minv, maxv: nc.maxv};
                    } else {
                        mergedChunks.push(cur);
                        cur = nc;
                    }
                }
                mergedChunks.push(cur);
            }

            continuation(mergedChunks);
        }

    };


    function Vob(b, o) {
        this.block = b;
        this.offset = o;
    }

    Vob.prototype.toString = function () {
        return '' + this.block + ':' + this.offset;
    }

    function readInt(ba, offset) {
        return (ba[offset + 3] << 24) | (ba[offset + 2] << 16) | (ba[offset + 1] << 8) | (ba[offset]);
    }

    function readShort(ba, offset) {
        return (ba[offset + 1] << 8) | (ba[offset]);
    }

    function readVob(ba, offset) {
        var block = ((ba[offset + 6] & 0xff) * 0x100000000) + ((ba[offset + 5] & 0xff) * 0x1000000) + ((ba[offset + 4] & 0xff) * 0x10000) + ((ba[offset + 3] & 0xff) * 0x100) + ((ba[offset + 2] & 0xff));
        var bint = (ba[offset + 1] << 8) | (ba[offset]);
        if (block == 0 && bint == 0) {
            return null;  // Should only happen in the linear index?
        } else {
            return new Vob(block, bint);
        }
    }

    /**
     * Calculate the list of bins that may overlap with region [beg, end]
     *
     */
    function reg2bins(beg, end) {
        var i = 0, k, list = [];
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