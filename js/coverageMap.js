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
            myself = this;
        allBases.forEach(function (base) {
            var key = "qual" + base;
            if (base !== refBase) {
                sum += myself[key];
            }
        });
        return sum / this.qual > 0;

    };

    Coverage.prototype.mismatchPercentages = function(refBase) {

        var fractions = [],
            myself = this;

        allBases.forEach(function (base) {
            var bTotal;
            if (base !== refBase) {
                bTotal = myself["pos" + base] + myself["neg" + base];
                fractions.push({base: base, percent: bTotal/myself.total})
            }
        });

        fractions.sort(function(a, b) {
            return a.percent - b.percent;
        });

        return fractions;
    };

    igv.CoverageMap = function (genomicInterval, refSeq) {

        var myself;

        this.prefixes = [ "pos", "neg", "qual" ];
        this.bases = [ "A", "T", "C", "G", "N" ];

        this.refSeq = refSeq;
        this.chr = genomicInterval.chr;
        this.bpStart = genomicInterval.start;
        this.length = (genomicInterval.end - genomicInterval.start);

        this.coverage = new Array(this.length);

        this.maximum = 0;
        myself = this;
        genomicInterval.features.forEach(function (alignment) {

            alignment.blocks.forEach(function (block) {

                var key,
                    base,
                    i,
                    j,
                    q;

                for (i = block.start - myself.bpStart, j = 0; j < block.len; i++, j++) {

                    if (!myself.coverage[ i ]) {
                        myself.coverage[ i ] = new Coverage();
                    }

                    base = block.seq.charAt(j);
                    key = (alignment.strand) ? "pos" + base : "neg" + base;
                    q = block.qual.charCodeAt(j);

                    myself.coverage[ i ][ key ] += 1;
                    myself.coverage[ i ][ "qual" + base ] += q;

                    myself.coverage[ i ].total += 1;
                    myself.coverage[ i ].qual += q;

                    myself.maximum = Math.max(myself.coverage[ i ].total, myself.maximum);
                }

            });
        });

//        console.log("CoverageMap - chr " + this.chr + " start " + igv.numberFormatter(this.bpStart) + " length " + igv.numberFormatter(this.length));

    };

    igv.CoverageMap.prototype.coverageAtGenomicLocation = function (genomicLocation) {

        var index = genomicLocation - this.bpStart;

        if (index < 0 || index >= this.coverage.length) {

            return {};
        } else {

            return coverage[ index ];
        }


    };

    return igv;

})(igv || {});
