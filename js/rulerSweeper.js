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
        this.namespace = '.sweeper_' + guid;

        this.addMouseHandlers();
    };

    igv.RulerSweeper.prototype.DEPRICATE_layoutWholeGenome = function () {

        const self = this;
        const browser = this.browser;

        const nameLast = this.browser.genome.wgChromosomeNames[ this.browser.genome.wgChromosomeNames.length - 1 ];
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

                $div.on('click', handleClick);
                $div.on('touchend', handleClick);

                function handleClick(e) {

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
                }
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

        $(document).off(this.namespace);
        this.viewport.$viewport.off(this.namespace);
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

        $(this.browser.$root).on('mousedown' + this.namespace, function (e) {

            isMouseIn = true;

            mouseDown = igv.translateMouseCoordinates(e, self.viewport.$viewport).x;

            if (true === isMouseDown ) {

                self.$rulerSweeper.show();

                width = threshold;
                left = mouseDown;
                self.$rulerSweeper.css({ left: left + 'px' });
                self.$rulerSweeper.width(width);

            }

        });

        $(this.browser.$root).on('mousemove' + this.namespace, function (e) {
            var mouseCurrent;

            if (isMouseDown && isMouseIn) {

                mouseCurrent = igv.translateMouseCoordinates(e, self.viewport.$viewport).x;
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

        });

        $(this.browser.$root).on('mouseup' + this.namespace, function (e) {

            let extent;

            if (true === isMouseDown && true === isMouseIn) {

                isMouseDown = isMouseIn = undefined;

                self.$rulerSweeper.hide();

                extent = {};
                extent.start = bp.call(self, left);
                extent.end   = bp.call(self, left + width);

                if (width > threshold) {

                    igv.Browser.validateLocusExtent(browser.genome.getChromosome(self.viewport.genomicState.referenceFrame.chrName).bpLength, extent, browser.minimumBases());

                    self.viewport.genomicState.referenceFrame.bpPerPixel = (Math.round(extent.end) - Math.round(extent.start)) / self.viewport.$viewport.width();
                    self.viewport.genomicState.referenceFrame.start = Math.round(extent.start);

                    browser.updateViews(self.viewport.genomicState);
                }

            }

        });

        this.viewport.$viewport.on('mousedown' + this.namespace, function (e) {

            isMouseDown = true;
        });

    };

    igv.RulerSweeper.prototype.dispose = function () {
        this.disableMouseHandlers();
    };


    function bp(pixel) {
        return this.viewport.genomicState.referenceFrame.start + (pixel * this.viewport.genomicState.referenceFrame.bpPerPixel);
    }



    return igv;

}) (igv || {});
