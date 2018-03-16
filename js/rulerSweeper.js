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

    igv.RulerSweeper = function (viewport, genomicState) {

        var index;

        this.viewport = viewport;
        this.genomicState = genomicState;

        this.$rulerSweeper = $('<div class="igv-ruler-sweeper-div">');
        $(viewport.contentDiv).append(this.$rulerSweeper);

        this.wholeGenomeLayout($(viewport.contentDiv).find('.igv-whole-genome-container'));

        index = igv.browser.genomicStateList.indexOf(genomicState);
        this.mouseHandlers =
            {
                document:
                    {
                        down:'mousedown.rulersweeper.' + index,
                        move:'mousemove.rulersweeper.' + index,
                          up:'mouseup.rulersweeper.' + index
                    },
                viewport:
                    {
                        down:'mousedown.rulersweeper.viewport.' + index
                    }

            };

        this.addMouseHandlers();
    };

    igv.RulerSweeper.prototype.wholeGenomeLayout = function ($container) {

        var self = this,
            $viewportContent,
            viewportWidth,
            extent,
            nameLast,
            chrLast,
            scraps,
            $div,
            $e;


        nameLast = _.last(igv.browser.genome.wgChromosomeNames);

        chrLast = igv.browser.genome.getChromosome(nameLast);

        extent = Math.floor(chrLast.bpLength/1000) + igv.browser.genome.getCumulativeOffset(nameLast);

        viewportWidth = this.viewport.$viewport.width();
        $viewportContent = $(this.viewport.contentDiv);

        scraps = 0;
        _.each(igv.browser.genome.wgChromosomeNames, function (name) {
            var w,
                percentage;

            percentage = (igv.browser.genome.getChromosome(name).bpLength)/extent;
            if (percentage * viewportWidth < 1.0) {
                scraps += percentage;
            } else {
                $div = $('<div>');
                $container.append($div);

                w = Math.floor(percentage * viewportWidth);
                $div.width(w);

                $e = $('<span>');
                $div.append($e);

                $e.text(name);

                $div.on('click', function (e) {
                    var locusString,
                        loci;

                    $viewportContent.find('.igv-whole-genome-container').hide();
                    $viewportContent.find('canvas').show();

                    if (1 === igv.browser.genomicStateList.length) {
                        locusString = name;
                    } else {
                        loci = _.map(igv.browser.genomicStateList, function (g) {
                            return g.locusSearchString;
                        });

                        loci[ igv.browser.genomicStateList.indexOf(self.genomicState) ] = name;
                        locusString = loci.join(' ');
                    }

                    igv.browser.search(locusString);
                });
            }

        });

        scraps *= viewportWidth;
        scraps = Math.floor(scraps);
        if (scraps >= 1) {

            $div = $('<div>');
            $container.append($div);

            $div.width(scraps);

            $e = $('<span>');
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

        var self = this,
            isMouseDown,
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
                    igv.Browser.validateLocusExtent(igv.browser.genome.getChromosome(self.genomicState.referenceFrame.chrName), extent);
                    self.viewport.goto(self.genomicState.referenceFrame.chrName, extent.start, extent.end);
                }

            }

        });

        this.viewport.$viewport.on(this.mouseHandlers.viewport.down, function (e) {

            isMouseDown = true;
        });

    };

    function bp(pixel) {
        return this.genomicState.referenceFrame.start + (pixel * this.genomicState.referenceFrame.bpPerPixel);
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
