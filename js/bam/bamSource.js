var igv = (function (igv) {

    /**
     }
     * A wrapper around a bam file that provides a simple cache
     *
     * @param bamPath
     * @param baiPath
     * @constructor
     */
    igv.BamSource = function (bamPath, baiPath) {

        this.bamFile = new igv.BamReader(bamPath, baiPath);
    };

    igv.BamSource.prototype.getFeatures = function (chr, bpStart, bpEnd, success, task) {

        if (this.genomicInterval && this.genomicInterval.contains(chr, bpStart, bpEnd)) {

            success(this.genomicInterval);

        } else {

            var expand = 1000,
                myself,
                qStart,
                qEnd,
                coverageMap,
                packedAlignments;

            // Expand the query parameters to enable minor changes in window size without forcing a reload
            qStart = Math.max(0, bpStart - expand);
            qEnd = bpEnd + expand;

            myself = this;
            this.bamFile.readAlignments(chr, qStart, qEnd, function (alignments) {

                myself.genomicInterval = new igv.GenomicInterval(chr, qStart, qEnd);

                igv.sequenceSource.getSequence(myself.genomicInterval.chr, myself.genomicInterval.start, myself.genomicInterval.end, function(refSeq){

                    myself.genomicInterval.coverageMap = new igv.CoverageMap(chr, qStart, qEnd, alignments, refSeq);

                    myself.genomicInterval.packedAlignments = packAlignments(myself.genomicInterval, alignments);

                    success(myself.genomicInterval);

                }, task);

            });
        }
    };


     function packAlignments (genomicInterval, features) {

        if (features.length === 0) {

            return [];

        } else {

            var bucketListLength = genomicInterval.end - genomicInterval.start,
                bucketList = new Array(bucketListLength),
                i;

            features.forEach(function (alignment) {

                var buckListIndex = alignment.start - genomicInterval.start;
                if (bucketList[buckListIndex] === undefined) {
                    bucketList[buckListIndex] = [];
                }
                bucketList[buckListIndex].push(alignment);
            });


            var myself = this,
                allocatedCount = 0,
                nextStart = genomicInterval.start,
                alignmentRow,
                index,
                bucket,
                alignment,
                alignmentSpace = 4 * 2,
                packedAlignments = [];

            while (allocatedCount < features.length) {

                alignmentRow = [];
                while (nextStart <= genomicInterval.end) {

                    bucket = undefined;

                    while (!bucket && nextStart <= genomicInterval.end) {

                        index = nextStart - genomicInterval.start;
                        if (bucketList[index] === undefined) {
                            ++nextStart;                     // No alignments at this index
                        } else {
                            bucket = bucketList[index];
                        }

                    } // while (bucket)

                    if (!bucket) continue;

                    alignment = bucket.pop();
                    if (0 === bucket.length) {
                        bucketList[index] = undefined;
                    }

                    alignmentRow.push(alignment);
                    nextStart = alignment.start + alignment.lengthOnRef + alignmentSpace;
                    ++allocatedCount;

                } // while (nextStart)

                if (alignmentRow.length > 0) {
                    packedAlignments.push(alignmentRow);
                }

                nextStart = genomicInterval.start;

            } // while (allocatedCount)

            return packedAlignments;
        }
    }



    return igv;

})(igv || {});