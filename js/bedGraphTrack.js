/**
 * Created by turner on 2/11/14.
 */
var igv = (function (igv) {


    igv.BEDGraphTrack = function (config) {
        this.url = config.url;
        this.featureSource = new igv.BedFeatureSource(this.url);
        this.label = config.label;
        this.id = config.id || this.label;
        this.height = 100;

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

    igv.BEDGraphTrack.prototype.draw = function (canvas, refFrame, bpStart, bpEnd, width, height, continuation) {

        var chr = refFrame.chr;

        this.featureSource.getFeatures(chr, bpStart, bpEnd, function (features) {

            if (features) {

                // do stuff

            }

            continuation();

            function renderFeature(feature, index, featureList) {

                // do stuff

            }
        });
    };


    igv.BEDGraphTrack.prototype.drawLabel = function (ctx) {

        // do stuff

    };

    return igv;

})(igv || {});
