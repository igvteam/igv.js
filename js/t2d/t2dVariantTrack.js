// Simple variant track for mpg prototype


var igv = (function (igv) {

    var neutralColor = "rgb(150,150,150)",
        posConsColor = "rgb(0, 0, 150)",
        posProtColor = "rgb(150, 0, 0)";

    igv.MpgTrack = function (url) {
        this.url = url;
        this.featureSource = new igv.MpgFeatureSource(url);
        this.label = "Variants";
        this.id = "variants";
        this.height = 50;   // The preferred height
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
    igv.MpgTrack.prototype.draw = function (canvas, refFrame, bpStart, bpEnd, pixelWidth, pixelHeight, continuation, task) {

        var chr, queryChr;

        chr = refFrame.chr;

        queryChr = (chr.startsWith("chr") ? chr.substring(3) : chr);

        // Don't try to draw variants for windows > 3 mb
        if (bpEnd - bpStart > 3100000) {

            canvas.fillText("Zoom in to see variants", 600, 10);
            continuation();
            return;
        }


        canvas.fillRect(0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});


        this.featureSource.getFeatures(queryChr, bpStart, bpEnd, function (featureList) {

                var variant, len, xScale, px, px1, pw, py, color;

                if (featureList) {

                    len = featureList.length;

                    py = 20;

                    for (var i = 0; i < len; i++) {
                        variant = featureList[i];
                        if (variant.POS < bpStart) continue;
                        if (variant.POS > bpEnd) break;

                        if (variant.Protein_change) {
                            color = posProtColor;
                        }
                        else if (variant.Consequence) {
                            color = posConsColor;
                        } else {
                            color = neutralColor;
                        }

                        xScale = refFrame.bpPerPixel;

                        px = Math.round((variant.POS - 1 - bpStart) / xScale);
                        px1 = Math.round((variant.POS - bpStart) / xScale);
                        pw = Math.max(1, px1 - px);

                        // Create a small gap if there is room.
                        if(pw > 3) {
                            px ++;
                            pw -= 2;
                        }

                        canvas.fillRect(px, py, pw, 10, {'fillStyle': color});

                    }
                }

                if (continuation) continuation();
            },
            task);
    };

    igv.MpgTrack.prototype.drawLabel = function (ctx) {
//        ctx.save();
//        ctx.textAlign = 'right';
//        ctx.verticalAlign = 'center';
//        ctx.strokeStyle = "black";
//        ctx.fillText(this.label, 90, this.height / 2);
//        ctx.restore();

    }

    return igv;

})(igv || {});