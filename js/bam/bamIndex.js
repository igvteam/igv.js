// Represents a BAM index.
// Code is based heavily on bam.js, part of the Dalliance Genome Explorer,  (c) Thomas Down 2006-2001.

var igv = (function (igv) {


    const BAI_MAGIC = 21578050;
    const TABIX_MAGIC = 21578324;
    const MAX_HEADER_SIZE = 100000000;   // IF the header is larger than this we can't read it !

    /**
     * Read the index.  This method is public to support unit testing.
     * @param continuation
     */
    igv.loadBamIndex = function (indexUrl, config, continuation, tabix) {


        igvxhr.loadArrayBuffer(indexUrl,
            {
                headers: config.headers,
                success: function (arrayBuffer) {

                    var indices = [],
                        ba = new Uint8Array(arrayBuffer),
                        p = 0,
                        blockMin = MAX_HEADER_SIZE,
                        magic, blockStart, nbin, nintv, nref, block, i;

                    if (tabix) {
                        var inflate = new Zlib.Gunzip(new Uint8Array(ba));
                        ba = inflate.decompress();
                    }

                    magic = readInt(ba, p);
                    p += 4;

                    if (magic === BAI_MAGIC || (tabix && magic === TABIX_MAGIC)) {

                        nref = readInt(ba, p);
                        p += 4;


                        if (tabix) {
                            var format = readInt(ba, p);
                            p += 4;
                            var col_seq = readInt(ba, p);
                            p += 4;
                            var col_beg = readInt(ba, p);
                            p += 4;
                            var col_end = readInt(ba, p);
                            p += 4;
                            var meta = readInt(ba, p);
                            p += 4;
                            var skip = readInt(ba, p);
                            p += 4;
                            var l_nm = readInt(ba, p);
                            p += 4;

                            while (l_nm > 0) {
                                var seq_name = readString(ba, p);
                                p += seq_name.length + 1;
                                l_nm -= (seq_name.length + 1);
                            }
                        }

                        for (var ref = 0; ref < nref; ++ref) {

                            var binIndex = {},
                                linearIndex = [];

                            blockStart = p;

                            nbin = readInt(ba, p);
                            p += 4;

                            for (var b = 0; b < nbin; ++b) {

                                var binNumber = readInt(ba, p);
                                p += 4;

                                binIndex[binNumber] = [];

                                var nchnk = readInt(ba, p); // # of chunks for this bin
                                p += 4;

                                // Find the minimum file offset => position of block containing first alignment
                                for (i = 0; i < nchnk; i++) {
                                    var cs = readVob(ba, p);
                                    p += 8;
                                    var ce = readVob(ba, p);
                                    p += 8;

                                    if (cs && ce) {
                                        if (cs.block < blockMin) {
                                            blockMin = cs.block;
                                        }
                                        binIndex[binNumber].push([cs, ce]);
                                    }
                                }
                            }


                            nintv = readInt(ba, p);  // # of intervals
                            p += 4;

                            for (i = 0; i < nintv; i++) {
                                cs = readVob(ba, p);
                                p += 8;
                                linearIndex.push(cs);   // Might be null

                            }

                            if (nbin > 0) {
                                // Store index for this sequence as byte array
                                indices[ref] = {
                                    binIndex: binIndex,
                                    linearIndex: linearIndex
                                }
                            }
                        }

                    } else {
                        throw new Error(indexUrl + " is not a " + (tabix ? "tabix" : "bai") + " file");
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
            ba = bam.indices[refId];

        if (!ba) {
            continuation([]);
        }
        else {

            var intBinsL = reg2bins(min, max);        // List of bin #s that might overlap min, max
            var leafChunks = [],
                otherChunks = [];


            intBinsL.forEach(function (bin) {

                if(ba.binIndex[bin]) {
                    var chunks = ba.binIndex[bin],
                        nchnk = chunks.length;

                    for (var c = 0; c < nchnk; ++c) {
                        var cs = chunks[c][0];
                        var ce = chunks[c][1];
                        (bin < 4681 ? otherChunks : leafChunks).push({minv: cs, maxv: ce});
                    }

                }
            });

            var nintv = ba.linearIndex.length;
            var lowest = null;
            var minLin = Math.min(min >> 14, nintv - 1), maxLin = Math.min(max >> 14, nintv - 1);
            for (var i = minLin; i <= maxLin; ++i) {
                var lb = ba.linearIndex[i];
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

    function readString(ba, offset) {

        var s = "";
        var c;
        while ((c = ba[offset++]) != 0) {
            s += String.fromCharCode(c);
        }
        return s;

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