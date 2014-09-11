// Simple variant track for mpg prototype


var igv = (function (igv) {


    igv.T2dTrack = function (config) {
        this.url = config.url;
        this.featureSource = new igv.MpgFeatureSource(config);
        this.label = config.label;
        this.id = config.trait;
        this.height = 100;   // The preferred height
        this.minLogP = 0;
        this.maxLogP = 10;

        this.colorScale = new BinnedColorScale(
            [5e-8, 5e-4, 0.5],
            ["rgb(255,50,50)", "rgb(251,100,100)", "rgb(251,170,170)", "rgb(227,238,249)"]
        );
    }



    /**
     *
     * @param canvas   an igv.Canvas
     * @param bpStart
     * @param bpEnd
     * @param pixelWidth
     * @param pixelHeight
     * @param continuation  -  Optional.   called on completion, no arguments.
     *
     * "ID", "CHROM", "POS", "DBSNP_ID", "Consequence", "Protein_change"
     */
    igv.T2dTrack.prototype.draw = function (canvas, refFrame, bpStart, bpEnd, pixelWidth, pixelHeight, continuation, task) {

        var chr,
            queryChr,
            track=this,
            chr = refFrame.chr,
            yScale = (track.maxLogP - track.minLogP) / pixelHeight,
            radius=3;

        queryChr = (chr.startsWith("chr") ? chr.substring(3) : chr);

        // Don't try to draw variants for windows > 3 mb
//        if (bpEnd - bpStart > 3100000) {
//
//            canvas.fillText("Zoom in to see variants", 600, 10);
//            continuation();
//            return;
//        }


        canvas.fillRect(0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(230, 230, 230)"});


        this.featureSource.getFeatures(queryChr, bpStart, bpEnd, function (featureList) {

                var variant, len, xScale, px, px1, pw, py, color, pvalue, val;

                if (featureList) {

                    len = featureList.length;

                    py = 20;

                    for (var i = 0; i < len; i++) {

                        variant = featureList[i];
                        if (variant.POS < bpStart) continue;
                        if (variant.POS > bpEnd) break;

                        pvalue = variant.PVALUE;
                        if(!pvalue) continue;

                        color = track.colorScale.getColor(pvalue);
                        val = -Math.log(pvalue)/2.302585092994046;

                        xScale = refFrame.bpPerPixel;

                        px = Math.round((variant.POS - bpStart) / xScale);

                        py = Math.max(0, pixelHeight - Math.round((val - track.minLogP) / yScale));

                        if (color) canvas.setProperties({fillStyle: color, strokeStyle: "black"});
                        canvas.fillCircle(px, py, radius);
                        //canvas.strokeCircle(px, py, radius);


                    }
                }

              //  canvas.setProperties({fillStyle: "rgb(250, 250, 250)"});
              //  canvas.fillRect(0, 0, pixelWidth, pixelHeight);



                if (continuation) continuation();
            },
            task);
    };



    igv.T2dTrack.prototype.paintControl = function (canvas, pixelWidth, pixelHeight) {

        var track = this,
            yScale = (track.maxLogP - track.minLogP) / pixelHeight;

        var font = {'font': 'normal 10px Arial',
            'textAlign': 'right',
            'strokeStyle': "black"};

        canvas.fillRect(0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        for (var p = 2; p < track.maxLogP; p += 2) {
            var yp = pixelHeight - Math.round((p - track.minLogP) / yScale);
            // TODO: Dashes may not actually line up with correct scale. Ask Jim about this
            canvas.strokeLine(45, yp - 2, 50, yp - 2, font); // Offset dashes up by 2 pixel
            canvas.fillText(p, 44, yp + 2, font); // Offset numbers down by 2 pixels; TODO: error
        }


        font['textAlign'] = 'center';


        canvas.fillText("-log10(pvalue)", pixelWidth / 2, pixelHeight / 2, font, {rotate: {angle: -90}});


    };


    // TODO -- generalize this class and move to top level
    /**
     *
     * @param thresholds - array of threshold values defining bin boundaries in ascending order
     * @param colors - array of colors for bins  (length == thresholds.length + 1)
     * @constructor
     */
    var BinnedColorScale = function(thresholds, colors) {
        this.thresholds = thresholds;
        this.colors = colors;
    }

    BinnedColorScale.prototype.getColor = function(value) {

        var i, len=this.thresholds.length;

        for(i=0; i<len; i++) {
            if(value < this.thresholds[i]) {
                return this.colors[i];
            }
        }

        return this.colors[this.colors.length - 1];

    }

    return igv;

})(igv || {});