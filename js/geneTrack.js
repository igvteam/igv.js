var igv = (function (igv) {

    igv.GeneTrack = function (config) {
        this.config = config;
        this.url = config.url;
        this.featureSource = new igv.BedFeatureSource(this.config);
        this.label = config.label;
        this.id = config.id || config.label;
        this.height = 100;
        this.minHeight = this.height;
        this.maxHeight = this.height;
        this.order = config.order;

        this.render = igv.renderGene;
    };

    /**
     *
     * @param canvas   an igv.Canvas
     * @param refFrame
     * @param bpStart
     * @param bpEnd
     * @param pixelWidth
     * @param pixelHeight
     * @param continuation  -  Optional.   called on completion, no arguments.
     */
    igv.GeneTrack.prototype.draw = function (canvas, refFrame, bpStart, bpEnd, pixelWidth, pixelHeight, continuation, task) {

//        console.log("geneTrack.draw " + refFrame.chr);

        var chr =  refFrame.chr,
            track = this;

        canvas.fillRect(0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});


        this.featureSource.getFeatures(chr, bpStart, bpEnd, function (featureList) {

                var gene, len;

            if (featureList) {

                len = featureList.length;

//                console.log("geneTrack.featureSource.getFeatures " + featureList.length);

                canvas.setProperties({fillStyle: "rgb(150,150,150)", strokeStyle: "rgb(150,150,150)"});

                for (var i = 0; i < len; i++) {
                    gene = featureList[i];
                    if (gene.end < bpStart) continue;
                    if (gene.start > bpEnd) break;

                    track.render(gene, bpStart, refFrame.bpPerPixel, canvas);
                }
            }
            else {
                console.log("No feature list");
            }

            if (continuation) continuation();
        },
        task);
    };

    igv.GeneTrack.prototype.drawLabel = function (ctx) {
//        ctx.save();
//        ctx.textAlign = 'right';
//        ctx.verticalAlign = 'center';
//        ctx.strokeStyle = "black";
//        ctx.fillText(this.label, 90, this.height / 2);
//        ctx.restore();

    }

    return igv;

})(igv || {});