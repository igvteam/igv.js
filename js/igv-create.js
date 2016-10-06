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

        setDefaults(config);

        setOAuth(config);

        // Deal with legacy genome definition options
        setReferenceConfiguration(config);

        // Set track order explicitly. Otherwise they will be ordered randomly as each completes its async load
        setTrackOrder(config);

        browser = new igv.Browser(config, $('<div class="igv-track-container-div">')[0]);

        $(parentDiv).append(browser.$root);

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
        igv.popover = new igv.Popover($content, "igv-popover");

        // ColorPicker object -- singleton shared by all components
        igv.colorPicker = new igv.ColorPicker(browser.$root, config.palette, "igv-color-picker");
        igv.colorPicker.hide();

        // alert object -- singleton shared by all components
        igv.alert = new igv.AlertDialog(browser.$root, "igv-alert");
        igv.alert.hide();

        // Dialog object -- singleton shared by all components
        igv.dialog = new igv.Dialog(browser.$root, igv.Dialog.dialogConstructor, "igv-dialog");
        igv.dialog.hide();

        // Data Range Dialog object -- singleton shared by all components
        igv.dataRangeDialog = new igv.DataRangeDialog(browser.$root, "igv-data-range-dialog");
        igv.dataRangeDialog.hide();

        if (!config.showNavigation) {
            $header.append($('<div class="igv-logo-nonav">'));
        }

        // phone home -- counts launches.  Count is anonymous, needed for our continued funding.  Please don't delete
        phoneHome();

        igv.loadGenome(config.reference).then(function (genome) {

            var width;

            browser.genome = genome;
            browser.genome.id = config.reference.genomeId;
            width = browser.syntheticViewportContainerWidth();

            browser.getGenomicStateList(lociWithConfiguration(config), width, function (genomicStateList) {

                if (_.size(genomicStateList) > 0) {

                    browser.genomicStateList = genomicStateList;

                    _.each(genomicStateList, function (genomicState, index) {

                        genomicState.viewportWidth = width / _.size(genomicStateList);
                        genomicState.viewportContainerPercentage = 1.0 / _.size(genomicStateList);

                        genomicState.referenceFrame = new igv.ReferenceFrame(genomicState.chromosome.name, genomicState.start, (genomicState.end - genomicState.start) / genomicState.viewportWidth);

                        genomicState.locusIndex = index;
                        genomicState.locusCount = _.size(genomicStateList);
                    });

                    browser.updateLocusSearchWithGenomicState(_.first(browser.genomicStateList));

                    if (false === config.hideIdeogram) {
                        browser.ideoPanel = new igv.IdeoPanel($header);
                        browser.ideoPanel.repaint();
                    }

                    if (config.showRuler) {
                        browser.rulerTrack = new igv.RulerTrack();
                        browser.addTrack(browser.rulerTrack);
                    }

                    if (config.tracks) {
                        browser.loadTracksWithConfigList(config.tracks);
                    }

                }

            });

            function lociWithConfiguration(configuration) {

                var loci = [];

                if (configuration.locus) {
                    loci.push(configuration.locus);
                }

                if (configuration.loci) {
                    _.each(configuration.loci, function(locus){
                        loci.push(locus);
                    });
                }

                if (0 === _.size(loci)){
                    loci.push( _.first(browser.genome.chromosomeNames) );
                }

                return loci;
            }

        }).catch(function (error) {
            igv.presentAlert(error);
            console.log(error);
        });

        return browser;

    };

    function setOAuth(conf) {
        oauth.google.apiKey = conf.apiKey;
        oauth.google.access_token = conf.oauthToken;
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

            browser.$searchInput.change(function (e) {
                browser.parseSearchInput( $(e.target).val() );
                // browser.search($(this).val());
            });

            $faSearch = $('<i class="igv-fa-search fa fa-search fa-18px shim-left-6">');

            $faSearch.click(function () {
                browser.parseSearchInput( browser.$searchInput.val() );
                // browser.search(browser.$searchInput.val());
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
            // browser.windowSizePanel = new igv.WindowSizePanel($navigation);

            $navigation.append(makeZoomWidget());

            // cursor tracking guide
            browser.$cursorTrackingGuide = $('<div class="igv-cursor-tracking-guide">');
            if (true == config.showCursorTrackingGuide) {
                browser.$cursorTrackingGuide.show();
            } else {
                browser.$cursorTrackingGuide.hide();
            }
            $(browser.trackContainerDiv).append(browser.$cursorTrackingGuide);

            $cursorTrackingGuideToggle = igv.makeToggleButton('show cursor guide', 'hide cursor guide', 'showCursorTrackingGuide', function () {
                return browser.$cursorTrackingGuide;
            }, undefined);

            $navigation.append($cursorTrackingGuideToggle);

            // one base wide center guide
            browser.centerGuide = new igv.CenterGuide($(browser.trackContainerDiv), config);

            $navigation.append(browser.centerGuide.$centerGuideToggle);

            // toggle track labels
            $trackLabelToggle = igv.makeToggleButton('show labels', 'hide labels', 'trackLabelsVisible', function () {
                return $(browser.trackContainerDiv).find('.igv-track-label');
            }, undefined);

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

            if (config.showKaryo === "hide") {
                $karyoPanelToggle.text("Show Karyotype");
                $(contentKaryo).addClass("igv-karyo-hide");
            } else {
                $karyoPanelToggle.text("Hide Karyotype");
            }

            $karyoPanelToggle.click(function () {
                var hidden = $(".igv-karyo-div").hasClass("igv-karyo-hide");
                if (hidden) {
                    $karyoPanelToggle.text("Hide Karyotype");
                    $(".igv-karyo-div").removeClass("igv-karyo-hide");
                } else {
                    $karyoPanelToggle.text("Show Karyotype");
                    $(".igv-karyo-div").addClass("igv-karyo-hide");
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

        $faZoomOut = $('<i class="fa fa-minus-circle igv-fa-search fa-24px" style="padding-right: 4px;">');

        $faZoomOut.click(function () {
            igv.browser.zoomOut();
        });

        $faZoomIn = $('<i class="fa fa-plus-circle igv-fa-search fa-24px">');

        $faZoomIn.click(function () {
            igv.browser.zoomIn();
        });

        $zoomContainer = $('<div class="igvNavigationZoom">');
        $zoomContainer.append($faZoomOut);
        $zoomContainer.append($faZoomIn);

        return $zoomContainer;

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
        igv.browser.$root.remove();
        $(".igv-grid-container-colorpicker").remove();
        $(".igv-grid-container-dialog").remove();
        // $(".igv-grid-container-dialog").remove();
    }


    // Increments an anonymous usage count.  Essential for continued funding of igv.js, please do not remove.
    function phoneHome() {
        var url = "https://data.broadinstitute.org/igv/projects/current/counter_igvjs.php?version=" + igvjs_version;
        igvxhr.load(url).then(function (ignore) {
            // console.log(ignore);
        }).catch(function (error) {
            console.log(error);
        });
    }

    return igv;
})
(igv || {});







