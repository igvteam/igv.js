var igv = (function (igv) {

    var host = window.location.hostname,
        fastaURL = "http://igvdata.broadinstitute.org/genomes/seq/hg19/hg19.fasta",
        cytobandURL = "http://igvdata.broadinstitute.org/genomes/seq/hg19/cytoBand.txt",
        gencodeURL = "http://igvdata.broadinstitute.org/annotations/hg19/genes/gencode.v18.collapsed.bed";


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


    igv.createBrowser = function (type) {


        igv.browser = new igv.Browser("IGV");

        var browser = igv.browser,
            rootDiv = browser.div,
            contentContainer = $('<div class="container-fluid"><div class="row">')[0],
            contentRoot = $('<div id="igvRootDiv" class="igv-root-div">')[0],
            contentHeader = $('<div id="igvHeaderDiv" class="igv-header-div">')[0],
            trackContainer = $('<div id="igvTrackContainerDiv" class="igv-track-container-div">')[0];


        // DOM
        $(rootDiv).append(contentContainer);
        $(contentContainer).append(contentRoot);
        $(contentRoot).append(contentHeader);
        $(contentRoot).append(trackContainer);

        browser.startup = function () {

            browser.genome = null;

            browser.referenceFrame = null;

            browser.controlPanelWidth = 50;

            browser.trackContainerDiv = trackContainer;

            browser.trackPanels = [];

            // Need to set an inital locus, use chr1 for now
            browser.referenceFrame = new igv.ReferenceFrame("chr1", 1, 240000000);

            igv.sequenceSource = igv.getFastaSequence(fastaURL);

            browser.ideoPanel = new igv.IdeoPanel(browser);
            $('#igvHeaderDiv').append(browser.ideoPanel.div);
            browser.ideoPanel.resize();


            igv.loadGenome(cytobandURL, function (genome) {
                browser.genome = genome;
                if (browser.ideoPanel) browser.ideoPanel.repaint();
            });

            browser.addTrack(new igv.RulerTrack());

            browser.addTrack(new igv.SequenceTrack(igv.sequenceSource));

            browser.addTrack(new igv.GeneTrack(gencodeURL));

            // TODO: Needs to be a better way to grab the right track and change this
            browser.trackPanels[browser.trackPanels.length - 1].order = 10000;


            window.onresize = throttle(function () {
                if (browser.ideoPanel) browser.ideoPanel.resize();
                browser.trackPanels.forEach(function (panel) {
                    panel.resize();
                })
            }, 10);

        }

        function zoomOut() {
            browser.zoomOut();
        }

        function zoomIn() {
            browser.zoomIn();
        }

        function search(arg) {
            browser.search(arg);
        }

        return browser;


    }

    return igv;
})
(igv || {});







