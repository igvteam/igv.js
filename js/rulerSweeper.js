/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 * Author: Jim Robinson
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

    igv.RulerSweeper = function (viewport, $viewport, $viewportContent, genomicState) {

        this.viewport = viewport;
        this.$viewport = $viewport;
        this.$viewportContent = $viewportContent;
        this.genomicState = genomicState;

        this.$rulerSweeper = $('<div class="igv-ruler-sweeper-div">');
        this.$viewportContent.append(this.$rulerSweeper);

        this.addMouseHandlers();
    };

    igv.RulerSweeper.prototype.disableMouseHandlers = function () {
        this.$viewportContent.off();
        this.$viewport.off();
    };

    igv.RulerSweeper.prototype.addMouseHandlers = function () {

        var self = this,
            isMouseDown = undefined,
            isMouseIn = undefined,
            mouseDownXY = undefined,
            mouseMoveXY = undefined,
            left,
            rulerSweepWidth,
            rulerSweepThreshold = 1,
            dx;

        this.disableMouseHandlers();

        this.$viewport.on({

            mousedown: function (e) {

                e.preventDefault();
                e.stopPropagation();

                self.$viewportContent.off();

                self.$viewportContent.on({
                    mousedown: function (e) {

                        e.preventDefault();
                        e.stopPropagation();

                        isMouseDown = true;
                    }
                });

                // mouseDownXY = igv.translateMouseCoordinates(e, self.contentDiv);
                mouseDownXY = { x:e.offsetX, y:e.offsetY };

                left = mouseDownXY.x;
                rulerSweepWidth = 0;
                self.$rulerSweeper.css({"display": "inline", "left": left + "px", "width": rulerSweepWidth + "px"});

                isMouseIn = true;
            },

            mousemove: function (e) {

                e.preventDefault();
                e.stopPropagation();

                if (isMouseDown && isMouseIn) {

                    // mouseMoveXY = igv.translateMouseCoordinates(e, self.contentDiv);
                    mouseMoveXY = { x:e.offsetX, y:e.offsetY };

                    dx = mouseMoveXY.x - mouseDownXY.x;
                    rulerSweepWidth = Math.abs(dx);

                    if (rulerSweepWidth > rulerSweepThreshold) {

                        self.$rulerSweeper.css({"width": rulerSweepWidth + "px"});

                        if (dx < 0) {

                            if (mouseDownXY.x + dx < 0) {
                                isMouseIn = false;
                                left = 0;
                            } else {
                                left = mouseDownXY.x + dx;
                            }
                            self.$rulerSweeper.css({"left": left + "px"});
                        }
                    }
                }
            },

            mouseup: function (e) {

                var extent,
                    referenceFrame;

                e.preventDefault();
                e.stopPropagation();

                if (isMouseDown) {

                    // End sweep
                    isMouseDown = false;
                    isMouseIn = false;

                    self.$rulerSweeper.css({ "display": "none", "left": 0 + "px", "width": 0 + "px" });

                    referenceFrame = self.genomicState.referenceFrame;

                    extent = {};
                    extent.start = referenceFrame.start + (left * referenceFrame.bpPerPixel);
                    extent.end = extent.start + rulerSweepWidth * referenceFrame.bpPerPixel;

                    if (rulerSweepWidth > rulerSweepThreshold) {
                        igv.Browser.validateLocusExtent(igv.browser.genome.getChromosome(referenceFrame.chrName), extent);
                        self.viewport.goto(referenceFrame.chrName, extent.start, extent.end);
                    }
                }

            }
        });

    };

    return igv;

}) (igv || {});
