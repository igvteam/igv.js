
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
    igv.BamReader = function (config) {

        this.config = config;
        this.bamPath = config.url;
        this.baiPath = config.indexUrl || (this.bamPath + ".bai"); // Todo - deal with Picard convention.  WHY DOES THERE HAVE TO BE 2?
        this.headPath = config.headUrl || this.bamPath;

    };

    /**
     * Read the bam header.  This function is public to support unit testing
     * @param continuation
     */
    igv.BamReader.prototype.readHeader = function (continuation) {

        var bam = this;

        getContentLength(bam, function (contentLength) {


            var len = bam.index.headerSize + 64000;   // Insure we get the complete compressed block containing the header

            if (contentLength > 0) len = Math.min(contentLength, len);

            igvxhr.loadArrayBuffer(bam.bamPath,
                {
                    headers: bam.config.headers,

                    range: {start: 0, size: len},

                    success: function (compressedBuffer) {

                        var unc = igv.unbgzf(compressedBuffer, len);

                        var uncba = new Uint8Array(unc);

                        var magic = readInt(uncba, 0);
                        var samHeaderLen = readInt(uncba, 4);
                        var samHeader = '';
                        for (var i = 0; i < samHeaderLen; ++i) {
                            samHeader += String.fromCharCode(uncba[i + 8]);
                        }

                        var nRef = readInt(uncba, samHeaderLen + 8);
                        var p = samHeaderLen + 12;

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
                            bam.indexToChr.push(name);

                            p = p + 8 + lName;
                        }

                        continuation();

                    }
                });

        });
    }

    igv.BamReader.prototype.readAlignments = function (chr, min, max, continuation, task) {

        var bam = this;

        getChrIndex(this, function (chrToIndex) {

            var chrId = chrToIndex[chr];
            var chunks;
            if (chrId === undefined) {
                if (chr.startsWith("chr")) chr = chr.substr(3);
                else chr = "chr" + chr;
                chrId = bam.chrToIndex[chr];
            }
            if (chrId === undefined) {
                continuation([]);
            } else {

                getIndex(bam, function (index) {

                    index.blocksForRange(chrId, min, max, function (chunks) {

                        if (!chunks) {
                            continuation(null, 'Error in index fetch');
                        }


                        var records = [];
                        loadNextChunk(0);

                        function loadNextChunk(index) {

                            var c = chunks[index];
                            var fetchMin = c.minv.block;
                            var fetchMax = c.maxv.block + (1 << 16); // *sigh*

                            igvxhr.loadArrayBuffer(bam.bamPath,
                                {
                                    task: task,
                                    headers: bam.config.headers,
                                    range: {start: fetchMin, size: fetchMax - fetchMin + 1},
                                    success: function (compressed) {

                                        var ba = new Uint8Array(igv.unbgzf(compressed, c.maxv.block - c.minv.block + 1));

                                        decodeBamRecords(ba, chunks[index].minv.offset, records, min, max, chrId);

                                        index++;

                                        if (index >= chunks.length) {

                                            // If we have combined multiple chunks. Sort records by start position.  I'm not sure this is neccessary
                                            if (index > 0 && records.length > 1) {
                                                records.sort(function (a, b) {
                                                    return a.start - b.start;
                                                });
                                            }
                                            continuation(records);
                                        }
                                        else {
                                            loadNextChunk(index);
                                        }
                                    }
                                });


                        }
                    });
                });
            }
        });


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
                mateRefID,
                matePos,
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

                record = new igv.BamAlignment();

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

                record.flags = flag;
                record.strand = !(flag & READ_STRAND_FLAG);

                lseq = readInt(ba, offset + 20);

                mateRefID = readInt(ba, offset + 24);
                record.matePos = readInt(ba, offset + 28);


                record.tlen = readInt(ba, offset + 32);

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
                    qseq += String.fromCharCode(ba[p + j] + 33);
                }
                p += lseq;

                record.qual = qseq;
                record.start = pos;
                record.mq = mq;
                record.readName = readName;
                record.chr = bam.indexToChr[refID];
                record.mateChr = bam.indexToChr[mateRefID];

                record.tagBA = new Uint8Array(ba.buffer.slice(p, blockEnd));  // decode thiese on demand
                p += blockEnd;

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


    function getIndex(bam, continuation) {

        if (bam.index) {
            continuation(bam.index);
        }
        else {
            igv.loadBamIndex(bam.baiPath, bam.config, function (index) {
                bam.index = index;
                continuation(bam.index);
            });
        }

    }

    function getContentLength(bam, continuation) {
        if (bam.contentLength) {
            continuation(bam.contentLength);
        }
        else {

            getIndex(bam, function (bamIndex) {

                var headerSize = bamIndex.headerSize;

                // Gen the content length first, so we don't try to read beyond the end of the file
                igvxhr.loadHeader(bam.headPath,
                    {
                        headers: bam.headers,
                        success: function (header) {
                            var contentLengthString = header ? header["Content-Length"] : null;
                            if (contentLengthString) {
                                bam.contentLength = parseInt(contentLengthString);
                            }
                            else {
                                bam.contentLength = -1;
                            }

                            if (!bam.contentLength) bam.contentLength = -1; //Protect against inf loop
                            continuation(bam.contentLength);

                        },
                        error: function () {
                            bam.contentLength = -1;
                            continuation(bam.contentLength);
                        }

                    });
            });
        }
    }


    function getChrIndex(bam, continuation) {

        if (bam.chrToIndex) {
            continuation(bam.chrToIndex);
        }
        else {
            bam.readHeader(function () {
                continuation(bam.chrToIndex);
            })
        }
    }


    function readInt(ba, offset) {
        return (ba[offset + 3] << 24) | (ba[offset + 2] << 16) | (ba[offset + 1] << 8) | (ba[offset]);
    }

    function readShort(ba, offset) {
        return (ba[offset + 1] << 8) | (ba[offset]);
    }


    return igv;

})
(igv || {});


