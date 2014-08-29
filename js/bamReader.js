// Represents a BAM file.
// Code is based heavily on bam.js, part of the Dalliance Genome Explorer,  (c) Thomas Down 2006-2001.

var igv = (function (igv) {

    var BAM_MAGIC = 21840194;
    var BAI_MAGIC = 21578050;
    var SECRET_DECODER = ['=', 'A', 'C', 'x', 'G', 'x', 'x', 'x', 'T', 'x', 'x', 'x', 'x', 'x', 'x', 'N'];
    var CIGAR_DECODER = ['M', 'I', 'D', 'N', 'S', 'H', 'P', '=', 'X', '?', '?', '?', '?', '?', '?', '?'];
    var READ_PAIRED_FLAG = 0x1;
    var PROPER_PAIR_FLAG = 0x2;
    var READ_UNMAPPED_FLAG = 0x4;
    var MATE_UNMAPPED_FLAG = 0x8;
    var READ_STRAND_FLAG = 0x10;
    var MATE_STRAND_FLAG = 0x20;
    var FIRST_OF_PAIR_FLAG = 0x40;
    var SECOND_OF_PAIR_FLAG = 0x80;
    var NOT_PRIMARY_ALIGNMENT_FLAG = 0x100;
    var READ_FAILS_VENDOR_QUALITY_CHECK_FLAG = 0x200;
    var DUPLICATE_READ_FLAG = 0x400;
    var SUPPLEMENTARY_ALIGNMENT_FLAG = 0x800;


    /**
     * Class for reading a bam file
     *
     * @param bamPath
     * @param baiPath
     * @constructor
     */
    igv.BamReader = function (bamPath, baiPath) {

        this.bamPath = bamPath;
        this.baiPath = baiPath || (bamPath + ".bai");
        // Todo - deal with Picard convention.  WHY DOES THERE HAVE TO BE 2?

    };

    /**
     * Read the index.  This method is public to support unit testing.
     * @param continuation
     */
    igv.BamReader.prototype.readIndex = function (continuation) {

        var bam = this;

        var dataLoader = new igv.DataLoader(this.baiPath);

        dataLoader.loadArrayBuffer(function (arrayBuffer) {

            var uncba = new Uint8Array(arrayBuffer);

            var baiMagic = readInt(uncba, 0);
            if (baiMagic === BAI_MAGIC) {

                var nref = readInt(uncba, 4);

                bam.indices = [];

                var p = 8;
                for (var ref = 0; ref < nref; ++ref) {
                    var blockStart = p;
                    var nbin = readInt(uncba, p);
                    p += 4;
                    for (var b = 0; b < nbin; ++b) {
                        var bin = readInt(uncba, p);
                        var nchnk = readInt(uncba, p + 4);
                        p += 8 + (nchnk * 16);
                    }
                    var nintv = readInt(uncba, p);
                    p += 4;
                    p += (nintv * 8);
                    if (nbin > 0) {
                        bam.indices[ref] = new Uint8Array(arrayBuffer, blockStart, p - blockStart);
                    }
                }

            } else {
                // TODO -- throw error
                console.log("Not a BAI file");
            }

            continuation();
        });

    };

    /**
     * Read the bam header.  This function is public to support unit testing
     * @param continuation
     */
    igv.BamReader.prototype.readHeader = function (continuation) {

        if (this.contentLength) {
            readHeader(this);
        }
        else {
            // Gen the content length first, so we don't try to read beyond the end of the file
            readContentLength(this);
        }

        function readContentLength(bam) {
            var loader = new igv.DataLoader(bam.bamPath);
            loader.onerror = function () {
                bam.contentLength = -1;
            }
            loader.loadHeader(function (header) {
                var contentLengthString = header ? header["Content-Length"] : null;
                if (contentLengthString) {
                    bam.contentLength = parseInt(contentLengthString);
                }
                else {
                    bam.contentLength = -1;
                }

                if (!bam.contentLength) bam.contentLength = -1; //Protect against inf loop
                readHeader(bam);

            });
        }

        function readHeader(bam) {

            var dataLoader = new igv.DataLoader(bam.bamPath);

            // Fetch some bytes for the header.  TODO -- if we need more we'll have to fetch again
            var len = 10000;
            if (bam.contentLength && bam.contentLength > 0) len = Math.min(len, bam.contentLength);
            dataLoader.range = {start: 0, size: 10000};

            dataLoader.loadArrayBuffer(function (compressedBuffer) {

                var unc = unbgzf(compressedBuffer);
                var uncba = new Uint8Array(unc);
                var magic = readInt(uncba, 0);
                var headLen = readInt(uncba, 4);
                var header = '';
                for (var i = 0; i < headLen; ++i) {
                    header += String.fromCharCode(uncba[i + 8]);
                }

                var nRef = readInt(uncba, headLen + 8);
                var p = headLen + 12;

                bam.chrToIndex = {};
                bam.indexToChr = [];
                for (var i = 0; i < nRef; ++i) {
                    var lName = readInt(uncba, p);
                    var name = '';
                    for (var j = 0; j < lName - 1; ++j) {
                        name += String.fromCharCode(uncba[p + 4 + j]);
                    }
                    var lRef = readInt(uncba, p + lName + 4);
                    //dlog(name + ': ' + lRef);
                    bam.chrToIndex[name] = i;
                    if (name.indexOf('chr') == 0) {
                        bam.chrToIndex[name.substring(3)] = i;
                    } else {
                        bam.chrToIndex['chr' + name] = i;
                    }
                    bam.indexToChr.push(name);

                    p = p + 8 + lName;
                }

                continuation();

            });
        }

    };

    /**
     * Fetch blocks for a particular genomic range.  This method is public so it can be unit-tested.
     *
     * @param refId  the sequence dictionary index of the chromosome
     * @param min  genomic start position
     * @param max  genomic end position
     * @param continuation
     */
    igv.BamReader.prototype.blocksForRange = function (refId, min, max, continuation) {

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
                            (bin < 4681 ? otherChunks : leafChunks).push(new Chunk(cs, ce));
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
                        if(cur.maxv != null && cur.minv != null && nc.minv.block == cur.maxv.block) { // no point splitting mid-block
                            cur = new Chunk(cur.minv, nc.maxv);
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

    igv.BamReader.prototype.readAlignments = function (chr, min, max, continuation, task) {

        var bam = this;

        if (!this.chrToIndex) {
            bam.readHeader(function () {
                read();
            })
        }
        else {
            read();
        }

        function read() {
            var chrId = bam.chrToIndex[chr];
            var chunks;
            if (chrId === undefined) {
                if(chr.startsWith("chr")) chr = chr.substr(3);
                else chr = "chr" + chr;
                chrId = bam.chrToIndex[chr];
            }
            if (chrId === undefined) {
                chunks = [];
            }else {

                bam.blocksForRange(chrId, min, max, function (chunks) {

                    if (!chunks) {
                        continuation(null, 'Error in index fetch');
                    }


                    var records = [];
                    var index = 0;
                    tramp();

                    function tramp() {
                        if (index >= chunks.length) {

                            // If we have combined multiple chunks sort records by start position.  I'm not sure this is neccessary
                            if (index > 1 && records.length > 1) {
                                records.sort(function (a, b) {
                                    return a.start - b.start;
                                });
                            }

                            continuation(records);
                        } else {
                            var c = chunks[index];
                            var fetchMin = c.minv.block;
                            var fetchMax = c.maxv.block + (1 << 16); // *sigh*

                            var dataLoader = new igv.DataLoader(bam.bamPath);
                            dataLoader.range = {start: fetchMin, size: fetchMax - fetchMin + 1};
                            dataLoader.loadArrayBuffer(function (compressed) {

                                var ba = new Uint8Array(unbgzf(compressed, c.maxv.block - c.minv.block + 1));
//                                console.log("Decode");
                                decodeBamRecords(ba, chunks[index].minv.offset, records, min, max, chrId);
                                ++index;


                                return tramp();
                            },
                            task);

                        }
                    }
                });
            }
        }


        function decodeBamRecords(ba, offset, records, min, max, chrId) {

            var blockSize,
                blockEnd,
                record,
                refID,
                pos,
                bmn,
                bin,
                mq,
                nl,
                flag_nc,
                flag,
                nc,
                lseq,
                nextRef,
                nextPos,
                tlen,
                readName,
                j,
                p,
                lengthOnRef,
                cigar,
                c,
                cigarArray,
                seq,
                seqBytes,
                qseq;

            while (true) {

                blockSize = readInt(ba, offset);
                blockEnd = offset + blockSize + 4;

                if (blockEnd >= ba.length) {
                    return;
                }

                record = {};

                refID = readInt(ba, offset + 4);
                pos = readInt(ba, offset + 8);

                if (refID > chrId || pos > max) return;  // We've gone off the right edge => we're done
                else if (refID < chrId) continue;    // Not sure this is possible

                bmn = readInt(ba, offset + 12);
                bin = (bmn & 0xffff0000) >> 16;
                mq = (bmn & 0xff00) >> 8;
                nl = bmn & 0xff;

                flag_nc = readInt(ba, offset + 16);
                flag = (flag_nc & 0xffff0000) >> 16;
                nc = flag_nc & 0xffff;

                record.strand = !(flag & READ_STRAND_FLAG);

                lseq = readInt(ba, offset + 20);

                nextRef = readInt(ba, offset + 24);
                nextPos = readInt(ba, offset + 28);
                tlen = readInt(ba, offset + 32);

                readName = '';
                for (j = 0; j < nl - 1; ++j) {
                    readName += String.fromCharCode(ba[offset + 36 + j]);
                }

                p = offset + 36 + nl;

                lengthOnRef = 0;
                cigar = '';

                /**
                 * @param cigarette CIGAR element (operator + length) encoded as an unsigned int.
                 * @return Object representation of the CIGAR element.
                 */
                    //private static CigarElement binaryCigarToCigarElement(final int cigarette) {
                    //    final int binaryOp = cigarette & 0xf;
                    //    final int length = cigarette >> 4;
                    //    return new CigarElement(length, CigarOperator.binaryToEnum(binaryOp));
                    //}

                cigarArray = [];
                for (c = 0; c < nc; ++c) {
                    var cigop = readInt(ba, p);
                    var opLen = (cigop >> 4);
                    var opLtr = CIGAR_DECODER[cigop & 0xf];
                    if (opLtr == 'M' || opLtr == 'EQ' || opLtr == 'X' || opLtr == 'D' || opLtr == 'N' || opLtr == '=')
                        lengthOnRef += opLen;
                    cigar = cigar + opLen + opLtr;
                    p += 4;

                    cigarArray.push({len: opLen, ltr: opLtr});
                }
                record.cigar = cigar;
                record.lengthOnRef = lengthOnRef;

                if (record.start + record.lengthOnRef < min) continue;  // Record out-of-range "to the left", skip to next one


                seq = '';
                seqBytes = (lseq + 1) >> 1;
                for (j = 0; j < seqBytes; ++j) {
                    var sb = ba[p + j];
                    seq += SECRET_DECODER[(sb & 0xf0) >> 4];
                    seq += SECRET_DECODER[(sb & 0x0f)];
                }
                seq = seq.substring(0, lseq);  // seq might have one extra character (if lseq is an odd number)

                p += seqBytes;
                record.seq = seq;

                qseq = '';
                for (j = 0; j < lseq; ++j) {
                    qseq += String.fromCharCode(ba[p + j]);
                }
                p += lseq;

                record.qual = qseq;
                record.start = pos;
                record.mq = mq;
                record.readName = readName;
                record.chr = bam.indexToChr[refID];

                while (p < blockEnd) {
                    var tag = String.fromCharCode(ba[p]) + String.fromCharCode(ba[p + 1]);
                    var type = String.fromCharCode(ba[p + 2]);
                    var value;

                    if (type == 'A') {
                        value = String.fromCharCode(ba[p + 3]);
                        p += 4;
                    } else if (type == 'i' || type == 'I') {
                        value = readInt(ba, p + 3);
                        p += 7;
                    } else if (type == 'c' || type == 'C') {
                        value = ba[p + 3];
                        p += 4;
                    } else if (type == 's' || type == 'S') {
                        value = readShort(ba, p + 3);
                        p += 5;
                    } else if (type == 'f') {
                        throw 'FIXME need floats';
                    } else if (type == 'Z') {
                        p += 3;
                        value = '';
                        for (; ;) {
                            var cc = ba[p++];
                            if (cc == 0) {
                                break;
                            } else {
                                value += String.fromCharCode(cc);
                            }
                        }
                    } else {
                        throw 'Unknown type ' + type;
                    }
                    record[tag] = value;
                }

                if (!min || record.start <= max && record.start + record.lengthOnRef >= min) {
                    if (chrId === undefined || refID == chrId) {
                        record.blocks = makeBlocks(record, cigarArray);
                        records.push(record);
                    }
                }
                offset = blockEnd;
            }
            // Exits via top of loop.
        }

        /**
         * Split the alignment record into blocks as specified in the cigarArray.  Each aligned block contains
         * its portion of the read sequence and base quality strings.  A read sequence or base quality string
         * of "*" indicates the value is not recorded.  In all other cases the length of the block sequence (block.seq)
         * and quality string (block.qual) must == the block length.
         *
         * NOTE: Insertions are not yet treated // TODO
         *
         * @param record
         * @param cigarArray
         * @returns array of blocks
         */
        function makeBlocks(record, cigarArray) {


            var blocks = [],
                seqOffset = 0,
                pos = record.start,
                len = cigarArray.length,
                blockSeq,
                blockQuals;

            for (var i = 0; i < len; i++) {

                var c = cigarArray[i];

                switch (c.ltr) {
                    case 'H' :
                        break; // ignore hard clips
                    case 'P' :
                        break; // ignore pads
                    case 'S' :
                        seqOffset += c.len;
                        break; // soft clip read bases
                    case 'N' :
                        pos += c.len;
                        break;  // reference skip
                    case 'D' :
                        pos += c.len;
                        break;
                    case 'I' :
                        seqOffset += c.len;
                        break;
                    case 'M' :
                    case 'EQ' :
                    case '=' :
                    case 'X' :
                        blockSeq = record.seq === "*" ? "*" : record.seq.substr(seqOffset, c.len);
                        blockQuals = record.qual === "*" ? "*" : record.qual.substr(seqOffset, c.len);
                        blocks.push({start: pos, len: c.len, seq: blockSeq, qual: blockQuals});
                        seqOffset += c.len;
                        pos += c.len;
                        break;
                    default :
                        console.log("Error processing cigar element: " + c.len + c.ltr);
                }
            }

            return blocks;

        }

    }

    function Vob(b, o) {
        this.block = b;
        this.offset = o;
    }

    Vob.prototype.toString = function () {
        return '' + this.block + ':' + this.offset;
    }

    function Chunk(minv, maxv) {
        this.minv = minv;
        this.maxv = maxv;
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

    function unbgzf(data, lim) {
        lim = Math.min(lim || 1, data.byteLength - 100);
        var oBlockList = [];
        var ptr = [0];
        var totalSize = 0;

        while (ptr[0] < lim) {
            var ba = new Uint8Array(data, ptr[0], 100); // FIXME is this enough for all credible BGZF block headers?
            var xlen = (ba[11] << 8) | (ba[10]);
            // dlog('xlen[' + (ptr[0]) +']=' + xlen);
            var unc = jszlib_inflate_buffer(data, 12 + xlen + ptr[0], Math.min(65536, data.byteLength - 12 - xlen - ptr[0]), ptr);
            ptr[0] += 8;
            totalSize += unc.byteLength;
            oBlockList.push(unc);
        }

        if (oBlockList.length == 1) {
            return oBlockList[0];
        } else {
            var out = new Uint8Array(totalSize);
            var cursor = 0;
            for (var i = 0; i < oBlockList.length; ++i) {
                var b = new Uint8Array(oBlockList[i]);
                arrayCopy(b, 0, out, cursor, b.length);
                cursor += b.length;
            }
            return out.buffer;
        }
    }

    /* calculate the list of bins that may overlap with region [beg,end) (zero-based) */
    var MAX_BIN = (((1 << 18) - 1) / 7);

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


