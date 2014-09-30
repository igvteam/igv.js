var igv = (function (igv) {


    /**
     * Create an igv.browser instance.  This object defines the public API for interacting with the genome browser.
     *
     * @param options Object specifying initial configuration options.
     *
     */
    igv.createBrowser = function (options) {

        console.log("Create browser");

        igv.browser = new igv.Browser("IGV");

        igv.browser.flanking = options.flanking;

        var browser = igv.browser,
            rootDiv = browser.div,
            contentRoot = $('<div id="igvContentDiv" class="igv-content-div">')[0],
            contentKaryo = $('<div id="igvKaryoDiv" class="igv-karyo-div">')[0],
            contentHeader = $('<div id="igvHeaderDiv" class="igv-header-div">')[0],
            trackContainer = $('<div id="igvTrackContainerDiv" class="igv-track-container-div">')[0];



        // DOM
        $(rootDiv).append(contentKaryo);
        $(rootDiv).append(contentRoot);

        $(contentRoot).append(contentHeader);
        $(contentRoot).append(trackContainer);

        // Popover object -- singleton shared by all components
        igv.popover = new igv.Popover(contentRoot);


        browser.startup = function () {

            console.log("Browser startup");

            browser.controlPanelWidth = 50;

            browser.trackContainerDiv = trackContainer;

            browser.trackPanels = [];

            igv.sequenceSource = igv.getFastaSequence(options.fastaURL);

            if (options.showKaryo) {
                browser.karyoPanel = new igv.KaryoPanel(browser);
                $('#igvKaryoDiv').append(browser.karyoPanel.div);
                browser.karyoPanel.resize();
            }


            browser.ideoPanel = new igv.IdeoPanel(browser);
            $('#igvHeaderDiv').append(browser.ideoPanel.div);
            browser.ideoPanel.resize();


            igv.loadGenome(options.cytobandURL, function (genome) {

                browser.genome = genome;

                // Set inital locus
                var firstChrName = browser.genome.chromosomeNames[0],
                    firstChr = browser.genome.chromosomes[firstChrName];

                browser.referenceFrame = new igv.ReferenceFrame(firstChrName, 0, firstChr.bpLength / browser.trackViewportWidth());


                if (browser.ideoPanel) browser.ideoPanel.repaint();
                if (browser.karyoPanel) browser.karyoPanel.repaint();
                browser.addTrack(new igv.RulerTrack());

                // Load initial tracks, if any
                if (options.tracks) {

                    options.tracks.forEach(function (track) {
                        browser.addTrack(track);
                    });

                }

                if(options.locus) {
                    browser.search(options.locus);
                }

                // TODO -- why is this function throttled?
                window.onresize = igv.throttle(function () {
                   browser.resize();
                }, 10);
            });

        }

        return browser;


    }

    return igv;
})
(igv || {});







