
// Chromosome ideogram
//

var log = function(txt) {
	console.log("karyo: "+txt);
}
var igv = (function (igv) {

    igv.KaryoPanel = function (browser) {

        this.browser = browser;
        this.div = document.createElement('div');
        this.div.style.height = "200px";
        this.div.style.width = "100%";

        this.ideograms = null;

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
        log("canvas height: "+ canvas.style.height);
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

            igv.navigateKaryo(browser, mouseX);
        }

    }

    // Move location of the reference panel by clicking on the genome ideogram
    igv.navigateKaryo = function (browser, pixelPosition) {

        var referenceFrame = browser.referenceFrame,
            chromosome = browser.genome.getChromosome(browser.referenceFrame.chr),
            viewportWidth = browser.trackViewportWidth(),
            bp = chromosome.length * pixelPosition / viewportWidth;

        referenceFrame.start = bp;
        browser.update();
    };

    igv.KaryoPanel.prototype.resize = function () {

        var contentHeight = this.div.clientHeight,
            contentWidth = this.div.clientWidth,
            canvas = this.canvas,
            chromosomeNameCanvas = this.chromosomeNameCanvas;
        canvas.style.width = "100%";
        canvas.style.height = contentHeight + "px";
        canvas.setAttribute('width', contentWidth);    //Must set the width & height of the canvas
        canvas.setAttribute('height', contentHeight);
        log("redraw: height is :"+contentHeight);
        chromosomeNameCanvas.style.width = "100%";
        chromosomeNameCanvas.style.height = contentHeight + "px";
        chromosomeNameCanvas.setAttribute('width',50);
        chromosomeNameCanvas.setAttribute('height', contentHeight)

        
        this.repaint();
    }

    igv.KaryoPanel.prototype.repaint = function () {

        var genome = this.browser.genome,
            referenceFrame = this.browser.referenceFrame,
            stainColors = [],
            w = this.canvas.width,
            h = this.canvas.height;
        log("clearing rect. h="+h);
        this.ctx.clearRect(0, 0, w, h);

        if (!(genome && genome.chromosomes)) return;

        var chromosomes = genome.getChromosomes();
        log("Current chr: "+referenceFrame.chr);
        var image = this.ideograms;
        
        
        if (chromosomes.length < 1) {
        	log("No chromosomes yet, returning");
        	return;
        }
        var chrwidth = Math.min(30, w / 24);
        var chrheight = h-20;
        var longestChr = genome.getChromosome('chr1');
        var cytobands = longestChr.cytobands;
        var maxLen = cytobands[cytobands.length-1].end;
        log("Longest chr: "+maxLen);
        if (!image || image == null) {
            image = document.createElement('canvas');
            image.width = w;
           
            image.height = 200;
            var bufferCtx = image.getContext('2d');
            var nr = 0;
           
            for (chr in chromosomes) {
            	if (nr > 24) break;
            	nr++;
            	var chromosome = genome.getChromosome(chr);
            	chromosome.x = nr*chrwidth;
            	log("Drawing chr "+chr);
            	drawIdeogram(chromosome.x, 0, chromosome, bufferCtx, chrwidth/2,chrheight, maxLen);
            	
            }
            this.ideograms= image;           
        }
        else {
        	log("Already got karyo image: "+image);
        }
        
        this.ctx.drawImage(image, 0, 0);
        
        // Draw red box
        this.ctx.save();
        var chromosome = this.browser.genome.getChromosome(this.browser.referenceFrame.chr);
        cytobands = chromosome.cytobands;
        var size = cytobands[cytobands.length-1].end;
        var ideoScale = h / maxLen;

        var boxPY1 = Math.round(this.browser.referenceFrame.start * ideoScale);
        var boxPY2 = Math.round((this.browser.referenceFrame.start+100) * ideoScale);
        log("Drawing red box, py1 ="+boxPY1+", boxPY2="+boxPY2 );
        this.ctx.strokeStyle = "red";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(chromosome.x-1, boxPY1, chrwidth/2+2, 3 );
        this.ctx.restore();

        var chromosomeNameWidth = this.chromosomeNameCanvas.width;
        var chromosomeNameHeight = this.chromosomeNameCanvas.height;

        this.chromosomeNameCtx.clearRect(0, 0, 100, 100);
        this.chromosomeNameCtx.fillStyle = "rgb(0, 0, 0)";
        this.chromosomeNameCtx.fillText(referenceFrame.chr, chromosomeNameWidth / 2, chromosomeNameHeight / 2);


        function drawIdeogram(ideogramLeft, ideogramTop, chromosome, bufferCtx, ideogramWidth, ideogramHeight, longestChr) {
           
            if (!genome) return;            
            if (!chromosome) return;

            var cytobands = chromosome.cytobands;

            var centerx = (ideogramLeft + ideogramWidth / 2);

            var xC = [];
            var yC = [];

            var len = cytobands.length;
            if (len == 0) return;
           
            var scale = ideogramHeight / longestChr;
            var lastPY = -1;
            for (var i = 0; i < cytobands.length; i++) {
                var cytoband = cytobands[i];

                var starty = scale * cytoband.start + ideogramTop;
                var endy = scale * cytoband.end + ideogramTop;
                if (endy > lastPY) {
                    if (cytoband.type == 'c') { // centermere: "acen"
                        if (cytoband.label.charAt(0) == 'p') {
                            yC[0] = starty;
                            xC[0] = ideogramWidth + ideogramLeft;
                            yC[1] = starty;
                            xC[1] = ideogramLeft;
                            yC[2] = endy;
                            xC[2] = centerx;
                        } else {
                            yC[0] = endy;
                            xC[0] = ideogramWidth + ideogramLeft;
                            yC[1] = endy;
                            xC[1] = ideogramLeft;
                            yC[2] = starty;
                            xC[2] = centerx;
                        }
                        bufferCtx.fillStyle = "rgb(150, 0, 0)"; //g2D.setColor(Color.RED.darker());
                        bufferCtx.strokeStyle = "rgb(150, 0, 0)"; //g2D.setColor(Color.RED.darker());
                        bufferCtx.polygon(xC, yC, 1, 0);
                       // g2D.fillPolygon(xC, yC, 3);
                    } else {
                    	var sy = Math.round(starty);
                    	var ey = Math.round(endy);
                    	var dy = Math.round(endy - starty);
                        bufferCtx.fillStyle = getCytobandColor(cytoband); //g2D.setColor(getCytobandColor(cytoband));
                        bufferCtx.fillRect(ideogramLeft, sy,  ideogramWidth, dy);                    
                    }
                }
                
               
           //      bufferCtx.strokeStyle = "black";
                // bufferCtx.strokeRect(ideogramLeft, ideogramTop, ideogramWidth, ideogramHeight, 0, ideogramWidth / 2, 1);
           //      bufferCtx.strokeRect(ideogramLeft, ideogramTop, ideogramWidth, ideogramHeight);
                //context.strokeRect(margin, y, trackWidth-2*margin, height);                
                lastPY = endy;

            }
            bufferCtx.fillStyle = null;
            bufferCtx.lineWidth = 1;
            bufferCtx.strokeStyle = "gray";
            bufferCtx.roundRect(ideogramLeft, ideogramTop, ideogramWidth, lastPY, ideogramWidth / 2, 0, 1);
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
                //log("Got color: "+c);
                return c;

            }
        }

    }

    return igv;
})
    (igv || {});