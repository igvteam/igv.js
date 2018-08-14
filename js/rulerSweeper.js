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

    igv.RulerSweeper = function (viewport) {

        var guid;

        this.viewport = viewport;
        this.browser = viewport.browser;

        this.$rulerSweeper = $('<div class="igv-ruler-sweeper-div">');
        $(viewport.contentDiv).append(this.$rulerSweeper);

        guid = igv.guid();

        this.mouseHandlers =
            {
                document:
                    {
                        down:'mousedown._document_.' + guid,
                        move:'mousemove._document_.' + guid,
                          up:  'mouseup._document_.' + guid
                    },
                viewport:
                    {
                        down:'mousedown.viewport.' + guid
                    }

            };

        this.addMouseHandlers();
    };

    igv.RulerSweeper.prototype.layoutWholeGenome = function () {

        const self = this;
        const browser = this.browser;

        const nameLast = _.last(this.browser.genome.wgChromosomeNames);
        const chrLast = this.browser.genome.getChromosome(nameLast);
        const extent = Math.floor(chrLast.bpLength/1000) + this.browser.genome.getCumulativeOffset(nameLast);
        const pixels = this.viewport.$viewport.width();

        let scraps = 0;
        this.browser.genome.wgChromosomeNames.forEach(function (name) {
            var chr,
                w,
                percentage,
                shortName;

            chr = browser.genome.getChromosome(name);

            percentage = chr.bpLength/extent;

            if (percentage * pixels < 1.0) {
                scraps += percentage;
            } else {
                const $div = $('<div>');
                self.viewport.$wholeGenomeContainer.append($div);

                w = Math.floor(percentage * pixels);
                $div.width(w);

                const $e = $('<span>');
                $div.append($e);

                shortName = (name.startsWith("chr")) ? name.substring(3) : name;
                $e.text(shortName);

                $div.on('click', function (e) {
                    var locusString,
                        loci;

                    self.viewport.$wholeGenomeContainer.hide();
                    $(self.viewport.canvas).hide();

                    if (1 === browser.genomicStateList.length) {
                        locusString = name;
                    } else {
                        loci = _.map(browser.genomicStateList, function (g) {
                            return g.locusSearchString;
                        });

                        loci[ browser.genomicStateList.indexOf(self.viewport.genomicState) ] = name;
                        locusString = loci.join(' ');
                    }

                    browser.search(locusString);
                });
            }

        });

        scraps *= pixels;
        scraps = Math.floor(scraps);
        if (scraps >= 1) {

            const $div = $('<div>');
            self.viewport.$wholeGenomeContainer.append($div);

            $div.width(scraps);

            const $e = $('<span>');
            $div.append($e);

            $e.text('-');

        }

    };

    igv.RulerSweeper.prototype.disableMouseHandlers = function () {

        $(document).off(this.mouseHandlers.document.down);
        $(document).off(this.mouseHandlers.document.move);
        $(document).off(this.mouseHandlers.document.up);

        this.viewport.$viewport.off(this.mouseHandlers.viewport.down);
    };

    igv.RulerSweeper.prototype.addMouseHandlers = function () {

        const browser = this.browser;
        const self = this;

        var isMouseDown,
            isMouseIn,
            mouseDown,
            left,
            threshold,
            width,
            dx;

        this.disableMouseHandlers();

        isMouseDown = isMouseIn = mouseDown = undefined;

        threshold = 1;

        $(document).on(this.mouseHandlers.document.down, function (e) {

            isMouseIn = true;

            mouseDown = translateMouseCoordinates(e, self.viewport.$viewport).x;

            if (true === isMouseDown ) {

                self.$rulerSweeper.show();

                width = threshold;
                left = mouseDown;
                self.$rulerSweeper.css({ left: left + 'px' });
                self.$rulerSweeper.width(width);

            }

        });

        $(document).on(this.mouseHandlers.document.move, igv.throttle(function (e) {
            var mouseCurrent;

            if (isMouseDown && isMouseIn) {

                mouseCurrent = translateMouseCoordinates(e, self.viewport.$viewport).x;
                mouseCurrent = Math.min(mouseCurrent, self.viewport.$viewport.width());
                mouseCurrent = Math.max(mouseCurrent, 0);

                dx = mouseCurrent - mouseDown;

                width = Math.abs(dx);
                self.$rulerSweeper.width(width);

                if (dx < 0) {
                    left = mouseDown + dx;
                    self.$rulerSweeper.css({ left: left + 'px' });
                }

            }

        }, 10));

        $(document).on(this.mouseHandlers.document.up, function (e) {

            var extent;

            if (true === isMouseDown && true === isMouseIn) {

                isMouseDown = isMouseIn = undefined;

                self.$rulerSweeper.hide();

                extent = {};
                extent.start = bp.call(self, left);
                extent.end   = bp.call(self, left + width);

                if (width > threshold) {
                    // console.log('start | end '+  igv.numberFormatter(extent.start) + ' | ' + igv.numberFormatter(extent.end));
                    igv.Browser.validateLocusExtent(browser.genome.getChromosome(self.viewport.genomicState.referenceFrame.chrName), extent, browser);
                    var genomicState = self.viewport.genomicState,
                        referenceFrame = genomicState.referenceFrame;
                    referenceFrame.bpPerPixel = (Math.round(extent.end) - Math.round(extent.start)) / self.viewport.$viewport.width();
                    referenceFrame.start = Math.round(extent.start);
                    browser.updateViews(genomicState);
                }

            }

        });

        this.viewport.$viewport.on(this.mouseHandlers.viewport.down, function (e) {

            isMouseDown = true;
        });

    };

    function bp(pixel) {
        return this.viewport.genomicState.referenceFrame.start + (pixel * this.viewport.genomicState.referenceFrame.bpPerPixel);
    }

    function translateMouseCoordinates(e, $target) {

        var eFixed,
            posx,
            posy;

        eFixed = $.event.fix(e);

        if (undefined === $target.offset()) {
            console.log('igv.translateMouseCoordinates - $target.offset() is undefined.');
        }
        posx = eFixed.pageX - $target.offset().left;
        posy = eFixed.pageY - $target.offset().top;

        return { x: posx, y: posy }
    }

    return igv;

}) (igv || {});
