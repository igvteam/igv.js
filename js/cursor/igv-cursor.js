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

    igv.createCursorBrowser = function (options) {

        var horizontalScrollBarContainer,
            contentHeader,
            trackContainerDiv,
            browser,
            utilityDiv,
            dataSource;

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

            var value = $("input[id='frameWidthInput']").val();
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

            $('#igvExportRegionsModal').modal('hide');

        });

        // save session via modal form
        $("#igvSaveSessionModalForm").submit(function (event) {

            var session,
                downloadInput;

            session = browser.session();
            downloadInput = $("#igvSaveSessionModalForm").find('input[name="downloadContent"]');

            downloadInput.val(session);

            $('#igvSaveSessionModal').modal('hide');

        });

        // session upload
        var sessionInput = document.getElementById('igvSessionLoad');
        sessionInput.addEventListener('change', function (e) {

            var fileReader = new FileReader(),
                sessionFile;

            sessionFile = sessionInput.files[ 0 ];

            fileReader.onload = function (e) {

                var json = e.target.result,
                    session = JSON.parse(json);

                $("#igvSessionLoad").val("");

                $('#igvSessionLoadModal').modal('hide');

                browser.initializeWithSession(session);

            };

            fileReader.readAsText(sessionFile);

        });

        // BED file upload
        document.getElementById('igvFileUpload').onchange = function (e) {

            var localFile = $(this)[ 0 ].files[ 0 ];

            configureTrackWithLocalFileOrPath( { type: "bed", localFile: localFile} );

            $(this).val("");
            $('#igvFileUploadModal').modal('hide');
        };

        // BED URL upload
        document.getElementById('igvLoadURL').onchange = function (e) {

            var path = $(this).val();

            configureTrackWithLocalFileOrPath( { type: "bed", url: path, name: igv.browser.trackLabelWithPath(path) } );

            $(this).val("");
            $('#igvLoadURLModal').modal('hide');

        };

        function configureTrackWithLocalFileOrPath(config) {

            config.designatedTrack = (0 === igv.browser.trackViews.length) ? true : undefined;
            igv.browser.loadTracksWithConfigList([config]);
        }

        // Construct DOM hierarchy
        trackContainerDiv = $('<div id="igvTrackContainerDiv" class="igv-track-container-div">')[0];
        browser = new igv.Browser(options, trackContainerDiv);

        browser.encodeTable = new igv.EncodeTable($('#encodeModalBody'), function() {

            igv.encodeSearch(function (json) {

                dataSource = new igv.EncodeDataSource( { jSON: json } );

                dataSource.loadJSON(function () {

                    browser.encodeTable.spinner.hide();
                    browser.encodeTable.loadWithDataSource(dataSource);
                });

            });

            //dataSource = new igv.EncodeDataSource( { filePath: options.encodeTable || "resources/peaks.hg19.txt" } );
            //
            //dataSource.loadJSON(function () {
            //
            //    igv.stopSpinnerAtParentElement($('#encodeModalTable')[ 0 ]);
            //
            //    browser.encodeTable.loadWithDataSource(dataSource);
            //});

        });

        // Attach spinner to root div
        browser.div.appendChild(igv.spinner());
        igv.stopSpinnerAtParentElement(browser.div);

        document.getElementById('igvContainerDiv').appendChild(browser.div);

        contentHeader = $('<div class="row"></div>')[0];
        $(browser.div).append(contentHeader);

        // horizontal scrollbar container. fill in the guts after track construction
        horizontalScrollBarContainer = $('<div class="igv-horizontal-scrollbar-container-div">')[0];
        $(browser.div).append(horizontalScrollBarContainer);

        // utility div
        utilityDiv = $('<div class="igv-utility-div">');
        $(browser.div).append(utilityDiv[0]);

        // control panel header
        utilityDiv.append($('<div class="igv-control-panel-header-div">Track Summary</div>')[0]);

        // track container
        $(browser.div).append(trackContainerDiv);

        // Popover object -- singleton shared by all components
        igv.popover = new igv.Popover(browser.div);

        // ColorPicker object -- singleton shared by all components
        igv.colorPicker = new igv.ColorPicker($(browser.div), options.palette);
        igv.colorPicker.hide();

        // Dialog object -- singleton shared by all components
        igv.dialog = new igv.Dialog($(browser.div));
        igv.dialog.hide();


        // extend jquery ui dialog widget to support enter key triggering "ok" button press.
        $.extend($.ui.dialog.prototype.options, {

            create: function() {

                var $this = $(this);

                // focus first button and bind enter to it
                $this.parent().find('.ui-dialog-buttonpane button:first').focus();

                $this.keypress(function(e) {

                    if( e.keyCode == $.ui.keyCode.ENTER ) {
                        $this.parent().find('.ui-dialog-buttonpane button:first').click();
                        return false;
                    }

                });
            }

        });

        igv.addAjaxExtensions();

        // Add cursor specific methods to the browser object,  some new some overrides
        addCursorBrowserExtensions(browser);
        addCursorTrackViewExtensions(browser);

        browser.cursorModel = new cursor.CursorModel(browser);
        browser.referenceFrame = new igv.ReferenceFrame("", 0, 1 / browser.cursorModel.framePixelWidth);

        browser.highlightColor = "rgb(204, 51, 0)";

        // Launch app with session JSON if provided as param
        var sessionJSONPath = igv.getQueryValue('session');

        if (sessionJSONPath) {

            $.getJSON(sessionJSONPath, function (session) {


                console.log("launchSession: " + JSON.stringify(session));
                browser.initializeWithSession(session);

            });

        }
        else {

            if (undefined === options.tracks || 0 === options.tracks.length) {
                return;
            }

            browser.loadTracksWithConfigList(options.tracks);

        }

        return browser;
    };

    function addCursorBrowserExtensions(browser) {

        // Augment standard behavior of loadTracksWithConfigList
        browser.loadTracksWithConfigList = function (configList) {

            var tracks = [],
                doInitialize;

            configList.forEach(function(config){

                var track = cursorTrackWithConfig(config, browser);

                if (undefined !== track) {
                    tracks.push(track);

                    if (true === config.designatedTrack) {
                        browser.designatedTrack = track;
                    }

                }

            });

            if (0 === tracks.length) {
                return;
            }

            if (undefined === browser.designatedTrack) {
                browser.designatedTrack = tracks[ 0 ];
            }

            browser.getFeaturesForTracks(tracks, function () {

                doInitialize = (0 === igv.browser.trackViews.length);

                tracks.forEach(function (track) {
                    browser.addTrack(track);
                });

                if (doInitialize) {
                    browser.designatedTrack.featureSource.allFeatures(function (features) {

                        var horizontalScrollBarContainer = $("div.igv-horizontal-scrollbar-container-div");
                        browser.horizontalScrollbar = new cursor.HorizontalScrollbar(browser, $(horizontalScrollBarContainer));

                        browser.cursorModel.setRegions(features);

                        browser.horizontalScrollbar.update();
                    });
                }



            });

        };

        browser.initializeWithSession = function (session) {

            var tracks;

            browser.sessionTeardown();

            browser.cursorModel.regionWidth = session.regionWidth;
            $("input[id='regionSizeInput']").val(browser.cursorModel.regionWidth);

            tracks = [];
            session.tracks.forEach(function(trackSession){

                var track,
                    config = {
                        type: "bed",
                        url: trackSession.path,
                        color: trackSession.color,
                        name: trackSession.name || trackSession.label,   // label is (deprecated) synonym for name
                        order: trackSession.order,
                        height: trackSession.height,
                        trackFilter: trackSession.trackFilter,
                        designatedTrack: trackSession.designatedTrack
                    };

                track = cursorTrackWithConfig(config, browser);
                if (undefined !== track) {
                    tracks.push(track);
                }

                if (config.designatedTrack && true === config.designatedTrack) {
                    browser.designatedTrack = track;
                }

            });

            if (0 === tracks.length) {
                return;
            }

            if (undefined === browser.designatedTrack) {
                browser.designatedTrack = tracks[ 0 ];
            }

            browser.getFeaturesForTracks(tracks, function () {

                tracks.forEach(function (track) {
                    browser.addTrack(track);
                });

                browser.designatedTrack.featureSource.allFeatures(function (features) {

                    var horizontalScrollBarContainer = $("div.igv-horizontal-scrollbar-container-div");
                    browser.horizontalScrollbar = new cursor.HorizontalScrollbar(browser, $(horizontalScrollBarContainer));

                    browser.cursorModel.setRegions(features);

                    browser.setFrameWidth(browser.trackViewportWidth() * session.framePixelWidthUnitless);

                    browser.referenceFrame.bpPerPixel = 1.0 / browser.cursorModel.framePixelWidth;

                    //browser.goto("", session.start, session.end);
                    browser.fitToScreen();

                    browser.horizontalScrollbar.update();

                });

            });

        };

        browser.session = function () {

            var dev_null,
                session =
                {
                    start: Math.floor(browser.referenceFrame.start),
                    end: Math.floor((browser.referenceFrame.bpPerPixel * browser.trackViewportWidth()) + browser.referenceFrame.start),
                    regionWidth: browser.cursorModel.regionWidth,
                    framePixelWidthUnitless: (browser.cursorModel.framePixelWidth / browser.trackViewportWidth()),
                    tracks: []
                };

            dev_null = browser.trackViewportWidth();

            browser.trackViews.forEach(function (trackView) {

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

        browser.sessionTeardown = function () {

            var trackView,
                horizontalScrollBarContainer;

            while (this.trackViews.length > 0) {
                trackView = this.trackViews[ this.trackViews.length - 1 ];
                this.removeTrack(trackView.track);
            }

            horizontalScrollBarContainer = $("div.igv-horizontal-scrollbar-container-div");
            $(horizontalScrollBarContainer).empty();

            this.horizontalScrollbar = undefined;

        };

        browser.getFeaturesForTracks = function (tracks, continuation) {

            var trackCount = tracks.length;

            igv.startSpinnerAtParentElement(browser.div);

            tracks.forEach(function (track) {

                track.getFeatureCache(function(ignored){

                    --trackCount;
                    if (0 === trackCount) {

                        igv.stopSpinnerAtParentElement(browser.div);

                        // do stuff
                        continuation();

                    }

                });

            });

        };

        browser.presentSortStatus = function (trackView) {

            $(trackView.track.sortButton).addClass("igv-control-sort-fa-selected");

            $(browser.trackContainerDiv).find("i.fa-signal").each(function() {

                var me = $(this);

                if (1 === browser.sortDirection) {
                    me.addClass("fa-flip-horizontal");
                } else {
                    me.removeClass("fa-flip-horizontal");
                }

            });

        };

        browser.selectDesignatedTrack = function (trackView) {

            var currentDesignatedTrackView,
                bullseyeInner,
                bullseyeOuter,
                trackLabelDiv;

            if (browser.designatedTrack && browser.designatedTrack.trackFilter.trackPanel !== trackView) {

                currentDesignatedTrackView = browser.designatedTrack.trackFilter.trackPanel;

                bullseyeInner = $(currentDesignatedTrackView.trackDiv).find("i.fa-circle");
                bullseyeInner.removeClass("igv-control-bullseye-fa-selected");
                bullseyeInner.addClass   ("igv-control-bullseye-fa");

                bullseyeOuter = $(currentDesignatedTrackView.trackDiv).find("i.fa-circle-thin");
                bullseyeOuter.removeClass("igv-control-bullseye-fa-selected");

                trackLabelDiv = $(currentDesignatedTrackView.trackDiv).find("div.igv-track-label-div");
                trackLabelDiv.removeClass("igv-track-label-selected-div");

            }

            browser.designatedTrack = trackView.track;

            bullseyeInner = $(trackView.trackDiv).find("i.fa-circle");
            bullseyeInner.removeClass("igv-control-bullseye-fa");
            bullseyeInner.addClass   ("igv-control-bullseye-fa-selected");

            bullseyeOuter = $(trackView.trackDiv).find("i.fa-circle-thin");
            bullseyeOuter.addClass("igv-control-bullseye-fa-selected");


            //bullseyeInner.css({
            //    "color" : browser.highlightColor
            //});

            trackLabelDiv = $(trackView.trackDiv).find("div.igv-track-label-div");
            trackLabelDiv.addClass("igv-track-label-selected-div");

        };

        browser.setFrameWidth = function (frameWidthString) {

            if (!igv.isNumber(frameWidthString)) {
                console.log("bogus " + frameWidthString);
                return;
            }

            var frameWidth = parseFloat(frameWidthString);
            if (frameWidth > 0) {

                browser.cursorModel.framePixelWidth = frameWidth;
                browser.referenceFrame.bpPerPixel = 1 / frameWidth;

                $("input[id='frameWidthInput']").val(frameWidthNumberFormatter(frameWidth));

                browser.update();
            }


        };

        browser.setRegionSize = function (regionSizeString) {

            var regionSize = parseFloat(regionSizeString);
            if (regionSize > 0) {

                browser.cursorModel.regionWidth = regionSize;
                $("input[id='regionSizeInput']").val(browser.cursorModel.regionWidth);

                browser.cursorModel.filterRegions();
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

        browser.trackContentWidth = function () {

            var width;

            if (this.trackViews && this.trackViews.length > 0) {
                width = this.trackViews[0].contentDiv.clientWidth;
            }
            else {
                width = this.trackContainerDiv.clientWidth;
            }

            return width;

        };

        // Augment standard behavior of resize
        browser.resize = function () {

            var ratio;

            if (!browser.horizontalScrollbar) {

                this.__proto__.resize.call(this);
            }
            else {

                ratio = browser.cursorModel.framePixelWidth / browser.trackContentWidth();

                this.__proto__.resize.call(this);

                //browser.cursorModel.framePixelWidth = ratio * browser.trackContentWidth();
                //browser.referenceFrame.bpPerPixel = 1.0 / browser.cursorModel.framePixelWidth;
                //
                //$("input[id='frameWidthInput']").val(frameWidthNumberFormatter(browser.cursorModel.framePixelWidth));

                browser.setFrameWidth( ratio * browser.trackContentWidth() );
                browser.horizontalScrollbar.update();
            }

        };

        // Augment standard behavior of removeTrack
        browser.removeTrack = function (track) {

            this.__proto__.removeTrack.call(this, track);

            if (track === this.designatedTrack) {
                this.designatedTrack = undefined;
            }

            this.cursorModel.filterRegions();

        };

        function frameWidthNumberFormatter(frameWidth) {

            var divisor;

            if (frameWidth < 1) {

                divisor = 1000;
            } else if (frameWidth < 100) {

                divisor = 100;
            } else {

                divisor = 10;
            }

            return Math.round(frameWidth * divisor) / divisor;
        }

        function cursorTrackWithConfig(config, browser){

            var path,
                type,
                track;

            if (browser.isDuplicateTrack(config)) {
                return undefined;
            }

            path = config.url;
            type = config.type;
            if (!type) {
                type = cursorGetType(path);
            }

            if (type !== "bed") {
                window.alert("Bad Track type");
                return undefined;
            }

            track = new cursor.CursorTrack(config, browser);

            if (config.designatedTrack && true === config.designatedTrack) {
                browser.designatedTrack = track;
            }

            function cursorGetType(path) {

                if (path.endsWith(".bed") || path.endsWith(".bed.gz") || path.endsWith(".broadPeak") || path.endsWith(".broadPeak.gz")) {
                    return "bed";
                } else {
                    return undefined;
                }

            }

            return track;
        }

    }

    function addCursorTrackViewExtensions(browser) {

        igv.TrackView.prototype.viewportCreationHelper = function (viewportDiv) {
            // do nothing;
            //console.log("nadda");
        };

        igv.TrackView.prototype.leftHandGutterCreationHelper = function (leftHandGutter) {

            var trackView = this,
                track = trackView.track,
                trackFilterButtonDiv,
                trackLabelDiv,
                sortButton,
                bullseyeStackSpan,
                bullseyeOuterIcon,
                bullseyeInnerIcon;

            // track label
            trackLabelDiv = $('<div class="igv-track-label-div">')[0];
            trackLabelDiv.innerHTML = track.name;
            trackLabelDiv.title = track.name;
            $(trackView.leftHandGutter).append(trackLabelDiv);
            track.trackLabelDiv = trackLabelDiv;  // DON'T REMOVE THIS!

            // track selection
            bullseyeStackSpan = document.createElement("span");
            $(trackView.leftHandGutter).append($(bullseyeStackSpan));

            bullseyeStackSpan.className = "fa-stack igv-control-bullseye-stack-fa";
            track.bullseyeStackSpan = bullseyeStackSpan;

            bullseyeOuterIcon = document.createElement("i");
            bullseyeStackSpan.appendChild(bullseyeOuterIcon);
            bullseyeOuterIcon.className = "fa fa-stack-2x fa-circle-thin";

            bullseyeInnerIcon = document.createElement("i");
            bullseyeStackSpan.appendChild(bullseyeInnerIcon);
            bullseyeInnerIcon.className = "fa fa-stack-1x fa-circle igv-control-bullseye-fa";

            bullseyeStackSpan.onclick = function () {

                if (browser.designatedTrack && browser.designatedTrack === trackView.track) {
                    return;
                } else {
                    browser.selectDesignatedTrack(trackView);
                }

                if(browser.cursorModel) {
                    browser.designatedTrack.featureSource.allFeatures(function (featureList) {
                        browser.referenceFrame.start = 0;
                        browser.cursorModel.setRegions(featureList);
                    });
                }

            };

            // track filter
            trackFilterButtonDiv = document.createElement("div");
            $(trackView.leftHandGutter).append($(trackFilterButtonDiv));

            trackFilterButtonDiv.className = "igv-track-filter-button-div";

            trackView.track.trackFilter = new igv.TrackFilter(trackView);
            trackView.track.trackFilter.createTrackFilterWidgetWithParentElement(trackFilterButtonDiv);

            // sort
            browser.sortDirection = undefined;
            browser.sortTrack = undefined;

            sortButton = document.createElement("i");
            $(trackView.leftHandGutter).append($(sortButton));
            sortButton.className = "fa fa-signal igv-control-sort-fa fa-flip-horizontal";
            track.sortButton = sortButton;

            sortButton.onclick = function () {

                if (browser.sortTrack === track) {

                    browser.sortDirection = (undefined === browser.sortDirection) ? 1 : -1 * browser.sortDirection;
                } else {

                    browser.sortTrack = track;
                    if (undefined === browser.sortDirection) {
                        browser.sortDirection = 1;
                    }
                }

                browser.cursorModel.sortRegions(track.featureSource, browser.sortDirection, function (regions) {

                    browser.update();

                    browser.trackViews.forEach(function (tp) {

                        if (1 === browser.sortDirection) {

                            $(tp.track.sortButton).addClass("fa-flip-horizontal");
                        } else {

                            $(tp.track.sortButton).removeClass("fa-flip-horizontal");
                        }

                        if (track === tp.track) {

                            $(tp.track.sortButton).addClass("igv-control-sort-fa-selected");
                        } else {

                            $(tp.track.sortButton).removeClass("igv-control-sort-fa-selected");
                        }
                    });

                });

            };

        };

        igv.TrackView.prototype.rightHandGutterCreationHelper = function (trackManipulationIconBox) {

            var myself = this,
                removeButton,
                gearButton;

            $(trackManipulationIconBox).append($('<i class="fa fa-chevron-circle-up   igv-track-menu-move-up">')[0]);
            $(trackManipulationIconBox).append($('<i class="fa fa-chevron-circle-down igv-track-menu-move-down">')[0]);

            $(trackManipulationIconBox).find("i.fa-chevron-circle-up").click(function () {
                myself.browser.reduceTrackOrder(myself)
            });

            $(trackManipulationIconBox).find("i.fa-chevron-circle-down").click(function () {
                myself.browser.increaseTrackOrder(myself)
            });



            //removeButton = $('<i class="fa fa-times igv-track-menu-discard">')[0];
            //$(trackManipulationIconBox).append(removeButton);

            //$(removeButton).click(function () {
            //    myself.browser.removeTrack(myself.track);
            //});


            gearButton = $('<i class="fa fa-gear fa-20px igv-track-menu-gear igv-app-icon" style="padding-top: 5px">');
            $(trackManipulationIconBox).append(gearButton[0]);

            $(gearButton).click(function (e) {
                igv.popover.presentTrackMenu(e.pageX, e.pageY, myself);
            });


        };

        igv.TrackView.prototype.repaint = function () {

            if (!(this.track && this.browser && this.browser.referenceFrame)) {
                return;
            }

            var tileWidth,
                tileStart,
                tileEnd,
                buffer,
                myself = this,
                ctx,
                referenceFrame = this.browser.referenceFrame,
                refFrameStart = referenceFrame.start,
                refFrameEnd = refFrameStart + referenceFrame.toBP(this.canvas.width);

            if (!this.tile || !this.tile.containsRange(referenceFrame.chr, refFrameStart, refFrameEnd, referenceFrame.bpPerPixel)) {

                // First see if there is a load in progress that would satisfy the paint request

                if (myself.currentTask && !myself.currentTask.complete && myself.currentTask.end >= refFrameEnd && myself.currentTask.start <= refFrameStart) {

                    // Nothing to do but wait for current load task to complete

                }

                else {

                    if (myself.currentTask) {
                        if(!myself.currentTask.complete) myself.currentTask.abort();
                        myself.currentTask = null;
                    }

                    //igv.startSpinnerAtParentElement(myself.trackDiv);

                    myself.currentTask = {
                        canceled: false,
                        chr: referenceFrame.chr,
                        start: tileStart,
                        end: tileEnd,
                        abort: function () {
                            this.canceled = true;
                            if (this.xhrRequest) {
                                this.xhrRequest.abort();
                            }

                            //igv.stopSpinnerAtParentElement(myself.trackDiv);
                        }

                    };

                    buffer = document.createElement('canvas');
                    buffer.width = 3 * this.canvas.width;
                    buffer.height = this.canvas.height;
                    ctx =  buffer.getContext('2d');

                    tileWidth = Math.round(referenceFrame.toBP(buffer.width));
                    tileStart = Math.max(0, Math.round(referenceFrame.start - tileWidth / 3));
                    tileEnd = tileStart + tileWidth;

                    myself.track.draw(ctx, referenceFrame, tileStart, tileEnd, buffer.width, buffer.height, function (task) {

                            //igv.stopSpinnerAtParentElement(myself.trackDiv);

                            if (!(myself.currentTask && myself.currentTask.canceled)) {
                                myself.tile = new Tile(referenceFrame.chr, tileStart, tileEnd, referenceFrame.bpPerPixel, buffer);
                                myself.paintImage();

                            }
                            myself.currentTask = undefined;
                        },
                        myself.currentTask);

                    if (myself.track.paintAxis) {

                        var buffer2 = document.createElement('canvas');
                        buffer2.width = this.controlCanvas.width;
                        buffer2.height = this.controlCanvas.height;

                        var ctx2 =  buffer2.getContext('2d');

                        myself.track.paintAxis(ctx2, buffer2.width, buffer2.height);

                        myself.controlCtx.drawImage(buffer2, 0, 0);
                    }
                }

            }

            if (this.tile && this.tile.chr === referenceFrame.chr) {
                this.paintImage();
            }
            else {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }



            function Tile (chr, tileStart, tileEnd, scale, image) {
                this.chr = chr;
                this.startBP = tileStart;
                this.endBP = tileEnd;
                this.scale = scale;
                this.image = image;
            }


            Tile.prototype.containsRange = function (chr, start, end, scale) {
                var hit = this.scale == scale && start >= this.startBP && end <= this.endBP && chr === this.chr;
                return hit;
            };


        };

    }

    return igv;

})(igv || {});