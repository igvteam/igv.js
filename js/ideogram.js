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

    igv.IdeoPanel = function ($parent, panelWidth, browser) {
        this.browser = browser;
        this.$parent = $parent;
        this.buildPanels($parent, panelWidth);

    };

    igv.IdeoPanel.prototype.buildPanels = function ($parent, width) {

        var self = this;

        $parent.append($('<div class="igv-ideogram-shim"></div>'));

        this.panels = this.browser.genomicStateList.map(function (genomicState) {
            return panelWithGenomicState.call(self, $parent, genomicState, width)
        });
    };

    igv.IdeoPanel.prototype.setWidth = function (width, doRepaint) {

        this.panels.forEach(function (panel) {
            var canvas;

            panel.$ideogram.outerWidth(width);

            setupCanvasSize(panel);

            panel.ideograms = {};
        });

        if (true === doRepaint) {
            this.repaint();
        }

    };

    igv.IdeoPanel.prototype.resize = function () {
        this.setWidth(this.browser.viewportContainerWidth() / this.browser.genomicStateList.length, true)
    };

    igv.IdeoPanel.prototype.repaint = function () {

        const browser = this.browser;

        this.panels.forEach(function (panel) {
            repaintPanel(browser, panel);
        })

    };

    igv.IdeoPanel.prototype.discardPanels = function () {

        this.panels.forEach(function (panel) {
            panel.$ideogram.remove();
        });

        this.panels = undefined;

    };

    igv.IdeoPanel.prototype.addPanelWithGenomicStateAtIndex = function (genomicState, index, width) {
        var panel,
            $detached;

        panel = panelWithGenomicState.call(this, this.$parent, genomicState, width);

        if (index === this.panels.length) {
            this.panels.push(panel);
        } else {

            this.panels.splice(index, 0, panel);

            // The viewport constructor always appends. Reorder here.
            $detached = panel.$ideogram.detach();
            $detached.insertAfter(this.panels[index - 1].$ideogram);
        }

        assessBorders(this.panels);
    };

    igv.IdeoPanel.prototype.removePanelWithLocusIndex = function (index) {

        this.panels[index].$ideogram.remove();
        this.panels.splice(index, 1);

        assessBorders(this.panels);

    };

    igv.IdeoPanel.prototype.repaintPanelWithGenomicState = function (genomicState) {

        const browser = this.browser;
        const index = this.browser.genomicStateList.indexOf(genomicState);
        repaintPanel(browser, this.panels[index]);
    };

    function panelWithGenomicState($parent, genomicState, width) {

        var canvas,
            panel;

        const browser = this.browser;

        panel = {};

        panel.genomicState = genomicState;

        panel.$ideogram = $('<div class="igv-ideogram-content"></div>');

        $parent.append(panel.$ideogram);

        addBorder(panel.$ideogram, browser.genomicStateList.indexOf(genomicState), browser.genomicStateList.length);

        panel.$ideogram.outerWidth(width);

        panel.$canvas = $('<canvas>');
        panel.$ideogram.append(panel.$canvas);

        setupCanvasSize(panel);

        panel.ideograms = {};

        panel.$ideogram.on('click', function (e) {
            clickHandler(browser, panel, e);
        });

        return panel;
    }

    function addBorder($ideogram, index, length) {

        if (index < length && (1 + index !== length)) {
            $ideogram.addClass('igv-ideogram-content-border-right');
        } else {
            $ideogram.removeClass('igv-ideogram-content-border-right');
        }

    }

    function assessBorders(panels) {

        panels.forEach(function (panel, p) {

            if (1 === panels.length || (1 + p) === panels.length) {
                panel.$ideogram.removeClass('igv-ideogram-content-border-right');
            } else {
                panel.$ideogram.addClass('igv-ideogram-content-border-right');
            }

        });

    }

    function repaintPanel(browser, panel) {

        var image,
            chromosome,
            percentWidth,
            percentX,
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

        var w = panel.$canvas.width();
        var h = panel.$canvas.height();

        if (!(w > 0 && h > 0)) return;

        referenceFrame = panel.genomicState.referenceFrame;
        if (!(browser.genome && referenceFrame && browser.genome.getChromosome(referenceFrame.chrName) && panel.$canvas.height() > 0)) {
            return;
        }

        stainColors = [];
        igv.graphics.fillRect(panel.ctx, 0, 0, panel.$canvas.width(), panel.$canvas.height(), {fillStyle: igv.Color.greyScale(255)});

        if (referenceFrame.chrName.toLowerCase() === "all") {
            return;
        }

        drawIdeogram(panel.ctx, panel.$canvas.width(), panel.$canvas.height());

        chromosome = browser.genome.getChromosome(referenceFrame.chrName);

        widthBP = Math.round(referenceFrame.bpPerPixel * panel.$ideogram.width());
        xBP = referenceFrame.start;

        if (widthBP < chromosome.bpLength) {

            percentWidth = widthBP / chromosome.bpLength;
            percentX = xBP / chromosome.bpLength;

            x = Math.floor(percentX * panel.$canvas.width());
            width = Math.floor(percentWidth * panel.$canvas.width());

            x = Math.max(0, x);
            x = Math.min(panel.$canvas.width() - width, x);

            // Push current context
            panel.ctx.save();

            // Draw red box
            panel.ctx.strokeStyle = "red";
            panel.ctx.lineWidth = (width < 2) ? 1 : 2;

            xx = x + (panel.ctx.lineWidth) / 2;
            ww = (width < 2) ? 1 : width - panel.ctx.lineWidth;

            yy = panel.ctx.lineWidth / 2;
            hh = panel.$canvas.height() - panel.ctx.lineWidth;

            panel.ctx.strokeRect(xx, yy, ww, hh);

            // Pop current context
            panel.ctx.restore();
        }


        function drawIdeogram(ctx, width, height) {

            var shim,
                shim2,
                ideogramTop,
                cytobands,
                cytoband,
                center,
                xC,
                yC,
                chrLength,
                scale,
                start,
                end,
                i;

            shim = 1;
            shim2 = 0.5 * shim;
            ideogramTop = 0;

            if (undefined === browser.genome) {
                return;
            }

            igv.graphics.fillRect(ctx, 0, 0, width, height, {fillStyle: igv.Color.greyScale(255)});

            cytobands = browser.genome.getCytobands(referenceFrame.chrName);
            if (cytobands) {

                center = (ideogramTop + height / 2);

                xC = [];
                yC = [];

                if (0 === cytobands.length) {
                    return;
                }

                chrLength = cytobands[cytobands.length - 1].end;

                scale = width / chrLength;

                // round rect clipping path
                ctx.beginPath();
                igv.graphics.roundRect(ctx, shim2, shim2 + ideogramTop, width - 2 * shim2, height - 2 * shim2, (height - 2 * shim2) / 2, 0, 1);
                ctx.clip();

                for (i = 0; i < cytobands.length; i++) {

                    cytoband = cytobands[i];
                    start = scale * cytoband.start;
                    end = scale * cytoband.end;

                    if (cytoband.type === 'c') {

                        if (cytoband.name.charAt(0) === 'p') {
                            xC[0] = start;
                            yC[0] = height + ideogramTop;
                            xC[1] = start;
                            yC[1] = ideogramTop;
                            xC[2] = end;
                            yC[2] = center;
                        } else {
                            xC[0] = end;
                            yC[0] = height + ideogramTop;
                            xC[1] = end;
                            yC[1] = ideogramTop;
                            xC[2] = start;
                            yC[2] = center;
                        }

                        ctx.fillStyle = "rgb(150, 0, 0)";
                        ctx.strokeStyle = "rgb(150, 0, 0)";
                        igv.graphics.polygon(ctx, xC, yC, 1, 0);
                    } else {

                        ctx.fillStyle = getCytobandColor(stainColors, cytoband);
                        igv.graphics.fillRect(ctx, start, shim + ideogramTop, (end - start), height - 2 * shim);
                    }
                }
            }

            // round rect border
            ctx.strokeStyle = igv.Color.greyScale(41);
            igv.graphics.roundRect(ctx, shim2, shim2 + ideogramTop, width - 2 * shim2, height - 2 * shim2, (height - 2 * shim2) / 2, 0, 1);
        }

        function getCytobandColor(colors, data) {

            if (data.type === 'c') { // centermere: "acen"
                return "rgb(150, 10, 10)"
            } else {
                var stain = data.stain; // + 4;

                var shade = 230;
                if (data.type === 'p') {
                    shade = Math.floor(230 - stain / 100.0 * 230);
                }
                var c = colors[shade];
                if (!c) {
                    c = "rgb(" + shade + "," + shade + "," + shade + ")";
                    colors[shade] = c;
                }
                return c;

            }
        }

    }

    function setupCanvasSize(panel) {
        var canvas = panel.$canvas.get(0);
        var w = +panel.$ideogram.width();
        var h = +panel.$ideogram.height();
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        canvas.width = window.devicePixelRatio * w;
        canvas.height = window.devicePixelRatio * h;
        panel.ctx = canvas.getContext("2d");
        panel.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    function clickHandler(browser, panel, e) {

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

        chr = browser.genome.getChromosome(referenceFrame.chrName);
        chrCoveragePercentage = locusLength / chr.bpLength;

        if (xPercentage - (chrCoveragePercentage / 2.0) < 0) {
            xPercentage = chrCoveragePercentage / 2.0;
        }

        if (xPercentage + (chrCoveragePercentage / 2.0) > 1.0) {
            xPercentage = 1.0 - chrCoveragePercentage / 2.0;
        }

        ss = Math.round((xPercentage - (chrCoveragePercentage / 2.0)) * chr.bpLength);
        ee = Math.round((xPercentage + (chrCoveragePercentage / 2.0)) * chr.bpLength);

        referenceFrame.start = Math.round((xPercentage - (chrCoveragePercentage / 2.0)) * chr.bpLength);
        referenceFrame.bpPerPixel = (ee - ss) / panel.$ideogram.width();

        browser.updateLocusSearchWidget(genomicState);

        browser.updateViews()

    }

    return igv;
})
(igv || {});
