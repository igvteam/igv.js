var igv = (function (igv) {


    // TODO -- this funtion should be in some utility file to avoid copies
    function throttle(fn, threshhold, scope) {
        threshhold || (threshhold = 100);
        var last, deferTimer;

        return function () {
            var context = scope || this;

            var now = +new Date,
                args = arguments;
            if (last && now < last + threshhold) {
                // hold on to it
                clearTimeout(deferTimer);
                deferTimer = setTimeout(function () {
                    last = now;
                    fn.apply(context, args);
                }, threshhold);
            } else {
                last = now;
                fn.apply(context, args);
            }
        }
    }


    /**
     * Create an igv.browser instance.  This object defines the public API for interacting with the genome browser.
     *
     * @param options Object specifying initial configuration options.
     *
     */
    igv.createBrowser = function (options) {


        igv.browser = new igv.Browser("IGV");

        var browser = igv.browser,
            rootDiv = browser.div,
            contentContainer = $('<div class="container-fluid"><div class="row">')[0],
            contentRoot = $('<div id="igvRootDiv" class="igv-root-div">')[0],
            contentKaryo = $('<div id="igvKaryoDiv" class="igv-karyo-div">')[0],
            contentHeader = $('<div id="igvHeaderDiv" class="igv-header-div">')[0],
            trackContainer = $('<div id="igvTrackContainerDiv" class="igv-track-container-div">')[0];


        // DOM
        $(rootDiv).append(contentKaryo);
        $(rootDiv).append(contentContainer);

        $(contentContainer).append(contentRoot);

        $(contentRoot).append(contentHeader);
        $(contentRoot).append(trackContainer);

        browser.startup = function () {

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


            // TODO: Needs to be a better way to grab the right track and change this
            browser.trackPanels[browser.trackPanels.length - 1].order = 10000;


                window.onresize = throttle(function () {
                    if (browser.ideoPanel) browser.ideoPanel.resize();
                    if (browser.karyoPanel) browser.karyoPanel.resize();
                    browser.trackPanels.forEach(function (panel) {
                        panel.resize();
                    })
                }, 10);
            });

        }

        return browser;


    }

    return igv;
})
(igv || {});







