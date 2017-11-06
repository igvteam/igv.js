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

        var $content,
            $header,
            browser;

        if (igv.browser) {
            //console.log("Attempt to create 2 browsers.");
            igv.removeBrowser();
        }

        if (undefined === config) config = {};

        setDefaults(config);


        // Set track order explicitly. Otherwise they will be ordered randomly as each completes its async load
        setTrackOrder(config);

        browser = new igv.Browser(config, $('<div class="igv-track-container-div">')[0]);

        $(parentDiv).append(browser.$root);

        // drag & drop
        browser.trackFileLoad = new igv.TrackFileLoad();
        browser.$root.append(browser.trackFileLoad.$container);
        browser.trackFileLoad.$container.hide();

        setControls(browser, config);

        $content = $('<div class="igv-content-div">');
        browser.$root.append($content);

        $header = $('<div id="igv-content-header">');
        $content.append($header);

        $content.append(browser.trackContainerDiv);

        // user feedback
        browser.userFeedback = new igv.UserFeedback($content);
        browser.userFeedback.hide();

        // Popover object -- singleton shared by all components
        igv.popover = new igv.Popover($content);

        // alert object -- singleton shared by all components
        igv.alert = new igv.AlertDialog(browser.$root, "igv-alert");
        igv.alert.hide();

        // Dialog object -- singleton shared by all components
        igv.dialog = new igv.Dialog(browser.$root, igv.Dialog.dialogConstructor);
        igv.dialog.hide();

        // Data Range Dialog object -- singleton shared by all components
        igv.dataRangeDialog = new igv.DataRangeDialog(browser.$root);
        igv.dataRangeDialog.hide();

        if (!config.showNavigation) {
            $header.append($('<div class="igv-logo-nonav">'));
        }

        if (config.apiKey) igv.setApiKey(config.apiKey);
        if (config.oauthToken) igv.setOauthToken(config.oauthToken);


        var width;

        // Potentially load a session file
        loadSessionFile()

            .then(function (session) {

                if (session) {
                    config = Object.assign(config, session);
                }

                // Deal with legacy genome definition options
                setReferenceConfiguration(config);

                // Query parameter locus has precendence
                var initialLocus = extractLocus();
                if(initialLocus) config.locus = initialLocus;

                return config;
            })

            .then(function (config) {

                return igv.loadGenome(config.reference);

            })

            .then(function (genome) {

                igv.browser.genome = genome;
                igv.browser.genome.id = config.reference.genomeId;

                igv.browser.chromosomeSelectWidget.update(igv.browser.genome);

                width = igv.browser.viewportContainerWidth();

                return igv.browser.getGenomicStateList(getInitialLocus(config), width)
            })

            .then(function (genomicStateList) {

                var errorString;

                if (genomicStateList.length > 0) {

                    igv.browser.genomicStateList = genomicStateList.map(function (genomicState, index) {
                        genomicState.locusIndex = index;
                        genomicState.locusCount = genomicStateList.length;
                        genomicState.referenceFrame = new igv.ReferenceFrame(genomicState.chromosome.name, genomicState.start, (genomicState.end - genomicState.start) / (width / genomicState.locusCount));
                        genomicState.initialReferenceFrame = new igv.ReferenceFrame(genomicState.chromosome.name, genomicState.start, (genomicState.end - genomicState.start) / (width / genomicState.locusCount));
                        return genomicState;
                    });

                    igv.browser.updateLocusSearchWithGenomicState(_.first(igv.browser.genomicStateList));

                    igv.browser.zoomWidgetLayout();

                    // igv.browser.toggleCursorGuide(igv.browser.genomicStateList);
                    igv.browser.toggleCenterGuide(igv.browser.genomicStateList);

                    if (igv.browser.karyoPanel) {
                        igv.browser.karyoPanel.resize();
                    }

                    if (true === config.showIdeogram) {
                        igv.browser.ideoPanel = new igv.IdeoPanel($header);
                        igv.browser.ideoPanel.repaint();
                    }

                    if (config.showRuler) {
                        igv.browser.rulerTrack = new igv.RulerTrack();
                        igv.browser.addTrack(igv.browser.rulerTrack);
                    }

                    if (config.roi) {
                        igv.browser.roi = [];
                        config.roi.forEach(function (r) {
                            igv.browser.roi.push(new igv.ROI(r));
                        });
                    }

                    if (config.tracks) {
                        igv.browser.loadTracksWithConfigList(config.tracks);
                    }

                    igv.browser.windowSizePanel.updateWithGenomicState(_.first(igv.browser.genomicStateList));

                } else {
                    errorString = 'Unrecognized locus ' + config.locus;
                    igv.presentAlert(errorString);
                }

            })
            .catch(function (error) {
                igv.presentAlert(error);
                console.log(error);
            });

        return browser;

    };

    igv.setApiKey = function (key) {
        oauth.google.apiKey = key;
    }

    igv.setOauthToken = function (token) {
        oauth.google.access_token = token;
    }

    function setTrackOrder(conf) {

        var trackOrder = 1;

        if (conf.tracks) {
            conf.tracks.forEach(function (track) {
                if (track.order === undefined) {
                    track.order = trackOrder++;
                }
            });
        }

    }

    function setReferenceConfiguration(conf) {

        if (conf.genome) {
            conf.reference = expandGenome(conf.genome);
        }
        else if (conf.fastaURL) {   // legacy property
            conf.reference = {
                fastaURL: conf.fastaURL,
                cytobandURL: conf.cytobandURL
            }
        }
        else if (conf.reference && conf.reference.id !== undefined && conf.reference.fastaURL === undefined) {
            conf.reference = expandGenome(conf.reference.id);
        }

        if (!(conf.reference && conf.reference.fastaURL)) {
            //alert("Fatal error:  reference must be defined");
            igv.presentAlert("Fatal error:  reference must be defined");
            throw new Error("Fatal error:  reference must be defined");
        }


        /**
         * Expands ucsc type genome identifiers to genome object.
         *
         * @param genomeId
         * @returns {{}}
         */
        function expandGenome(genomeId) {

            var reference = igv.Genome.KnownGenomes[genomeId];

            if (!reference)igv.presentAlert("Uknown genome id: " + genomeId);

            return reference;
        }

    }

    function setControls(browser, conf) {

        var controlDiv;

        // Create controls.  This can be customized by passing in a function, which should return a div containing the
        // controls

        if (conf.showCommandBar !== false && conf.showControls !== false) {
            controlDiv = conf.createControls ? conf.createControls(browser, conf) : createStandardControls(browser, conf);
            browser.$root.append($(controlDiv));
        }

    }

    function createStandardControls(browser, config) {

        var $igvLogo,
            $controls,
            $karyo,
            $navigation,
            $searchContainer,
            $faSearch;

        $controls = $('<div id="igvControlDiv">');

        if (config.showNavigation) {

            $navigation = $('<div class="igv-navbar">');
            $controls.append($navigation);

            // IGV logo
            $igvLogo = $('<div class="igv-logo">');
            $navigation.append($igvLogo);

            // load local file
            $navigation.append(browser.trackFileLoad.$presentationButton);
            if (true === config.showLoadFileWidget) {
                browser.trackFileLoad.$presentationButton.show();
            } else {
                browser.trackFileLoad.$presentationButton.hide();
            }

            // chromosome select widget
            browser.chromosomeSelectWidget = new igv.ChromosomeSelectWidget(browser, $navigation);
            if (true === config.showChromosomeWidget) {
                browser.chromosomeSelectWidget.$container.show();
            } else {
                browser.chromosomeSelectWidget.$container.hide();
            }

            // search container
            $searchContainer = $('<div class="igv-search-container">');
            $navigation.append($searchContainer);

            browser.$searchInput = $('<input type="text" placeholder="Locus Search">');
            $searchContainer.append(browser.$searchInput);

            browser.$searchInput.change(function (e) {
                browser.parseSearchInput($(this).val());
            });

            $faSearch = $('<i class="fa fa-search">');
            $searchContainer.append($faSearch);

            $faSearch.click(function () {
                browser.parseSearchInput(browser.$searchInput.val());
            });


            // search results presented in table
            browser.$searchResults = $('<div class="igv-search-results">');
            $searchContainer.append(browser.$searchResults.get(0));

            browser.$searchResultsTable = $('<table>');
            browser.$searchResults.append(browser.$searchResultsTable.get(0));

            browser.$searchResults.hide();

            // window size panel
            browser.windowSizePanel = new igv.WindowSizePanel($navigation);

            // zoom widget
            zoomWidget(browser, $navigation);

            // cursor tracking guide
            browser.$cursorTrackingGuide = $('<div class="igv-cursor-tracking-guide">');
            $(browser.trackContainerDiv).append(browser.$cursorTrackingGuide);

            if (true === config.showCursorTrackingGuide) {
                browser.$cursorTrackingGuide.show();
            } else {
                browser.$cursorTrackingGuide.hide();
            }

            browser.$cursorTrackingGuideToggle = igv.makeToggleButton('cursor guide', 'cursor guide', 'showCursorTrackingGuide', function () {
                return browser.$cursorTrackingGuide;
            }, undefined);

            $navigation.append(browser.$cursorTrackingGuideToggle);

            // one base wide center guide
            browser.centerGuide = new igv.CenterGuide($(browser.trackContainerDiv), config);

            $navigation.append(browser.centerGuide.$centerGuideToggle);

            // toggle track labels
            browser.$trackLabelToggle = igv.makeToggleButton('track labels', 'track labels', 'trackLabelsVisible', function () {
                return $(browser.trackContainerDiv).find('.igv-track-label');
            }, undefined);

            $navigation.append(browser.$trackLabelToggle);

        }

        $karyo = $('#igvKaryoDiv');
        if (undefined === $karyo.get(0)) {
            $karyo = $('<div id="igvKaryoDiv" class="igv-karyo-div">');
            $controls.append($karyo);
        }
        browser.karyoPanel = new igv.KaryoPanel($karyo, config);

        $navigation.append(browser.karyoPanel.$karyoPanelToggle);

        if (false === config.showKaryo) {
            browser.karyoPanel.$karyoPanelToggle.hide();
            $karyo.hide();
        }

        return $controls.get(0);
    }

    function zoomWidget(browser, $parent) {

        var $fa;

        browser.$zoomContainer = $('<div class="igv-zoom-widget">');
        $parent.append(browser.$zoomContainer);

        $fa = $('<i class="fa fa-minus-circle">');
        browser.$zoomContainer.append($fa);
        $fa.on('click', function () {
            browser.zoomOut();
        });


        $fa = $('<i class="fa fa-plus-circle">');
        browser.$zoomContainer.append($fa);
        $fa.on('click', function () {
            browser.zoomIn();
        });

    }

    function setDefaults(config) {

        if (undefined === config.showLoadFileWidget) {
            config.showLoadFileWidget = false;
        }

        if (undefined === config.minimumBases) {
            config.minimumBases = 40;
        }

        if (undefined === config.showIdeogram) {
            config.showIdeogram = true;
        }

        if (undefined === config.showCursorTrackingGuide) {
            config.showCursorTrackingGuide = false;
        }

        if (undefined === config.showCenterGuide) {
            config.showCenterGuide = false;
        }

        if (undefined === config.showKaryo) {
            config.showKaryo = false;
        }

        if (undefined === config.trackLabelsVisible) {
            config.trackLabelsVisible = true;
        }

        if (config.showControls === undefined) {
            config.showControls = true;
        }

        if (config.showNavigation === undefined) {
            config.showNavigation = true;
        }

        if (config.showRuler === undefined) {
            config.showRuler = true;
        }

        if (config.showSequence === undefined) {
            config.showSequence = true;
        }

        if (config.flanking === undefined) {
            config.flanking = 1000;
        }
        if (config.pairsSupported === undefined) {
            config.pairsSupported = true;
        }

        if (config.type === undefined) {
            config.type = "IGV";
        }

        if (!config.tracks) {
            config.tracks = [];
        }

        if (config.showSequence) {
            config.tracks.push({type: "sequence", order: -Number.MAX_VALUE});
        }

    }

    igv.removeBrowser = function () {
        igv.browser.$root.remove();
        $(".igv-grid-container-dialog").remove();
        // $(".igv-grid-container-dialog").remove();
    };


    function getInitialLocus(config) {

        var loci = [];

        if (config.locus) {
            if (Array.isArray(config.locus)) {
                loci = config.locus;

            } else {
                loci.push(config.locus);
            }
        }
        else {
            if (igv.browser.genome.hasOwnProperty("all")) {
                loci.push("all");
            }
            else {
                loci.push(igv.browser.genome.chromosomeNames[0]);
            }
        }

        return loci;
    }


    function extractQuery(uri) {
        var i1, i2, i, j, s, query, tokens;

        query = {};
        i1 = uri.indexOf("?");
        i2 = uri.lastIndexOf("#");

        if (i1 >= 0) {
            if (i2 < 0) i2 = uri.length;

            for (i = i1 + 1; i < i2;) {

                j = uri.indexOf("&", i);
                if (j < 0) j = i2;

                s = uri.substring(i, j);
                tokens = s.split("=", 2);
                if (tokens.length === 2) {
                    query[tokens[0]] = tokens[1];
                }

                i = j + 1;
            }
        }
        return query;
    }

    function loadSessionFile() {

        var query = extractQuery(window.location.href);

        if (query.hasOwnProperty("igvSessionXML")) {

            var igvSession = decodeURIComponent(query["igvSessionXML"]);

            return igv.xhr.loadString(igvSession)
                .then(function (string) {
                    return new igv.XMLSession(string);
                })

        }
        else {
            return Promise.resolve(undefined);
        }
    }

    function extractLocus() {

        var query = extractQuery(window.location.href),
            loc = query["locus"];

        return loc ? decodeURIComponent(loc) : undefined;
    }

    return igv;
})
(igv || {});







