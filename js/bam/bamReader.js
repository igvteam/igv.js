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

    const MAX_GZIP_BLOCK_SIZE = (1 << 16);   //  APPARENTLY.  Where is this documented???


    /**
     * Class for reading a bam file
     *
     * @param config
     * @constructor
     */
    igv.BamReader = function (config) {

        this.config = config;
        this.bamPath = 'gcs' === config.sourceType ?
            igv.translateGoogleCloudURL(config.url) :
            config.url;
        this.baiPath = 'gcs' === config.sourceType ?
            igv.translateGoogleCloudURL(config.url + ".bai") :
            config.url + ".bai"; // Todo - deal with Picard convention.  WHY DOES THERE HAVE TO BE 2?
        this.headPath = config.headURL || this.bamPath;

    };

    igv.BamReader.prototype.readFeatures = function (chr, min, max, continuation, task) {

        var bam = this;

        getChrIndex(this, function (chrToIndex) {

            var chrId = chrToIndex[chr],
                chunks;

            if (chrId === undefined) {
                continuation([]);
            } else {

                getIndex(bam, function (bamIndex) {

                    chunks = bamIndex.blocksForRange(chrId, min, max);


                    if (!chunks) {
                        continuation(null, 'Error in index fetch');
                        return;
                    }
                    if (chunks.length === 0) {
                        continuation([]);
                        return;
                    }


                    var records = [];
                    loadNextChunk(0);

                    function loadNextChunk(chunkNumber) {

                        var c = chunks[chunkNumber],
                            fetchMin = c.minv.block,
                            fetchMax = c.maxv.block + 65000,   // Make sure we get the whole block.
                            range =
                                (bam.contentLength > 0 && fetchMax > bam.contentLength) ?
                                {start: fetchMin} :
                                {start: fetchMin, size: fetchMax - fetchMin + 1};

                        igvxhr.loadArrayBuffer(bam.bamPath,
                            {
                                task: task,
                                headers: bam.config.headers,
                                range: range,
                                success: function (compressed) {

                                    try {
                                        var ba = new Uint8Array(igv.unbgzf(compressed)); //, c.maxv.block - c.minv.block + 1));
                                    } catch (e) {
                                        console.log(e);
                                        continuation(records);
                                    }

                                    decodeBamRecords(ba, chunks[chunkNumber].minv.offset, records, min, max, chrId);

                                    chunkNumber++;

                                    if (chunkNumber >= chunks.length) {

                                        // If we have combined multiple chunks. Sort records by start position.  I'm not sure this is neccessary
                                        if (chunkNumber > 0 && records.length > 1) {
                                            records.sort(function (a, b) {
                                                return a.start - b.start;
                                            });
                                        }
                                        continuation(records);
                                    }
                                    else {
                                        loadNextChunk(chunkNumber);
                                    }
                                }
                            });


                    }
                });
            }
        });


        function decodeBamRecords(ba, offset, alignments, min, max, chrId) {

            var blockSize,
                blockEnd,
                alignment,
                blocks,
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
                readName,
                j,
                p,
                lengthOnRef,
                cigar,
                c,
                cigarArray,
                seq,
                seqBytes;

            while (true) {

                blockSize = readInt(ba, offset);
                blockEnd = offset + blockSize + 4;

                if (blockEnd >= ba.length) {
                    return;
                }

                alignment = new igv.BamAlignment();

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

                alignment.flags = flag;
                alignment.strand = !(flag & READ_STRAND_FLAG);

                lseq = readInt(ba, offset + 20);

                mateRefID = readInt(ba, offset + 24);
                matePos = readInt(ba, offset + 28);
                alignment.fragmentLength = readInt(ba, offset + 32);

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
                alignment.cigar = cigar;
                alignment.lengthOnRef = lengthOnRef;

                if (alignment.start + alignment.lengthOnRef < min) continue;  // Record out-of-range "to the left", skip to next one


                seq = '';
                seqBytes = (lseq + 1) >> 1;
                for (j = 0; j < seqBytes; ++j) {
                    var sb = ba[p + j];
                    seq += SECRET_DECODER[(sb & 0xf0) >> 4];
                    seq += SECRET_DECODER[(sb & 0x0f)];
                }
                seq = seq.substring(0, lseq);  // seq might have one extra character (if lseq is an odd number)

                p += seqBytes;
                alignment.seq = seq;


                if (lseq === 1 && String.fromCharCode(ba[p + j] + 33) === "*") {
                    // TODO == how to represent this?
                }
                else {
                    alignment.qual = [];
                    for (j = 0; j < lseq; ++j) {
                        alignment.qual.push(ba[p + j]);
                    }
                }
                p += lseq;


                alignment.start = pos;
                alignment.mq = mq;
                alignment.readName = readName;
                alignment.chr = bam.indexToChr[refID];

                if (mateRefID >= 0) {
                    alignment.mate = {
                        chr: bam.indexToChr[mateRefID],
                        position: matePos
                    };
                }


                alignment.tagBA = new Uint8Array(ba.buffer.slice(p, blockEnd));  // decode thiese on demand
                p += blockEnd;

                if (!min || alignment.start <= max && alignment.start + alignment.lengthOnRef >= min) {
                    if (chrId === undefined || refID == chrId) {
                        blocks = makeBlocks(alignment, cigarArray);
                        alignment.blocks = blocks.blocks;
                        alignment.insertions = blocks.insertions;
                        alignments.push(alignment);
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
                insertions,
                seqOffset = 0,
                pos = record.start,
                len = cigarArray.length,
                blockSeq,
                blockQuals,
                minQ = 5,  //prefs.getAsInt(PreferenceManager.SAM_BASE_QUALITY_MIN)
                maxQ = 20; //prefs.getAsInt(PreferenceManager.SAM_BASE_QUALITY_MAX)

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
                        blockSeq = record.seq === "*" ? "*" : record.seq.substr(seqOffset, c.len);
                        blockQuals = record.qual ? record.qual.slice(seqOffset, c.len) : undefined;
                        if(insertions === undefined) insertions = [];
                        insertions.push({start: pos, len: c.len, seq: blockSeq, qual: blockQuals});
                        seqOffset += c.len;
                        break;
                    case 'M' :
                    case 'EQ' :
                    case '=' :
                    case 'X' :

                        blockSeq = record.seq === "*" ? "*" : record.seq.substr(seqOffset, c.len);
                        blockQuals = record.qual ? record.qual.slice(seqOffset, c.len) : undefined;
                        blocks.push({start: pos, len: c.len, seq: blockSeq, qual: blockQuals});
                        seqOffset += c.len;
                        pos += c.len;

                        break;

                    default :
                        console.log("Error processing cigar element: " + c.len + c.ltr);
                }
            }

            return {blocks: blocks, insertions: insertions};

        }

    };

    /**
     * Read the bam header.  This function is public to support unit testing
     * @param continuation
     * @param stopSpinner
     */
    igv.BamReader.prototype.readHeader = function (continuation) {

        var bam = this;

        getContentLength(bam, function (contentLength) {

            getIndex(bam, function (index) {

                var contentLength = index.blockMax,
                    len = index.headerSize + MAX_GZIP_BLOCK_SIZE + 100;   // Insure we get the complete compressed block containing the header

                if (contentLength <= 0) contentLength = index.blockMax;  // Approximate

                bam.contentLength = contentLength;

                if (contentLength > 0) len = Math.min(contentLength, len);

                igvxhr.loadArrayBuffer(bam.bamPath,
                    {
                        headers: bam.config.headers,

                        range: {start: 0, size: len},

                        success: function (compressedBuffer) {

                            var unc = igv.unbgzf(compressedBuffer, len),
                                uncba = new Uint8Array(unc),
                                magic = readInt(uncba, 0),
                                samHeaderLen = readInt(uncba, 4),
                                samHeader = '',
                                genome = igv.browser ? igv.browser.genome : null;

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

                                if (genome && genome.getChromosomeName) {
                                    name = genome.getChromosomeName(name);
                                }

                                bam.chrToIndex[name] = i;
                                bam.indexToChr.push(name);

                                p = p + 8 + lName;
                            }

                            continuation();

                        }
                    });
            });
        });

    };


    function getContentLength(bam, continuation) {

        if (bam.contentLength) {
            continuation(bam.contentLength);
        }
        else {

            // Gen the content length first, so we don't try to read beyond the end of the file
            igvxhr.getContentLength(bam.headPath, {
                headers: bam.headers,
                success: function (contentLength) {
                    bam.contentLength = contentLength;
                    continuation(bam.contentLength);

                },
                error: function (unused, xhr) {
                    bam.contentLength = -1;
                    continuation(bam.contentLength);
                }

            });
        }
    }


    function getIndex(bam, continuation) {

        var bamIndex = bam.index;

        if (bam.index) {
            continuation(bam.index);
        }
        else {
            igv.loadBamIndex(bam.baiPath, bam.config, function (index) {
                bam.index = index;

                // Override contentLength
                bam.contentLength = index.blockMax;


                continuation(bam.index);
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


