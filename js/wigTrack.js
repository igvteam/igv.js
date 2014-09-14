/**
 * Created by turner on 2/11/14.
 */
var igv = (function (igv) {


    igv.WIGTrack = function (descriptor) {

        this.descriptor = descriptor;
        this.url = descriptor.url;

        if (this.url.endsWith(".bedgraph")) {
            this.featureSource = new igv.BEDGraphFeatureSource(this.url);
        } else {
            this.featureSource = new igv.WIGFeatureSource(this.url);
        }

        this.label = descriptor.label;
        this.id = descriptor.id || this.label;
        this.color = descriptor.color || "rgb(150,150,150)"
        this.height = 100;
        this.order = descriptor.order;

    };

    /**
     *
     * @param canvas -- a "fabric canvas",  fabricjs.com  (not a Canvas2D)
     * @param refFrame
     * @param bpStart
     * @param bpEnd
     * @param width
     * @param height
     * @param continuation
     */

    //  this.track.draw(igvCanvas, refFrame, tileStart, tileEnd, buffer.width, buffer.height, function () {

    igv.WIGTrack.prototype.draw = function (canvas, refFrame, bpStart, bpEnd, width, height, continuation) {

        var track=this,
            chr = refFrame.chr;

        this.featureSource.getFeatures(chr, bpStart, bpEnd, function (features) {

            var featureMin, featureMax, denom;

            if (features) {
                featureMin = features.minimum;
                featureMax = features.maximum;
                denom = featureMax - featureMin;
                features.featureList.forEach(renderFeature);
            }

            continuation();

            function renderFeature(feature, index, featureList) {

                var centroid = 128,
                    delta = 32,
                    rectOrigin,
                    rectEnd,
                    rectWidth,
                    rectHeight,
                    rectBaseline,
                    rect;

                if (feature.end < bpStart) return;
                if (feature.start > bpEnd) return;

                rectOrigin = refFrame.toPixels(feature.start - bpStart);
                rectEnd = refFrame.toPixels(feature.end - bpStart);
                rectWidth = Math.max(1, rectEnd - rectOrigin);
                rectHeight = ((feature.value - featureMin) / denom) * height;
                rectBaseline = height - rectHeight;

                canvas.fillRect(rectOrigin, rectBaseline, rectWidth, rectHeight, {fillStyle: track.color});

            }
        });
    };


    igv.WIGTrack.prototype.drawLabel = function (ctx) {
        // draw label stuff
    };

    return igv;

})(igv || {});
