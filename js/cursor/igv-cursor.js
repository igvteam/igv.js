var igv = (function (igv) {

    igv.createCursorBrowser = function (options) {

        var contentHeader,
            cursorUIHeaderBlurbDiv,
            trackContainer,
            browser;

        // Append event handlers to Header DIV
        document.getElementById('zoomOut').onclick = function (e) {
            browser.zoomOut()
        };
        document.getElementById('zoomIn').onclick = function () {
            browser.zoomIn()
        };
        document.getElementById('fitToScreen').onclick = function () {
            browser.fitToScreen();
        };
        document.getElementById('regionSizeInput').onchange = function (e) {

            var value = $("#regionSizeInput").val();
            if (!igv.isNumber(value)) {
                console.log("bogus " + value);
                return;
            }

            browser.setRegionSize(parseFloat(value, 10));
        };
        document.getElementById('frameWidthInput').onchange = function (e) {

            var value = $("#frameWidthInput").val();
            if (!igv.isNumber(value)) {
                console.log("bogus " + value);
                return;
            }

            browser.setFrameWidth(parseFloat(value, 10));

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

            fileReader.onload = function (e) {

                var json = e.target.result,
                    session = JSON.parse(json);

                browser.sessionTeardown();

                browser.loadSession(session);

            };

            fileReader.readAsText(sessionFile);

        });

        // BED file upload
        var fileInput = document.getElementById('igvFileUpload');
        fileInput.addEventListener('change', function (e) {

            var localFile,
                localFiles = fileInput.files;

            for (var i = 0; i < localFiles.length; i++) {

                localFile = localFiles[ i ];
                $("#igvFileUploadForm")[0].reset();

                browser.loadTrack({
                    type: "bed",
                    localFile: localFile,
                    url: undefined,
                    label: localFile.name
                });


            }

        });

        // BED URL upload
        document.getElementById('igvLoadURL').onchange = function (e) {
            var obj,
                path;

            obj = $("#igvLoadURL");
            path = obj.val();
            obj.val("");

            browser.loadTrack({
                type: "bed",
                url: path,
                label: "Unnamed Track"
            });

        };

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

                var tableRow,
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

                        browser.loadTrack({
                            type: "bed",
                            url: record.path,
                            label: encode.encodeTrackLabel(record),
                            color: encode.encodeAntibodyColor(record.antibody)
                        });

                    }

                }

            });

        });

        // Append resultant ENCODE DataTables markup
        $('#encodeModalBody').html('<table cellpadding="0" cellspacing="0" border="0" class="display" id="encodeModalTable"></table>');


        // Construct DOM hierarchy
        contentHeader = $('<div class="row"></div>')[0];
        cursorUIHeaderBlurbDiv = $('<div class="igv-cursor-ui-header-blurb">Primary track is <span></span> with <span></span> total regions (<span></span> regions remain with filters applied)</div>')[0];
        trackContainer = $('<div id="igvTrackContainerDiv" class="igv-track-container-div">')[0];

        browser = new igv.Browser(options, trackContainer);
        document.getElementById('igvContainerDiv').appendChild(browser.div);

        $(browser.div).append(contentHeader);
        $(contentHeader).append(cursorUIHeaderBlurbDiv);

        browser.horizontalScrollbar = new cursor.HorizontalScrollbar(browser, $(browser.div));
        $(browser.div).append(trackContainer);



        igv.addAjaxExtensions();


        // Add cursor specific methods to the browser object,  some new some overrides
        addCursorExtensions(browser);

