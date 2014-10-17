//
// Chromosome ideogram
//

var igv = (function (igv) {

    igv.IdeoPanel = function (parentElement) {

        this.ideograms = {};

        this.div = $('<div class="igv-ideogram-div"></div>')[0];
        $(parentElement).append(this.div);

        var contentDiv = $('<div class="igv-ideogram-content-div"></div>')[0];
        $(this.div).append(contentDiv);
        contentDiv.style.left = igv.browser.controlPanelWidth + "px";

        var canvas = $('<canvas class="igv-ideogram-canvas"></canvas>')[0];
        $(contentDiv).append(canvas);
        canvas.setAttribute('width', contentDiv.clientWidth);
        canvas.setAttribute('height', contentDiv.clientHeight);
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");


        var chromosomeNameDiv = $('<div class="igv-ideogram-chr-div"></div>')[0];
        chromosomeNameDiv.style.width = igv.browser.controlPanelWidth + "px";
        this.div.appendChild(chromosomeNameDiv);

        var chrNameLabel = $('<div style="text-align:right;padding-right: 5px"></div>')[0];
        $(chromosomeNameDiv).append(chrNameLabel)

        this.chromosomeNameLabel = chrNameLabel;


        //  var chromosomeNameCanvas = $('<canvas style="position:absolute;width:100%;height:100%"></canvas>')[0];
        //  chromosomeNameCanvas.setAttribute('width', chromosomeNameDiv.clientWidth);
        //  chromosomeNameCanvas.setAttribute('height', chromosomeNameCanvas.clientHeight);


        this.canvas = canvas;
        contentDiv.appendChild(canvas);

        this.ctx = canvas.getContext("2d");

        //  this.chromosomeNameCanvas = chromosomeNameCanvas;
        //  chromosomeNameDiv.appendChild(chromosomeNameCanvas);

        //  this.chromosomeNameCtx = chromosomeNameCanvas.getContext("2d");
        //  this.chromosomeNameCtx.font = "bold 10px Arial";

        this.canvas.onclick = function (e) {

            var canvasCoords = igv.translateMouseCoordinates(e, canvas),
                mouseX = canvasCoords.x,
                referenceFrame = igv.browser.referenceFrame,
                chromosome = igv.browser.genome.getChromosome(igv.browser.referenceFrame.chr),
                viewportWidth = canvas.clientWidth,
                bp = chromosome.bpLength * mouseX / viewportWidth;

            this.getContext("2d").fillRect(mouseX, 0, 10, 10);

            igv.browser.goto(referenceFrame.chr, bp);
        }

    }

    igv.IdeoPanel.prototype.resize = function () {

        var contentHeight = this.div.clientHeight,
            contentWidth = this.div.clientWidth,
            canvas = this.canvas;
        canvas.setAttribute('width', contentWidth);    //Must set the width & height of the canvas
        canvas.setAttribute('height', contentHeight);


        this.ideograms = {};
        this.repaint();
    }

    igv.IdeoPanel.prototype.repaint = function () {

        try {
            var genome = igv.browser.genome,
                referenceFrame = igv.browser.referenceFrame,
                stainColors = [],
                w = this.canvas.width,
                h = this.canvas.height;
            this.ctx.clearRect(0, 0, w, h);

            if (!(genome && genome.getChromosome(referenceFrame.chr))) return;

            var image = this.ideograms[igv.browser.referenceFrame.chr];
            if (!image) {
                image = document.createElement('canvas');
                image.width = w;
                image.height = 13;
                var bufferCtx = image.getContext('2d');
                drawIdeogram(bufferCtx, w, 13);
                this.ideograms[igv.browser.referenceFrame.chr] = image;
            }
            this.ctx.drawImage(image, 0, 10);

            // Draw red box
            this.ctx.save();
            var chromosome = igv.browser.genome.getChromosome(igv.browser.referenceFrame.chr);
            var ideoScale = w / chromosome.bpLength;
            var widthBP = w * igv.browser.referenceFrame.bpPerPixel;
            if (widthBP < chromosome.bpLength) {
                var boxPX = Math.round(igv.browser.referenceFrame.start * ideoScale);
                var boxW = Math.max(1, Math.round(widthBP * ideoScale));
                this.ctx.strokeStyle = "red";
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(boxPX, 9, boxW, 15);
                this.ctx.restore();
            }


            this.chromosomeNameLabel.innerHTML = referenceFrame.chr;

            // var chromosomeNameWidth = this.chromosomeNameCanvas.width;
            //var chromosomeNameHeight = this.chromosomeNameCanvas.height;

            //this.chromosomeNameCtx.clearRect(0, 0, 100, 100);
            //this.chromosomeNameCtx.fillStyle = "rgb(0, 0, 0)";
            //this.chromosomeNameCtx.fillText(referenceFrame.chr, chromosomeNameWidth / 2, chromosomeNameHeight / 2);
        } catch (e) {
            console.log("Error painting ideogram: " + e.message);
        }


        function drawIdeogram(bufferCtx, ideogramWidth, ideogramHeight) {

            var ideogramTop = 0;

            if (!genome) return;

            var chromosome = genome.getChromosome(referenceFrame.chr);
            if (!chromosome) return;

            var cytobands = chromosome.cytobands;


            var center = (ideogramTop + ideogramHeight / 2);

            var xC = [];
            var yC = [];

            var len = cytobands.length;
            if (len == 0) return;

            var chrLength = cytobands[len - 1].end;

            var scale = ideogramWidth / chrLength;

            var lastPX = -1;
            for (var i = 0; i < cytobands.length; i++) {
                var cytoband = cytobands[i];

                var start = scale * cytoband.start;
                var end = scale * cytoband.end;
                if (end > lastPX) {


                    if (cytoband.type == 'c') { // centermere: "acen"

                        if (cytoband.label.charAt(0) == 'p') {
                            xC[0] = start;
                            yC[0] = ideogramHeight + ideogramTop;
                            xC[1] = start;
                            yC[1] = ideogramTop;
                            xC[2] = end;
                            yC[2] = center;
                        } else {
                            xC[0] = end;
                            yC[0] = ideogramHeight + ideogramTop;
                            xC[1] = end;
                            yC[1] = ideogramTop;
                            xC[2] = start;
                            yC[2] = center;
                        }
                        bufferCtx.fillStyle = "rgb(150, 0, 0)"; //g2D.setColor(Color.RED.darker());
                        bufferCtx.strokeStyle = "rgb(150, 0, 0)"; //g2D.setColor(Color.RED.darker());
                        bufferCtx.polygon(xC, yC, 1, 0);
                        // g2D.fillPolygon(xC, yC, 3);
                    } else {

                        bufferCtx.fillStyle = getCytobandColor(cytoband); //g2D.setColor(getCytobandColor(cytoband));
                        bufferCtx.fillRect(start, ideogramTop, (end - start), ideogramHeight);
                        // context.fillStyle = "Black"; //g2D.setColor(Color.BLACK);
                        // context.strokeRect(start, y, (end - start), height);
                    }
                }

                bufferCtx.strokeStyle = "black";
                bufferCtx.roundRect(0, ideogramTop, ideogramWidth, ideogramHeight, ideogramHeight / 2, 0, 1);
                //context.strokeRect(margin, y, trackWidth-2*margin, height);
                lastPX = end;

            }
        }

        function getCytobandColor(data) {
            if (data.type == 'c') { // centermere: "acen"
                return "rgb(150, 10, 10)"

            } else {
                var stain = data.stain; // + 4;

                var shade = 230;
                if (data.type == 'p') {
                    shade = Math.floor(230 - stain / 100.0 * 230);
                }
                var c = stainColors[shade];
                if (c == null) {
                    c = "rgb(" + shade + "," + shade + "," + shade + ")";
                    stainColors[shade] = c;
                }
                return c;

            }
        }

    }

    return igv;
})
(igv || {});