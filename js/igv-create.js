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

    var igvjs_version = "beta";
    igv.version = igvjs_version;

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
            trackOrder = 1;

        if (igv.browser) {
            //console.log("Attempt to create 2 browsers.");
            igv.removeBrowser();
        }

        if (!config) config = {};

        setDefaults(config);

        oauth.google.apiKey = config.apiKey;
        oauth.google.access_token = config.oauthToken;

        // Deal with several legacy genome definition options
        if (config.genome) {
            config.reference = expandGenome(config.genome);
        }
        else if (config.fastaURL) {   // legacy property
            config.reference = {
                fastaURL: config.fastaURL,
                cytobandURL: config.cytobandURL
            }
        }
        else if (config.reference && config.reference.id !== undefined && config.reference.fastaURL === undefined) {
            config.reference = expandGenome(config.reference.id);
        }

        if (!(config.reference && config.reference.fastaURL)) {
            //alert("Fatal error:  reference must be defined");
            igv.presentAlert("Fatal error:  reference must be defined");
            throw new Error("Fatal error:  reference must be defined");
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

        $(document).click(function (e) {
            var target = e.target;
            if (!igv.browser.div.contains(target)) {
                // We've clicked outside the IGV div.  Close any open popovers.
                igv.popover.hide();
            }
        });


        // DOM
        $(parentDiv).append($(rootDiv));

        // Create controls.  This can be customized by passing in a function, which should return a div containing the
        // controls

        if (config.showCommandBar !== false && config.showControls !== false) {
            controlDiv = config.createControls ? config.createControls(browser, config) : createStandardControls(browser, config);
            $(rootDiv).append($(controlDiv));
        }

        contentDiv = $('<div class="igv-content-div">')[0];
        $(rootDiv).append(contentDiv);

        headerDiv = $('<div>')[0];
        $(contentDiv).append(headerDiv);

        $(contentDiv).append(trackContainerDiv);

        // user feedback
        browser.userFeedback = new igv.UserFeedback($(contentDiv));
        browser.userFeedback.hide();

        // Popover object -- singleton shared by all components
        igv.popover = new igv.Popover($(contentDiv), "igv-popover");

        // ColorPicker object -- singleton shared by all components
        igv.colorPicker = new igv.ColorPicker($(rootDiv), config.palette, "igv-color-picker");
        igv.colorPicker.hide();

        // alert object -- singleton shared by all components
        igv.alert = new igv.AlertDialog($(rootDiv), "igv-alert");
        igv.alert.hide();

        // Dialog object -- singleton shared by all components
        igv.dialog = new igv.Dialog($(rootDiv), igv.Dialog.dialogConstructor, "igv-dialog");
        igv.dialog.hide();

        // Data Range Dialog object -- singleton shared by all components
        igv.dataRangeDialog = new igv.DataRangeDialog($(rootDiv), "igv-data-range-dialog");
        igv.dataRangeDialog.hide();

        if (!config.showNavigation) {
            igvLogo = $('<div class="igv-logo-nonav">');
            $(headerDiv).append(igvLogo[0]);
        }

        // ideogram
        if (config.hideIdeogram && true === config.hideIdeogram) {
            // do nothing
        } else {
            browser.ideoPanel = new igv.IdeoPanel(headerDiv);
            browser.ideoPanel.resize();
        }

        // phone home -- counts launches.  Count is anonymous, needed for our continued funding.  Please don't delete
        phoneHome();


        igv.loadGenome(config.reference).then(function (genome) {

            var firstChr,
                locus,
                ss,
                ee,
                range;

            genome.id = config.reference.genomeId;
            browser.genome = genome;

            if (true === config.showRuler) {
                browser.addTrack(new igv.RulerTrack());
            }

            // Set inital locus
            firstChr = browser.genome.chromosomes[ browser.genome.chromosomeNames[0] ];
            browser.referenceFrame = new igv.ReferenceFrame(browser.genome.chromosomeNames[0], 0, firstChr.bpLength / browser.trackViewportWidth());

            browser.updateLocusSearch(browser.referenceFrame);

            if (browser.ideoPanel) browser.ideoPanel.repaint();
            if (browser.karyoPanel) browser.karyoPanel.resize();

            if (config.tracks) {

                // If an initial locus is specified go there first, then load tracks.  This avoids loading track data at
                // a default location then moving
                if (browser.initialLocus || config.locus) {

                    locus = browser.initialLocus ? browser.initialLocus : config.locus;

                    igv.startSpinnerAtParentElement(parentDiv);
                    browser.search(locus, function () {

                        igv.stopSpinnerAtParentElement(parentDiv);
                        ss = browser.referenceFrame.start;
                        ee = ss + browser.trackViewportWidth() * browser.referenceFrame.bpPerPixel;
                        range = ss - ee;
                        var sortBy = [browser.referenceFrame.chr, ss, ee, "DESC"];
                        if (config.tracks) {
                            config.tracks.forEach(function(track){
                                if(track.type === "seg")track.sortBy = sortBy;
                            });
                            browser.loadTracksWithConfigList(config.tracks);
                        }
                    }, true);

                } else {
                    browser.loadTracksWithConfigList(config.tracks);
                }

            } // if (config.tracks)

        }).catch(function (error) {
            igv.presentAlert(error);
            console.log(error);
        });

        return browser;

    };

    function createStandardControls(browser, config) {

        var $igvLogo,
            $controls,
            contentKaryo,
            $navigation,
            $searchContainer,
            $faSearch,
            $trackLabelToggle,
            $cursorTrackingGuideToggle,
            $karyoPanelToggle;

        $controls = $('<div id="igvControlDiv">');

        if (config.showNavigation) {

            $navigation = $('<div class="igvNavigation">');
            $controls.append($navigation);

            $igvLogo = $('<div class="igv-logo">');

            $searchContainer = $('<div class="igvNavigationSearch">');

            browser.$searchInput = $('<input class="igvNavigationSearchInput" type="text" placeholder="Locus Search">');

            browser.$searchInput.change(function () {

                browser.search($(this).val());
            });

            $faSearch = $('<i class="igv-fa-search fa fa-search fa-18px shim-left-6">');

            $faSearch.click(function () {
                browser.search(browser.$searchInput.val());
            });

            $searchContainer.append(browser.$searchInput);
            $searchContainer.append($faSearch);

            $navigation.append($igvLogo);
            $navigation.append($searchContainer);

            // search results presented in table
            browser.$searchResults = $('<div class="igvNavigationSearchResults">');
            browser.$searchResultsTable = $('<table class="igvNavigationSearchResultsTable">');

            browser.$searchResults.append(browser.$searchResultsTable[0]);

            $searchContainer.append(browser.$searchResults[0]);

            browser.$searchResults.hide();

            // window size panel
            browser.windowSizePanel = new igv.WindowSizePanel($navigation);

            // TODO - hide until re-implementation as part of ruler is released.
            browser.windowSizePanel.$content.hide();

            // $navigation.append($zoomContainer[0]);
            $navigation.append(makeZoomWidget());


            // cursor tracking guide
            browser.$cursorTrackingGuide = $('<div class="igv-cursor-tracking-guide">');
            if (true == config.showCursorTrackingGuide) {
                browser.$cursorTrackingGuide.show();
            } else {
                browser.$cursorTrackingGuide.hide();
            }
            $(browser.trackContainerDiv).append(browser.$cursorTrackingGuide);

            $cursorTrackingGuideToggle = igv.makeToggleButton('cursor guide', 'cursor guide', 'showCursorTrackingGuide', function () {
                return browser.$cursorTrackingGuide;
            });

            $navigation.append($cursorTrackingGuideToggle);

            // one base wide center guide
            browser.centerGuide = new igv.CenterGuide($(browser.trackContainerDiv), config);

            $navigation.append(browser.centerGuide.$centerGuideToggle);

            // toggle track labels
            $trackLabelToggle = igv.makeToggleButton('track labels', 'track labels', 'trackLabelsVisible', function () {
                return $(browser.trackContainerDiv).find('.igv-track-label');
            });

            $navigation.append($trackLabelToggle);

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

            $karyoPanelToggle = $('<div class="igv-nav-bar-toggle-button">');
            $karyoPanelToggle.text("Karyotype");

            if (config.showKaryo === "hide") {
                $karyoPanelToggle.toggleClass("igv-nav-bar-toggle-button-on")
                $(contentKaryo).addClass("igv-karyo-hide");
            } else {
                $karyoPanelToggle.toggleClass("igv-nav-bar-toggle-button-off")
            }

            $karyoPanelToggle.click(function () {
                var $karyo = $(".igv-karyo-div"),
                    hidden = $karyo.hasClass("igv-karyo-hide");
                $karyoPanelToggle.toggleClass("igv-nav-bar-toggle-button-on");
                $karyoPanelToggle.toggleClass("igv-nav-bar-toggle-button-off");
                if (hidden) {
                    $karyo.removeClass("igv-karyo-hide");
                } else {
                    $karyo.addClass("igv-karyo-hide");
                }
            });

            $navigation.append($karyoPanelToggle[0]);
        }


        return $controls[0];
    }

    function makeZoomWidget() {

        var $faZoomOut,
            $faZoomIn,
            $zoomContainer;

        $faZoomOut = $('<i class="fa fa-minus-circle igv-fa-search fa-20px shim-top-2 shim-right-4">');

        $faZoomOut.click(function () {
            igv.browser.zoomOut();
        });

        $faZoomIn = $('<i class="fa fa-plus-circle igv-fa-search fa-20px shim-top-2">');

        $faZoomIn.click(function () {
            igv.browser.zoomIn();
        });

        $zoomContainer = $('<div class="igvNavigationZoom">');
        $zoomContainer.append($faZoomOut);
        $zoomContainer.append($faZoomIn);

        return $zoomContainer;

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
                reference.fastaURL = "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg18/hg18.fasta";
                reference.cytobandURL = "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg18/cytoBand.txt.gz";
                break;
            case "hg19":
            case "GRCh37":
            default:
            {
                reference.fastaURL = "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/hg19.fasta";
                reference.cytobandURL = "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg19/cytoBand.txt";
            }
        }
        return reference;
    }

    function setDefaults(config) {

        config.showKaryo = config.showKaryo || false;
        if (config.hideIdeogram === undefined) config.hideIdeogram = false;
        if (config.showCursorTrackingGuide === undefined) config.showCursorTrackingGuide = false;
        if (config.showCenterGuide === undefined) config.showCenterGuide = false;
        if (config.showControls === undefined) config.showControls = true;
        if (config.showNavigation === undefined) config.showNavigation = true;
        if (config.showRuler === undefined) config.showRuler = true;
        if (config.showSequence === undefined) config.showSequence = true;
        if (config.flanking === undefined) config.flanking = 1000;
        if (config.pairsSupported === undefined) config.pairsSupported = true;
        if (config.type === undefined) config.type = "IGV";

        if (!config.tracks) {
            config.tracks = [];
        }
        if (config.showSequence) {
            config.tracks.push({type: "sequence", order: -9999});
        }  // Sequence track

    }

    igv.removeBrowser = function () {
        $(igv.browser.div).remove();
        $(".igv-grid-container-colorpicker").remove();
        $(".igv-grid-container-dialog").remove();
        // $(".igv-grid-container-dialog").remove();
    }


    // Increments an anonymous usage count.  Essential for continued funding of igv.js, please do not remove.
    function phoneHome() {
        var url = "https://data.broadinstitute.org/igv/projects/current/counter_igvjs.php?version=" + igvjs_version;
        igvxhr.load(url).then(function (ignore) {
            console.log(ignore);
        }).catch(function (error) {
            console.log(error);
        });
    }

    return igv;
})
(igv || {});







