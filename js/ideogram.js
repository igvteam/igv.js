//
// Chromosome ideogram
//

var igv = (function (igv) {

    igv.IdeoPanel = function (browser) {

        this.browser = browser;
        this.div = document.createElement('div');
        this.div.style.height = "40px";
        this.div.style.width = "100%";

        this.ideograms = {};

        var contentHeight = this.div.clientHeight;
        var contentWidth = this.div.clientWidth - browser.controlPanelWidth;
        var contentDiv = document.createElement("div");
        contentDiv.style.position = "absolute";
        contentDiv.style.height = "100%";
        contentDiv.style.left = browser.controlPanelWidth + "px";
        contentDiv.style.right = "0px";
        this.div.appendChild(contentDiv);

        var canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.width = "100%";
        canvas.style.height = contentHeight;
        canvas.setAttribute('width', contentWidth);    //Must set the width & height of the canvas
        canvas.setAttribute('height', contentHeight);

        var chromosomeNameDiv = document.createElement('div');
        chromosomeNameDiv.style.position = 'absolute';
        chromosomeNameDiv.style.height = "100%";
        chromosomeNameDiv.style.left = "0px";
        chromosomeNameDiv.style.width = browser.controlPanelWidth + "px";
        this.div.appendChild(chromosomeNameDiv);

        var chromosomeNameCanvas = document.createElement('canvas');
        chromosomeNameCanvas.style.position = 'absolute';
        chromosomeNameCanvas.style.width = "100%";
        chromosomeNameCanvas.style.height = contentHeight;
        //chromosomeNameCanvas.style.height = 40;
        chromosomeNameCanvas.setAttribute('width', browser.controlPanelWidth);
        chromosomeNameCanvas.setAttribute('height', contentHeight);


        this.canvas = canvas;
        contentDiv.appendChild(canvas);

        this.ctx = canvas.getContext("2d");

        this.chromosomeNameCanvas = chromosomeNameCanvas;
        chromosomeNameDiv.appendChild(chromosomeNameCanvas);

        this.chromosomeNameCtx = chromosomeNameCanvas.getContext("2d");
        this.chromosomeNameCtx.font = "bold 10px Arial";

        this.canvas.onclick = function (e) {
            var isFirefox = typeof InstallTrigger !== 'undefined';

            var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
            var isChrome = !!window.chrome && !isOpera;

            var mouseX;
            var mouseY;

            if (isFirefox) {
                // It's Firefox
                mouseX = e.layerX;
                mouseY = e.layerY;
            } else {
                // It's Chrome or Safari and works for both
                mouseX = e.offsetX;
                mouseY = e.offsetY;
            }

            this.getContext("2d").fillRect(mouseX, 0, 10, 10);

            igv.navigateIdeogram(browser, mouseX);
        }

    }

    // Move location of the reference panel by clicking on the genome ideogram
    igv.navigateIdeogram = function (browser, pixelPosition) {

        var referenceFrame = browser.referenceFrame,
            chromosome = browser.genome.getChromosome(browser.referenceFrame.chr),
            viewportWidth = browser.trackViewportWidth(),
            bp = chromosome.length * pixelPosition / viewportWidth;

        referenceFrame.start = bp;
        browser.update();
    };

    igv.IdeoPanel.prototype.resize = function () {

        var contentHeight = this.div.clientHeight,
            contentWidth = this.div.clientWidth,
            canvas = this.canvas,
            chromosomeNameCanvas = this.chromosomeNameCanvas;
        canvas.style.width = "100%";
        canvas.style.height = contentHeight + "px";
        canvas.setAttribute('width', contentWidth);    //Must set the width & height of the canvas
        canvas.setAttribute('height', contentHeight);

        chromosomeNameCanvas.style.width = "100%";
        chromosomeNameCanvas.style.height = contentHeight + "px";
        chromosomeNameCanvas.setAttribute('width',50);
        chromosomeNameCanvas.setAttribute('height', contentHeight)

        this.ideograms = {};
        this.repaint();
    }

    igv.IdeoPanel.prototype.repaint = function () {

        var genome = this.browser.genome,
            referenceFrame = this.browser.referenceFrame,
            stainColors = [],
            w = this.canvas.width,
            h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);

        if (!(genome && genome.getChromosome(referenceFrame.chr))) return;

        var image = this.ideograms[this.browser.referenceFrame.chr];
        if (!image) {
            image = document.createElement('canvas');
            image.width = w;
            image.height = 13;
            var bufferCtx = image.getContext('2d');
            drawIdeogram(bufferCtx, w, 13);
            this.ideograms[this.browser.referenceFrame.chr] = image;
        }
        this.ctx.drawImage(image, 0, 10);

        // Draw red box
        this.ctx.save();
        var chromosome = this.browser.genome.getChromosome(this.browser.referenceFrame.chr);
        var ideoScale = w / chromosome.length;

        var widthBP = w * this.browser.referenceFrame.bpPerPixel;

        var boxPX = Math.round(this.browser.referenceFrame.start * ideoScale);
        var boxW = Math.max(1, Math.round(widthBP * ideoScale));
        this.ctx.strokeStyle = "red";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(boxPX, 9, boxW, 15);
        this.ctx.restore();

        var chromosomeNameWidth = this.chromosomeNameCanvas.width;
        var chromosomeNameHeight = this.chromosomeNameCanvas.height;

        this.chromosomeNameCtx.clearRect(0, 0, 100, 100);
        this.chromosomeNameCtx.fillStyle = "rgb(0, 0, 0)";
        this.chromosomeNameCtx.fillText(referenceFrame.chr, chromosomeNameWidth / 2, chromosomeNameHeight / 2);


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