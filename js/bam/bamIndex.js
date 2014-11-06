var igv = (function (igv) {


    var BAI_MAGIC = 21578050;

    /**
     * Read the index.  This method is public to support unit testing.
     * @param continuation
     */
    igv.loadBamIndex = function (indexUrl, continuation) {


        igvxhr.loadArrayBuffer(indexUrl,
            {
                success: function (arrayBuffer) {

                    var indices = [], parser, baiMagic, blockStart, nbin, nintv, ref, nref, block;

                    parser = new igv.BinaryParser(new DataView(arrayBuffer));
                    baiMagic = parser.getInt();

                    if (baiMagic === BAI_MAGIC) {

                        nref = parser.getInt();

                        for (var ref = 0; ref < nref; ++ref) {

                            blockStart = parser.position;

                            nbin = parser.getInt();

                            for (var b = 0; b < nbin; ++b) {

                                var bin = parser.getInt();

                                var nchnk = parser.getInt();  // # of chunks for this bin

                                parser.skip(nchnk * 16);
                            }

                            nintv = parser.getInt();   // # of intervals

                            parser.skip(nintv * 8);  // advance pointer to end  for this sequence

                            if (nbin > 0) {
                                // Store index for this sequence as byte array
                                block = new Uint8Array(arrayBuffer, blockStart, parser.position - blockStart);
                                indices[ref] = block;
                            }
                        }

                    } else {
                        // TODO -- throw error
                        console.log("Not a BAI file");
                    }

                    continuation(new igv.BamIndex(indices));
                }
            });
    }



    igv.BamIndex = function(indices) {

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

        var bam = this;

        if (!this.indices) {
            this.readIndex(function () {
                blocksForRange(bam);
            });
        }
        else {
            blocksForRange(bam);
        }

        function blocksForRange(bam) {

            var index = bam.indices[refId];
            if (!index) {
                continuation([]);
            }
            else {

                var intBinsL = reg2bins(min, max);
                var intBins = [];
                for (var i = 0; i < intBinsL.length; ++i) {
                    intBins[intBinsL[i]] = true;
                }
                var leafChunks = [], otherChunks = [];

                var nbin = readInt(index, 0);
                var p = 4;
                for (var b = 0; b < nbin; ++b) {
                    var bin = readInt(index, p);
                    var nchnk = readInt(index, p + 4);
                    // dlog('bin=' + bin + '; nchnk=' + nchnk);
                    p += 8;
                    if (intBins[bin]) {
                        for (var c = 0; c < nchnk; ++c) {
                            var cs = readVob(index, p);
                            var ce = readVob(index, p + 8);
                            (bin < 4681 ? otherChunks : leafChunks).push({minv: cs, maxv: ce});
                            p += 16;
                        }
                    } else {
                        p += (nchnk * 16);
                    }
                }

                var nintv = readInt(index, p);
                var lowest = null;
                var minLin = Math.min(min >> 14, nintv - 1), maxLin = Math.min(max >> 14, nintv - 1);
                for (var i = minLin; i <= maxLin; ++i) {
                    var lb = readVob(index, p + 4 + (i * 8));
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
        }
    };

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