var igv = (function (igv) {

    var maxViewportHeight = 400;

    igv.TrackView = function (track, browser) {

        this.browser = browser;
        this.track = track;
        this.order = 0;
        this.marginBottom = 10;

        var viewportHeight,
            viewportDiv,
            trackDiv,
            controlDiv,
            contentHeight,
            contentDiv,
            canvas,
            contentWidth,
            closeButton,
            labelButton,
            trackFilterButtonDiv;

        viewportHeight = track.height;

        // track
        trackDiv = document.createElement("div");
        browser.trackContainerDiv.appendChild(trackDiv);
        trackDiv.className = "igv-track-div";
        trackDiv.style.top = browser.rootHeight + "px";
        trackDiv.style.height = viewportHeight + "px";

        this.trackDiv = trackDiv;

        // controls
        controlDiv = document.createElement("div");
        trackDiv.appendChild(controlDiv);
        controlDiv.className = "igv-control-div";

        this.controlDiv = controlDiv;

       // if (browser.type === "GTEX") {
            var controlWidth = controlDiv.clientWidth;
            var controlHeight = controlDiv.clientHeight;

            var controlCanvas = document.createElement('canvas');
            controlDiv.appendChild(controlCanvas);
            controlCanvas.style.position = 'absolute';
            controlCanvas.style.width = controlWidth + "px";
            controlCanvas.style.height = controlHeight + "px";
            controlCanvas.setAttribute('width', controlWidth);
            controlCanvas.setAttribute('height', controlHeight);
            this.controlCanvas = controlCanvas;
            this.controlCtx = controlCanvas.getContext("2d");


    //    }

        // TODO - dat - this is so nothing breaks that is dependent on igv.controlPanelWidth
        igv.controlPanelWidth = controlDiv.clientWidth;

        // The viewport
        viewportDiv = document.createElement("div");
        trackDiv.appendChild(viewportDiv);
        viewportDiv.className = "igv-viewport-div";
        viewportDiv.style.left = controlDiv.clientWidth + "px";
        viewportDiv.style.height = viewportHeight + "px";

        this.viewportDiv = viewportDiv;

        // Content
        contentHeight = track.height;
        contentDiv = document.createElement("div");
        viewportDiv.appendChild(contentDiv);  // Note, must do this before getting width for canvas
        contentDiv.className = "igv-content-div";
        contentDiv.style.height = contentHeight + "px";

        this.contentDiv = contentDiv;

        contentWidth = contentDiv.clientWidth;

        canvas = document.createElement('canvas');
        contentDiv.appendChild(canvas);
        canvas.style.position = 'absolute';
        canvas.style.width = contentWidth + "px";
        canvas.style.height = contentHeight + "px";
        canvas.setAttribute('width', contentWidth);    //Must set the width & height of the canvas
        canvas.setAttribute('height', contentHeight);

        // filter  -- CURSOR only for now
        if (browser.type === "CURSOR") {

//            this.track.cursorHistogram = new cursor.CursorHistogram(this.track.height, this.track.max);
            this.track.cursorHistogram = new cursor.CursorHistogram(controlDiv.clientHeight, this.track.max);
            this.track.cursorHistogram.createMarkupWithTrackPanelDiv(this);

        }

        var nextButtonTop = 5;
        if (browser.type === "CURSOR") {

            var sortButton = document.createElement("i");
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

                var spinner = igv.getSpinner(viewportDiv);   // Start a spinner
                // Delay 100 ms to give spinner a chance to spin up (we are single threaded)
                setTimeout(function () {
                    browser.cursorModel.sortRegions(track.featureSource, track.sortDirection, function (regions) {
                        spinner.stop();
                        browser.update();
                        track.sortDirection *= -1;

                    });
                }, 100);

                browser.trackPanels.forEach(function (trackPanel) {
                    if (track !== trackPanel.track) {
                        trackPanel.track.sortButton.className = "fa fa-bar-chart-o";
                        trackPanel.track.sortButton.style.color = "black";
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

//            this.track.trackFilter = new igv.TrackFilter(this);
//            this.track.trackFilter.createTrackFilterWidgetWithParentElement(trackFilterButtonDiv);

            this.track.trackFilter = new igv.TrackFilter(this);
            this.track.trackFilter.createTrackFilterWidgetWithParentElement(trackFilterButtonDiv);

            nextButtonTop += 18;

        }

        // Close button
        if (!track.disableButtons) {

            closeButton = document.createElement("i");
            contentDiv.appendChild(closeButton);
            closeButton.style.color = "black";
            closeButton.className = "fa fa-times-circle";
            closeButton.style.position = "absolute";
            closeButton.style.top = "5px";
            closeButton.style.right = "5px";
            closeButton.style.cursor = "pointer";
            closeButton.onclick = function () {

//                removeTrackPanel(trackPanel);
                browser.removeTrack(track);

                // We removed a track. This removes it's filter. Must update filter chain application
                if (browser.type === "CURSOR") {
                    browser.cursorModel.filterRegions();
                }

            };

            if (track.label) {

                labelButton = document.createElement("button");
                viewportDiv.appendChild(labelButton);
                labelButton.className = "btn btn-xs btn-cursor-deselected";
                labelButton.style.position = "absolute";
                labelButton.style.top = "10px";
                labelButton.style.left = "10px";
                labelButton.innerHTML = track.label;
                track.labelButton = labelButton;

                labelButton.onclick = function () {

                    if(browser.cursorModel) {
                        track.featureSource.allFeatures(function (featureList) {

                            browser.referenceFrame.start = 0;
                            browser.cursorModel.setRegions(featureList);
//                        browser.update();


                        });


                        browser.trackPanels.forEach(function (trackPanel) {
                            if (track !== trackPanel.track) {
                                trackPanel.track.labelButton.className = "btn btn-xs btn-cursor-deselected";
                            }
                        });
                    }
                    labelButton.className = "btn btn-xs btn-cursor-selected";

                }


            }
        }


        browser.rootHeight += viewportHeight + this.marginBottom;

        browser.div.style.height = browser.rootHeight + 165 + "px";

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        addTrackHandlers(this);

        function removeTrackPanel(trackPanel) {

            var array = browser.trackPanels;
            array.splice(array.indexOf(trackPanel), 1);

            browser.trackContainerDiv.removeChild(trackPanel.trackDiv);

            browser.rootHeight = 0;
            browser.trackPanels.forEach(function (panel) {
                panel.trackDiv.style.top = browser.rootHeight + "px";
                browser.rootHeight += panel.trackDiv.clientHeight;

                browser.div.style.height = browser.rootHeight + 165 + "px";
            });

            // We removed a track. This removes it's filter. Must
            // now update filter chain application
            if (browser.type === "CURSOR") {
                browser.cursorModel.filterRegions();
            }
        }

        function addTrackHandlers(trackPanel) {

            var canvas = trackPanel.canvas;
            var isMouseDown = false;
            var lastMouseX;
            var referenceFrame = trackPanel.browser.referenceFrame;

            canvas.onmousemove = throttle(function (e) {

                var mouseX = e.clientX - canvas.offsetLeft;

                if (isMouseDown) {

                    if (lastMouseX) {

                        referenceFrame.shiftPixels(lastMouseX - mouseX);

                        if (referenceFrame.start < 0) {
                            referenceFrame.start = 0;
                        }

//                        if (igv.genome) {
//                            var chromosome = igv.genome.getChromosome(igv.referenceFrame.chr);
//                            var widthBP = Math.round((igv.trackWidth - igv.labelWidth) * igv.referenceFrame.bpPerPixel);
//                            var endBP = igv.referenceFrame.start + widthBP;
//                            if (chromosome && endBP > chromosome.length) {
//                                if (endBP > chromosome.length) {
//                                    igv.referenceFrame.start = chromosome.length - widthBP;
//                                }
//                            }
//                        }
                    }

                    lastMouseX = mouseX;
                    trackPanel.browser.repaint();
                }

            }, 20);

            canvas.onmousedown = function (e) {

                isMouseDown = true;
                var mouseX = e.clientX - canvas.offsetLeft; //e.pageX - $(this).offset().left;
                var mouseY = e.clientY - canvas.offsetTop;

                this.lastMouseX = mouseX;


            };

            canvas.onmouseup = function (e) {
                isMouseDown = false;
                lastMouseX = null;
            };

            canvas.onmouseout = function (e) {
                isMouseDown = false;
                lastMouseX = null;
            };

            canvas.onclick = function (e) {
                var mouseX = e.clientX - canvas.offsetLeft; //e.pageX - $(this).offset().left;
                var mouseY = e.clientY - canvas.offsetTop;

            };

            canvas.ondblclick = function (e) {
                var mouseX = e.clientX - canvas.offsetLeft; //e.pageX - $(this).offset().left;
                var mouseY = e.clientY - canvas.offsetTop;

                if (trackPanel.track.handleDblClick) {
                    trackPanel.track.handleDblClick(mouseX, mouseY, trackPanel.viewportDiv);
                }

                else {
                    var newCenter = Math.round(igv.referenceFrame.start + mouseX * igv.referenceFrame.bpPerPixel);
                    referenceFrame.bpPerPixel /= 2;
                    trackPanel.browser.goto(igv.referenceFrame.chr, newCenter);
                }
            }

        }

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
            startBP,
            endBP,
            panel,
            igvCanvas,
            chr,
            scale,
            refFrame,
            tileRefFrame;

        refFrame = this.browser.referenceFrame;
        chr = refFrame.chr;
        startBP = refFrame.start;
        endBP = startBP + refFrame.toBP(this.canvas.width);
        scale = refFrame.bpPerPixel;
        panel = this;

        if (!this.tile || !this.tile.containsRange(chr, startBP, endBP, scale)) {

            var contentDiv = this.contentDiv;

            buffer = document.createElement('canvas');
            buffer.width = 3 * this.canvas.width;
            buffer.height = this.canvas.height;
            igvCanvas = new igv.Canvas(buffer);

            tileWidth = Math.round(buffer.width * refFrame.bpPerPixel);
            tileStart = Math.max(0, Math.round(refFrame.start - tileWidth / 3));
            tileEnd = tileStart + tileWidth;

            spinner = igv.getSpinner(this.trackDiv);   // Start a spinner

            if (this.currentTask) {
                this.currentTask.abort();
            }
            this.currentTask = {
                canceled: false,
                abort: function() {
                    this.canceled = true;
                    if(this.xhrRequest) {
                        this.xhrRequest.abort();
                    }
                }

            };

            this.track.draw(igvCanvas, refFrame, tileStart, tileEnd, buffer.width, buffer.height, function (task) {


                    spinner.stop();

                    if(task) console.log(task.canceled);

                    if (!(task && task.canceled)) {
                        panel.tile = new Tile(chr, tileStart, tileEnd, scale, buffer);
                        panel.paintImage();
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
            this.xOffset = Math.round((this.tile.startBP - this.browser.referenceFrame.start) / this.browser.referenceFrame.bpPerPixel);
            this.ctx.drawImage(this.tile.image, this.xOffset, 0);
            this.ctx.save();
            this.ctx.restore();
        }
    };

    igv.TrackView.prototype.tooltipText = function (mouseX, mouseY) {
        return "";
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

    function throttle(fn, threshhold, scope) {
        threshhold || (threshhold = 200);
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

    return igv;
})
(igv || {});
