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

        browser.encodeTable = new encode.EncodeTable($('#encodeModalBody'), browser, browser.loadTracksWithConfigList);

        // drag & drop
        // browser.dragAndDrop = new igv.DragAndDrop();
        // browser.$root.append(browser.dragAndDrop.$container);
        // browser.dragAndDrop.initializationHelper();
        // browser.dragAndDrop.$container.hide();

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

        // ColorPicker object -- singleton shared by all components
        igv.colorPicker = new igv.ColorPicker(browser.$root, config.palette);
        igv.colorPicker.hide();

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

        // phone home -- counts launches.  Count is anonymous, needed for our continued funding.  Please don't delete
        phoneHome();

        igv.loadGenome(config.reference).then(function (genome) {

            var width;

            igv.browser.genome = genome;
            igv.browser.genome.id = config.reference.genomeId;

            width = igv.browser.viewportContainerWidth();
            igv.browser.getGenomicStateList(lociWithConfiguration(config), width, function (genomicStateList) {

                var errorString,
                    gs;

                if (_.size(genomicStateList) > 0) {

                    igv.browser.genomicStateList = _.map(genomicStateList, function (genomicState, index) {
                        genomicState.locusIndex = index;
                        genomicState.locusCount = _.size(genomicStateList);
                        genomicState.referenceFrame = new igv.ReferenceFrame(genomicState.chromosome.name, genomicState.start, (genomicState.end - genomicState.start) / (width/genomicState.locusCount));
                        genomicState.initialReferenceFrame = new igv.ReferenceFrame(genomicState.chromosome.name, genomicState.start, (genomicState.end - genomicState.start) / (width/genomicState.locusCount));
                        return genomicState;
                    });

                    igv.browser.updateLocusSearchWithGenomicState(_.first(igv.browser.genomicStateList));

                    if (1 === _.size(igv.browser.genomicStateList) && 'all' === (_.first(igv.browser.genomicStateList)).locusSearchString) {
                        igv.browser.disableZoomWidget();
                    } else {
                        igv.browser.enableZoomWidget(igv.browser.zoomHandlers);
                    }

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

                    if (config.tracks) {
                        igv.browser.loadTracksWithConfigList(config.tracks);

                        igv.browser.windowSizePanel.updateWithGenomicState(_.first(igv.browser.genomicStateList));
                    }

                } else {
                    errorString = 'Unrecognized locus ' + lociWithConfiguration(config);
                    igv.presentAlert(errorString);
                }

            });

            function lociWithConfiguration(configuration) {

                var loci = [];

                if (configuration.locus) {

                    if (Array.isArray(configuration.locus)) {
                        _.each(configuration.locus, function(l){
                            loci.push(l);
                        });

                    } else {
                        loci.push(configuration.locus);
                    }
                }

                if (0 === _.size(loci)){
                    loci.push( _.first(igv.browser.genome.chromosomeNames) );
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

            // search container
            $searchContainer = $('<div class="igv-search-container">');

            browser.$searchInput = $('<input type="text" placeholder="Locus Search">');

            browser.$searchInput.change(function (e) {
                browser.parseSearchInput( $(e.target).val() );
            });

            $faSearch = $('<i class="fa fa-search">');

            $faSearch.click(function () {
                browser.parseSearchInput( browser.$searchInput.val() );
            });

            $searchContainer.append(browser.$searchInput);
            $searchContainer.append($faSearch);

            // search results presented in table
            browser.$searchResults = $('<div class="igv-search-results">');
            browser.$searchResultsTable = $('<table>');

            browser.$searchResults.append(browser.$searchResultsTable.get(0));

            $searchContainer.append(browser.$searchResults.get(0));

            browser.$searchResults.hide();

            $navigation.append($searchContainer);


            // window size panel
            browser.windowSizePanel = new igv.WindowSizePanel($navigation);


            // drag & drop
            // $navigation.append(browser.dragAndDrop.$dragAndDropPresentationButton);


            // zoom
            browser.zoomHandlers = {
                in: {
                    click: function (e) {
                        browser.zoomIn();
                    }
                },
                out:{
                    click: function (e) {
                        browser.zoomOut();
                    }
                }
            };

            browser.$zoomContainer = zoomWidget();
            $navigation.append(browser.$zoomContainer);




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

    function zoomWidget() {

        var $zoomContainer = $('<div class="igv-zoom-widget">');
        $zoomContainer.append($('<i class="fa fa-minus-circle">'));
        $zoomContainer.append($('<i class="fa fa-plus-circle">'));

        return $zoomContainer;
    }

    function setDefaults(config) {

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
            config.tracks.push({type: "sequence", order: -9999});
        }

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







