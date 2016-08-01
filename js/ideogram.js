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

//
// Chromosome ideogram
//

var igv = (function (igv) {

    igv.IdeoPanel = function (parentElement) {

        this.ideograms = {};

        // ideogram content
        this.contentDiv = $('<div class="igv-ideogram-content-div"></div>');
        $(parentElement).append(this.contentDiv[0]);

        var myself = this;
        this.contentDiv.click(function (e) {

            var xy,
                xPercentage,
                chr,
                chrLength,
                locusLength,
                chrCoveragePercentage,
                locus;

            xy = igv.translateMouseCoordinates(e, myself.contentDiv);
            xPercentage = xy.x / myself.contentDiv.width();

            locusLength = igv.browser.trackViewportWidthBP();
            chr = igv.browser.genome.getChromosome(igv.browser.referenceFrame.chr);
            chrLength = chr.bpLength;
            chrCoveragePercentage = locusLength / chrLength;

            if (xPercentage - (chrCoveragePercentage/2.0) < 0) {
                xPercentage = chrCoveragePercentage/2.0;
                //return;
            }

            if (xPercentage + (chrCoveragePercentage/2.0) > 1.0) {
                xPercentage = 1.0 - chrCoveragePercentage/2.0;
                //return;
            }

            locus = igv.browser.referenceFrame.chr + ":" + igv.numberFormatter(1 + Math.floor((xPercentage - (chrCoveragePercentage/2.0)) * chrLength)) + "-" + igv.numberFormatter(Math.floor((xPercentage + (chrCoveragePercentage/2.0)) * chrLength));
            //console.log("chr length " + igv.numberFormatter(chrLength) + " locus " + locus);

            igv.browser.search(locus, undefined);

        });

        this.canvas = $('<canvas class="igv-ideogram-canvas"></canvas>')[0];
        $(this.contentDiv).append(this.canvas);
        this.canvas.setAttribute('width', this.contentDiv.width());
        this.canvas.setAttribute('height', this.contentDiv.height());
        this.ctx = this.canvas.getContext("2d");

    };

    igv.IdeoPanel.prototype.resize = function () {

        this.canvas.setAttribute('width', this.contentDiv.width());
        this.canvas.setAttribute('height', this.contentDiv.height());

        this.ideograms = {};
        this.repaint();
    };

    igv.IdeoPanel.prototype.repaint = function () {

        try {
            var y,
                image,
                bufferCtx,
                chromosome,
                widthPercentage,
                xPercentage,
                width,
                widthBP,
                x,
                xBP,
                genome = igv.browser.genome,
                referenceFrame = igv.browser.referenceFrame,
                stainColors = [];

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            if (!(genome && referenceFrame && genome.getChromosome(referenceFrame.chr))) {
                return;
            }

            image = this.ideograms[igv.browser.referenceFrame.chr];

            if (!image) {

                image = document.createElement('canvas');
                image.width = this.canvas.width;
                image.height = 13;

                bufferCtx = image.getContext('2d');

                drawIdeogram(bufferCtx, this.canvas.width, image.height);

                this.ideograms[igv.browser.referenceFrame.chr] = image;
            }

            y = (this.canvas.height - image.height) / 2.0;
            this.ctx.drawImage(image, 0, y);

            // Draw red box
            this.ctx.save();

            chromosome = igv.browser.genome.getChromosome(igv.browser.referenceFrame.chr);

            widthBP = Math.floor(igv.browser.trackViewportWidthBP());
                xBP = igv.browser.referenceFrame.start;

            if (widthBP < chromosome.bpLength) {

                widthPercentage = widthBP/chromosome.bpLength;
                    xPercentage =     xBP/chromosome.bpLength;

                x =     Math.floor(    xPercentage * this.canvas.width);
                width = Math.floor(widthPercentage * this.canvas.width);

                //console.log("canvas end " + this.canvas.width + " xEnd " + (x + width));

                x = Math.max(0, x);
                x = Math.min(this.canvas.width - width, x);

                this.ctx.strokeStyle = "red";
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, width, image.height + this.ctx.lineWidth - 1);
                this.ctx.restore();
            }

            //this.chromosomeNameLabel.innerHTML = referenceFrame.chr;

        } catch (e) {
            console.log("Error painting ideogram: " + e.message);
        }

        function drawIdeogram(bufferCtx, ideogramWidth, ideogramHeight) {

            var ideogramTop = 0;

            if (!genome) return;

            var cytobands = genome.getCytobands(referenceFrame.chr);

            if (cytobands) {

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

                            if (cytoband.name.charAt(0) == 'p') {
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
                }
            }
            bufferCtx.strokeStyle = "black";
            bufferCtx.roundRect(0, ideogramTop, ideogramWidth, ideogramHeight, ideogramHeight / 2, 0, 1);
            //context.strokeRect(margin, y, trackWidth-2*margin, height);
            lastPX = end;


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

    };

    return igv;
})
(igv || {});