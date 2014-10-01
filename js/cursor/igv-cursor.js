var igv = (function (igv) {

    igv.createCursorBrowser = function () {

        var browser = new igv.Browser("CURSOR"),
            contentHeader = $('<div class="row"></div>')[0],
            contentHeaderDiv = $('<div id="igvHeaderDiv" class="col-md-12" style="font-size:16px;"><span id="igvHeaderRegionDisplaySpan"></span></div>')[0],
            trackContainer = $('<div id="igvTrackContainerDiv" class="igv-track-container-div">')[0];

        browser.div = $('<div id="igvRootDiv" class="igv-root-div">')[0];
        $(browser.div).append(contentHeader);
        $(contentHeader).append(contentHeaderDiv);
        $(browser.div).append(trackContainer);
        document.getElementById('igvContainerDiv').appendChild(browser.div);

        browser.horizontalScrollbar = new cursor.HorizontalScrollbar(browser, $(browser.div));


        // Append event handlers to DOM elements
        document.getElementById('zoomOut').onclick = function (e) {
            browser.zoomOut()
        };
        document.getElementById('zoomIn').onclick = function () {
            browser.zoomIn()
        };
        document.getElementById('fitToScreen').onclick = function () {
            browser.fitToScreen();
        };
        document.getElementById('frameWidthInput').onchange = function (e) {

            var value = $("#frameWidthInput").val();
            if (!igv.isNumber(value)) {
                console.log("bogus " + value);
                return;
            }

            browser.setFrameWidth(parseFloat(value, 10));

        };
        document.getElementById('regionSizeInput').onchange = function (e) {

            var value = $("#regionSizeInput").val();
            if (!igv.isNumber(value)) {
                console.log("bogus " + value);
                return;
            }

            browser.setRegionSize(parseFloat(value, 10));
        };
        document.getElementById('trackHeightInput').onchange = function (e) {

            var value = $("#trackHeightInput").val();
            if (!igv.isNumber(value)) {
                console.log("bogus " + value);
                return;
            }


            browser.setTrackHeight(Math.round(parseFloat(value, 10)));
        };

//        // TODO: TO be replaced with modal form
//        // TODO: export regions via button
//        document.getElementById('igvExportRegionsButton').onclick = function (e) {
//            browser.cursorModel.exportRegions();
//        };

        // export regions via modal form
        $( "#igvExportRegionsModalForm" ).submit(function( event ) {

            var exportedRegions = "",
                downloadInput = $("#igvExportRegionsModalForm").find('input[name="downloadContent"]');

            browser.cursorModel.filteredRegions.forEach(function (region) {
                exportedRegions += region.exportRegion(browser.cursorModel.regionWidth);
            });

            downloadInput.val(exportedRegions);
        });

        // session save
        document.getElementById('igvSessionSaveButton').onclick = function (e) {
//            window.alert("igvSessionSaveButton");
            browser.saveSession();
        };

        // session load
        document.getElementById('igvSessionLoadButton').onclick = function (e) {
//            window.alert("igvSessionSaveButton");
            browser.sessionTeardown();
        };

        var fileInput = document.getElementById('igvFileUpload');
        fileInput.addEventListener('change', function (e) {

            var localFile,
                localFiles = fileInput.files,
                featureSource,
                cursorTrack;

            for (var i = 0; i < localFiles.length; i++) {

                localFile = localFiles[ i ];

                featureSource = new igv.BedFeatureSource(localFile);

                cursorTrack = new cursor.CursorTrack(featureSource, browser.cursorModel, browser.referenceFrame, localFile.name, browser.trackHeight);
                browser.addTrack(cursorTrack);

            }

        });

        // Load ENCODE DataTables data and build markup for modal dialog.
        encode.createEncodeDataTablesDataSet("resources/peaks.hg19.txt", function (dataSet) {

            var encodeModalTable = $('#encodeModalTable'),
                myDataTable = encodeModalTable.dataTable({

                    "data": dataSet,
                    "scrollY": "400px",
                    "scrollCollapse": true,
                    "paging": false,

                    "columns": [

                        { "title": "cell" },
                        { "title": "dataType" },

                        { "title": "antibody" },
                        { "title": "view" },

                        { "title": "replicate" },
                        { "title": "type" },

                        { "title": "lab" },
                        { "title": "path" }
                    ]

                });

            encodeModalTable.find('tbody').on('click', 'tr', function () {

                if ($(this).hasClass('selected')) {

                    $(this).removeClass('selected');
                }
                else {

                    // Commenting this out enables multi-selection
//                    myDataTable.$('tr.selected').removeClass('selected');
                    $(this).addClass('selected');
                }

            });

            $('#encodeModalTopCloseButton').on('click', function () {
                myDataTable.$('tr.selected').removeClass('selected');

            });

            $('#encodeModalBottomCloseButton').on('click', function () {
                myDataTable.$('tr.selected').removeClass('selected');
            });

            $('#encodeModalGoButton').on('click', function () {

                var featureSource,
                    cursorTrack,
                    tableRow,
                    tableRows,
                    tableCell,
                    tableCells,
                    record = {};

                tableRows = myDataTable.$('tr.selected');

                if (0 < tableRows.length) {

                    tableRows.removeClass('selected');

                    for (var i = 0; i < tableRows.length; i++) {

                        tableRow = tableRows[ i ];
                        tableCells = $('td', tableRow);

                        tableCells.each(function () {

                            tableCell = $(this)[0];
                            record[ encode.dataTableRowLabels[ tableCell.cellIndex ] ] = tableCell.innerText;

                        });

                        featureSource = new igv.BedFeatureSource(record.path);

                        cursorTrack = new cursor.CursorTrack(featureSource, browser.cursorModel, browser.referenceFrame, encode.encodeTrackLabel(record), browser.trackHeight);
                        cursorTrack.color = encode.encodeAntibodyColor(record.antibody);

                        browser.addTrack(cursorTrack);

                    }

                }

            });

        });

        // Append resultant ENCODE DataTables markup
        $('#encodeModalBody').html('<table cellpadding="0" cellspacing="0" border="0" class="display" id="encodeModalTable"></table>');

        browser.startup = function () {

            browser.genome = null;

            browser.referenceFrame = null;

            browser.controlPanelWidth = 50;

            browser.trackContainerDiv = trackContainer;

            browser.trackPanels = [];

            initCursor();

            window.onresize = igv.throttle(function () {

                var percent;

                if (browser.ideoPanel) {
                    browser.ideoPanel.resize();
                }

                browser.trackPanels.forEach(function (panel) {
                    panel.resize();
                });

                if (browser.cursorModel) {

                    percent = 100.0 * ($(".igv-viewport-div").first().width() / $(".igv-track-div").first().width());
//                    console.log("percent " + percent);
                    $(".igv-horizontal-scrollbar-div").css({
                        "width": percent + "%"
                    });

                }


            }, 10);
        };

        function initCursor() {

            var regionDisplayJQueryObject = $('#igvHeaderRegionDisplaySpan');

            browser.cursorModel = new cursor.CursorModel(browser, regionDisplayJQueryObject);
            browser.referenceFrame = new igv.ReferenceFrame("", 0, 1 / browser.cursorModel.framePixelWidth);

            browser.setFrameWidth = function (frameWidthString) {

                var frameWidth = parseFloat(frameWidthString);
                if (frameWidth > 0) {

                    browser.cursorModel.framePixelWidth = frameWidth;
                    $("input[id='frameWidthInput']").val(browser.cursorModel.framePixelWidth);

                    browser.referenceFrame.bpPerPixel = 1 / frameWidth;
                    browser.update();
                }
            };

            browser.setRegionSize = function (regionSizeString) {

                var regionSize = parseFloat(regionSizeString);
                if (regionSize > 0) {

                    browser.cursorModel.regionWidth = regionSize;
                    browser.update();
                }

            };

            browser.zoomIn = function () {

                browser.cursorModel.framePixelWidth *= 2;
                $("input[id='frameWidthInput']").val(browser.cursorModel.framePixelWidth);

                browser.update();
            };

            browser.zoomOut = function () {

                var thresholdFramePixelWidth = $(".igv-viewport-div").first().width() / browser.cursorModel.regionsToRender().length;

                browser.cursorModel.framePixelWidth = Math.max(thresholdFramePixelWidth, browser.cursorModel.framePixelWidth / 2.0);

//                    console.log("candidate " + browser.cursorModel.framePixelWidth + " threshold " + thresholdFramePixelWidth);

                $("input[id='frameWidthInput']").val(browser.cursorModel.framePixelWidth);

                browser.update();
            };

            browser.fitToScreen = function () {

                var regionCount,
                    frameWidth;

                if (!(browser.cursorModel && browser.cursorModel.regions)) {
                    return;
                }

                regionCount = browser.cursorModel.regionsToRender().length;

                if (regionCount > 0) {
//                        frameWidth = (browser.trackContainerDiv.clientWidth - browser.controlPanelWidth) / regionCount;
                    frameWidth = $(".igv-viewport-div").first().width() / regionCount;
                    browser.referenceFrame.start = 0;
                    browser.setFrameWidth(frameWidth);
                    $('frameWidthBox').value = frameWidth;
                }
            };

            var tssUrl = "test/data/cursor/hg19.tss.bed.gz";
            var peakURL = "test/data/cursor/wgEncodeBroadHistoneH1hescH3k4me3StdPk.broadPeak.gz";
            var peak2URL = "test/data/cursor/wgEncodeBroadHistoneH1hescH3k27me3StdPk.broadPeak.gz";

            var peakDataSource = new igv.BedFeatureSource(peakURL);
            var peak2DataSource = new igv.BedFeatureSource(peak2URL);
            var tssDataSource = new igv.BedFeatureSource(tssUrl);

            var tssTrack = new cursor.CursorTrack(tssDataSource, browser.cursorModel, browser.referenceFrame, "TSS", 40);

            var track1 = new cursor.CursorTrack(peakDataSource, browser.cursorModel, browser.referenceFrame, "H3k4me3 H1hesc", browser.trackHeight);
            track1.color = "rgb(0,150,0)";

            var track2 = new cursor.CursorTrack(peak2DataSource, browser.cursorModel, browser.referenceFrame, "H3k27me3 H1hesc", browser.trackHeight);
            track2.color = "rgb(150,0,0)";

            // Set the TSS track as the inital "selected" track (i.e. defines the regions)
            tssDataSource.allFeatures(function (featureList) {

                browser.cursorModel.setRegions(featureList);

                browser.addTrack(tssTrack);

                browser.addTrack(track1);

                browser.addTrack(track2);

                tssTrack.labelButton.className = "btn btn-xs btn-cursor-selected";

                browser.horizontalScrollbar.update(browser.cursorModel, browser.referenceFrame);
            });

        }

        // Augment standard behavior
        browser.removeTrack = function (track) {

            this.__proto__.removeTrack.call(this, track);
            this.cursorModel.filterRegions();

        }

        // tear down pre-existing session
        browser.sessionTeardown = function () {

            var trackView;

            while (this.trackPanels.length > 0) {
                trackView = this.trackPanels[ this.trackPanels.length - 1 ];
                this.removeTrack(trackView.track);
            }

        };

        browser.saveSession = function () {

            var session,
                restoredSession,
                form,
                hiddenFilenameInput,
                hiddenDownloadContent,
                stringified;

            form = document.createElement("form");
            document.body.appendChild(form);
            form.setAttribute("method", "post");
            form.setAttribute("action", "php/exportregions.php");

            // file name
            hiddenFilenameInput = document.createElement("input");
            form.appendChild(hiddenFilenameInput);
            hiddenFilenameInput.setAttribute("type", "hidden");
            hiddenFilenameInput.setAttribute("name", "filename");
            hiddenFilenameInput.setAttribute("value", "igv-session-save.json");

            // For attribute named downloadContent, stuff exportedRegions var into it's value
            hiddenDownloadContent = document.createElement("input");
            form.appendChild(hiddenDownloadContent);
            hiddenDownloadContent.setAttribute("type", "hidden");
            hiddenDownloadContent.setAttribute("name", "downloadContent");

            session = { tracks : [] };

            browser.trackPanels.forEach(function (trackView) {

                session.tracks.push( trackView.track.jsonRepresentation());

            });

            stringified = JSON.stringify(session);
            hiddenDownloadContent.setAttribute("value", JSON.stringify(session));

            restoredSession = JSON.parse(stringified);

            // submit and self-destruct
            form.submit();
            form.detach();

        };

        return browser;
    };


    igv.cursorAddTrackControlButtons = function (trackView, browser, controlDiv) {

        var sortButton = document.createElement("i"),
            track = trackView.track,
            nextButtonTop = 5;

        controlDiv.appendChild(sortButton);
        sortButton.className = "fa fa-bar-chart-o";
        sortButton.style.color = "black";
        sortButton.style.position = "absolute";
        sortButton.style.top = nextButtonTop + "px";
        sortButton.style.left = "5px";
        sortButton.style.cursor = "pointer";
        nextButtonTop += 18;

        track.sortButton = sortButton;
        sortButton.onclick = function () {

            browser.cursorModel.sortRegions(track.featureSource, track.sortDirection, function (regions) {
                browser.update();
                track.sortDirection *= -1;

            });

            browser.trackPanels.forEach(function (trackView) {
                if (track !== trackView.track) {
                    trackView.track.sortButton.className = "fa fa-bar-chart-o";
                    trackView.track.sortButton.style.color = "black";
                }
            });

            sortButton.className = "fa fa-signal";
            sortButton.style.color = "red";

        };


        //
        trackFilterButtonDiv = document.createElement("div");
        controlDiv.appendChild(trackFilterButtonDiv);

        trackFilterButtonDiv.id = "filterButtonDiv_" + igv.guid();
        trackFilterButtonDiv.className = "igv-filter-histogram-button-div";
        trackFilterButtonDiv.style.top = nextButtonTop + "px";
        trackFilterButtonDiv.style.left = "5px";

        trackView.track.trackFilter = new igv.TrackFilter(trackView);
        trackView.track.trackFilter.createTrackFilterWidgetWithParentElement(trackFilterButtonDiv);

        nextButtonTop += 18;

    }


    return igv;

})(igv || {});