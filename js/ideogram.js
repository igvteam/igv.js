/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of panel software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and panel permission notice shall be included in
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

    igv.IdeoPanel = function ($content_header) {

        $content_header.append($('<div class="igv-ideogram-left-shim"></div>'));
        this.buildPanels($content_header);
    };

    igv.IdeoPanel.setWidth = function ($ideogram, width) {
        var percentage;

        $ideogram.width(width);
        percentage = $ideogram.width()/$ideogram.outerWidth();
        $ideogram.width(Math.floor(percentage * width));
    };

    igv.IdeoPanel.prototype.buildPanels = function ($content_header) {

        this.panels = _.map(igv.browser.genomicStateList, function(genomicState) {

            var viewportContainerWidth = igv.browser.viewportContainerWidth(),
                panel = {};

            panel.genomicState = genomicState;

            panel.$ideogram = $('<div class="igv-ideogram-content-div"></div>');

            addBorders(panel.$ideogram, genomicState.locusIndex, genomicState.locusCount);

            igv.IdeoPanel.setWidth(panel.$ideogram, viewportContainerWidth/genomicState.locusCount);

            $content_header.append(panel.$ideogram);

            panel.$canvas = $('<canvas>');
            panel.$ideogram.append(panel.$canvas);

            panel.$canvas.attr('width', panel.$ideogram.width());
            panel.$canvas.attr('height', panel.$ideogram.height());

            panel.ctx = panel.$canvas.get(0).getContext("2d");

            panel.ideograms = {};

            panel.$ideogram.on('click', function (e) {
                igv.IdeoPanel.clickHandler(panel, e);
            });

            return panel;

            function addBorders($ideogram, locusIndex, lociCount) {

                if (1 === lociCount || locusIndex === lociCount - 1) {
                    return;
                }

                $ideogram.addClass('igv-ideogram-content-div-border-right');

            }

        });

    };

    igv.IdeoPanel.$empty = function ($content_header) {
        var $a = $content_header.find('.igv-ideogram-content-div');
        $a.remove();
    };

    igv.IdeoPanel.prototype.panelWithLocusIndex = function (locusIndex) {

        var panels = _.filter(this.panels, function(panel){
            return locusIndex === panel.genomicState.locusIndex;
        });

        return _.first(panels);
    };

    igv.IdeoPanel.prototype.resize = function () {

        var viewportContainerWidth = igv.browser.syntheticViewportContainerWidth();

        _.each(this.panels, function(panel, index) {
            var genomicState = igv.browser.genomicStateList[ index ];
            panel.$ideogram.width(Math.floor(viewportContainerWidth/genomicState.locusCount));
            panel.$canvas.attr('width', panel.$ideogram.width());
            panel.ideograms = {};
        });

        this.repaint();
    };

    igv.IdeoPanel.prototype.repaint = function () {

        _.each(this.panels, function(panel) {
            igv.IdeoPanel.repaintPanel(panel);
        })

    };

    igv.IdeoPanel.repaintPanel = function (panel) {

        try {
            var y,
                image,
                chromosome,
                widthPercentage,
                xPercentage,
                canvasWidth,
                canvasHeight,
                width,
                widthBP,
                x,
                xBP,
                referenceFrame,
                stainColors,
                xx,
                yy,
                ww,
                hh;

            referenceFrame = panel.genomicState.referenceFrame;
            if (!(igv.browser.genome && referenceFrame && igv.browser.genome.getChromosome(referenceFrame.chrName))) {
                return;
            }

            stainColors = [];
            canvasWidth = panel.$canvas.width();
            canvasHeight = panel.$canvas.height();
            panel.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            
            if(referenceFrame.chrName.toLowerCase() === "all") {
                return;
            }

            image = panel.ideograms[ referenceFrame.chrName ];

            if (undefined === image) {

                image = document.createElement('canvas');
                image.width = canvasWidth;
                image.height = canvasHeight;
                // image.height = 13;

                drawIdeogram(image.getContext('2d'), image.width, image.height);

                panel.ideograms[ referenceFrame.chrName ] = image;
            }

            // y = (canvasHeight - image.height) / 2.0;
            // panel.ctx.drawImage(image, 0, y);
            y = 0;
            panel.ctx.drawImage(image, 0, 0);

            // panel.ctx.save();

            chromosome = igv.browser.genome.getChromosome(referenceFrame.chrName);

            widthBP = Math.round(referenceFrame.bpPerPixel * panel.$ideogram.width());
            xBP = referenceFrame.start;

            if (widthBP < chromosome.bpLength) {

                widthPercentage = widthBP/chromosome.bpLength;
                xPercentage =     xBP/chromosome.bpLength;

                x =     Math.floor(    xPercentage * panel.$canvas.width());
                width = Math.floor(widthPercentage * panel.$canvas.width());

                x = Math.max(0, x);
                x = Math.min(canvasWidth - width, x);

                // Push current context
                panel.ctx.save();

                // Draw red box
                panel.ctx.strokeStyle = "red";
                panel.ctx.lineWidth = (width < 2) ? 1 : 2;

                xx = x + (panel.ctx.lineWidth)/2;
                ww = (width < 2) ? 1 : width - panel.ctx.lineWidth;

                yy = y + (panel.ctx.lineWidth)/2;
                hh = image.height - panel.ctx.lineWidth;

                panel.ctx.strokeRect(xx, yy, ww, hh);

                // Pop current context
                panel.ctx.restore();
            }

        } catch (e) {
            console.log("Error painting ideogram: " + e.message);
        }

        function drawIdeogram(bufferCtx, ideogramWidth, ideogramHeight) {

            var shim = 1,
                ideogramTop = 0;

            if (!igv.browser.genome) {
                return;
            }

            var cytobands = igv.browser.genome.getCytobands(referenceFrame.chrName);

            if (cytobands) {

                var center = (ideogramTop + ideogramHeight / 2);

                var xC = [];
                var yC = [];

                var len = cytobands.length;
                if (len == 0) {
                    return;
                }

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

                            bufferCtx.fillStyle = "rgb(150, 0, 0)";
                            bufferCtx.strokeStyle = "rgb(150, 0, 0)";
                            bufferCtx.polygon(xC, yC, 1, 0);

                        } else {

                            bufferCtx.fillStyle = getCytobandColor(stainColors, cytoband);

                            // fillRect: function (ctx, x, y, w, h, properties)

                            // bufferCtx.fillRect(start, ideogramTop, (end - start), ideogramHeight);
                            bufferCtx.fillRect(start, shim + ideogramTop, (end - start), ideogramHeight - 2*shim);
                        }
                    }
                }
            }
            bufferCtx.strokeStyle = "black";

            // roundRect(x, y, width, height, radius, fill, stroke)

            // bufferCtx.roundRect(0, ideogramTop, ideogramWidth, ideogramHeight, ideogramHeight / 2, 0, 1);
            bufferCtx.roundRect(shim, shim + ideogramTop, ideogramWidth - 2 * shim, ideogramHeight - 2*shim, (ideogramHeight - 2*shim)/2, 0, 1);
            lastPX = end;
        }

        function getCytobandColor(colors, data) {

            if (data.type == 'c') { // centermere: "acen"
                return "rgb(150, 10, 10)"
            } else {
                var stain = data.stain; // + 4;

                var shade = 230;
                if (data.type == 'p') {
                    shade = Math.floor(230 - stain / 100.0 * 230);
                }
                var c = colors[shade];
                if (c == null) {
                    c = "rgb(" + shade + "," + shade + "," + shade + ")";
                    colors[shade] = c;
                }
                return c;

            }
        }

    };

    igv.IdeoPanel.clickHandler  = function  (panel, e) {

        var xy,
            xPercentage,
            genomicState = panel.genomicState,
            referenceFrame = genomicState.referenceFrame,
            chr,
            locusLength,
            chrCoveragePercentage,
            locus,
            ss,
            ee;

        xy = igv.translateMouseCoordinates(e, panel.$ideogram.get(0));
        xPercentage = xy.x / panel.$ideogram.width();

        locusLength = referenceFrame.bpPerPixel * panel.$ideogram.width();

        chr = igv.browser.genome.getChromosome(referenceFrame.chrName);
        chrCoveragePercentage = locusLength / chr.bpLength;

        if (xPercentage - (chrCoveragePercentage/2.0) < 0) {
            xPercentage = chrCoveragePercentage/2.0;
        }

        if (xPercentage + (chrCoveragePercentage/2.0) > 1.0) {
            xPercentage = 1.0 - chrCoveragePercentage/2.0;
        }

        ss = Math.round((xPercentage - (chrCoveragePercentage/2.0)) * chr.bpLength);
        ee = Math.round((xPercentage + (chrCoveragePercentage/2.0)) * chr.bpLength);

        referenceFrame.start = Math.round((xPercentage - (chrCoveragePercentage/2.0)) * chr.bpLength);
        referenceFrame.bpPerPixel = (ee - ss)/ panel.$ideogram.width();

        igv.browser.updateLocusSearchWithGenomicState(genomicState);

        igv.browser.repaintWithLocusIndex( panel.genomicState.locusIndex )

    };
    return igv;
})
(igv || {});
