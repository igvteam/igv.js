var igv = (function (igv) {

    igv.createCursorBrowser = function (options) {

        var contentHeader = $('<div class="row"></div>')[0],
            contentHeaderDiv = $('<div id="igvHeaderDiv" class="igv-header-div col-md-12" style="font-size:16px;"><span id="igvHeaderRegionDisplaySpan"></span></div>')[0],
            trackContainer = $('<div id="igvTrackContainerDiv" class="igv-track-container-div">')[0],
            browser = new igv.Browser(options, trackContainer);

        $(browser.div).append(contentHeader);
        $(contentHeader).append(contentHeaderDiv);
        $(browser.div).append(trackContainer);

        browser.horizontalScrollbar = new cursor.HorizontalScrollbar(browser, $(browser.div));

        document.getElementById('igvContainerDiv').appendChild(browser.div);

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

        // export regions via modal form
        $("#igvExportRegionsModalForm").submit(function (event) {

            var exportedRegions = "",
                downloadInput = $("#igvExportRegionsModalForm").find('input[name="downloadContent"]');

            browser.cursorModel.filteredRegions.forEach(function (region) {
                exportedRegions += region.exportRegion(browser.cursorModel.regionWidth);
            });

            downloadInput.val(exportedRegions);
        });

        // save session via modal form
        $("#igvSaveSessionModalForm").submit(function (event) {

            var session,
                downloadInput;

            session = browser.session();
            downloadInput = $("#igvSaveSessionModalForm").find('input[name="downloadContent"]');

            downloadInput.val(session);
        });

        // session upload
        var sessionInput = document.getElementById('igvSessionLoad');
        sessionInput.addEventListener('change', function (e) {

            var fileReader = new FileReader(),
                sessionFile;

            sessionFile = sessionInput.files[ 0 ];
            $("#igvSessionLoadForm")[0].reset();

            fileReader.onload = (function (theFile) {

                return function (e) {

                    var session,
                        trackList = [];

                    browser.sessionTeardown();

                    session = JSON.parse(e.target.result);

                    browser.cursorModel.regionWidth = session.regionWidth;
                    $("input[id='regionSizeInput']").val(browser.cursorModel.regionWidth);

                    browser.trackHeight = session.trackHeight;
                    $("input[id='trackHeightInput']").val(browser.trackHeight);

                    session.tracks.forEach(function (trackSession) {

                        var featureSource,
                            track;

                        featureSource = new igv.BedFeatureSource(trackSession.path);

                        track = new cursor.CursorTrack(featureSource, browser.cursorModel, browser.referenceFrame, trackSession.label, trackSession.height);
                        track.color = trackSession.color;
                        track.order = trackSession.order;

                        if (trackSession.designatedTrack && true === trackSession.designatedTrack) {
                            browser.designatedTrack = track;
                        }

                        trackList.push( { track : track, trackFilterJSON : trackSession.trackFilter } );

                    });

                    if (!browser.designatedTrack) {
                        browser.designatedTrack = trackList[ 0 ];
                    }

                    browser.designatedTrack.featureSource.allFeatures(function (featureList) {

                        browser.cursorModel.setRegions(featureList);

                        trackList.forEach(function (trackTrackFilterJSON) {
                            browser.addTrack(trackTrackFilterJSON.track, trackTrackFilterJSON.trackFilterJSON);

                            if (trackTrackFilterJSON.trackFilterJSON) {
                                trackTrackFilterJSON.track.trackFilter.setWithJSON(trackTrackFilterJSON.trackFilterJSON);
                            }

                        });

                        browser.cursorModel.filterRegions();

                        browser.setFrameWidth(browser.trackViewportWidth() * session.framePixelWidthUnitless);

                        browser.referenceFrame.bpPerPixel = 1.0/browser.cursorModel.framePixelWidth;

                        browser.goto("", session.start, session.end);

                        browser.horizontalScrollbar.update();
                    });

                };

            })(sessionFile);

            fileReader.readAsText(sessionFile);

        });

        // file upload
        var fileInput = document.getElementById('igvFileUpload');
        fileInput.addEventListener('change', function (e) {

            var localFile,
                localFiles = fileInput.files,
                featureSource,
                cursorTrack;

            for (var i = 0; i < localFiles.length; i++) {

                localFile = localFiles[ i ];
                $("#igvFileUploadForm")[0].reset();

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
                        cursorTrack.height = browser.trackHeight;

                        browser.addTrack(cursorTrack);

                    }

                }

            });

        });

        // Append resultant ENCODE DataTables markup
        $('#encodeModalBody').html('<table cellpadding="0" cellspacing="0" border="0" class="display" id="encodeModalTable"></table>');

        browser.cursorModel = new cursor.CursorModel(browser);

        browser.referenceFrame = new igv.ReferenceFrame("", 0, 1 / browser.cursorModel.framePixelWidth);




        // Launch app with session JSON if provided as param
        var sessionJSONPath = igv.getQueryValue('session') || undefined;

        if (sessionJSONPath) {

            $.getJSON( sessionJSONPath, function( data ) {
;
                var session = JSON.parse(data);
                console.log("yup");

            });

        }





        
        addDemoTracks(browser);

        browser.setFrameWidth = function (frameWidthString) {

            if (!igv.isNumber(frameWidthString)) {
                console.log("bogus " + frameWidthString);
                return;
            }

            var frameWidth = parseFloat(frameWidthString);
            if (frameWidth > 0) {

                browser.cursorModel.framePixelWidth = frameWidth;
                browser.referenceFrame.bpPerPixel = 1 / frameWidth;

                $("input[id='frameWidthInput']").val(Math.round(frameWidth * 1000)/1000);

                browser.update();
            }
        };

        browser.setRegionSize = function (regionSizeString) {

            var regionSize = parseFloat(regionSizeString);
            if (regionSize > 0) {

                browser.cursorModel.regionWidth = regionSize;
                $("input[id='regionSizeInput']").val(browser.cursorModel.regionWidth);
                browser.update();
            }

        };

        browser.zoomIn = function () {

            browser.setFrameWidth(2.0 * browser.cursorModel.framePixelWidth);
            browser.update();
        };

        browser.zoomOut = function () {

            var thresholdFramePixelWidth = browser.trackViewportWidth() / browser.cursorModel.regionsToRender().length;

            browser.setFrameWidth(Math.max(thresholdFramePixelWidth, 0.5 * browser.cursorModel.framePixelWidth));

            browser.update();
        };

        browser.fitToScreen = function () {

            var frameWidth;

            if (!(browser.cursorModel && browser.cursorModel.regions)) {
                return;
            }

            if (browser.cursorModel.regionsToRender().length > 0) {
                frameWidth = browser.trackViewportWidth() / browser.cursorModel.regionsToRender().length;
                browser.referenceFrame.start = 0;
                browser.setFrameWidth(frameWidth);
             }
        };

        // Augment standard behavior
        browser.removeTrack = function (track) {

            this.__proto__.removeTrack.call(this, track);

            if (track === this.designatedTrack) {
                this.designatedTrack = undefined;
            }

            this.cursorModel.filterRegions();

        };

        browser.session = function () {

            var dev_null,
                session =
            {
                start : Math.floor(browser.referenceFrame.start),
                end : Math.floor((browser.referenceFrame.bpPerPixel * browser.trackViewportWidth()) + browser.referenceFrame.start),
                regionWidth : browser.cursorModel.regionWidth,
                framePixelWidthUnitless : (browser.cursorModel.framePixelWidth/browser.trackViewportWidth()),
                trackHeight : browser.trackHeight,
                tracks: []
            };

            dev_null = browser.trackViewportWidth();

            browser.trackPanels.forEach(function (trackView) {

                var jsonRepresentation = trackView.track.jsonRepresentation();

                if (browser.designatedTrack && browser.designatedTrack === trackView.track) {
                    jsonRepresentation.designatedTrack = true;
                }

                session.tracks.push( jsonRepresentation );
            });

            return JSON.stringify(session, undefined, 4);

        };

        // tear down pre-existing session
        browser.sessionTeardown = function () {

            var trackView;

            while (this.trackPanels.length > 0) {
                trackView = this.trackPanels[ this.trackPanels.length - 1 ];
                this.removeTrack(trackView.track);
            }

        };

        // NOTE: This is depricated and nolonger used
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
            form.setAttribute("action", "php/igvdownload.php");

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

            session = { tracks: [] };

            browser.trackPanels.forEach(function (trackView) {

                session.tracks.push(trackView.track.jsonRepresentation());

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

        var trackFilterButtonDiv,
            sortButton,
            track = trackView.track,
            nextButtonTop = 5;

        sortButton = document.createElement("i");
        controlDiv.appendChild(sortButton);

        sortButton.className = "fa fa-bar-chart-o igv-control-sort-fontawesome";
        $(sortButton).css({
            "position": "absolute",
            "top": nextButtonTop + "px",
            "left": 5 + "px"
        });

        nextButtonTop += 18;

        track.sortButton = sortButton;
        sortButton.onclick = function () {

            browser.cursorModel.sortRegions(track.featureSource, track.sortDirection, function (regions) {
                browser.update();
                track.sortDirection *= -1;

            });

            browser.trackPanels.forEach(function (trackView) {
                if (track !== trackView.track) {
                    trackView.track.sortButton.className = "fa fa-bar-chart-o igv-control-sort-fontawesome";
                }
            });

            trackView.track.sortButton.className = "fa fa-bar-chart-o igv-control-sort-fontawesome-selected";
        };

        //
        trackFilterButtonDiv = document.createElement("div");
        controlDiv.appendChild(trackFilterButtonDiv);
        trackFilterButtonDiv.id = "filterButtonDiv_" + igv.guid();
        trackFilterButtonDiv.className = "igv-filter-histogram-button-div";
        $(trackFilterButtonDiv).css({
            "position": "absolute",
            "top": nextButtonTop + "px",
            "left": 5 + "px"
        });

        trackView.track.trackFilter = new igv.TrackFilter(trackView);
        trackView.track.trackFilter.createTrackFilterWidgetWithParentElement(trackFilterButtonDiv);

        nextButtonTop += 18;

    }

    function addDemoTracks(browser) {
        var tssUrl = "test/data/cursor/hg19.tss.bed.gz";
        var peakURL = "test/data/cursor/wgEncodeBroadHistoneH1hescH3k4me3StdPk.broadPeak.gz";
        var peak2URL = "test/data/cursor/wgEncodeBroadHistoneH1hescH3k27me3StdPk.broadPeak.gz";

        var peakDataSource = new igv.BedFeatureSource(peakURL);
        var peak2DataSource = new igv.BedFeatureSource(peak2URL);
        var tssDataSource = new igv.BedFeatureSource(tssUrl);

        var tssTrack = new cursor.CursorTrack(tssDataSource, browser.cursorModel, browser.referenceFrame, "TSS", browser.trackHeight);
        browser.designatedTrack = tssTrack;

        var track1 = new cursor.CursorTrack(peakDataSource, browser.cursorModel, browser.referenceFrame, "H3k4me3 H1hesc", browser.trackHeight);
        track1.color = "rgb(0,150,0)";

        var track2 = new cursor.CursorTrack(peak2DataSource, browser.cursorModel, browser.referenceFrame, "H3k27me3 H1hesc", browser.trackHeight);
        track2.color = "rgb(150,0,0)";

        // Set the TSS track as the inital "selected" track (i.e. defines the regions)
        browser.designatedTrack.featureSource.allFeatures(function (featureList) {

            browser.cursorModel.setRegions(featureList);

            browser.addTrack(tssTrack);

            browser.addTrack(track1);

            browser.addTrack(track2);

            browser.horizontalScrollbar.update();
        });
    }

    return igv;

})(igv || {});