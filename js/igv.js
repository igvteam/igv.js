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


    function createStandardControls(browser, options) {
        var controlDiv = $('<div id="igvControlDiv" class="igv-control-div">')[0],
            contentKaryo;
        if (options.showKaryo) {
            contentKaryo = $('<div id="igvKaryoDiv" class="igv-karyo-div">')[0];
            $(controlDiv).append(contentKaryo);
            browser.karyoPanel = new igv.KaryoPanel(contentKaryo);
        }
        return controlDiv;
    }

    /**
     * Create an igv.browser instance.  This object defines the public API for interacting with the genome browser.
     *
     * @param parentDiv - DOM tree root
     * @param options - configuration options.
     *
     */
    igv.createBrowser = function (parentDiv, options) {

        if (igv.browser) {
            console.log("Attempt to create 2 browsers.")
            return igv.browser;
        }


        if (!options) options = {};
        options.type = "IGV";

        console.log("Create browser");
        if (!options.flanking && isT2D(options)) {  // TODO -- hack for demo, remove
            options.flanking = 100000;
        }

        var contentRoot = $('<div id="igvContentDiv" class="igv-content-div">')[0],
            contentHeader = $('<div id="igvHeaderDiv" class="igv-header-div">')[0],
            trackContainer = $('<div id="igvTrackContainerDiv" class="igv-track-container-div">')[0],
            browser = new igv.Browser(options, trackContainer),
            rootDiv = browser.div,
            controlDiv;

        // DOM

        parentDiv.appendChild(rootDiv);


        // Create controls.  This can be customized by passing in a function, which should return a div containing the
        // controls
        controlDiv = options.createControls ?
            options.createControls(browser, options) :
            createStandardControls(browser,options);

        $(rootDiv).append($(controlDiv));

        $(rootDiv).append(contentRoot);
        $(contentRoot).append(contentHeader);
        $(contentRoot).append(trackContainer);

        // Popover object -- singleton shared by all components
        igv.popover = new igv.Popover(contentRoot);

        browser.ideoPanel = new igv.IdeoPanel(rootDiv);
        $(contentHeader).append(browser.ideoPanel.div);
        browser.ideoPanel.resize();


        console.log("Browser startup");


        igv.sequenceSource = new igv.FastaSequence(options.fastaURL);


        igv.loadGenome(options.cytobandURL, function (genome) {

            browser.genome = genome;

            // Set inital locus
            var firstChrName = browser.genome.chromosomeNames[0],
                firstChr = browser.genome.chromosomes[firstChrName];

            browser.referenceFrame = new igv.ReferenceFrame(firstChrName, 0, firstChr.bpLength / browser.trackViewportWidth());
            browser.controlPanelWidth = 50;

            if (browser.ideoPanel) browser.ideoPanel.repaint();
            if (browser.karyoPanel) browser.karyoPanel.repaint();
            browser.addTrack(new igv.RulerTrack());

            // If an initial locus is specified go there first, then load tracks.  This avoids loading track data at
            // a default location then moving
            if (options.locus) {

                browser.search(options.locus, function () {

                    var refFrame = igv.browser.referenceFrame,
                        start = refFrame.start,
                        end = start + igv.browser.trackViewportWidth() * refFrame.bpPerPixel,
                        range = start - end;

                    if (options.tracks) {
                        if (range < 100000) {
                            igv.sequenceSource.getSequence(refFrame.chr, start, end, function (refSeq) {
                                options.tracks.forEach(function (track) {
                                    browser.loadTrack(track);
                                });
                            });
                        }
                    }
                    else {
                        options.tracks.forEach(function (track) {
                            browser.loadTrack(track);
                        });

                    }

                });

            }
            else if (options.tracks) {
                options.tracks.forEach(function (track) {
                    browser.loadTrack(track);
                });

            }


        });


        return browser;


    }

    // TODO -- temporary hack for demo, remove ASAP
    function isT2D(options) {
        if (options.tracks && options.tracks.length > 0) {
            var t = options.tracks[0];
            var b = t instanceof igv.T2dTrack;
            return b;
        }
        else {
            return false;
        }
    }

    return igv;
})(igv || {});







