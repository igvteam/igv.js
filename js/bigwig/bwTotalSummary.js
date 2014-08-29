/**
 * Created by jrobinso on 4/7/14.
 */


var igv = (function (igv) {


    igv.BWTotalSummary = function (byteBuffer) {

        if (byteBuffer) {

            this.basesCovered = byteBuffer.getLong();
            this.minVal = byteBuffer.getDouble();
            this.maxVal = byteBuffer.getDouble();
            this.sumData = byteBuffer.getDouble();
            this.sumSquares = byteBuffer.getDouble();

            computeStats.call(this);
        }
        else {
            this.basesCovered = 0;
            this.minVal = 0;
            this.maxVal = 0;
            this.sumData = 0;
            this.sumSquares = 0;
            this.mean = 0;
            this.stddev = 0;
        }
    }


    function computeStats() {
        var n = this.basesCovered;
        if (n > 0) {
            this.mean = this.sumData / n;
            this.stddev = Math.sqrt((this.sumSquares - (this.sumData / n) * this.sumData) / (n - 1));
        }
    }

    igv.BWTotalSummary.prototype.updateStats = function (stats) {

        this.basesCovered += stats.count;
        this.sumData += status.sumData;
        this.sumSquares += sumSquares;
        this.minVal = MIN(_minVal, min);
        this.maxVal = MAX(_maxVal, max);

        computeStats.call(this);

    }


    return igv;

})(igv || {});