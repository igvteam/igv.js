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


    igv.EqtlTrack = function (config) {


        var url = config.url,
            label = config.label,
            codec = url.endsWith(".bin") ? createEqtlBinary : createEQTL;

        this.config = config;
        this.url = url;
        this.featureSource = new igv.EqtlSource(url, codec);
        this.label = label;
        this.minLogP = config.minLogP || 3.5;
        this.maxLogP = config.maxLogP || 25;
        this.background = config.background;    // No default
        this.divider = config.divider || "rgb(225,225,225)";
        this.dotSize = config.dotSize || 2;
        this.height = config.height || 100;    // The preferred height

        this.onsearch = function (feature, source) {
            selectedFeature.call(this, feature, source);
        }
    }

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

        // Background
        if (this.background) canvas.fillRect(0, 0, pixelWidth, pixelHeight, {'fillStyle': this.background});
        canvas.strokeLine(0, pixelHeight - 1, pixelWidth, pixelHeight - 1, {'strokeStyle': this.divider});

        this.featureSource.getFeatures(chr, bpStart, bpEnd, function (featureList) {

                if (featureList) {

                    var len = featureList.length;


                    canvas.save();


                    // Draw in two passes, with "selected" eqtls drawn last
                    drawEqtls(false);
                    drawEqtls(true);


                    canvas.restore();

                }
                continuation(task);


                function drawEqtls(drawSelected) {

                    var radius = drawSelected ? 2 * track.dotSize : track.dotSize,
                        eqtl, i, px, py, color, isSelected, snp, geneName, selection;


                    //ctx.fillStyle = igv.selection.colorForGene(eqtl.geneName);
                    canvas.setProperties({
                        fillStyle: "rgb(180, 180, 180)",
                        strokeStyle: "rgb(180, 180, 180)"});

                    for (i = 0; i < len; i++) {

                        eqtl = featureList[i];
                        snp = eqtl.snp.toUpperCase();
                        geneName = eqtl.geneName.toUpperCase();
                        selection = track.selection;
                        isSelected = selection &&
                            (selection.snp === snp || selection.gene === geneName);

                        if (drawSelected && !isSelected) continue;

                        // Add eqtl's gene to the selection if this is the selected snp.
                        // TODO -- this should not be done here in the rendering code.
                        if (selection && selection.snp === snp) {
                            selection.addGene(geneName);
                        }

                        if (drawSelected && track.selection) {
                            color = selection.colorForGene(geneName);
                        }

                        if (drawSelected && color === undefined) continue;   // This should be impossible


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

            },
            task);
    }


    function selectedFeature(feature, source) {
        console.log(feature + " " + source);

        // TODO -- temporary hack, determine type from the source
        var type = source === "gtex" ? "snp" : "gene";

        this.selection = new GtexSelection(type == 'gene' ? {gene: feature} : {snp: feature});
        igv.browser.update();
    }


    GtexSelection = function (selection) {

        this.geneColors = {};
        this.gene = null;
        this.snp = null;
        this.genesCount = 0;

        if (selection.gene) {
            this.gene = selection.gene.toUpperCase();
            this.geneColors[this.gene] = brewer[this.genesCount++];

        }
        if (selection.snp) {
            this.snp = selection.snp.toUpperCase();
        }

    }

    GtexSelection.prototype.addGene = function (geneName) {
        if (!this.geneColors[geneName.toUpperCase()]) {
            this.geneColors[geneName.toUpperCase()] = brewer[this.genesCount++];
        }
    }

    GtexSelection.prototype.colorForGene = function (geneName) {
        return this.geneColors[geneName.toUpperCase()];
    }

    var brewer = new Array();
// Set +!
    brewer.push("rgb(228,26,28)");
    brewer.push("rgb(55,126,184)");
    brewer.push("rgb(77,175,74)");
    brewer.push("rgb(166,86,40)");
    brewer.push("rgb(152,78,163)");
    brewer.push("rgb(255,127,0)");
    brewer.push("rgb(247,129,191)");
    brewer.push("rgb(153,153,153)");
    brewer.push("rgb(255,255,51)");

// #Set 2
    brewer.push("rgb(102, 194, 165");
    brewer.push("rgb(252, 141, 98");
    brewer.push("rgb(141, 160, 203");
    brewer.push("rgb(231, 138, 195");
    brewer.push("rgb(166, 216, 84");
    brewer.push("rgb(255, 217, 47");
    brewer.push("rgb(229, 196, 148");
    brewer.push("rgb(179, 179, 179");

//#Set 3
    brewer.push("rgb( 141, 211, 199");
    brewer.push("rgb(255, 255, 179");
    brewer.push("rgb(190, 186, 218");
    brewer.push("rgb(251, 128, 114");
    brewer.push("rgb(128, 177, 211");
    brewer.push("rgb(253, 180, 98");
    brewer.push("rgb(179, 222, 105");
    brewer.push("rgb(252, 205, 229");
    brewer.push("rgb(217, 217, 217");
    brewer.push("rgb(188, 128, 189");
    brewer.push("rgb(204, 235, 197");
    brewer.push("rgb(255, 237, 111");


    return igv;

})(igv || {});