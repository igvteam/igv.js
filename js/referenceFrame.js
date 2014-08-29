// Reference frame classes.  Converts domain coordinates (usually genomic) to pixel coordinates

var igv = (function (igv) {


    igv.ReferenceFrame = function (chr, start, bpPerPixel) {
        this.chr = chr;
        this.start = start;
        this.bpPerPixel = bpPerPixel;
    }

    igv.ReferenceFrame.prototype.toPixels = function (bp) {
        // TODO -- do we really need ot round this?
        return bp / this.bpPerPixel;
    }

    igv.ReferenceFrame.prototype.toBP = function(pixels) {
        return this.bpPerPixel * pixels;
    }

    igv.ReferenceFrame.prototype.shiftPixels = function(pixels) {
        this.start += pixels * this.bpPerPixel;
    }

    igv.ReferenceFrame.prototype.description = function() {
        return "ReferenceFrame " + this.chr + " " + igv.numberFormatter(Math.floor(this.start)) + " bpp " + this.bpPerPixel;
    }


    return igv;

})(igv || {})