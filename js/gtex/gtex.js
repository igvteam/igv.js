var igv = (function (igv) {

    if (!igv.gtex) {
        igv.gtex = {};

    }

    igv.loadGtexTissueMappings = function (url, continuation) {

        var dataLoader = new igv.DataLoader(url);

        dataLoader.loadBinaryString(function (data) {

                var lines = data.split("\n"),
                    len = lines.length,
                    i,
                    records = [],
                    tokens;

                for (i = 0; i < len; i++) {
                    tokens = lines[i].split('\t');
                    if (tokens.length == 2) {
                        records.push({label: tokens[0], url: tokens[1]});
                    }
                }

                continuation(records);

            },
            function (errorEvent) {
                continuation(null);
            });

    }


    igv.createEqtlTrack = function (eqtlFile1, name) {

        var eqtlTrack = new igv.EqtlTrack(eqtlFile1, name);
        return eqtlTrack;


    }

    igv.createGtexBrowser = function (developmentMode) {

        var gencodeURL,
            fastaURL,
            tissueEqtlMappingURL,
            cytobandURL;

            fastaURL = "http://www.gtexportal.org/igv/assets/hg19/hg19.fa";
            tissueEqtlMappingURL = "http://www.gtexportal.org/igv/assets/eqtl/tissueEqtlMappings.txt";
            cytobandURL = "http://www.gtexportal.org/igv/assets/hg19/cytoBand.txt";
            gencodeURL = "http://www.gtexportal.org/igv/assets/hg19/gencode.v18.bed";


        if (igv.gtexBrowser) {
            return igv.gtexBrowser;   // Singleton
        }
        else {
            igv.gtexBrowser = new igv.Browser("GTEX");
        }

        var browser = igv.gtexBrowser,
            rootDiv = browser.div,

        // navBar = $('<nav class="navbar navbar-fixed-top" role="navigation">')[0],
            navBar = $('<div>')[0],
            navBarContainer = $('<div>')[0],

            controlDiv = $('<div id="igvControlDiv"></div>')[0],
            zoomInButton = $('<button class="igvZoomButton" name="zoomInButton"  onclick="gtex.zoomIn()">Zoom In&nbsp; </button>')[0],
            zoomOutButton = $('<button class="igvZoomButton" name="zoomOutButton"  onclick="gtex.zoomOut()">Zoom Out&nbsp; </button>')[0],

            trackHeightDiv = $('<div style="float:left">Track height:&nbsp;</div>')[0],
            heightBoxInput = $('<input type="text" id="igvTrackHeightInput" value="100"/>')[0],

            goBoxDiv = $('<div style="margin-left:auto;margin-right:auto;width:20%">')[0],
            goBoxInput = $('<input type="text" id="goBox" value="PDE8B"/>')[0],
            goBoxButton = $('<button name="goButton"">Go</button>')[0],

            testBoxDiv = $('<div style="margin-left:auto;margin-right:auto;width:10%">')[0],
            testBoxButton1 = $('<button name="testButton1"">Test1</button>')[0],
            testBoxButton2 = $('<button name="testButton2"">Test2</button>')[0],

            contentContainer = $('<div><div class="row">')[0],
            contentRoot = $('<div id="igvRootDiv" class="igv-root-div">')[0],
            contentHeader = $('<div id="igvHeaderDiv" class="igv-header-div">')[0],
            trackContainer = $('<div id="igvTrackContainerDiv" class="igv-track-container-div">')[0];


        // Actions
        testBoxButton1.onclick = function () {
            search('HLA-DQB1');
            search('AP4B1-AS1');
        }
        testBoxButton2.onclick = function () {
            search('AP4B1-AS1');
            search('HLA-DQB1');
        }

        goBoxInput.onChange = function () {
            search(goBoxInput.value);
        }
        goBoxButton.onclick = function () {
            search(goBoxInput.value);
        }
        zoomOutButton.onclick = zoomOut;
        zoomInButton.onclick = zoomIn;

        heightBoxInput.onchange = function () {

            var trackPanels = browser.trackPanels;

            var i;

            for (i = 0; i < trackPanels.length; i++) {
                if (trackPanels[i].track instanceof igv.EqtlTrack) {
                    trackPanels[i].trackDiv.style.height = heightBoxInput.value + "px";
                    trackPanels[i].canvas.height = heightBoxInput.value;
                    trackPanels[i].canvas.style.height = heightBoxInput.value + "px";
                    trackPanels[i].controlDiv.style.height = heightBoxInput.value + "px";
                    trackPanels[i].controlCanvas.height = heightBoxInput.value;
                    trackPanels[i].controlCanvas.style.height = heightBoxInput.value + "px";
                    trackPanels[i].viewportDiv.style.height = heightBoxInput.value + "px";
                }
            }

            var changingRootHeight = 0;

            trackPanels[0].trackDiv.style.top = "0px";

            changingRootHeight += parseInt(trackPanels[0].trackDiv.style.height) + parseInt(trackPanels[0].marginBottom);

            for (i = 1; i < trackPanels.length; i++) {
                trackPanels[i].trackDiv.style.top = changingRootHeight + "px";
                changingRootHeight += parseInt(trackPanels[i].trackDiv.style.height) + parseInt(trackPanels[i].marginBottom);
            }

            //console.log(this.trackContainerDiv.clientHeight + "  " + trackPanel.trackDiv.style.height + "  " + trackPanel.trackDiv.clientHeight);
            console.log("Reshaping height.");

            for (i = 1; i < trackPanels.length; i++) {
                if (trackPanels[i].track instanceof igv.EqtlTrack) {
                    trackPanels[i].update();
                }
            }

        }

        // DOM
        $(rootDiv).append(navBar);
        $(navBar).append(navBarContainer);

        $(navBarContainer).append(controlDiv);


        $(controlDiv).append(zoomInButton);
        $(controlDiv).append(zoomOutButton);
        $(controlDiv).append(trackHeightDiv);
        $(trackHeightDiv).append(heightBoxInput);

        if (developmentMode === true) {
            $(controlDiv).append(goBoxDiv);
            $(goBoxDiv).append(goBoxInput);
            $(goBoxDiv).append(goBoxButton);

            $(controlDiv).append(testBoxDiv);
            $(testBoxDiv).append(testBoxButton1);
            $(testBoxDiv).append(testBoxButton2);
        }

        $(navBarContainer).append(createGtexControls(browser, tissueEqtlMappingURL));


        $(rootDiv).append(contentContainer);
        $(contentContainer).append(contentRoot);
        $(contentRoot).append(contentHeader);
        $(contentRoot).append(trackContainer);

        browser.tracksToInitialize = [];

        browser.activeTracks = function (tissues) {

            var ontissueEqtlMappingURL = "http://www.gtexportal.org/igv/assets/eqtl/tissueEqtlMappings.txt";

            browser.tracksToInitialize = tissues;

            igv.loadGtexTissueMappings(ontissueEqtlMappingURL, function (records) {
                records.forEach(function (record) {
                    var track;

                    track = findTrackWithURL(browser, record.url);
                    if (track) {
                        browser.removeTrack(track);
                    }
                });

                records.forEach(function (record) {
                    var label = record.label,
                        url = record.url;

                    if (tissues.indexOf(label) > -1) {
                        var track = igv.createEqtlTrack(url, label);
                        track.disableButtons = false;
                        browser.addTrack(track);
                    }
                });
            });

            var checkBoxes = $('[type|=checkbox]');

            for (var i = 0; i < checkBoxes.length; i++) {
                checkBoxes[i].checked = (tissues.indexOf(checkBoxes[i].nextSibling.textContent) > -1);
            }

        };

        browser.startup = function () {


            browser.genome = null;

            browser.referenceFrame = null;

            browser.controlPanelWidth = 50;

            browser.trackContainerDiv = trackContainer;

            browser.trackPanels = [];


            //rs28525262	1	1584102	ENSG00000189339.7	SLC35E2B
            browser.referenceFrame = new igv.ReferenceFrame("chr1", 1584102 - 1000000, 2000000 / 1000);


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

            browser.addTrack(new igv.GeneTrack({
                url: gencodeURL,
                label: "Genes"
            }));

            // TODO: Needs to be a better way to grab the right track and change this
            browser.trackPanels[browser.trackPanels.length - 1].order = 10000;

            window.onresize = throttle(function () {
                if (browser.ideoPanel) browser.ideoPanel.resize();
                browser.trackPanels.forEach(function (panel) {
                    panel.resize();
                })
            }, 10);


        }


        function search(value) {
            browser.search(value);
        }

        function zoomIn() {
            browser.zoomIn();
        }

        function zoomOut() {
            browser.zoomOut();
        }


        function fitToScreen() {

            var regionCount, frameWidth;

            if (!(browser.cursorModel && browser.cursorModel.regions)) return;

            regionCount = browser.cursorModel.regions.length;

            if (regionCount > 0) {
                frameWidth = (browser.trackContainerDiv.clientWidth - browser.controlPanelWidth) / regionCount;
                browser.setFrameWidth(frameWidth);
                $('frameWidthBox').value = frameWidth;
            }
        }


        function search(value) {
            browser.search(value);
        }

        function zoomIn() {
            browser.zoomIn();
        }

        function zoomOut() {
            browser.zoomOut();
        }


        function fitToScreen() {

            var regionCount, frameWidth;

            if (!(browser.cursorModel && browser.cursorModel.regions)) return;

            regionCount = browser.cursorModel.regions.length;

            if (regionCount > 0) {
                frameWidth = (browser.trackContainerDiv.clientWidth - browser.controlPanelWidth) / regionCount;
                browser.setFrameWidth(frameWidth);
                $('frameWidthBox').value = frameWidth;
            }
        }


        function createGtexControls(browser, tissueEqtlMappingURL) {

            var selectionDiv = $('<div id="igvGtexSelectionDiv">')[0];

            igv.loadGtexTissueMappings(tissueEqtlMappingURL, function (records) {


                records.forEach(function (record) {

                    var containerDiv = $('<div style="float:left">');

                    var cb = $('<input type="checkbox"">')[0];
                    cb.tissueRecord = record;
                    cb.onclick = function (e) {
                        var record = e.currentTarget.tissueRecord,
                            track;

                        if (e.currentTarget.checked) {
                            track = igv.createEqtlTrack(record.url, record.label);
                            track.disableButtons = false;
                            browser.addTrack(track);
                        }
                        else {
                            track = findTrackWithURL(browser, record.url);
                            if (track) {
                                browser.removeTrack(track);
                            }
                        }
                    };
                    cb.style.position = "relative";
                    cb.style.float = "left";
                    $(containerDiv).append(cb);

                    var span = $('<span>' + record.label + '</span>')[0];
                    span.style.position = "relative";
                    span.style.float = "left";
                    span.style.marginRight = "30px";
                    $(containerDiv).append(span);

                    $(selectionDiv).append(containerDiv);
                });

                igv.gtexBrowser.activeTracks(igv.gtexBrowser.tracksToInitialize);
            });

            var clearDiv = $('<div style="clear:both">');
            $(selectionDiv).append(clearDiv);

            return selectionDiv;
        }

        function findTrackWithURL(browser, url) {

            var i, len = browser.trackPanels.length;

            for (i = 0; i < len; i++) {
                if (browser.trackPanels[i].track.file === url) {
                    return browser.trackPanels[i].track;
                }
            }
            return null;

        }




        return browser;
    }

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

    igv.GtexSelection = function (selection) {

        this.geneColors = {};
        this.gene = null;
        this.snp = null;
        this.genesCount = 0;

        if (selection.gene) {
            this.gene = selection.gene.toUpperCase();
            this.geneColors[this.gene] = brewer[this.genesCount++];

        }
        if (selection.snp) {
            this.snp = selection.snp.toUpperCase();
        }

    }

    igv.GtexSelection.prototype.addGene = function (geneName) {
        if (!this.geneColors[geneName.toUpperCase()]) {
            this.geneColors[geneName.toUpperCase()] = brewer[this.genesCount++];
        }
    }

    igv.GtexSelection.prototype.colorForGene = function (geneName) {
        return this.geneColors[geneName.toUpperCase()];
    }

    var brewer = new Array();
// Set +!
    brewer.push("rgb(228,26,28)");
    brewer.push("rgb(55,126,184)");
    brewer.push("rgb(77,175,74)");
    brewer.push("rgb(166,86,40)");
    brewer.push("rgb(152,78,163)");
    brewer.push("rgb(255,127,0)");
    brewer.push("rgb(247,129,191)");
    brewer.push("rgb(153,153,153)");
    brewer.push("rgb(255,255,51)");

// #Set 2
    brewer.push("rgb(102, 194, 165");
    brewer.push("rgb(252, 141, 98");
    brewer.push("rgb(141, 160, 203");
    brewer.push("rgb(231, 138, 195");
    brewer.push("rgb(166, 216, 84");
    brewer.push("rgb(255, 217, 47");
    brewer.push("rgb(229, 196, 148");
    brewer.push("rgb(179, 179, 179");

//#Set 3
    brewer.push("rgb( 141, 211, 199");
    brewer.push("rgb(255, 255, 179");
    brewer.push("rgb(190, 186, 218");
    brewer.push("rgb(251, 128, 114");
    brewer.push("rgb(128, 177, 211");
    brewer.push("rgb(253, 180, 98");
    brewer.push("rgb(179, 222, 105");
    brewer.push("rgb(252, 205, 229");
    brewer.push("rgb(217, 217, 217");
    brewer.push("rgb(188, 128, 189");
    brewer.push("rgb(204, 235, 197");
    brewer.push("rgb(255, 237, 111");


    return igv;

})(igv || {});