/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

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


    var CigarOperationTable = {
        ALIGNMENT_MATCH: "M",
        INSERT: "I",
        DELETE: "D",
        SKIP: "N",
        CLIP_SOFT: "S",
        CLIP_HARD: "H",
        PAD: "P",
        SEQUENCE_MATCH: "=",
        SEQUENCE_MISMATCH: "X"
    }

    igv.Ga4ghAlignmentReader = function (config) {

        this.config = config;
        this.url = config.url;
        this.readGroupSetIds = config.readGroupSetIds;
        this.authKey = config.authKey;   // Might be undefined or nill
    }


    igv.Ga4ghAlignmentReader.prototype.readFeatures = function (chr, bpStart, bpEnd, success, task) {

        var self = this;

        getChrNameMap(function (chrNameMap) {

            var queryChr = chrNameMap.hasOwnProperty(chr) ? chrNameMap[chr] : chr,
                readURL = self.url + "/reads/search";

            igv.ga4ghSearch({
                url: readURL,
                body: {
                    "readGroupSetIds": [self.readGroupSetIds],
                    "referenceName": queryChr,
                    "start": bpStart,
                    "end": bpEnd,
                    "pageSize": "10000"
                },
                decode: decodeGa4ghReads,
                success: success,
                task: task
            });

        });

        function getChrNameMap(continuation) {

            if (self.chrNameMap) {
                continuation(self.chrNameMap);
            }

            else {
                self.readMetadata(function (json) {

                    self.chrNameMap = {};

                    if (igv.browser && json.readGroups && json.readGroups.length > 0) {

                        var referenceSetId = json.readGroups[0].referenceSetId;

                        console.log("No reference set specified");

                        if (referenceSetId) {

                            // Query for reference names to build an alias table (map of genome ref names -> dataset ref names)
                            var readURL = self.url + "/references/search";

                            igv.ga4ghSearch({
                                url: readURL,
                                body: {
                                    "referenceSetId": referenceSetId
                                },
                                decode: function (j) {
                                    return j.references;
                                },
                                success: function (references) {
                                    references.forEach(function (ref) {
                                        var refName = ref.name,
                                            alias = igv.browser.genome.getChromosomeName(refName);
                                        self.chrNameMap[alias] = refName;
                                    });
                                    continuation(self.chrNameMap);

                                },
                                task: task
                            });
                        }
                        else {

                            // Try hardcoded constants -- workaround for non-compliant data at Google
                            populateChrNameMap(self.chrNameMap, self.config.datasetId);

                            continuation(self.chrNameMap);
                        }
                    }

                    else {
                        // No browser object, can't build map.  This can occur when run from unit tests
                        continuation(self.chrNameMap);
                    }
                });
            }

        }

    }


    igv.Ga4ghAlignmentReader.prototype.readMetadata = function (success, task) {

        igv.ga4ghGet({
            url: this.url,
            entity: "readgroupsets",
            entityId: this.readGroupSetIds,
            success: success,
            task: task
        });
    }


    /**
     * Decode an array of ga4gh read records
     *

     */
    function decodeGa4ghReads(json) {

        var i,
            jsonRecords = json.alignments,
            len = jsonRecords.length,
            json,
            read,
            alignment,
            cigarDecoded,
            alignments = [],
            genome = igv.browser.genome,
            mate;

        for (i = 0; i < len; i++) {

            json = jsonRecords[i];

            read = new igv.BamAlignment();

            read.readName = json.fragmentName;
            read.properPlacement = json.properPlacement;
            read.duplicateFragment = json.duplicateFragment;
            read.numberReads = json.numberReads;
            read.fragmentLength = json.fragmentLength;
            read.readNumber = json.readNumber;
            read.failedVendorQualityChecks = json.failedVendorQualityChecks;
            read.secondaryAlignment = json.secondaryAlignment;
            read.supplementaryAlignment = json.supplementaryAlignment;

            read.seq = json.alignedSequence;
            read.qual = json.alignedQuality;
            read.matePos = json.nextMatePosition;
            read.tagDict = json.info;

            read.flags = encodeFlags(json);


            alignment = json.alignment;
            if (alignment) {
                read.mapped = true;

                read.chr = json.alignment.position.referenceName;
                if (genome) read.chr = genome.getChromosomeName(read.chr);

                read.start = parseInt(json.alignment.position.position);
                read.strand = !(json.alignment.position.reverseStrand);
                read.mq = json.alignment.mappingQuality;
                read.cigar = encodeCigar(json.alignment.cigar);
                cigarDecoded = translateCigar(json.alignment.cigar);

                read.lengthOnRef = cigarDecoded.lengthOnRef;

                blocks = makeBlocks(read, cigarDecoded.array);
                read.blocks = blocks.blocks;
                read.insertions = blocks.insertions;

            }
            else {
                read.mapped = false;
            }

            mate = json.nextMatePosition;
            if (mate) {
                read.mate = {
                    chr: mate.referenceFrame,
                    position: parseInt(mate.position),
                    strand: !mate.reverseStrand
                };
            }

            alignments.push(read);

        }

        return alignments;

    }


    function encodeCigar(cigarArray) {
        return "";
    }

    function encodeFlags(json) {
        return 0;
    }


    function translateCigar(cigar) {

        var cigarUnit, opLen, opLtr,
            lengthOnRef = 0,
            cigarArray = [];

        for (i = 0; i < cigar.length; i++) {

            cigarUnit = cigar[i];

            opLtr = CigarOperationTable[cigarUnit.operation];
            opLen = parseInt(cigarUnit.operationLength);    // TODO -- this should be a long by the spec

            if (opLtr == 'M' || opLtr == 'EQ' || opLtr == 'X' || opLtr == 'D' || opLtr == 'N' || opLtr == '=')
                lengthOnRef += opLen;

            cigarArray.push({len: opLen, ltr: opLtr});

        }

        return {lengthOnRef: lengthOnRef, array: cigarArray};
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
                    blockSeq = record.seq === "*" ? "*" : record.seq.substr(seqOffset, c.len);
                    blockQuals = record.qual === "*" ? "*" : record.qual.slice(seqOffset, c.len);
                    if (insertions === undefined) insertions = [];
                    insertions.push({start: pos, len: c.len, seq: blockSeq, qual: blockQuals, insertion: true});
                    seqOffset += c.len;
                    break;
                case 'M' :
                case 'EQ' :
                case '=' :
                case 'X' :
                    blockSeq = record.seq === "*" ? "*" : record.seq.substr(seqOffset, c.len);
                    blockQuals = record.qual === "*" ? "*" : record.qual.slice(seqOffset, c.len);
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

    igv.decodeGa4ghReadset = function (json) {

        var sequenceNames = [],
            fileData = json["fileData"];

        fileData.forEach(function (fileObject) {

            var refSequences = fileObject["refSequences"];

            refSequences.forEach(function (refSequence) {
                sequenceNames.push(refSequence["name"]);
            });
        });

        return sequenceNames;
    }


    /**
     * Hardcoded hack to work around some non-compliant google datasets
     *
     * @param chrNameMap
     * @param datasetId
     */
    function populateChrNameMap(chrNameMap, datasetId) {
        var i;
        if ("461916304629" === datasetId || "337315832689" === datasetId) {
            for (i = 1; i < 23; i++) {
                chrNameMap["chr" + i] = i;
            }
            chrNameMap["chrX"] = "X";
            chrNameMap["chrY"] = "Y";
            chrNameMap["chrM"] = "MT";
        }
    }


    return igv;

})(igv || {});