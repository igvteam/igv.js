var igv = (function (igv) {


    igv.createGtexBrowser = function (parentDiv, options) {


        if (!options) options = {};

        options.showKaryo = false;

        if (!options.fastaUrl) {
            options.fastaURL = "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg19/hg19.fasta";
        }

        if (!options.cytobandURL) {
            options.cytobandURL = "//dn7ywbm9isq8j.cloudfront.net/genomes/seq/hg19/cytoBand.txt";
        }

        if (!options.track) {
            options.tracks = [
                {
                    type: "sequence",
                    order: 9999
                },
                {
                    url: "//dn7ywbm9isq8j.cloudfront.net/annotations/hg19/genes/gencode.v18.collapsed.bed",
                    label: "Genes",
                    order: 10000
                }
            ]
        }



        if (!options.createControls) {
            options.createControls = createGtexControls;
        }

        if (!options.tissueEqtlMappingURL) {
            options.tissueEqtlMappingURL = "http://www.gtexportal.org/igv/assets/eqtl/tissueEqtlMappings.txt";
        }

        return igv.createBrowser(parentDiv, options);


    }

    function createGtexControls(browser, options) {

        var controlDiv = $('<div id="igvControlDiv" class="igv-control-div">')[0],
            tissueEqtlMappingURL = options.tissueEqtlMappingURL,
            selectionDiv = $('<div style="margin-bottom:20px">')[0],
            widgetDiv = $('<div style="height: 40px">')[0],
            zoomDiv = $('<div style="float:right">')[0],
            zoomOutButton = $('<button style="margin-right:5px">Zoom Out&nbsp; </button>')[0],
            zoomInButton = $('<button>Zoom In&nbsp; </button>')[0],
            trackHeightDiv = $('<div style="float:left">Track height:&nbsp;</div>')[0],
            heightBoxInput = $('<input type="text" id="igvTrackHeightInput" value="100"/>')[0],
            goBoxDiv, goBoxInput, goBoxButton;


        zoomOutButton.onclick = function () {
            igv.browser.zoomOut();
        }

        zoomInButton.onclick = function () {
            igv.browser.zoomIn();
        }

        heightBoxInput.onchange = function () {

            igv.browser.setTrackHeight(heightBoxInput.value);
        }

        $(trackHeightDiv).append(heightBoxInput);
        $(zoomDiv).append(zoomOutButton);
        $(zoomDiv).append(zoomInButton);

        $(widgetDiv).append(trackHeightDiv);
        $(widgetDiv).append(zoomDiv);

        $(controlDiv).append(selectionDiv);
        $(controlDiv).append(widgetDiv);


        if (options.dev) {
            goBoxDiv = $('<div style="margin-left:auto;margin-right:auto;width:20%">')[0];
            goBoxInput = $('<input type="text" id="goBox" value="PDE8B"/>')[0];
            goBoxButton = $('<button name="goButton"">Go</button>')[0];
            goBoxInput.onChange = function () {
                igv.browser.search(goBoxInput.value);
            }
            goBoxButton.onclick = function () {
                igv.browser.search(goBoxInput.value);
            }
        }


        loadGtexTissueMappings(tissueEqtlMappingURL, function (records) {


            records.forEach(function (record) {

                var containerDiv = $('<span style="margin-right: 30px">')[0]; // style="float:left">');

                var cb = $('<input type="checkbox"">')[0];
                cb.tissueRecord = record;
                cb.onclick = function (e) {
                    var record = e.currentTarget.tissueRecord,
                        track;

                    if (e.currentTarget.checked) {

                        browser.loadTrack(
                            {
                                type: "eqtl",
                                url: record.url,
                                label: record.label,
                                disableButtons: true
                            }
                        );
                    }
                    else {
                        track = findTrackWithURL(browser, record.url);
                        if (track) {
                            browser.removeTrack(track);
                        }
                    }
                };
                $(containerDiv).append(cb);

                var span = $('<span>' + record.label + '</span>')[0];
                $(containerDiv).append(span);

                $(selectionDiv).append(containerDiv);
            });

            //igv.gtexBrowser.activeTracks(igv.gtexBrowser.tracksToInitialize);
        });


        return controlDiv;
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


    function loadGtexTissueMappings(url, continuation) {

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

})
(igv || {});