//        browser.horizontalScrollbar = new cursor.HorizontalScrollbar(browser, $(browser.div));




        browser.cursorModel = new cursor.CursorModel(browser);

        browser.referenceFrame = new igv.ReferenceFrame("", 0, 1 / browser.cursorModel.framePixelWidth);

        // Launch app with session JSON if provided as param
        var sessionJSONPath = igv.getQueryValue('session');

        if (sessionJSONPath) {

            $.getJSON(sessionJSONPath, function (session) {

                console.log("launchSession: " + JSON.stringify(browser.launchSession));
                browser.loadSession(session);

            });

        }
        else {

            if (undefined === options.tracks || 0 === options.tracks.length) {
                return;
            }

            options.tracks.forEach(function (trackConfig) {
                browser.loadTrack(trackConfig);
            });

            browser.designatedTrack.featureSource.allFeatures(function (featureList) {
                browser.cursorModel.setRegions(featureList);
                browser.horizontalScrollbar.update();
            });
        }


        return browser;
    };

    function addCursorExtensions(browser) {

        browser.setFrameWidth = function (frameWidthString) {

            if (!igv.isNumber(frameWidthString)) {
                console.log("bogus " + frameWidthString);
                return;
            }

            var frameWidth = parseFloat(frameWidthString);
            if (frameWidth > 0) {

                browser.cursorModel.framePixelWidth = frameWidth;
                browser.referenceFrame.bpPerPixel = 1 / frameWidth;

                $("input[id='frameWidthInput']").val(Math.round(frameWidth * 1000) / 1000);

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

        // Alter "super" implementation
        browser.loadTrack = function (config) {

//            this.__proto__.loadTrack.call(this, config);

            if (browser.isDuplicateTrack(config)) {
                return;
            }

            var path = config.url,
                type = config.type,
                newTrack,
                newFeatureSource;

            if (!type) {
                type = cursorGetType(path);
            }

            if (type !== "bed") {
                window.alert("Bad Track type");
                return;

            }

            newTrack = new cursor.CursorTrack(config, browser);
            if (undefined !== config.designatedTrack && true === config.designatedTrack) {
                browser.designatedTrack = newTrack;
            }

            this.addTrack(newTrack);

            return newTrack;

            function cursorGetType(path) {

                if (path.endsWith(".bed") || path.endsWith(".bed.gz") || path.endsWith(".broadPeak") || path.endsWith(".broadPeak.gz")) {
                    return "bed";
                } else {
                    return undefined;
                }

            }

        };

        browser.session = function () {

            var dev_null,
                session =
                {
                    start: Math.floor(browser.referenceFrame.start),
                    end: Math.floor((browser.referenceFrame.bpPerPixel * browser.trackViewportWidth()) + browser.referenceFrame.start),
                    regionWidth: browser.cursorModel.regionWidth,
                    framePixelWidthUnitless: (browser.cursorModel.framePixelWidth / browser.trackViewportWidth()),
                    trackHeight: browser.trackHeight,
                    tracks: []
                };

            dev_null = browser.trackViewportWidth();

            browser.trackPanels.forEach(function (trackView) {

                var jsonRepresentation = trackView.track.jsonRepresentation();

                if (jsonRepresentation) {

                    if (browser.designatedTrack && browser.designatedTrack === trackView.track) {
                        jsonRepresentation.designatedTrack = true;
                    }

                    session.tracks.push(jsonRepresentation);
                }
                else {
                    // TODO -- what if there is no json repesentation?
                }
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

        browser.loadSession = function (session) {

            var cursorTracks;

            browser.sessionTeardown();

            browser.cursorModel.regionWidth = session.regionWidth;
            $("input[id='regionSizeInput']").val(browser.cursorModel.regionWidth);

            browser.trackHeight = session.trackHeight;
            $("input[id='trackHeightInput']").val(browser.trackHeight);

            cursorTracks = [];
            browser.designatedTrack = undefined;
            session.tracks.forEach(function (trackSession) {

                var cursorTrack,
                    config = {
                        type: "bed",
                        url: trackSession.path,
                        color: trackSession.color,
                        label: trackSession.label,
                        order: trackSession.order,
                        trackFilter: trackSession.trackFilter,
                        designatedTrack: trackSession.designatedTrack
                    };

                cursorTrack = new cursor.CursorTrack(config, browser);
                if (undefined !== config.designatedTrack && true === config.designatedTrack) {
                    browser.designatedTrack = cursorTrack;
                }

                cursorTracks.push(cursorTrack);

            });

            if (undefined === browser.designatedTrack) {
                browser.designatedTrack = cursorTracks[ 0 ];
            }

            browser.designatedTrack.featureSource.allFeatures(function (featureList) {

                browser.cursorModel.setRegions(featureList);

                cursorTracks.forEach(function (cursorTrack) {

                    browser.addTrack(cursorTrack);

//                    if (cursorTrack.config && cursorTrack.config.trackFilter) {
//                        cursorTrack.trackFilter.setWithJSON(cursorTrack.config.trackFilter);
//                    }

                });

                browser.cursorModel.filterRegions();

                browser.setFrameWidth(browser.trackViewportWidth() * session.framePixelWidthUnitless);

                browser.referenceFrame.bpPerPixel = 1.0 / browser.cursorModel.framePixelWidth;

                browser.goto("", session.start, session.end);

                browser.horizontalScrollbar.update();

            });

        };
    }

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

    return igv;

})(igv || {});