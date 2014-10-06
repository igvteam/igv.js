var igv = (function (igv) {

    igv.TrackView = function (track, browser) {

        this.browser = browser;
        this.track = track;
        this.order = track.order || 0;
        this.marginBottom = 10;

        var viewportDiv,
            trackDiv,
            controlDiv,
            controlCanvas,
            contentDiv,
            canvas,
            closeButton,
            labelButton;

        // track
        trackDiv = document.createElement("div");
        browser.trackContainerDiv.appendChild(trackDiv);
        trackDiv.className = "igv-track-div";
        trackDiv.style.height = track.height + "px";
        this.trackDiv = trackDiv;

        // controls
        var controlWidth = browser.controlPanelWidth ? browser.controlPanelWidth : 50;

        controlDiv = document.createElement("div");
        controlDiv.className = "igv-control-div";
        controlDiv.style.width = controlWidth + "px";
        controlDiv.style.height = track.height + "px";
        this.controlDiv = controlDiv;

        controlCanvas = document.createElement('canvas');
        controlDiv.style.width = controlWidth + "px";
        trackDiv.appendChild(controlDiv);
        this.controlDiv = controlDiv;

        controlDiv.appendChild(controlCanvas);
        controlCanvas.style.width = controlDiv.clientWidth + "px";
        controlCanvas.style.height = controlDiv.clientHeight + "px";
        controlCanvas.setAttribute('width', controlDiv.clientWidth);
        controlCanvas.setAttribute('height', controlDiv.clientHeight);
        this.controlCanvas = controlCanvas;
        this.controlCtx = controlCanvas.getContext("2d");

        // viewport
        viewportDiv = document.createElement("div");
        viewportDiv.className = "igv-viewport-div";
        viewportDiv.style.left = controlDiv.clientWidth + "px";
        viewportDiv.style.height = track.height + "px";
        trackDiv.appendChild(viewportDiv);
        this.viewportDiv = viewportDiv;

        // content
        contentDiv = document.createElement("div");
        viewportDiv.appendChild(contentDiv);
        contentDiv.className = "igv-content-div";
        contentDiv.style.height = track.height + "px";
        this.contentDiv = contentDiv;

        canvas = document.createElement('canvas');
        contentDiv.appendChild(canvas);
        canvas.style.position = 'absolute';
        canvas.style.width = contentDiv.clientWidth + "px";
        canvas.style.height = track.height + "px";
        canvas.setAttribute('width', contentDiv.clientWidth);
        canvas.setAttribute('height', track.height);


        // CURSOR specific functions
        if (browser.type === "CURSOR") {

            this.track.cursorHistogram = new cursor.CursorHistogram(controlDiv.clientHeight, this.track.max);
            this.track.cursorHistogram.createMarkupWithTrackPanelDiv(this);

            igv.cursorAddTrackControlButtons(this, browser, controlDiv)

        }

        // Close button
        if (!track.disableButtons) {

            closeButton = document.createElement("i");
            contentDiv.appendChild(closeButton);

            closeButton.className = "fa fa-times-circle igv-track-disable-button-fontawesome";
            closeButton.onclick = function () {
                browser.removeTrack(track);
            };

            if (track.label) {

                labelButton = document.createElement("button");
                viewportDiv.appendChild(labelButton);

                labelButton.className = "btn btn-xs btn-cursor-deselected igv-track-label";
                labelButton.innerHTML = track.label;
                track.labelButton = labelButton;

                labelButton.onclick = function (e) {

                    if (browser.cursorModel) {
                        track.featureSource.allFeatures(function (featureList) {

                            browser.referenceFrame.start = 0;
                            browser.cursorModel.setRegions(featureList);


                        });

                    }
                    else {

                        if (track.description) {
                            igv.popover.show(e.pageX, e.pageY, track.description);
                        }

                    }

                }

            }
        }

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        addTrackHandlers(this);


    };

    igv.TrackView.prototype.resize = function () {
        var canvas = this.canvas,
            contentDiv = this.contentDiv,
            contentWidth = this.viewportDiv.clientWidth;
        //      contentHeight = this.canvas.getAttribute("height");  // Maintain the current height

        contentDiv.style.width = contentWidth + "px";      // Not sure why css is not working for this
        //  contentDiv.style.height = contentHeight + "px";

        canvas.style.width = contentWidth + "px";
        canvas.setAttribute('width', contentWidth);    //Must set the width & height of the canvas
        this.update();
    };

    igv.TrackView.prototype.setTrackHeight = function (newHeight) {

        var heightStr = newHeight + "px";
        this.track.height = newHeight;
        this.trackDiv.style.height = heightStr;
        // this.controlDiv.style.height = heightStr;
        // this.controlCanvas.style.height = heightStr;
        // this.controlCanvas.setAttribute("height", newHeight);
        this.viewportDiv.style.height = heightStr;
        this.contentDiv.style.height = heightStr;
        this.canvas.style.height = heightStr;
        this.canvas.setAttribute("height", newHeight);

        this.track.cursorHistogram.updateHeight(this.track, newHeight);

        this.update();
    };

    igv.TrackView.prototype.update = function () {
        this.tile = null;
        this.repaint();

    };

    igv.TrackView.prototype.repaint = function () {

        if (!this.track) {
            return;
        }

        var tileWidth,
            tileStart,
            tileEnd,
            spinner,
            buffer,
            myself = this,
            igvCanvas,
            referenceFrame = this.browser.referenceFrame,
            refFrameStart = referenceFrame.start,
            refFrameEnd = refFrameStart + referenceFrame.toBP(this.canvas.width);

        if (!this.tile || !this.tile.containsRange(referenceFrame.chr, refFrameStart, refFrameEnd, referenceFrame.bpPerPixel)) {

            buffer = document.createElement('canvas');
            buffer.width = 3 * this.canvas.width;
            buffer.height = this.canvas.height;
            igvCanvas = new igv.Canvas(buffer);

            tileWidth = Math.round(referenceFrame.toBP(buffer.width));
            tileStart = Math.max(0, Math.round(referenceFrame.start - tileWidth / 3));
            tileEnd = tileStart + tileWidth;


            spinner = igv.getSpinner(this.trackDiv);   // Start a spinner

            if (this.currentTask) {
                this.currentTask.abort();
            }
            this.currentTask = {
                canceled: false,
                abort: function () {
                    this.canceled = true;
                    if (this.xhrRequest) {
                        this.xhrRequest.abort();
                    }
                    spinner.stop();
                }

            };

            this.track.draw(igvCanvas, referenceFrame, tileStart, tileEnd, buffer.width, buffer.height, function (task) {


                    spinner.stop();

                    if (task) console.log(task.canceled);

                    if (!(task && task.canceled)) {
                        myself.tile = new Tile(referenceFrame.chr, tileStart, tileEnd, referenceFrame.bpPerPixel, buffer);
                        myself.paintImage();
                    }
                },
                this.currentTask);

            if (this.track.paintControl) {

                var buffer2 = document.createElement('canvas');
                buffer2.width = this.controlCanvas.width;
                buffer2.height = this.controlCanvas.height;

                var bufferCanvas = new igv.Canvas(buffer2);

                this.track.paintControl(bufferCanvas, buffer2.width, buffer2.height);

                this.controlCtx.drawImage(buffer2, 0, 0);
            }


        }
        else {
            this.paintImage();
        }

    };

    igv.TrackView.prototype.paintImage = function () {

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.tile) {
            this.xOffset = Math.round(this.browser.referenceFrame.toPixels(this.tile.startBP - this.browser.referenceFrame.start));
            this.ctx.drawImage(this.tile.image, this.xOffset, 0);
            this.ctx.save();
            this.ctx.restore();
        }
    };

    igv.TrackView.prototype.setSortButtonDisplay = function (onOff) {
        this.track.sortButton.style.color = onOff ? "red" : "black";
    };

    function Tile(chr, tileStart, tileEnd, scale, image) {
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


    function addTrackHandlers(trackView) {

        // Register track handlers for popup.  Although we are not handling dragging here, we still need to check
        // for dragging on a mouseup

      var isMouseDown = false,
            lastMouseX = undefined,
            mouseDownX = undefined,
            canvas = trackView.canvas,
            popupTimer = undefined;

        $(canvas).mousedown(function (e) {

            var canvasCoords = igv.translateMouseCoordinates(e, canvas);

            if (igv.popover) igv.popover.hide();

            isMouseDown = true;
            lastMouseX = canvasCoords.x;
            mouseDownX = lastMouseX;


        });


        $(canvas).mouseup(function (e) {

            e = $.event.fix(e);   // Sets pageX and pageY for browsers that don't support them

            var canvasCoords = igv.translateMouseCoordinates(e, canvas),
                referenceFrame = trackView.browser.referenceFrame;

            if(!referenceFrame) return;

            if (popupTimer) {
                // Cancel previous timer
                window.clearTimeout(popupTimer);
                popupTimer = undefined;
            }

            if (Math.abs(canvasCoords.x - mouseDownX) <= igv.constants.dragThreshold && trackView.track.popupData) {
                const doubleClickDelay = 300;
                popupTimer = window.setTimeout(function () {

                        var popupData,
                            genomicLocation = Math.floor((referenceFrame.start) + referenceFrame.toBP(canvasCoords.x)),
                            xOrigin;

                        if (undefined === genomicLocation) {
                            return;
                        }

                        xOrigin = Math.round(referenceFrame.toPixels((trackView.tile.startBP - referenceFrame.start)));

                        popupData = trackView.track.popupData(genomicLocation, canvasCoords.x - xOrigin, canvasCoords.y);

//                        popupData = igv.popover.testData( Math.floor( igv.random(2, 25) ) );

                        if (popupData && popupData.length > 0) {
                            igv.popover.show(e.pageX, e.pageY, igv.formatPopoverText(popupData));
                        }
                        mouseDownX = undefined;
                    },
                    doubleClickDelay);
            }
            else {
                mouseDownX = undefined;
            }


            isMouseDown = false;
            lastMouseX = undefined;

        });


    }


    return igv;
})
(igv || {});
