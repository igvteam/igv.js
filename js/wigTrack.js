/**
 * Created by turner on 2/11/14.
 */
var igv = (function (igv) {


    igv.WIGTrack = function (config) {
        this.url = config.url;
        this.featureSource = new igv.WIGFeatureSource(this.url);
        this.label = config.label;
        this.id = config.id || this.label;
        this.height = 100;

    };

    /**
     *
     * @param canvas -- a "fabric canvas",  fabricjs.com  (not a Canvas2D)
     * @param bpStart
     * @param bpEnd
     * @param width
     * @param height
     * @param continuation
     */

    //  this.track.draw(igvCanvas, refFrame, tileStart, tileEnd, buffer.width, buffer.height, function () {

    igv.WIGTrack.prototype.draw = function (canvas, refFrame, bpStart, bpEnd, width, height, continuation) {

        var chr = refFrame.chr;

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

                canvas.fillRect(rectOrigin, rectBaseline, rectWidth, rectHeight, {fillStyle: igv.randomRGB(32, 224)});

            }
        });
    };


    igv.WIGTrack.prototype.drawLabel = function (ctx) {
        // draw label stuff
    };

    return igv;

})(igv || {});
