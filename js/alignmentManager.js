/**
 * Created by turner on 3/10/14.
 */
var igv = (function (igv) {

    igv.AlignmentManager = function (genomicInterval) {

        this.reservoirSampleCount = 2048;

        this.genomicInterval = genomicInterval;

    };

    igv.AlignmentManager.prototype.performReservoirSampling = function(success) {

        var i,
            j,
            reservoir = this.genomicInterval.features.slice(0, this.reservoirSampleCount),
            reservoirLength = reservoir.length,
            featuresLength = this.genomicInterval.features.length;

        if (this.reservoirSampleCount >= this.genomicInterval.features.length) {

            this.packAlignments(success);
        }

        for (i = reservoirLength; i < featuresLength; i++) {

            j = Math.floor(igv.random(0, i+1));
            if (j < reservoirLength) {
                reservoir[ j ] = this.genomicInterval.features[ i ];
            }
        }

        // packing alignments assumes a sorted list of features as input
        reservoir.sort(function (a, b) {
            return a.start - b.start;
        });

        // clobber pre-exisiting features list
        this.genomicInterval.features = reservoir;

        this.packAlignments(success);

    };

    igv.AlignmentManager.prototype.packAlignments = function(continuation) {

        if (this.genomicInterval.features.length == 0) {

            continuation(null);  // nothing to pack
        } else {

            var bucketListLength = this.genomicInterval.end - this.genomicInterval.features[0].start,
                bucketList = [],
                i;

            for (i = 0; i < bucketListLength; i++) {
                bucketList[i] = Math.NaN;
            }

            this.genomicInterval.features.forEach(this.assignAlignmentsToBuckets, bucketList);

            this.doPackAlignments(bucketList, continuation);
        }

    };

    igv.AlignmentManager.prototype.assignAlignmentsToBuckets = function(alignment, index, alignments) {

        var buckListIndex = alignment.start - alignments[0].start;

        if (Math.NaN === this[buckListIndex]) {
            this[buckListIndex] = [];
        }

        this[buckListIndex].unshift(alignment);
    };

// packing alignments assumes a sorted list of features as input
    igv.AlignmentManager.prototype.doPackAlignments = function(bucketList, continuation) {

        var myself = this,
            allocatedCount = 0,
            nextStart = this.genomicInterval.features[0].start,
            alignmentRow,
            cnt,
            index,
            bucket,
            alignment,
            alignmentSpace = 4 * 2;

        this.genomicInterval.packedAlignments = [];

        while (allocatedCount < this.genomicInterval.features.length) {

            alignmentRow = [];
            while (nextStart <= this.genomicInterval.end) {

                bucket = Math.NaN;
                cnt = 0;
                while (bucket === Math.NaN && nextStart <= this.genomicInterval.end) {

                    ++cnt;
                    index = nextStart - this.genomicInterval.features[0].start;
                    if (Math.NaN === bucketList[index]) {
                        ++nextStart;
                    } else {
                        bucket = bucketList[index];
                    }

                } // while (bucket)

                if (Math.NaN === bucket) continue;

                alignment = bucket.pop();
                if (0 === bucket.length) {
                    bucketList[index] = bucket = Math.NaN;
                }

                alignmentRow.push(alignment);
                nextStart = alignment.start + myself.alignmentBlocksBBoxLength(alignment) + alignmentSpace;
                ++allocatedCount;

            } // while (nextStart)

            if (alignmentRow.length > 0) {
                this.genomicInterval.packedAlignments.push(alignmentRow);
            }

            nextStart = this.genomicInterval.features[0].start;

        } // while (allocatedCount)

//        continuation(this.genomicInterval.packedAlignments);
        continuation(this);
    };

    igv.AlignmentManager.prototype.alignmentBlocksBBoxLength = function(alignment) {

        var first = alignment.blocks[ 0 ],
            last  = alignment.blocks[ alignment.blocks.length - 1 ];

        return (last.start + last.len) - first.start;
    };

    igv.AlignmentManager.prototype.alignmentBlockHitTest = function(alignment, genomicLocation) {

        var loc = igv.numberFormatter(genomicLocation),
            ss = igv.numberFormatter(alignment.start),
            ee = igv.numberFormatter(alignment.start + this.alignmentBlocksBBoxLength(alignment)),
            alignmentBlocksBBoxLength = this.alignmentBlocksBBoxLength(alignment),
            readChar;

        if ((alignment.start + alignmentBlocksBBoxLength) < genomicLocation) {
            return undefined;
        }
        else if (alignment.start > genomicLocation) {
            return undefined;
        } else if (0 === alignment.blocks.len) {
            return undefined;
        }

        readChar = undefined;
        alignment.blocks.forEach(function (block) {

            var index;


            if (undefined === readChar) {

                if ("*" === block.seq) {
                    return
                }

                if (genomicLocation < block.start) {
                    return;
                }

                if (genomicLocation > block.start + block.seq.length) {
                    return;
                }

                index = genomicLocation - block.start;
                readChar = block.seq.charAt( index );
            }

        });

        return readChar;
    };


    function qualityToAlpha(quality) {

        if (quality <  5) return  0.1;
        if (quality > 20) return 20.0;

        return Math.max(0.1, Math.min(1.0, 0.1 + 0.9 * (quality - 5) / (20 - 5)));
    }

    return igv;

})(igv || {});

