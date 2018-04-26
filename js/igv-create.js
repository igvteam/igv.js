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

        var $header,
            browser;

        if (igv.browser) {
            //console.log("Attempt to create 2 browsers.");
            igv.removeBrowser();
        }

        if (undefined === config) config = {};

        setDefaults(config);

        // Explicit parameters have priority
        if (config.queryParametersSupported) {
            extractQuery(config);
        }

        // Set track order explicitly. Otherwise they will be ordered randomly as each completes its async load
        setTrackOrder(config);

        browser = new igv.Browser(config, $('<div class="igv-track-container-div">')[0]);

        $(parentDiv).append(browser.$root);

        setControls(browser, config);

        browser.$content = $('<div class="igv-content-div">');
        browser.$root.append(browser.$content);

        $header = $('<div id="igv-content-header">');
        browser.$content.append($header);

        browser.$content.append(browser.trackContainerDiv);

        // user feedback
        browser.userFeedback = new igv.UserFeedback(browser.$content);
        browser.userFeedback.hide();

        igv.popover = new igv.Popover(browser.$content);

        igv.alertDialog = new igv.AlertDialog(browser.$content);

        igv.inputDialog = new igv.InputDialog(browser.$root);

        igv.trackRemovalDialog = new igv.TrackRemovalDialog(browser.$root);

        igv.dataRangeDialog = new igv.DataRangeDialog(browser.$root);

        // TODO fix this
        // if (!config.showNavigation) {
        //     $header.append($('<div id="igv-logo-nonav">'));
        // }

        if (config.apiKey) igv.setApiKey(config.apiKey);
        if (config.oauthToken) igv.setOauthToken(config.oauthToken);

        // Load known genome table (make this optional)

        return igv.Genome.getKnownGenomes()

            .then(function (genomeTable) {
                // Potentially load a session file
                return loadSessionFile(config.sessionURL);
            })

            .then(function (session) {

                var locus = config.locus;

                if (session) {
                    config = Object.assign(config, session);
                    if (locus) config.locus = locus;    // Restore

                    if (undefined === config.tracks) config.tracks = [];
                    config.tracks.push({type: "sequence", order: -Number.MAX_VALUE});
                }

                // Expand genome IDs and deal with legacy genome definition options
                setReferenceConfiguration(config);

                return config;
            })

            .then(function (config) {

                return igv.loadGenome(config.reference);

            })

            .then(function (genome) {

                browser.genome = genome;
                browser.genome.id = config.reference.id;

                if (true === config.encodeEnabled) {
                    browser.encodeTable.loadData(config.reference.id, undefined, undefined, undefined);
                }

                browser.chromosomeSelectWidget.update(browser.genome);

                return browser.getGenomicStateList(getInitialLocus(config))
            })

            .then(function (genomicStateList) {

                var viewportWidth,
                    errorString;

                if (genomicStateList.length > 0) {

                    viewportWidth = browser.viewportContainerWidth() / genomicStateList.length;

                    browser.genomicStateList = genomicStateList.map(function (gs) {
                        var obj;
                        gs.referenceFrame = new igv.ReferenceFrame(gs.chromosome.name, gs.start, gs.end, (gs.end - gs.start) / viewportWidth);
                        obj = _.omit(gs, 'start', 'end');
                        return obj;
                    });

                    if (config.showRuler) {
                        browser.rulerTrack = new igv.RulerTrack();
                        browser.addTrack(browser.rulerTrack);
                    }

                    if (config.roi) {
                        browser.roi = [];
                        config.roi.forEach(function (r) {
                            browser.roi.push(new igv.ROI(r));
                        });
                    }

                    if (config.tracks) {
                        browser.loadTrackList(config.tracks);
                    }

                    return browser.genomicStateList;

                } else {
                    errorString = 'Unrecognized locus ' + config.locus;
                    igv.presentAlert(errorString, undefined);
                }

            })
            .then(function (genomicStateList) {
                var panelWidth;

                if (true === config.showIdeogram) {
                    panelWidth = browser.viewportContainerWidth() / genomicStateList.length;
                    browser.ideoPanel = new igv.IdeoPanel($header, panelWidth);
                    browser.ideoPanel.repaint();
                }

                // if (true === config.showKaryo) {
                //     browser.karyoPanel = new igv.KaryoPanel($('#igvKaryoDiv'));
                //     browser.$navigation.append(browser.karyoPanel.$karyoPanelToggle);
                //     browser.karyoPanel.resize(panelWidth);
                // } else {
                //     $('#igvKaryoDiv').hide();
                // }

                browser.updateLocusSearchWidget(genomicStateList[0]);

                browser.windowSizePanel.updateWithGenomicState(genomicStateList[0]);

                if (false === config.showTrackLabels) {
                    browser.hideTrackLabels();
                } else {
                    browser.showTrackLabels();
                    if (browser.trackLabelControl) {
                        browser.trackLabelControl.setState(browser.trackLabelsVisible);
                    }

                }

                if (false === config.showCursorTrackingGuide) {
                    browser.hideCursorGuide();
                } else {
                    browser.showCursorGuide();
                    browser.cursorGuide.setState(browser.cursorGuideVisible);
                }

                if (false === config.showCenterGuide) {
                    browser.hideCenterGuide();
                } else {
                    browser.showCenterGuide();
                    browser.centerGuide.setState(browser.centerGuideVisible);
                }

                // multi-locus mode
                if (genomicStateList.length > 1) {

                    // TODO: This is temporary until implement multi-locus center guides
                    browser.centerGuide.disable();

                }
                // whole-genome
                else if ('all' === genomicStateList[0].locusSearchString) {
                    browser.centerGuide.disable();
                    browser.disableZoomWidget();
                }

                console.log('createBrowser - Genome.getKnownGenomes - return browser');
                return browser;

            })
            .catch(function (error) {
                igv.presentAlert(error, undefined);
                console.log(error);
            });

        // return browser;

    };

    //@deprecated -- user setGoogleApiKey
    igv.setApiKey = function (key) {
        igv.oauth.google.apiKey = key;
    }

    igv.setGoogleApiKey = function (key) {
        igv.oauth.google.apiKey = key;
    }

    //@deprecated -- use setGoogleOauthToken
    igv.setOauthToken = function (token) {
        igv.oauth.google.access_token = token;
    }

    igv.setGoogleOauthToken = function (token) {
        igv.oauth.google.access_token = token;
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
            igv.presentAlert("Fatal error:  reference must be defined", undefined);
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

            if (!reference)igv.presentAlert("Uknown genome id: " + genomeId, undefined);

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

        var $div,
            $igv_nav_bar_left_container,
            $igv_nav_bar_right_container,
            $genomic_location,
            $locus_size_group,
            $toggle_button_container,
            logoDiv,
            $controls,
            $karyo,
            $navigation,
            $searchContainer,
            $faSearch;

        $controls = $('<div id="igvControlDiv">');

        if (config.showNavigation) {

            $navigation = $('<div id="igv-navbar">');
            $controls.append($navigation);
            browser.$navigation = $navigation;

            $igv_nav_bar_left_container = $('<div id="igv-nav-bar-left-container">');
            $navigation.append($igv_nav_bar_left_container);

            // IGV logo
            logoDiv = $('<div id="igv-logo">');
            var logoSvg = logo();
            logoSvg.css("width", "34px");
            logoSvg.css("height", "16px");
            logoDiv.append(logoSvg);
            $igv_nav_bar_left_container.append(logoDiv);

            // load local file
            // browser.trackFileLoad = new igv.TrackFileLoad($igv_nav_bar_left_container, browser.$root);
            browser.trackFileLoad = new igv.FileLoadWidget($igv_nav_bar_left_container, browser.$root);
            if (true === config.showLoadFileWidget) {
                browser.trackFileLoad.$presentationButton.show();
            } else {
                browser.trackFileLoad.$presentationButton.hide();
            }

            $genomic_location = $('<div id="igv-genomic-location">');
            $igv_nav_bar_left_container.append($genomic_location);

            // chromosome select widget
            browser.chromosomeSelectWidget = new igv.ChromosomeSelectWidget(browser, $genomic_location);
            if (true === config.showChromosomeWidget) {
                browser.chromosomeSelectWidget.$container.show();
            } else {
                browser.chromosomeSelectWidget.$container.hide();
            }


            $locus_size_group = $('<div id="igv-locus-size-group">');
            $genomic_location.append($locus_size_group);

            // locus goto widget container
            $searchContainer = $('<div id="igv-search-container">');
            $locus_size_group.append($searchContainer);

            // locus goto input
            browser.$searchInput = $('<input type="text" placeholder="Locus Search">');
            $searchContainer.append(browser.$searchInput);

            browser.$searchInput.change(function (e) {
                browser.search($(this).val());
            });

            // search icon
            $div = $('<i>');
            $searchContainer.append($div);
            $div.append(igv.createIcon("search"));
            $div.click(function () {
                browser.search(browser.$searchInput.val());
            });
            $searchContainer.append($faSearch);

            // TODO: Currently not used
            // search results presented in table
            // browser.$searchResults = $('<div class="igv-search-results">');
            // $searchContainer.append(browser.$searchResults.get(0));
            // browser.$searchResultsTable = $('<table>');
            // browser.$searchResults.append(browser.$searchResultsTable.get(0));
            // browser.$searchResults.hide();

            // window size display
            browser.windowSizePanel = new igv.WindowSizePanel($locus_size_group);


            // cursor guide | center guide | track labels

            $igv_nav_bar_right_container = $('<div id="igv-nav-bar-right-container">');
            $navigation.append($igv_nav_bar_right_container);

            $toggle_button_container = $('<div id="igv-nav-bar-toggle-button-container">');
            $igv_nav_bar_right_container.append($toggle_button_container);

            // cursor guide
            browser.cursorGuide = new igv.CursorGuide($(browser.trackContainerDiv), $toggle_button_container, config);

            // center guide
            browser.centerGuide = new igv.CenterGuide($(browser.trackContainerDiv), $toggle_button_container, config);

            // toggle track labels
            if (true === config.showTrackLabelButton) {
                browser.trackLabelControl = new igv.TrackLabelControl($toggle_button_container);
            }

            // zoom widget
            zoomWidget(browser, $igv_nav_bar_right_container);

        }

        // $karyo = $('#igvKaryoDiv');
        // if (undefined === $karyo.get(0)) {
        //     $karyo = $('<div id="igvKaryoDiv" class="igv-karyo-div">');
        //     $controls.append($karyo);
        // }


        return $controls.get(0);
    }

    function zoomWidget(browser, $parent) {

        var $div,
            $fa;

        browser.$zoomContainer = $('<div id="igv-zoom-widget">');

        browser.$zoomContainer.css("font-size", "20px");    // TODO -- could be done in style sheet.

        $parent.append(browser.$zoomContainer);

        // zoom out
        $div = $('<i>');
        browser.$zoomContainer.append($div);
        $fa = igv.createIcon("minus-circle");
        $div.append($fa);
        $div.on('click', function () {
            browser.zoomOut();
        });

        // zoom in
        $div = $('<i>');
        browser.$zoomContainer.append($div);
        $fa = igv.createIcon("plus-circle");
        $div.append($fa);
        $div.on('click', function () {
            browser.zoomIn();
        });

    }

    function setDefaults(config) {

        if (undefined === config.encodeEnabled) {
            config.encodeEnabled = false;
        }

        if (undefined === config.showLoadFileWidget) {
            config.showLoadFileWidget = false;
        }

        if (undefined === config.minimumBases) {
            config.minimumBases = 40;
        }

        if (undefined === config.showIdeogram) {
            config.showIdeogram = true;
        }

        if (undefined === config.showCursorTrackingGuideButton) {
            config.showCursorTrackingGuideButton = true;
        }

        if (undefined === config.showCursorTrackingGuide) {
            config.showCursorTrackingGuide = false;
        }

        if (undefined === config.showCenterGuideButton) {
            config.showCenterGuideButton = true;
        }

        if (undefined === config.showCenterGuide) {
            config.showCenterGuide = false;
        }

        if (undefined === config.showTrackLabelButton) {
            config.showTrackLabelButton = true;
        }

        if (undefined === config.showTrackLabels) {
            config.showTrackLabels = true;
        }

        if (undefined === config.showKaryo) {
            config.showKaryo = false;
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

        if (!config.tracks) {
            config.tracks = [];
        }

        if (config.showSequence) {
            config.tracks.push({type: "sequence", order: -Number.MAX_VALUE});
        }

    }

    igv.removeBrowser = function () {
        igv.browser.$root.remove();
        igv.browser.dispose();
        $(".igv-generic-dialog-container").remove();
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


    function extractQuery(config) {

        var i1, i2, i, j, s, query, tokens, uri, key, value;

        uri = window.location.href;

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
                    key = tokens[0];
                    value = decodeURIComponent(tokens[1]);

                    if ('file' === key) {

                        if (!config.tracks) config.tracks = [];
                        value.split(',').forEach(function (t) {
                            config.tracks.push({
                                url: t
                            })
                        });
                    }
                    else {
                        config[key] = value;
                    }
                }

                i = j + 1;
            }
        }
        return query;
    }

    function loadSessionFile(igvSession, locus) {

        if (igvSession) {
            return igv.xhr.loadString(igvSession)
                .then(function (string) {
                    return new igv.XMLSession(string);
                })
        }
        else {
            return Promise.resolve(undefined);
        }
    }


    function logo() {

        return $(
            '<svg width="690px" height="324px" viewBox="0 0 690 324" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
            '<title>IGV</title>' +
            '<g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">' +
            '<g id="IGV" fill="#666666">' +
            '<polygon id="Path" points="379.54574 8.00169252 455.581247 8.00169252 515.564813 188.87244 532.884012 253.529506 537.108207 253.529506 554.849825 188.87244 614.833392 8.00169252 689.60164 8.00169252 582.729511 320.722144 486.840288 320.722144"></polygon>' +
            '<path d="M261.482414,323.793286 C207.975678,323.793286 168.339046,310.552102 142.571329,284.069337 C116.803612,257.586572 103.919946,217.158702 103.919946,162.784513 C103.919946,108.410325 117.437235,67.8415913 144.472217,41.0770945 C171.507199,14.3125977 212.903894,0.930550071 268.663545,0.930550071 C283.025879,0.930550071 298.232828,1.84616386 314.284849,3.6774189 C330.33687,5.50867394 344.839793,7.97378798 357.794056,11.072835 L357.794056,68.968378 C339.48912,65.869331 323.578145,63.5450806 310.060654,61.9955571 C296.543163,60.4460336 284.574731,59.6712835 274.154998,59.6712835 C255.850062,59.6712835 240.502308,61.4320792 228.111274,64.9537236 C215.720241,68.4753679 205.793482,74.2507779 198.330701,82.2801269 C190.867919,90.309476 185.587729,100.87425 182.48997,113.974767 C179.392212,127.075284 177.843356,143.345037 177.843356,162.784513 C177.843356,181.942258 179.251407,198.000716 182.067551,210.960367 C184.883695,223.920018 189.671068,234.41436 196.429813,242.443709 C203.188559,250.473058 212.059279,256.178037 223.042241,259.558815 C234.025202,262.939594 247.683295,264.629958 264.01693,264.629958 C268.241146,264.629958 273.098922,264.489094 278.590403,264.207362 C284.081883,263.925631 289.643684,263.50304 295.275972,262.939577 L295.275972,159.826347 L361.595831,159.826347 L361.595831,308.579859 C344.698967,313.087564 327.239137,316.750019 309.215815,319.567334 C291.192494,322.38465 275.281519,323.793286 261.482414,323.793286 L261.482414,323.793286 L261.482414,323.793286 Z" id="Path"></path>;' +
            '<polygon id="Path" points="0.81355666 5.00169252 73.0472883 5.00169252 73.0472883 317.722144 0.81355666 317.722144"></polygon>' +
            '</g> </g> </svg>'
        );
    }


    return igv;
})
(igv || {});







