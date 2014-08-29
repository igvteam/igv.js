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

        if (this.alignmentManager && this.alignmentManager.genomicInterval.contains(chr, bpStart, bpEnd)) {

            success(this.alignmentManager);

        } else {

            var expand = 1000,
                thisSource,
                qStart,
                qEnd;

            // Expand the query parameters to enable minor changes in window size without forcing a reload
            qStart = Math.max(0, bpStart - expand);
            qEnd = bpEnd + expand;

            thisSource = this;
            this.bamFile.readAlignments(chr, qStart, qEnd, function (alignments) {

                thisSource.alignmentManager = new igv.AlignmentManager(new igv.GenomicInterval(chr, qStart, qEnd, alignments));

                igv.sequenceSource.getSequence(thisSource.alignmentManager.genomicInterval.chr, thisSource.alignmentManager.genomicInterval.start, thisSource.alignmentManager.genomicInterval.end, function(refSeq){

                    thisSource.alignmentManager.coverageMap = new igv.CoverageMap(thisSource.alignmentManager.genomicInterval, refSeq);

                    thisSource.alignmentManager.performReservoirSampling(success);

                }, task);

            });
        }
    };


    return igv;

})(igv || {});