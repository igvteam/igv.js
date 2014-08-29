var igv = (function (igv) {


    var createEQTL = function (tokens) {
        var snp = tokens[0];
        var chr = tokens[1];
        var position = parseInt(tokens[2]) - 1;
        var geneId = tokens[3]
        var geneName = tokens[4];
        var genePosition = tokens[5];
        var fStat = parseFloat(tokens[6]);
        var pValue = parseFloat(tokens[7]);
        return new Eqtl(snp, chr, position, geneId, geneName, genePosition, fStat, pValue);
    }

    var createEqtlBinary = function (parser) {

        var snp = parser.getString();
        var chr = parser.getString();
        var position = parser.getInt();
        var geneId = parser.getString();
        var geneName = parser.getString();
        //var genePosition = -1;
        //var fStat = parser.getFloat();
        var pValue = parser.getFloat();
        //var qValue = parser.getFloat();
        //return new Eqtl(snp, chr, position, geneId, geneName, genePosition, fStat, pValue);
        return new Eqtl(snp, chr, position, geneId, geneName, pValue);
    }


    igv.EqtlTrack = function (url, label) {


        var codec = url.endsWith(".bin") ? createEqtlBinary : createEQTL;

        this.file = url;
        this.featureSource = new igv.EqtlSource(url, codec);
        this.id = label.replace(/ /g, '_');
        this.label = label;
        this.minLogP = 3.5;
        this.maxLogP = 25;
        this.height = this.preferredHeight;    // The preferred height
    }

    igv.EqtlTrack.prototype.preferredHeight = 100;


    igv.EqtlTrack.prototype.paintControl = function (canvas, pixelWidth, pixelHeight) {

        var track = this,
            yScale = (track.maxLogP - track.minLogP) / pixelHeight;

        var font = {'font': 'normal 10px Arial',
            'textAlign': 'right',
            'strokeStyle': "black"};

        canvas.fillRect(0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        for (var p = 4; p <= track.maxLogP; p += 2) {
            var yp = pixelHeight - Math.round((p - track.minLogP) / yScale);
            // TODO: Dashes may not actually line up with correct scale. Ask Jim about this
            canvas.strokeLine(45, yp - 2, 50, yp - 2, font); // Offset dashes up by 2 pixel
            canvas.fillText(p, 44, yp + 2, font); // Offset numbers down by 2 pixels; TODO: error
        }


        font['textAlign'] = 'center';


        canvas.fillText("-log10(pvalue)", pixelWidth / 2, pixelHeight / 2, font, {rotate: {angle: -90}});


    };

    /**
     *
     * @param canvas   an igv.Canvas
     * @param bpStart
     * @param bpEnd
     * @param pixelWidth
     * @param pixelHeight
     * @param continuation  -  Optional.   called on completion, no arguments.
     * @param task - Optional.  Represents the current task (computation)
     */
    igv.EqtlTrack.prototype.draw = function (canvas, refFrame, bpStart, bpEnd, pixelWidth, pixelHeight, continuation, task) {

        var track = this,
            chr = refFrame.chr,
            yScale = (track.maxLogP - track.minLogP) / pixelHeight;

        this.featureSource.getFeatures(chr, bpStart, bpEnd, function (featureList) {

            if (featureList) {

                var len = featureList.length;


                canvas.save();

                // Background
                canvas.setProperties({fillStyle: "rgb(250, 250, 250)"});
                canvas.fillRect(0, 0, pixelWidth, pixelHeight);


                function drawEqtls(drawSelected) {

                    var radius = drawSelected ? 4 : 2,
                        eqtl, i, px, py, color, isSelected, snp, geneName;


                    //ctx.fillStyle = igv.selection.colorForGene(eqtl.geneName);
                    canvas.setProperties({
                        fillStyle: "rgb(180, 180, 180)",
                        strokeStyle: "rgb(180, 180, 180)"});

                    for (i = 0; i < len; i++) {

                        eqtl = featureList[i];
                        snp = eqtl.snp.toUpperCase();
                        geneName = eqtl.geneName.toUpperCase();

                        isSelected = igv.selection &&
                            (igv.selection.snp === snp || igv.selection.gene === geneName);

                        if(drawSelected && !isSelected) continue;

                        // Add eqtl's gene to the selection if this is the selected snp.
                        // TODO -- this should not be done here in the rendering code.
                        if (igv.selection && igv.selection.snp === snp) {
                            igv.selection.addGene(geneName);
                        }

                        if (drawSelected && igv.selection) {
                            color = igv.selection.colorForGene(geneName);
                        }

                        if(drawSelected && color === undefined) continue;   // This should be impossible



                        px = refFrame.toPixels(Math.round(eqtl.position - bpStart + 0.5));
                        if (px < 0) continue;
                        else if (px > pixelWidth) break;

                        py = Math.max(0, pixelHeight - Math.round((eqtl.mLogP - track.minLogP) / yScale));
                        eqtl.px = px;
                        eqtl.py = py;

                        if (color) canvas.setProperties({fillStyle: color, strokeStyle: "black"});
                        canvas.fillCircle(px, py, radius);
                        canvas.strokeCircle(px, py, radius);
                    }
                }

                // Draw in two passes, with "selected" eqtls drawn last
                drawEqtls(false);
                drawEqtls(true);


                canvas.restore();

            }
            continuation(task);

        },
        task);
    }



    return igv;

})(igv || {});