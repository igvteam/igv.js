var igv = (function (igv) {


    /**
     * Create an igv.browser instance.  This object defines the public API for interacting with the genome browser.
     *
     * @param options Object specifying initial configuration options.
     *
     */
    igv.createBrowser = function (options) {

        if(igv.browser) {
            console.log("Attempt to create 2 browsers.")
            return igv.browser;
        }

        if(!options) options = {};
        options.type = "IGV";

        console.log("Create browser");
        if(!options.flanking && isT2D(options)) {  // TODO -- hack for demo, remove
            options.flanking = 100000;
        }

        var contentRoot = $('<div id="igvContentDiv" class="igv-content-div">')[0],
            contentKaryo = $('<div id="igvKaryoDiv" class="igv-karyo-div">')[0],
            contentHeader = $('<div id="igvHeaderDiv" class="igv-header-div">')[0],
            trackContainer = $('<div id="igvTrackContainerDiv" class="igv-track-container-div">')[0],
            browser = new igv.Browser(options, trackContainer),
            rootDiv = browser.div;

        // DOM
        $(rootDiv).append(contentKaryo);
        $(rootDiv).append(contentRoot);
        $(contentRoot).append(contentHeader);
        $(contentRoot).append(trackContainer);

        // Popover object -- singleton shared by all components
        igv.popover = new igv.Popover(contentRoot);

        if (options.showKaryo) {
            browser.karyoPanel = new igv.KaryoPanel(browser);
            $('#igvKaryoDiv').append(browser.karyoPanel.div);
            browser.karyoPanel.resize();
        }


        browser.ideoPanel = new igv.IdeoPanel(browser);
        $('#igvHeaderDiv').append(browser.ideoPanel.div);
        browser.ideoPanel.resize();



        browser.startup = function () {

            console.log("Browser startup");


            igv.sequenceSource = igv.getFastaSequence(options.fastaURL);


            igv.loadGenome(options.cytobandURL, function (genome) {

                browser.genome = genome;

                // Set inital locus
                var firstChrName = browser.genome.chromosomeNames[0],
                    firstChr = browser.genome.chromosomes[firstChrName];

                browser.referenceFrame = new igv.ReferenceFrame(firstChrName, 0, firstChr.bpLength / browser.trackViewportWidth());
                browser.controlPanelWidth = 50;

                if (browser.ideoPanel) browser.ideoPanel.repaint();
                if (browser.karyoPanel) browser.karyoPanel.repaint();
                browser.addTrack(new igv.RulerTrack());

                // Load initial tracks, if any
                if (options.tracks) {

                    options.tracks.forEach(function (track) {
                        browser.addTrack(track);
                    });

                }

                if (options.locus) {
                    browser.search(options.locus);
                }

            });

        }

        return browser;


    }

    // TODO -- temporary hack for demo, remove ASAP
    function isT2D(options) {
        if (options.tracks && options.tracks.length > 0) {
            var t = options.tracks[0];
            var b = t instanceof igv.T2dTrack;
            return b;
        }
        else {
            return false;
        }
    }

    return igv;
})
(igv || {});







