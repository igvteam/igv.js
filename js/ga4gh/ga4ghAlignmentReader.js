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
        this.filter = config.filter || new igv.BamFilter();
        this.readGroupSetIds = config.readGroupSetIds;
        this.authKey = config.authKey;   // Might be undefined or nill

        this.samplingWindowSize = config.samplingWindowSize === undefined ? 100 : config.samplingWindowSize;
        this.samplingDepth = config.samplingDepth === undefined ? 100 : config.samplingDepth;
        if (config.viewAsPairs) {
            this.pairsSupported = true;
        }
        else {
            this.pairsSupported = config.pairsSupported === undefined ? true : config.pairsSupported;
        }
    }


    igv.Ga4ghAlignmentReader.prototype.readAlignments = function (chr, bpStart, bpEnd) {

        var self = this;

        return new Promise(function (fulfill, reject) {

            getChrNameMap().then(function (chrNameMap) {

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
                    results: new igv.AlignmentContainer(chr, bpStart, bpEnd, self.samplingWindowSize, self.samplingDepth, self.pairsSupported)
                }).then(fulfill)
                    .catch(reject);

            }).catch(reject);

            function getChrNameMap() {


                return new Promise(function (fulfill, reject) {
                    if (self.chrNameMap) {
                        fulfill(self.chrNameMap);
                    }

                    else {
                        self.readMetadata().then(function (json) {

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
                                        }
                                    }).then(function (references) {
                                        references.forEach(function (ref) {
                                            var refName = ref.name,
                                                alias = igv.browser.genome.getChromosomeName(refName);
                                            self.chrNameMap[alias] = refName;
                                        });
                                        fulfill(self.chrNameMap);

                                    }).catch(reject);
                                }
                                else {

                                    // Try hardcoded constants -- workaround for non-compliant data at Google
                                    populateChrNameMap(self.chrNameMap, self.config.datasetId);

                                    fulfill(self.chrNameMap);
                                }
                            }

                            else {
                                // No browser object, can't build map.  This can occur when run from unit tests
                                fulfill(self.chrNameMap);
                            }
                        }).catch(reject);
                    }

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
                    alignment,
                    jsonAlignment,
                    cigarDecoded,
                    alignments = [],
                    genome = igv.browser.genome,
                    mate;

                for (i = 0; i < len; i++) {

                    json = jsonRecords[i];

                    alignment = new igv.BamAlignment();

                    alignment.readName = json.fragmentName;
                    alignment.properPlacement = json.properPlacement;
                    alignment.duplicateFragment = json.duplicateFragment;
                    alignment.numberReads = json.numberReads;
                    alignment.fragmentLength = json.fragmentLength;
                    alignment.readNumber = json.readNumber;
                    alignment.failedVendorQualityChecks = json.failedVendorQualityChecks;
                    alignment.secondaryAlignment = json.secondaryAlignment;
                    alignment.supplementaryAlignment = json.supplementaryAlignment;
                    alignment.seq = json.alignedSequence;
                    alignment.qual = json.alignedQuality;
                    alignment.matePos = json.nextMatePosition;
                    alignment.tagDict = json.info;
                    alignment.flags = encodeFlags(json);


                    jsonAlignment = json.alignment;
                    if (jsonAlignment) {
                        alignment.mapped = true;

                        alignment.chr = json.alignment.position.referenceName;
                        if (genome) alignment.chr = genome.getChromosomeName(alignment.chr);

                        alignment.start = parseInt(json.alignment.position.position);
                        alignment.strand = !(json.alignment.position.reverseStrand);
                        alignment.mq = json.alignment.mappingQuality;
                        alignment.cigar = encodeCigar(json.alignment.cigar);
                        cigarDecoded = translateCigar(json.alignment.cigar);

                        alignment.lengthOnRef = cigarDecoded.lengthOnRef;

                        blocks = makeBlocks(alignment, cigarDecoded.array);
                        alignment.blocks = blocks.blocks;
                        alignment.insertions = blocks.insertions;

                    }
                    else {
                        alignment.mapped = false;
                    }

                    mate = json.nextMatePosition;
                    if (mate) {
                        alignment.mate = {
                            chr: mate.referenceFrame,
                            position: parseInt(mate.position),
                            strand: !mate.reverseStrand
                        };
                    }

                    if (self.filter.pass(alignment)) {
                        alignments.push(alignment);
                    }


                }

                return alignments;

                // TODO -- implement me
                function encodeCigar(cigarArray) {
                    return "";
                }

                // TODO -- implement me
                function encodeFlags(json) {
                    return 0;
                }

                function translateCigar(cigar) {

                    var cigarUnit, opLen, opLtr,
                        lengthOnRef = 0,
                        cigarArray = [],
                        i;

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
                                insertions.push({
                                    start: pos,
                                    len: c.len,
                                    seq: blockSeq,
                                    qual: blockQuals,
                                    insertion: true
                                });
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
            }


        });
    }


    igv.Ga4ghAlignmentReader.prototype.readMetadata = function () {

        return igv.ga4ghGet({
            url: this.url,
            entity: "readgroupsets",
            entityId: this.readGroupSetIds
        });
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