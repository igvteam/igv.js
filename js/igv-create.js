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
     * @param config - configuration options.
     *
     */
    igv.createBrowser = function (parentDiv, config) {

        var igvLogo,
            contentDiv,
            headerDiv,
            trackContainerDiv,
            browser,
            rootDiv,
            controlDiv,
            $parent = $(parentDiv),
            palette,
            trackOrder = 1;

        if (igv.browser) {
            //console.log("Attempt to create 2 browsers.");
            igv.removeBrowser();
        }

        if (!config) config = {};

        setDefaults(config);

        if (!config.type) config.type = "IGV";

        oauth.google.apiKey = config.apiKey;
        oauth.google.access_token = config.oauthToken;

        if (config.genome) {
            config.reference = expandGenome(config.genome);
        }

        else if (config.fastaURL) {   // legacy property
            config.reference = {
                fastaURL: config.fastaURL,
                cytobandURL: config.cytobandURL
            }
        }

        if (!(config.reference && config.reference.fastaURL)) {
            alert("Fatal error:  reference must be defined");
            return;
        }


        //Set order of tracks, otherwise they will be ordered randomly as each completes its async load
        if (config.tracks) {
            config.tracks.forEach(function (track) {
                if (track.order === undefined) {
                    track.order = trackOrder++;
                }
            });
        }

        trackContainerDiv = $('<div class="igv-track-container-div">')[0];
        browser = new igv.Browser(config, trackContainerDiv);
        rootDiv = browser.div;

        $(document).mousedown(function (e) {
            //console.log("browser.isMouseDown = true");
            browser.isMouseDown = true;
        });

        $(document).mouseup(function (e) {

            //console.log("browser.isMouseDown = undefined");
            browser.isMouseDown = undefined;

            if (browser.dragTrackView) {
                $(browser.dragTrackView.igvTrackDragScrim).hide();
            }

            browser.dragTrackView = undefined;

        });


        // DOM
        $(parentDiv).append($(rootDiv));

        // Create controls.  This can be customized by passing in a function, which should return a div containing the
        // controls

        if (config.showCommandBar !== false) {
            controlDiv = config.createControls ?
                config.createControls(browser, config) :
                createStandardControls(browser, config);
            $(rootDiv).append($(controlDiv));
        }

        contentDiv = $('<div class="igv-content-div">')[0];
        $(rootDiv).append(contentDiv);

        //headerDiv = $('<div id="igvHeaderDiv" class="igv-header-div">')[0];
        headerDiv = $('<div>')[0];
        $(contentDiv).append(headerDiv);

        $(contentDiv).append(trackContainerDiv);

        // user feedback
        browser.userFeedback = new igv.UserFeedback($(contentDiv));
        browser.userFeedback.hide();

        // Popover object -- singleton shared by all components
        igv.popover = new igv.Popover(contentDiv);

        // ColorPicker object -- singleton shared by all components
        if (config.trackDefaults) {
            palette = config.trackDefaults.palette;
        }
        igv.colorPicker = new igv.ColorPicker($parent, palette);
        igv.colorPicker.hide();

        // Dialog object -- singleton shared by all components
        igv.dialog = new igv.Dialog($parent);
        igv.dialog.hide();

        // Data Range Dialog object -- singleton shared by all components
        igv.dataRangeDialog = new igv.DataRangeDialog($parent);
        igv.dataRangeDialog.hide();

        // extend jquery ui dialog widget to support enter key triggering "ok" button press.
        //$.extend($.ui.dialog.prototype.options, {
        //
        //    create: function () {
        //
        //        var $this = $(this),
        //            $firstButton = $this.parent().find('.ui-dialog-buttonpane button:first');
        //
        //        // focus first button and bind enter to it
        //        $firstButton.focus();
        //
        //        $this.keypress(function (e) {
        //
        //            if (e.keyCode == $.ui.keyCode.ENTER) {
        //                $firstButton.click();
        //                return false;
        //            }
        //
        //        });
        //    }
        //
        //});

        if (!config.showNavigation) {
            igvLogo = $('<div class="igv-logo-nonav">');
            $(headerDiv).append(igvLogo[0]);
        }

        // ideogram
        browser.ideoPanel = new igv.IdeoPanel(headerDiv);
        browser.ideoPanel.resize();


        igv.loadGenome(config.reference).then(function (genome) {

            var referenceWidth = browser.trackViewportWidth();
            if (referenceWidth === 0) referenceWidth = 500;

            genome.id = config.reference.genomeId;
            browser.genome = genome;
            browser.addTrack(new igv.RulerTrack());


            // Set inital locus
            var firstChrName = browser.genome.chromosomeNames[0],
                firstChr = browser.genome.chromosomes[firstChrName];

            browser.referenceFrame = new igv.ReferenceFrame(firstChrName, 0, firstChr.bpLength / referenceWidth);
            browser.controlPanelWidth = 50;

            browser.updateLocusSearch(browser.referenceFrame);

            if (browser.ideoPanel) browser.ideoPanel.repaint();
            if (browser.karyoPanel) browser.karyoPanel.resize();

            // If an initial locus is specified go there first, then load tracks.  This avoids loading track data at
            // a default location then moving
            if (browser.initialLocus || config.locus) {

                var locus = browser.initialLocus ? browser.initialLocus : config.locus;

                igv.startSpinnerAtParentElement(parentDiv);
                browser.search(locus, function () {

                    igv.stopSpinnerAtParentElement(parentDiv);
                    var refFrame = browser.referenceFrame,
                        start = refFrame.start,
                        end = start + browser.trackViewportWidth() * refFrame.bpPerPixel,
                        range = start - end;

                    if (config.tracks) {

                        browser.loadTracksWithConfigList(config.tracks);


                    }

                });

            } else if (config.tracks) {

                browser.loadTracksWithConfigList(config.tracks);

            }


        }).catch(function (error) {
            console.log(error);
        });

        return browser;

    };

    function createStandardControls(browser, config) {

        var $igvLogo,
            $controls = $('<div id="igvControlDiv">'),
            contentKaryo,
            $navigation,
            $searchContainer,
            $faZoom,
            $trackLabelToggle,
            $zoomContainer,
            $faZoomIn,
            $faZoomOut;


        $navigation = $('<div class="igvNavigation">');
        $controls.append($navigation[0]);

        if (config.showNavigation) {

            $igvLogo = $('<div class="igv-logo">');

            $searchContainer = $('<div class="igvNavigationSearch">');

            browser.$searchInput = $('<input class="igvNavigationSearchInput" type="text" placeholder="Locus Search">');

            browser.$searchInput.change(function () {

                browser.search($(this).val());
            });

            $faZoom = $('<i class="igv-app-icon fa fa-search fa-18px shim-left-6">');

            $faZoom.click(function () {
                browser.search(browser.$searchInput.val());
            });

            $searchContainer.append(browser.$searchInput[0]);
            $searchContainer.append($faZoom[0]);

            $navigation.append($igvLogo[0]);
            $navigation.append($searchContainer[0]);

            // search results presented in table
            browser.$searchResults = $('<div class="igvNavigationSearchResults">');
            browser.$searchResultsTable = $('<table class="igvNavigationSearchResultsTable">');

            browser.$searchResults.append(browser.$searchResultsTable[0]);

            $searchContainer.append(browser.$searchResults[0]);

            browser.$searchResults.hide();

            // window size panel
            browser.windowSizePanel = new igv.WindowSizePanel($navigation);

            // zoom in/out
            $faZoomOut = $('<i class="fa fa-minus-circle igv-app-icon fa-24px" style="padding-right: 4px;">');

            $faZoomOut.click(function () {
                igv.browser.zoomOut();
            });

            $faZoomIn = $('<i class="fa fa-plus-circle igv-app-icon fa-24px">');

            $faZoomIn.click(function () {
                igv.browser.zoomIn();
            });

            $zoomContainer = $('<div class="igvNavigationZoom">');
            $zoomContainer.append($faZoomOut[0]);
            $zoomContainer.append($faZoomIn[0]);
            $navigation.append($zoomContainer[0]);


            // hide/show track labels
            $trackLabelToggle = $('<div class="igv-toggle-track-labels">');
            $trackLabelToggle.text("hide labels");

            $trackLabelToggle.click(function () {

                var $leftHandGutters = $('.igv-left-hand-gutter'),
                    $ideogram = $('.igv-ideogram-content-div'),
                    $viewports = $('.igv-viewport-div');

                browser.trackLabelsVisible = !browser.trackLabelsVisible;

                if (false === browser.trackLabelsVisible) {
                    // hide
                    $trackLabelToggle.text("show labels");
                    $ideogram.css({'margin-left': '0'});
                    $leftHandGutters.hide();
                    $viewports.removeClass("gutter-shim");
                    $viewports.addClass("no-gutter-shim");
                    igv.browser.resize();
                } else {
                    // show
                    $trackLabelToggle.text("hide labels");
                    $ideogram.css({'margin-left': '100px'});
                    $leftHandGutters.show();
                    $viewports.removeClass("no-gutter-shim");
                    $viewports.addClass("gutter-shim");
                    igv.browser.resize();
                }

            });

            $navigation.append($trackLabelToggle[0]);

        }

        if (config.showKaryo) {
            contentKaryo = $('#igvKaryoDiv')[0];
            // if a karyo div already exists in the page, use that one.
            // this allows the placement of the karyo view on the side, for instance
            if (!contentKaryo) {
                contentKaryo = $('<div id="igvKaryoDiv" class="igv-karyo-div">')[0];
                $controls.append(contentKaryo);
            }
            browser.karyoPanel = new igv.KaryoPanel(contentKaryo);
        }


        return $controls[0];
    }

    /**
     * Expands ucsc type genome identifiers to genome object.
     *
     * @param genomeId
     * @returns {{}}
     */
    function expandGenome(genomeId) {

        var reference = {id: genomeId};

        switch (genomeId) {

            case "hg18":
                reference.fastaURL = "//s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg18/hg18.fasta";
                reference.cytobandURL = "//s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg18/cytoBand.txt.gz";
                break;
            case "hg19":
            case "GRCh37":
            default:
            {
                reference.fastaURL = "//s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fasta";
                reference.cytobandURL = "//s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/cytoBand.txt";
            }
        }
        return reference;
    }

    function setDefaults(config) {

        if (!config.tracks) {
            config.tracks = [];
        }
        config.tracks.push({type: "sequence", order: -9999});
        config.showKaryo = config.showKaryo || false;
        config.showNavigation = config.showNavigation === undefined ? true : config.showNavigation;
        config.flanking = config.flanking === undefined ? 1000 : config.flanking;

    }

    igv.removeBrowser = function () {
        $(igv.browser.div).remove();
        $(".igv-grid-container-colorpicker").remove();
        $(".igv-grid-container-dialog").remove();
        $(".igv-grid-container-dialog").remove();
    }

    return igv;
})
(igv || {});







