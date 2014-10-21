/**
 * Created by turner on 2/18/14.
 */
var igv = (function (igv) {

    igv.SEGTrack = function (config) {
        this.url = config.url;        
        this.label = config.label;
        this.id = config.id || config.label;
        this.height = 100;   // The preferred height
        this.featureSource = new igv.SEGFeatureSource(this.url);        
    }

    /**
     *
     * @param canvas - an igv.Canvas
     * @param bpStart
     * @param bpEnd
     * @param width
     * @param height
     * @param continuation
     */
    igv.SEGTrack.prototype.draw = function (canvas, refFrame, bpStart, bpEnd, width, height, continuation) {

        var chr = refFrame.chr;
        this.featureSource.getFeatures(chr, bpStart, bpEnd, function (featureList) {

            if (featureList) {

                var pxStart,
                    pxEnd,
                    pxWidth,
                    featureListLength = featureList.features.length,
                    feature,
                    featureHeight,
                    baseline,
                    denom = featureList.maximum - featureList.minimum;

                for (var i = 0; i < featureListLength; i++) {

                    feature = featureList.features[i];

                    if (feature.end < bpStart) continue;
                    if (feature.start > bpEnd) break;

                    pxStart = refFrame.toPixels(feature.start - bpStart);
                    pxEnd = refFrame.toPixels(feature.end - bpStart);
                    pxWidth = Math.max(1, pxEnd - pxStart);

                    featureHeight = ((feature.value - featureList.minimum) / denom) * height;

                    baseline = height - featureHeight;

                    // Use random colors to disambiguate features during implementation of WIG renderer
                    canvas.fillRect(pxStart, baseline, pxWidth, featureHeight, {fillStyle: igv.randomRGB(0, 255)});

                }
            }

            continuation();

        });
    };

    igv.SEGTrack.prototype.drawLabel = function (ctx) {
        // draw label stuff
    };

    return igv;

})(igv || {});
