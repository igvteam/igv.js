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

    "use strict";

    igv.BamSource = function (config, genome) {

        this.config = config;
        this.genome = genome;
        this.alignmentContainer = undefined;
        this.maxRows = config.maxRows || 1000;

        if (igv.isFilePath(config.url)) {
            // do nothing
            console.log('ignore');
        } else if (igv.isString(config.url) && config.url.startsWith("data:")) {
            this.config.indexed = false;
        }

        if ("ga4gh" === config.sourceType) {
            this.bamReader = new igv.Ga4ghAlignmentReader(config, genome);
        } else if ("pysam" === config.sourceType) {
            this.bamReader = new igv.BamWebserviceReader(config, genome)
        } else if ("htsget" === config.sourceType) {
            this.bamReader = new igv.HtsgetReader(config, genome);
        } else if ("shardedBam" === config.sourceType) {
            this.bamReader = new igv.ShardedBamReader(config, genome);
        } else {
            if (this.config.indexed === false) {
                this.bamReader = new igv.BamReaderNonIndexed(config, genome);
            }
            else {
                this.bamReader = new igv.BamReader(config, genome);
            }
        }

        this.viewAsPairs = config.viewAsPairs;
        this.showSoftclips = config.showSoftclips;
        this.groupBy = config.groupBy || 'none';
        this.groupByTag = config.groupBy === 'tag' ? config.groupByTag : undefined;
    };




    igv.BamSource.prototype.setViewAsPairs = function (bool) {

        if (this.viewAsPairs !== bool) {
            this.viewAsPairs = bool;
            this.packAlignmentRows();
        }   
    };  

    igv.BamSource.prototype.setGroupBy = function (key, tag) {

        if (this.groupBy !== key || this.groupByTag !== tag) {
            this.groupBy = key;
            this.groupByTag = tag;
            this.packAlignmentRows();
        }   
    };  

    igv.BamSource.prototype.packAlignmentRows = function () {
        var alignmentContainer = this.alignmentContainer,
            packedAlignmentRows,
            alignments;

        if (!alignmentContainer) {
            return;
        }   

        packedAlignmentRows = alignmentContainer.packedAlignmentRows;
        alignmentContainer.packedAlignmentRows = undefined;
        if (this.viewAsPairs) {
            alignments = pairAlignments(packedAlignmentRows);
        } else {
            alignments = unpairAlignments(packedAlignmentRows);
        }

        packedAlignmentRows = [];
        if (this.groupBy === 'tag') {
            var groups = groupAlignmentsByTag(alignments, this.groupByTag),
                maxRows = this.maxRows,
                showSoftclips = this.showSoftclips;
            Object.keys(groups).sort().forEach(function (key) {
                packAlignmentRows(packedAlignmentRows, groups[key], alignmentContainer.start, alignmentContainer.end, maxRows, showSoftclips);
            });
        } else {
            packAlignmentRows(packedAlignmentRows, alignments, alignmentContainer.start, alignmentContainer.end, this.maxRows, this.showSoftclips);
        }
        alignmentContainer.packedAlignmentRows = packedAlignmentRows;
    };

    igv.BamSource.prototype.getAlignments = function (chr, bpStart, bpEnd) {

        const self = this;
        const genome = this.genome;


        if (self.alignmentContainer && self.alignmentContainer.contains(chr, bpStart, bpEnd)) {
            
            return Promise.resolve(self.alignmentContainer);
            
        } else {
            
            return new Promise(function (fulfill, reject) {


                self.bamReader.readAlignments(chr, bpStart, bpEnd).then(function (alignmentContainer) {

                    var alignments = alignmentContainer.alignments;
                    alignmentContainer.packedAlignmentRows = [{alignments: alignments}];
                    alignmentContainer.alignments = undefined;  // Don't need to hold onto these anymore
                    self.alignmentContainer = alignmentContainer;
                    self.packAlignmentRows();

                    igv.browser.genome.sequence.getSequence(alignmentContainer.chr, alignmentContainer.start, alignmentContainer.end).then(
                        function (sequence) {


                            if (sequence) {

                                alignmentContainer.coverageMap.refSeq = sequence;    // TODO -- fix this
                                alignmentContainer.sequence = sequence;           // TODO -- fix this


                                fulfill(alignmentContainer);
                            }
                        }).catch(reject);

                }).catch(reject);

            });
        }
    }

    function pairAlignments(rows) {

        var pairCache = {},
            result = [];

        rows.forEach(function (row) {

            row.alignments.forEach(function (alignment) {

                var pairedAlignment;

                if (canBePaired(alignment)) {

                    pairedAlignment = pairCache[alignment.readName];
                    if (pairedAlignment) {
                        pairedAlignment.setSecondAlignment(alignment);
                        pairCache[alignment.readName] = undefined;   // Don't need to track this anymore.
                    }
                    else {
                        pairedAlignment = new igv.PairedAlignment(alignment);
                        pairCache[alignment.readName] = pairedAlignment;
                        result.push(pairedAlignment);
                    }
                }

                else {
                    result.push(alignment);
                }
            });
        });
        return result;
    }

    function unpairAlignments(rows) {
        var result = [];
        rows.forEach(function (row) {
            row.alignments.forEach(function (alignment) {
                if (alignment instanceof igv.PairedAlignment) {
                    if (alignment.firstAlignment) result.push(alignment.firstAlignment);  // shouldn't need the null test
                    if (alignment.secondAlignment) result.push(alignment.secondAlignment);

                }
                else {
                    result.push(alignment);
                }
            });
        });
        return result;
    }

    function canBePaired(alignment) {
        return alignment.isPaired() &&
            alignment.isMateMapped() &&
            alignment.chr === alignment.mate.chr &&
            (alignment.isFirstOfPair() || alignment.isSecondOfPair()) && !(alignment.isSecondary() || alignment.isSupplementary());
    }

    function packAlignmentRows(packedAlignmentRows, alignments, start, end, maxRows, showSoftclips) {

        if (!alignments) return;


        if (alignments.length === 0) {
            return;
        } else {

            var bucketList = [],
                allocatedCount = 0,
                lastAllocatedCount = 0,
                nextStart,
                alignmentRow,
                index,
                bucket,
                alignment,
                alignmentSpace = 4 * 2,
                bucketStart;


            alignments.sort(function (a, b) {
                var sa = showSoftclips ? a.getSoftStart() : a.start,
                sb = showSoftclips ? b.getSoftStart() : b.start,
                la = showSoftclips ? a.getSoftEnd() - sa : a.lengthOnRef,
                lb = showSoftclips ? b.getSoftEnd() - sb : b.lengthOnRef;
                if (sa !== sb) 
                    return sa - sb; 
                if (la !== lb) 
                    return lb - la; 
                return b.strand - a.strand;
            });

            bucketStart = Math.max(start, showSoftclips ? alignments[0].getSoftStart() : alignments[0].start);
            nextStart = bucketStart;

            alignments.forEach(function (alignment) {

                var s = showSoftclips ? alignment.getSoftStart() : alignment.start,
                    buckListIndex = Math.max(0, s - bucketStart);
                if (bucketList[buckListIndex] === undefined) {
                    bucketList[buckListIndex] = [];
                }
                bucketList[buckListIndex].push(alignment);
            });


            while (allocatedCount < alignments.length && packedAlignmentRows.length < maxRows) {

                alignmentRow = new igv.BamAlignmentRow();

                while (nextStart <= end) {

                    bucket = undefined;

                    while (!bucket && nextStart <= end) {

                        index = nextStart - bucketStart;
                        if (bucketList[index] === undefined) {
                            ++nextStart;                     // No alignments at this index
                        } else {
                            bucket = bucketList[index];
                        }

                    } // while (bucket)

                    if (!bucket) {
                        break;
                    }
                    alignment = bucket.shift();
                    if (0 === bucket.length) {
                        bucketList[index] = undefined;
                    }

                    alignmentRow.alignments.push(alignment);
                    nextStart = (showSoftclips ? alignment.getSoftEnd() : alignment.start + alignment.lengthOnRef) + alignmentSpace;
                    ++allocatedCount;

                } // while (nextStart)

                if (alignmentRow.alignments.length > 0) {
                    packedAlignmentRows.push(alignmentRow);
                }

                nextStart = bucketStart;

                if (allocatedCount === lastAllocatedCount) break;   // Protect from infinite loops

                lastAllocatedCount = allocatedCount;

            } // while (allocatedCount)

            return;
        }
    }

    function groupAlignmentsByTag(alignments, tag) {
        var result = {};
        alignments.forEach(function (alignment) {
            var tagValue = (alignment instanceof igv.PairedAlignment)
                ? alignment.firstAlignment.tags()[tag] : alignment.tags()[tag];
            if (tagValue === undefined)
                tagValue = "";
            if (result[tagValue] === undefined)
                result[tagValue] = [];
            result[tagValue].push(alignment);
        });
        return result;
    }

    return igv;

})(igv || {});
