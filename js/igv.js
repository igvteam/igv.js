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

    /**
     * Create an igv.browser instance.  This object defines the public API for interacting with the genome browser.
     *
     * @param parentDiv - DOM tree root
     * @param options - configuration options.
     *
     */
    igv.createBrowser = function (parentDiv, options) {

        var contentDiv,
            headerDiv,
            trackContainerDiv,
            browser,
            rootDiv,
            controlDiv,
            colorPickerPalette;

        if (igv.browser) {
            console.log("Attempt to create 2 browsers.");
            return igv.browser;
        }

        if (!options) options = {};
        if (!options.type) options.type = "IGV";

        if(options.oauthToken) {
            oauth.google.access_token = options.oauthToken;
        }

        if (!options.flanking && isT2D(options)) {  // TODO -- hack for demo, remove
            options.flanking = 100000;
        }

        if (options.genome) {
            mergeGenome(options);
        }

        trackContainerDiv = $('<div id="igvTrackContainerDiv" class="igv-track-container-div">')[0];
        browser = new igv.Browser(options, trackContainerDiv);
        rootDiv = browser.div;


        // DOM
        parentDiv.appendChild(rootDiv);

        // Create controls.  This can be customized by passing in a function, which should return a div containing the
        // controls
        controlDiv = options.createControls ?
            options.createControls(browser, options) :
            createStandardControls(browser, options);

        $(rootDiv).append($(controlDiv));

        contentDiv = $('<div id="igvContentDiv" class="igv-content-div">')[0];
        $(rootDiv).append(contentDiv);

        headerDiv = $('<div id="igvHeaderDiv" class="igv-header-div">')[0];
        $(contentDiv).append(headerDiv);

        $(contentDiv).append(trackContainerDiv);


        // user feedback
        browser.userFeedback = new igv.UserFeedback( $(contentDiv) );
        browser.userFeedback.hide();

        // Popover object -- singleton shared by all components
        igv.popover = new igv.Popover(contentDiv);

        // ColorPicker object -- singleton shared by all components
        igv.colorPicker = new igv.ColorPicker($("body"), options.palette);
        //igv.colorPicker = new igv.ColorPicker($(trackContainerDiv), options.palette);
        igv.colorPicker.hide();

        // extend jquery ui dialog widget to support enter key triggering "ok" button press.
        $.extend($.ui.dialog.prototype.options, {

            create: function() {

                var $this = $(this);

                // focus first button and bind enter to it
                $this.parent().find('.ui-dialog-buttonpane button:first').focus();

                $this.keypress(function(e) {

                    if( e.keyCode == $.ui.keyCode.ENTER ) {
                        $this.parent().find('.ui-dialog-buttonpane button:first').click();
                        return false;
                    }

                });
            }

        });


        browser.ideoPanel = new igv.IdeoPanel(rootDiv);
        $(headerDiv).append(browser.ideoPanel.div);
        browser.ideoPanel.resize();

        if (options.trackDefaults) {

            if (undefined !== options.trackDefaults.bam) {

                if (undefined !== options.trackDefaults.bam.coverageThreshold) {
                    igv.CoverageMap.threshold = options.trackDefaults.bam.coverageThreshold;
                }

                if (undefined !== options.trackDefaults.bam.coverageQualityWeight) {
                    igv.CoverageMap.qualityWeight = options.trackDefaults.bam.coverageQualityWeight;
                }
            }
        }

        igv.loadGenome(options.fastaURL, options.cytobandURL, function (genome) {

            browser.genome = genome;
            browser.addTrack(new igv.RulerTrack());

            // Set inital locus
            var firstChrName = browser.genome.chromosomeNames[0],
                firstChr = browser.genome.chromosomes[firstChrName];

            browser.referenceFrame = new igv.ReferenceFrame(firstChrName, 0, firstChr.bpLength / browser.trackViewportWidth());
            browser.controlPanelWidth = 50;

            browser.updateLocusSearch(browser.referenceFrame);

            if (browser.ideoPanel) browser.ideoPanel.repaint();
            if (browser.karyoPanel) browser.karyoPanel.repaint();

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
                            genome.sequence.getSequence(refFrame.chr, start, end, function (refSeq) {
                                options.tracks.forEach(function (track) {
                                    browser.loadTrack(track);
                                });
                            });
                        }
                        else {
                            options.tracks.forEach(function (track) {
                                browser.loadTrack(track);
                            });
                        }
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


    };

    function createStandardControls(browser, options) {

        var controlDiv = $('<div id="igvControlDiv" class="igv-control-div">')[0],
            contentKaryo,
            navigation,
            search,
            searchButton,
            zoom,
            zoomInButton,
            zoomOutButton,
            fileInput = document.getElementById('fileInput');

        if (fileInput) {

            fileInput.addEventListener('change', function (e) {

                var localFile = fileInput.files[0],
                    featureFileReader;

                featureFileReader = new igv.FeatureFileReader({localFile: localFile});
                featureFileReader.readFeatures(function () {
                    console.log("success reading " + localFile.name);
                });

            });

        }

        if (options.showNavigation) {

            navigation = $('<div class="igvNavigation">');
            $(controlDiv).append(navigation[0]);


            // search
            search = $('<div class="igvNavigationSearch">');
            navigation.append(search[0]);

            browser.searchInput = $('<input class="igvNavigationSearchInput" type="text" placeholder="Locus Search">');
            //browser.searchInput = $('<input type="search" placeholder="Locus Search">');
            search.append(browser.searchInput[0]);

            searchButton = $('<i class="igv-app-icon fa fa-search fa-24px igvNavigationMarginLeft12">');
            search.append(searchButton[0]);

            browser.searchInput.change(function () {

                browser.search($(this).val());
            });

            searchButton.click(function () {
                browser.search(browser.searchInput.val());
            });

            // zoom
            zoom = $('<div class="igvNavigationZoom">');
            navigation.append(zoom[0]);

            zoomOutButton = $('<i class="igv-app-icon fa fa-minus-square-o fa-24px" style="padding-right: 4px;">');

            zoom.append(zoomOutButton[0]);

            zoomInButton = $('<i class="igv-app-icon fa fa-plus-square-o fa-24px">');
            zoom.append(zoomInButton[0]);

            zoomInButton.click(function () {
                igv.browser.zoomIn();
            });

            zoomOutButton.click(function () {
                igv.browser.zoomOut();
            });

        }

        if (options.showKaryo) {
            contentKaryo = $('#igvKaryoDiv')[0];
            // if a karyo div already exists in the page, use that one.
            // this allows the placement of the karyo view on the side, for instance
            if (!contentKaryo) {
                contentKaryo = $('<div id="igvKaryoDiv" class="igv-karyo-div">')[0];
                $(controlDiv).append(contentKaryo);
            }
            browser.karyoPanel = new igv.KaryoPanel(contentKaryo);
        }


        return controlDiv;
    }

    // Merge some standard genome tracks,  this is useful for demos
    // TODO -- move this to external json
    function mergeGenome(options) {

        if (options.genome && options.genome === "hg19") {
            options.fastaURL = "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg19/hg19.fasta";
            options.cytobandURL = "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg19/cytoBand.txt";

            if (!options.tracks) options.tracks = [];

            options.tracks.push(
                {
                    type: "sequence",
                    order: 9999
                });
            options.tracks.push(
                {
                    url: "//dn7ywbm9isq8j.cloudfront.net/annotations/hg19/genes/gencode.v18.collapsed.bed.gz",
                    indexed: false,
                    name: "Genes",
                    order: 10000
                });
        }
    }

    // TODO -- temporary hack for demo, remove ASAP
    function isT2D(options) {
        if (options.tracks && options.tracks.length > 0) {
            var t = options.tracks[0];
            var b = t instanceof igv.GWASTrack;
            return b;
        }
        else {
            return false;
        }
    }

    return igv;
})
(igv || {});







