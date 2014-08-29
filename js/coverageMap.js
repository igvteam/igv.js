/**
 * Created by turner on 3/21/14.
 */
var igv = (function (igv) {

    /**
     * @param genomicInterval - genomic interval
     * @param refSeq - reference sequence
     * @constructor
     */
    var allBases = ["A", "C", "T", "G", "N"];
    var threshold = 0.2;

    function Coverage() {
        this.posA = 0;
        this.negA = 0;

        this.posT = 0;
        this.negT = 0;

        this.posC = 0;
        this.negC = 0;
        this.posG = 0;

        this.negG = 0;

        this.posN = 0;
        this.negN = 0;

        this.pos = 0;
        this.neg = 0;

        this.qualA = 0;
        this.qualT = 0;
        this.qualC = 0;
        this.qualG = 0;
        this.qualN = 0;

        this.qual = 0;

        this.total = 0;
    }

    Coverage.prototype.isMismatch = function (refBase) {
        var sum = 0,
            that = this;
        allBases.forEach(function (base) {
            var key = "qual" + base;
            if (base !== refBase) {
                sum += that[key];
            }
        });
        return sum / this.qual > 0;

    }

    Coverage.prototype.mismatchPercentages = function(refBase) {

        var fractions = [],
            that=this;

        allBases.forEach(function (base) {
            var bTotal;
            if (base !== refBase) {
                bTotal = that["pos" + base] + that["neg" + base];
                fractions.push({base: base, percent: bTotal/that.total})
            }
        });

        fractions.sort(function(a, b) {
            return a.percent - b.percent;
        });

        return fractions;
    }

    igv.CoverageMap = function (genomicInterval, refSeq) {

        var thisCoverageMap;

        this.prefixes = [ "pos", "neg", "qual" ];
        this.bases = [ "A", "T", "C", "G", "N" ];

        this.refSeq = refSeq;
        this.bpStart = genomicInterval.start;
        this.length = (genomicInterval.end - genomicInterval.start);

        this.coverage = new Array(this.length);

        this.maximum = 0;
        thisCoverageMap = this;
        genomicInterval.features.forEach(function (alignment) {

            alignment.blocks.forEach(function (block) {

                var key,
                    base,
                    i,
                    j,
                    q;

                for (i = block.start - thisCoverageMap.bpStart, j = 0; j < block.len; i++, j++) {

                    if (!thisCoverageMap.coverage[ i ]) thisCoverageMap.coverage[i] = new Coverage();

                    base = block.seq.charAt(j);
                    key = (alignment.strand) ? "pos" + base : "neg" + base;
                    q = block.qual.charCodeAt(j);

                    thisCoverageMap.coverage[ i ][ key ] += 1;
                    thisCoverageMap.coverage[ i ][ "qual" + base ] += q;

                    thisCoverageMap.coverage[i].total += 1;
                    thisCoverageMap.coverage[i].qual += q;

                    thisCoverageMap.maximum = Math.max(thisCoverageMap.coverage[ i ].total, thisCoverageMap.maximum);
                }

            });
        });

    };

    return igv;

})(igv || {});
