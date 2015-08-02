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
            bodyObject,
            palette,
            element,
            trackOrder=1;

        if (igv.browser) {
            console.log("Attempt to create 2 browsers.");
            return igv.browser;
        }

        if (!config) config = {};

        setDefaults(config);

        if (!config.type) config.type = "IGV";

        oauth.google.apiKey = config.apiKey;
        oauth.google.access_token = config.oauthToken;

        if (!config.flanking && isT2D(config)) {  // TODO -- hack for demo, remove
            config.flanking = 100000;
        }

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

        trackContainerDiv = $('<div id="igvTrackContainerDiv" class="igv-track-container-div">')[0];
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

        if(config.showCommandBar !== false) {
            controlDiv = config.createControls ?
                config.createControls(browser, config) :
                createStandardControls(browser, config);
            $(rootDiv).append($(controlDiv));
        }

        contentDiv = $('<div id="igvContentDiv" class="igv-content-div">')[0];
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

        bodyObject = $("body");

        // ColorPicker object -- singleton shared by all components
        if (config.trackDefaults) {
            palette = config.trackDefaults.palette;
        }
        igv.colorPicker = new igv.ColorPicker(bodyObject, palette);
        igv.colorPicker.hide();

        // Dialog object -- singleton shared by all components
        igv.dialog = new igv.Dialog(bodyObject);
        igv.dialog.hide();

        // Data Range Dialog object -- singleton shared by all components
        igv.dataRangeDialog = new igv.DataRangeDialog(bodyObject);
        igv.dataRangeDialog.hide();

        // extend jquery ui dialog widget to support enter key triggering "ok" button press.
        $.extend($.ui.dialog.prototype.options, {

            create: function () {

                var $this = $(this);

                // focus first button and bind enter to it
                $this.parent().find('.ui-dialog-buttonpane button:first').focus();

                $this.keypress(function (e) {

                    if (e.keyCode == $.ui.keyCode.ENTER) {
                        $this.parent().find('.ui-dialog-buttonpane button:first').click();
                        return false;
                    }

                });
            }

        });

        if (!config.showNavigation) {
            igvLogo = $('<div class="igv-logo-nonav">');
            $(headerDiv).append(igvLogo[0]);
        }

        // ideogram
        browser.ideoPanel = new igv.IdeoPanel(headerDiv);
        browser.ideoPanel.resize();


        igv.loadGenome(config.reference, function (genome) {

            var referenceWidth = browser.trackViewportWidth();
            if(referenceWidth === 0) referenceWidth = 500;

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
            if (browser.karyoPanel) browser.karyoPanel.repaint();

            // If an initial locus is specified go there first, then load tracks.  This avoids loading track data at
            // a default location then moving
            if (browser.initialLocus || config.locus) {

                var locus = browser.initialLocus ? browser.initialLocus : config.locus;

                igv.startSpinnerAtParentElement(parentDiv);
                browser.search(locus, function () {

                    igv.stopSpinnerAtParentElement(parentDiv);
                    var refFrame = igv.browser.referenceFrame,
                        start = refFrame.start,
                        end = start + igv.browser.trackViewportWidth() * refFrame.bpPerPixel,
                        range = start - end;

                    if (config.tracks) {

                        igv.browser.loadTracksWithConfigList(config.tracks);

                        //config.tracks.forEach(function (track) {
                        //    browser.loadTrack(track);
                        //});

                    }

                });

            } else if (config.tracks) {

                igv.browser.loadTracksWithConfigList(config.tracks);

                //config.tracks.forEach(function (track) {
                //    browser.loadTrack(track);
                //});

            }


        });

        return browser;

    };

    function createStandardControls(browser, config) {

        var igvLogo,
            controlDiv = $('<div id="igvControlDiv">')[0],
            contentKaryo,
            navigation,
            searchContainer,
            searchButton,
            $trackLabelToggle,
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

        navigation = $('<div class="igvNavigation">');
        $(controlDiv).append(navigation[0]);

        // search
        if (config.showNavigation) {

            igvLogo = $('<div class="igv-logo">');
            navigation.append(igvLogo[0]);







            searchContainer = $('<div class="igvNavigationSearch">');
            navigation.append(searchContainer[0]);

            browser.searchInput = $('<input class="igvNavigationSearchInput" type="text" placeholder="Locus Search">');
            searchContainer.append(browser.searchInput[0]);

            searchButton = $('<i class="igv-app-icon fa fa-search fa-18px shim-left-6">');
            searchContainer.append(searchButton[0]);

            browser.searchInput.change(function () {

                browser.search($(this).val());
            });

            searchButton.click(function () {
                browser.search(browser.searchInput.val());
            });

            // search results presented in table
            browser.$searchResults = $('<div class="igvNavigationSearchResults">');
            browser.$searchResultsTable = $('<table class="igvNavigationSearchResultsTable">');

            browser.$searchResults.append(browser.$searchResultsTable[0 ]);

            searchContainer.append(browser.$searchResults[ 0 ]);

            browser.$searchResults.hide();







            // window size panel
            browser.windowSizePanel = new igv.WindowSizePanel(navigation);

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

            // toggle track labels
            $trackLabelToggle = $('<div class="igvNavigationToggleTrackLabels">');
            $trackLabelToggle.text("hide labels");
            navigation.append($trackLabelToggle[ 0 ]);

            $trackLabelToggle.click(function () {

                browser.trackLabelsVisible = !browser.trackLabelsVisible;
                if (false === browser.trackLabelsVisible) {
                    $(this).text("show labels");
                    $('.igv-app-icon-container').hide();
                } else {
                    $(this).text("hide labels");
                    $('.igv-app-icon-container').show();
                }

            });

        }

        if (config.showKaryo) {
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
                reference.fastaURL = "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg18/hg18.fasta";
                reference.cytobandURL = "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg18/cytoBand.txt.gz";
                break;
            case "hg19":
            case "GRCh37":
            default:
            {
                reference.fastaURL = "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg19/hg19.fasta";
                reference.cytobandURL = "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg19/cytoBand.txt";
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
        config.showNavigation = config.showNavigation || true;
        config.flanking = config.flanking === undefined ? 1000 : config.flanking;

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







