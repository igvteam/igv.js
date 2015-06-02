/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var igv = (function (igv) {

    var log = function (txt) {
        // if (console) console.log("karyo: " + txt);
    };

    igv.KaryoPanel = function (parentElement) {

        this.ideograms = null;
        igv.guichromosomes = [];

        this.div = $('<div class="igv-karyo-div"></div>')[0];
        $(parentElement).append(this.div);

        var contentDiv = $('<div class="igv-karyo-content-div"></div>')[0];
        $(this.div).append(contentDiv);

        var canvas = $('<canvas class="igv-karyo-canvas"></canvas>')[0];
        $(contentDiv).append(canvas);
        canvas.setAttribute('width', contentDiv.offsetWidth);
        canvas.setAttribute('height', contentDiv.offsetHeight);
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        var tipCanvas = document.createElement('canvas');
        tipCanvas.style.position = 'absolute';    // => relative to first positioned ancestor
        tipCanvas.style.width = "100px";
        tipCanvas.style.height = "20px";
        tipCanvas.style.left = "-2000px";
        tipCanvas.setAttribute('width', "100px");    //Must set the width & height of the canvas
        tipCanvas.setAttribute('height', "20px");
        var tipCtx = tipCanvas.getContext("2d");
        contentDiv.appendChild(tipCanvas);

        this.canvas.onmousemove = function (e) {

            var mouseCoords = igv.translateMouseCoordinates(e, canvas);
            var mouseX = mouseCoords.x;
            var mouseY = mouseCoords.y;

            var hit = false;
            for (var i = 0; i < igv.guichromosomes.length; i++) {
                var g = igv.guichromosomes[i];
                if (g.x < mouseX && g.right > mouseX && g.y < mouseY && g.bottom > mouseY) {
                    var dy = mouseY - g.y;
                    var bp = Math.round(g.size * dy / g.h);
                    //log("Found chr "+g.name+", bp="+bp+", mousex="+mouseX+", mousey="+mouseY);
                    tipCanvas.style.left = Math.round(mouseX + 20) + "px";
                    tipCanvas.style.top = Math.round(mouseY - 5) + "px";

                    //log("width/height of tip canvas:"+tipCanvas.width+"/"+tipCanvas.height);
                    //log("tipCanvas.left="+tipCanvas.style.left);
                    tipCtx.clearRect(0, 0, tipCanvas.width, tipCanvas.height);
                    tipCtx.fillStyle = 'rgb(255,255,220)';
                    tipCtx.fillRect(0, 0, tipCanvas.width, tipCanvas.height);
                    tipCtx.fillStyle = 'rgb(0,0,0)';
                    var mb = Math.round(bp / 1000000);
                    tipCtx.fillText(g.name + " @ " + mb + " MB", 3, 12);
                    hit = true;
                    break;
                }
            }
            if (!hit) {
                tipCanvas.style.left = "-2000px";
            }
        }
        this.canvas.onclick = function (e) {

            var mouseCoords = igv.translateMouseCoordinates(e, canvas);
            var mouseX = mouseCoords.x;
            var mouseY = mouseCoords.y;
            igv.navigateKaryo(mouseX, mouseY);
        }

    };

    // Move location of the reference panel by clicking on the genome ideogram
    igv.navigateKaryo = function (mouseX, mouseY) {
        // check each chromosome if the coordinates are within its bound
        for (var i = 0; i < igv.guichromosomes.length; i++) {
            var g = igv.guichromosomes[i];
            if (g.x < mouseX && g.right > mouseX && g.y < mouseY && g.bottom > mouseY) {
                var dy = mouseY - g.y;
                var bp = Math.round(g.size * dy / g.h);
                log("Going to position " + bp);
                igv.browser.goto(g.name, bp);
                break;
            }
        }

        igv.browser.update();
    };

    igv.KaryoPanel.prototype.resize = function () {

        var canvas = this.canvas;
        canvas.setAttribute('width', canvas.clientWidth);    //Must set the width & height of the canvas
        canvas.setAttribute('height', canvas.clientHeight);
        log("Resize called: width=" + canvas.clientWidth + "/" + canvas.clientHeight);
        this.ideograms = undefined;
        this.repaint();
    }

    igv.KaryoPanel.prototype.repaint = function () {


        var genome = igv.browser.genome,
            referenceFrame = igv.browser.referenceFrame,
            stainColors = [],
            w = this.canvas.width,
            h = this.canvas.height;

        this.ctx.clearRect(0, 0, w, h);

        if (!(genome && referenceFrame && genome.chromosomes && referenceFrame.chr)) return;

        var chromosomes = genome.getChromosomes();
        var image = this.ideograms;


        if (chromosomes.length < 1) {
            log("No chromosomes yet, returning");
            return;
        }
        var nrchr = 24;
        var nrrows = 1;
        if (w < 300) nrrows = 2;

        var totalchrwidth = Math.min(50, (w - 20) / (nrchr + 2) * nrrows);

        var chrwidth = Math.min(20, totalchrwidth / 2);
        // allow for 2 rows!

        var top = 25;
        var chrheight = (h / nrrows) - top;

        var cytobands = genome.getCytobands('chr1');      // Longest chr

        var me = this;
        var maxLen = cytobands[cytobands.length - 1].end;

        if (!image || image == null) {
            drawImage.call(this);
        }

        this.ctx.drawImage(image, 0, 0);

        // Draw red box
        this.ctx.save();

        // Translate chr to official name
        var chr = referenceFrame.chr;
        if (this.genome) {
            chr = this.genome.getChromosomeName(chr);
        }
        var chromosome = igv.browser.genome.getChromosome(chr);
        if (chromosome) {
            var ideoScale = longestChr.bpLength / chrheight;   // Scale in bp per pixels

            //var boxPY1 = top + Math.round(referenceFrame.start / ideoScale);
            var boxHeight = Math.max(3, (igv.browser.trackViewportWidth() * referenceFrame.bpPerPixel) / ideoScale);

            //var boxPY2 = Math.round((this.browser.referenceFrame.start+100) * ideoScale);
            this.ctx.strokeStyle = "rgb(150, 0, 0)";
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(chromosome.x - 3, chromosome.y - 3, chrwidth + 6, boxHeight + 6);
            this.ctx.restore();
        }
        else log("Could not find chromosome " + chr);


        function drawImage() {
            image = document.createElement('canvas');
            image.width = w;

            image.height = h;
            var bufferCtx = image.getContext('2d');
            var nr = 0;
            var col = 0;
            var row = 1;
            var y = top;
            igv.guichromosomes = [];
            for (chr in chromosomes) {
                if (nr > nrchr) break;
                if (row == 1 && nrrows == 2 && nr + 1 > nrchr / 2) {
                    row = 2;
                    col = 0;
                    y = y + chrheight + top;
                }
                nr++;
                col++;
                //log("Found chr "+chr);
                var chromosome = genome.getChromosome(chr);
                if (chr == 'chrM' && !chromosome.bpLength) chromosome.bpLength = 16000;
                chromosome.x = col * totalchrwidth;
                chromosome.y = y;

                var guichrom = new Object();
                guichrom.name = chr;
                igv.guichromosomes.push(guichrom);

                drawIdeogram(guichrom, chromosome.x, chromosome.y, chromosome, bufferCtx, chrwidth, chrheight, maxLen);

            }
            this.ideograms = image;

            // now add some tracks?
            log("============= PROCESSING " + igv.browser.trackViews.length + " TRACKS");
            var tracknr = 0;
            for (var i = 0; i < igv.browser.trackViews.length; i++) {
                var trackPanel = igv.browser.trackViews[i];
                var track = trackPanel.track;
                if (track.getSummary && track.loadSummary) {
                    log("Found track with summary: " + track.name);

                    var source = track;

                    window.source = track;
                    source.loadSummary("chr1", 0, 1000000, function (featureList) {
                        if (featureList) {
                            //log("Got summary feature list, will add to karyo track")
                            nr = 0;
                            for (chr in chromosomes) {
                                var guichrom = igv.guichromosomes[nr];
                                //if (nr > 1) break;                       
                                nr++;
                                if (guichrom && guichrom.size) {
                                    loadfeatures(source, chr, 0, guichrom.size, guichrom, bufferCtx, tracknr);
                                }
                            }
                        }
                        else {
                            //  log("Track and chr "+chr+" has no summary features");
                        }
                    });
                    tracknr++;
                }
            }
        }

        function drawFeatures(source, featurelist, guichrom, ideogramLeft, top, bufferCtx, ideogramWidth, ideogramHeight, longestChr, tracknr) {
            if (!genome) {
                //log("no genome");
                return;
            }
            if (!guichrom) {
                //log("no chromosome");
                return;
            }
            if (!featurelist) {
                //log("Found no summary features on "+guichrom );
                return;
            }
            var len = featurelist.length;
            if (len == 0) {
                //log("Found no summary features on "+guichrom );
                return;
            }
            var scale = ideogramHeight / longestChr;
            //  log("drawing " + len + " feaures of chrom " + guichrom.name);
            var dx = 1;
            for (var i = 0; i < featurelist.length; i++) {
                var feature = featurelist[i];
                var color = 'rgb(0,0,150)';
                var value = feature.score;
                if (source.getColor) {
                    color = source.getColor(value);
                    // log("got color: "+color+" for value "+value);
                }

                var starty = scale * feature.start + top;
                var endy = scale * feature.end + top;
                var dy = Math.max(0.01, endy - starty);
                //    if (i < 3) log("Drawing feature  " + feature.start + "-" + feature.end + " -> " + starty + ", dy=" + dy);
                bufferCtx.fillStyle = color; //g2D.setColor(getCytobandColor(cytoband));
                bufferCtx.fillRect(ideogramLeft + ideogramWidth + tracknr * 2 + 1, starty, dx, dy);

            }
        }

        function drawIdeogram(guichrom, ideogramLeft, top, chromosome, bufferCtx, ideogramWidth, ideogramHeight, longestChr) {

            if (!genome) return;
            if (!chromosome) return;

            var cytobands = genome.getCytobands(chromosome.name);

            if (cytobands) {

                var centerx = (ideogramLeft + ideogramWidth / 2);

                var xC = [];
                var yC = [];

                var len = cytobands.length;
                if (len == 0) {
                    //log("Chr "+JSON.stringify(chromosome)+" has no length");
                    //return;
                }
                var scale = ideogramHeight / longestChr;

                guichrom.x = ideogramLeft;
                guichrom.y = top;
                guichrom.w = ideogramWidth;
                guichrom.right = ideogramLeft + ideogramWidth;
                var last = 0;
                var lastPY = -1;
                if (len > 0) {
                    last = cytobands[len - 1].end;
                    guichrom.h = scale * last;
                    guichrom.size = last;
                }
                else {
                    var MINH = 5;
                    lastPY = top + MINH;
                    guichrom.h = MINH;
                    guichrom.size = MINH / scale;
                }

                guichrom.longest = longestChr;
                guichrom.bottom = top + guichrom.h;

                if (len > 0) {
                    for (var i = 0; i < cytobands.length; i++) {
                        var cytoband = cytobands[i];

                        var starty = scale * cytoband.start + top;
                        var endy = scale * cytoband.end + top;
                        if (endy > lastPY) {
                            if (cytoband.type == 'c') { // centermere: "acen"
                                if (cytoband.name.charAt(0) == 'p') {
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
                                // centromer: carl wants another color
                                bufferCtx.fillStyle = "rgb(220, 150, 100)"; //g2D.setColor(Color.RED.darker());
                                bufferCtx.strokeStyle = "rgb(150, 0, 0)"; //g2D.setColor(Color.RED.darker());
                                bufferCtx.polygon(xC, yC, 1, 0);
                                // g2D.fillPolygon(xC, yC, 3);
                            } else {
                                var dy = endy - starty;

                                bufferCtx.fillStyle = getCytobandColor(cytoband); //g2D.setColor(getCytobandColor(cytoband));
                                bufferCtx.fillRect(ideogramLeft, starty, ideogramWidth, dy);
                            }
                        }

                        lastPY = endy;
                    }

                }
            }
            bufferCtx.fillStyle = null;
            bufferCtx.lineWidth = 1;
            bufferCtx.strokeStyle = "darkgray";
            var r = ideogramWidth / 2;
            bufferCtx.roundRect(ideogramLeft, top - r / 2, ideogramWidth, lastPY - top + r, ideogramWidth / 2, 0, 1);

            // draw chromosome name

            bufferCtx.font = "bold 10px Arial";
            bufferCtx.fillStyle = "rgb(0, 0, 0)";
            var name = chromosome.name;
            if (name.length > 3) name = name.substring(3);
            //log("Drawing chr name "+name+" at "+(ideogramLeft + ideogramWidth / 2 - 3*name.length));
            bufferCtx.fillText(name, ideogramLeft + ideogramWidth / 2 - 3 * name.length, top - 10);
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

        function loadfeatures(source, chr, start, end, guichrom, bufferCtx, tracknr) {
            //log("=== loadfeatures of chr " + chr + ", x=" + guichrom.x);            

            source.getSummary(chr, start, end, function (featureList) {
                if (featureList) {
                    len = featureList.length;
                    //log(" -->- loaded: chrom " + chr + " with " + len + " summary features, drawing them");
                    drawFeatures(source, featureList, guichrom, guichrom.x, guichrom.y, bufferCtx, chrwidth, chrheight, maxLen, tracknr);
                    me.repaint();
                }
                else {
                    //log("Track and chr "+chr+" has no summary features yet");
                }
            });

        }

    }

    return igv;
})
(igv || {});