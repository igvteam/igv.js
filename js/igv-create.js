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

        var dropdown,
            listActionItems,
            contentDiv,
            headerDiv,
            trackContainerDiv,
            browser,
            rootDiv,
            controlDiv,
            bodyObject;




        // TODO - dat - REMOVE ME - Should be in api.js.
        // TODO - dat - REMOVE ME - Should be in api.js.
        dropdown = $(".dropdown");
        listActionItems = dropdown.find("li").find("a");

        $(listActionItems[ 0 ]).click(function(){

            igv.browser.loadTrack({
                url: 'http://www.broadinstitute.org/igvdata/1KG/b37/data/NA06984/alignment/NA06984.mapped.ILLUMINA.bwa.CEU.low_coverage.20120522.bam',
                label: 'NA06984'});

        });

        $(listActionItems[ 1 ]).click(function(){

            igv.browser.loadTrack({
                sourceType: 'ga4gh',
                type: 'bam',
                url: 'https://www.googleapis.com/genomics/v1beta2',
                readGroupSetIds: 'CMvnhpKTFhCjz9_25e_lCw',
                label: 'Ga4gh Reads'});

        });

        $(listActionItems[ 2 ]).click(function(){

            igv.browser.loadTrack({
                sourceType: 'ga4gh',
                type: 'vcf',
                url: 'https://www.googleapis.com/genomics/v1beta2',
                variantSetId: '10473108253681171589',
                visibilityWindow: 100000,
                label: 'Ga4gh Variants'});

        });

        $(listActionItems[ 3 ]).click(function(){

            igv.browser.loadTrack({
                url: '//www.broadinstitute.org/igvdata/test/igv-web/segmented_data_080520.seg.gz',
                label: 'GBM Copy # (TCGA Broad GDAC)'});

        });

        $(listActionItems[ 4 ]).click(function(){

            igv.browser.loadTrack({
                type: 'eqtl',
                url: '//www.gtexportal.org/igv/assets/eqtl/Skin_Sun_Exposed_Lower_leg.portal.eqtl.bin',
                label: 'Skin Sun Exposed Lower leg'});

        });

        $(listActionItems[ 5 ]).click(function(){

            igv.browser.loadTrack( {
                url: '//www.broadinstitute.org/igvdata/t2d/recomb_decode.bedgraph',
                label: 'Recombination rate'});

        });

        $(listActionItems[ 6 ]).click(function(){

            igv.browser.loadTrack(
                {
                    type: 'vcf',
                    url: '//www.broadinstitute.org/igvdata/test/igv-web/TSVC_variants_IonXpress_078.vcf.gz',
                    label: 'TSVC Variants 078'
                });

        });

        $(listActionItems[ 7 ]).click(function(){

            igv.browser.loadTrack(
                {
                    type: 'bed',
                    url: '//www.broadinstitute.org/igvdata/annotations/hg19/dbSnp/snp137.hg19.bed.gz',
                    visibilityWindow: 200000,
                    label: 'dbSNP 137'
                });

        });

        //dropdown.on('shown.bs.dropdown', function (e) {
        //
        //    var listItems = $(this).find("li");
        //
        //    console.log("ul.dropdown-menu - shown.bs.dropdown");
        //
        //});
        //
        //dropdown.on('hidden.bs.dropdown', function (e) {
        //
        //    console.log("ul.dropdown-menu - hidden.bs.dropdown");
        //
        //});

        // TODO - dat - REMOVE ME - Should be in api.js.
        // TODO - dat - REMOVE ME - Should be in api.js.




        if (igv.browser) {
            console.log("Attempt to create 2 browsers.");
            return igv.browser;
        }

        if (!options) options = {};
        if (!options.type) options.type = "IGV";

        oauth.google.access_token = options.oauthToken;
        oauth.google.apiKey = options.apiKey;

        if (!options.flanking && isT2D(options)) {  // TODO -- hack for demo, remove
            options.flanking = 100000;
        }

        if (options.genome || options.fastaURL === undefined) {
            mergeGenome(options);
        }

        trackContainerDiv = $('<div id="igvTrackContainerDiv" class="igv-track-container-div">')[0];
        browser = new igv.Browser(options, trackContainerDiv);
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
        browser.userFeedback = new igv.UserFeedback($(contentDiv));
        browser.userFeedback.hide();

        // Popover object -- singleton shared by all components
        igv.popover = new igv.Popover(contentDiv);

        bodyObject = $("body");

        // ColorPicker object -- singleton shared by all components
        igv.colorPicker = new igv.ColorPicker(bodyObject, options.palette);
        igv.colorPicker.hide();

        // Dialog object -- singleton shared by all components
        igv.dialog = new igv.Dialog(bodyObject);
        igv.dialog.hide();

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

        var igvLogo,
            controlDiv = $('<div id="igvControlDiv" class="igv-control-div">')[0],
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

            igvLogo = $('<div class="igv-logo">');
            navigation.append(igvLogo[0]);

            // search
            search = $('<div class="igvNavigationSearch">');
            navigation.append(search[0]);

            browser.searchInput = $('<input class="igvNavigationSearchInput" type="text" placeholder="Locus Search">');
            search.append(browser.searchInput[0]);

            searchButton = $('<i class="igv-app-icon fa fa-search fa-18px shim-left-6">');
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

        switch (options.genome) {

            case "hg18":
                options.fastaURL = "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg18/hg18.fasta";
                options.cytobandURL = "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg18/cytoBand.txt.gz";
                break;

            case "hg19":
            default:
            {
                options.fastaURL = "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg19/hg19.fasta";
                options.cytobandURL = "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg19/cytoBand.txt";

                if (!options.tracks) options.tracks = [];

                options.tracks.push(
                    {
                        type: "sequence",
                        order: -9999
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







