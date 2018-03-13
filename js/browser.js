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

    igv.Browser = function (options, trackContainerDiv) {

        this.config = options;

        igv.browser = this;   // Make globally visible (for use in html markup).

        igv.browser.$root = $('<div id="igvRootDiv" class="igv-root-div">');

        initialize.call(this, options);

        $("input[id='trackHeightInput']").val(this.trackHeight);

        this.trackContainerDiv = trackContainerDiv;

        this.trackViews = [];

        this.trackLabelsVisible = true;

        this.featureDB = {};   // Hash of name -> feature, used for search function.

        this.constants = {
            dragThreshold: 3,
            defaultColor: "rgb(0,0,150)",
            doubleClickDelay: options.doubleClickDelay || 500
        };

        // Map of event name -> [ handlerFn, ... ]
        this.eventHandlers = {};

        attachMouseHandlers.call(this);

    };

    function initialize(options) {
        var genomeId;

        this.flanking = options.flanking;
        this.type = options.type || "IGV";
        this.crossDomainProxy = options.crossDomainProxy;
        this.formats = options.formats;
        this.trackDefaults = options.trackDefaults;

        if (options.search) {
            this.searchConfig = {
                type: "json",
                url: options.search.url,
                coords: options.search.coords === undefined ? 1 : options.search.coords,
                chromosomeField: options.search.chromosomeField || "chromosome",
                startField: options.search.startField || "start",
                endField: options.search.endField || "end",
                geneField: options.search.geneField || "geneSymbol",
                snpField: options.search.snpField || "snp",
                resultsField: options.search.resultsField
            }
        }
        else {

            if (options.reference && options.reference.id) {
                genomeId = options.reference.id;
            }
            else if (options.genome) {
                genomeId = options.genome;
            }
            else {
                genomeId = "hg19";
            }

            this.searchConfig = {
                // Legacy support -- deprecated
                type: "plain",
                url: 'https://portals.broadinstitute.org/webservices/igv/locus?genome=$GENOME$&name=$FEATURE$',
                coords: 0,
                chromosomeField: "chromosome",
                startField: "start",
                endField: "end"

            }
        }
    }

    function attachMouseHandlers() {

        var self = this;

        window.onresize = igv.throttle(function () {
            self.resize();
        }, 10);

        $(document).on('mousedown.browser', function (e) {
            self.isMouseDown = true;
        });

        $(document).on('mouseup.browser', function (e) {

            self.isMouseDown = undefined;

            if (self.dragTrackView) {
                self.dragTrackView.$trackDragScrim.hide();
            }

            self.dragTrackView = undefined;

        });

        $(document).on('click.browser', function (e) {
            var target = e.target;
            if (!self.$root.get(0).contains(target)) {
                // We've clicked outside the IGV div.  Close any open popovers.
                igv.popover.hide();
            }
        });

        // Guide line is bound within track area, and offset by 5 pixels so as not to interfere mouse clicks.
        $(this.trackContainerDiv).on('mousemove.cursorTrackingGuide', igv.throttle(function (e) {
            var exe;

            e.preventDefault();

            exe = Math.max(50, igv.translateMouseCoordinates(e, self.trackContainerDiv).x - 5);
            exe = Math.min(self.trackContainerDiv.clientWidth - 65, exe);

            self.$cursorTrackingGuide.css({ left: exe + 'px' });
        }, 10));

    }

    igv.Browser.hasKnownFileExtension = function (config) {
        var extension = igv.getExtension(config);

        if (undefined === extension) {
            return false;
        }
        return igv.Browser.knownFileExtensions.has(extension);
    };

    igv.Browser.prototype.disableZoomWidget = function () {
        this.$zoomContainer.hide();
    };

    igv.Browser.prototype.enableZoomWidget = function () {
        this.$zoomContainer.show();
    };

    igv.Browser.prototype.toggleCursorGuide = function (genomicStateList) {

        if (_.size(genomicStateList) > 1 || 'all' === (_.first(genomicStateList)).locusSearchString.toLowerCase()) {

            if (this.$cursorTrackingGuide.is(":visible")) {
                this.$cursorTrackingGuideToggle.click();
            }

            this.$cursorTrackingGuideToggle.hide();

        } else {
            this.$cursorTrackingGuideToggle.show();
        }
    };

    igv.Browser.prototype.toggleCenterGuide = function (genomicStateList) {

        if (_.size(genomicStateList) > 1 || 'all' === (_.first(genomicStateList)).locusSearchString.toLowerCase()) {

            if (this.centerGuide.$container.is(":visible")) {
                this.centerGuide.$centerGuideToggle.click();
            }

            this.centerGuide.$centerGuideToggle.hide();

        } else {
            this.centerGuide.$centerGuideToggle.show();
        }
    };

    igv.Browser.prototype.loadTracksWithConfigList = function (configList) {

        var self = this,
            loadedTracks = [];

        configList.forEach(function (config) {
            var track = self.loadTrack(config);
            if (track) {
                loadedTracks.push(track);
            }
        });

        // Really we should just resize the new trackViews, but currently there is no way to get a handle on those
        this.trackViews.forEach(function (trackView) {
            trackView.resize();
        });

        return loadedTracks;
    };

    igv.Browser.prototype.loadTrack = function (config) {

        var self = this,
            settings,
            property,
            newTrack,
            featureSource;

        igv.inferTrackTypes(config);

        // Set defaults if specified
        if (this.trackDefaults && config.type) {
            settings = this.trackDefaults[config.type];
            if (settings) {
                for (property in settings) {
                    if (settings.hasOwnProperty(property) && config[property] === undefined) {
                        config[property] = settings[property];
                    }
                }
            }
        }

        newTrack = igv.createTrack(config);

        if (undefined === newTrack) {
            igv.presentAlert("Unknown file type: " + config.url, undefined);
            return newTrack;
        }

        // Set order field of track here.  Otherwise track order might get shuffled during asynchronous load
        if (undefined === newTrack.order) {
            newTrack.order = this.trackViews.length;
        }

        // If defined, attempt to load the file header before adding the track.  This will catch some errors early
        if (typeof newTrack.getFileHeader === "function") {
            newTrack.getFileHeader()
                .then(function (header) {
                    self.addTrack(newTrack);
                })
                .catch(function (error) {
                    igv.presentAlert(error);
                });
        } else {
            self.addTrack(newTrack);
        }

        return newTrack;

    };

    /**
     * Add a new track.  Each track is associated with the following DOM elements
     *
     *      leftHandGutter  - div on the left for track controls and legend
     *      contentDiv  - a div element wrapping all the track content.  Height can be > viewportDiv height
     *      viewportDiv - a div element through which the track is viewed.  This might have a vertical scrollbar
     *      canvas     - canvas element upon which the track is drawn.  Child of contentDiv
     *
     * The width of all elements should be equal.  Height of the viewportDiv is controlled by the user, but never
     * greater than the contentDiv height.   Height of contentDiv and canvas are equal, and governed by the data
     * loaded.
     *
     * @param track
     */
    igv.Browser.prototype.addTrack = function (track) {

        var trackView;

        if (typeof igv.popover !== "undefined") {
            igv.popover.hide();
        }

        trackView = new igv.TrackView(this, $(this.trackContainerDiv), track);
        this.trackViews.push(trackView);
        this.reorderTracks();
        trackView.update();
    };

    igv.Browser.prototype.reorderTracks = function () {

        var myself = this;

        this.trackViews.sort(function (a, b) {
            var aOrder = a.track.order || 0;
            var bOrder = b.track.order || 0;
            return aOrder - bOrder;
        });

        // Reattach the divs to the dom in the correct order
        $(this.trackContainerDiv).children("igv-track-div").detach();

        this.trackViews.forEach(function (trackView) {
            myself.trackContainerDiv.appendChild(trackView.trackDiv);
        });

    };

    igv.Browser.prototype.removeTrackByName = function (name) {

        var remove;
        remove = _.first(_.filter(this.trackViews, function (trackView) {
            return name === trackView.track.name;
        }));

        this.removeTrack(remove.track);

    };

    igv.Browser.prototype.removeTrack = function (track) {

        // Find track panel
        var trackPanelRemoved;
        for (var i = 0; i < this.trackViews.length; i++) {
            if (track === this.trackViews[i].track) {
                trackPanelRemoved = this.trackViews[i];
                break;
            }
        }

        if (trackPanelRemoved) {
            this.trackViews.splice(i, 1);
            this.trackContainerDiv.removeChild(trackPanelRemoved.trackDiv);
            this.fireEvent('trackremoved', [trackPanelRemoved.track]);
        }

    };

    /**
     *
     * @param property
     * @param value
     * @returns {Array}  tracks with given property value.  e.g. findTracks("type", "annotation")
     */
    igv.Browser.prototype.findTracks = function (property, value) {
        var tracks = [];
        this.trackViews.forEach(function (trackView) {
            if (value === trackView.track[property]) {
                tracks.push(trackView.track)
            }
        })
        return tracks;
    };

    igv.Browser.prototype.reduceTrackOrder = function (trackView) {

        var indices = [],
            raisable,
            raiseableOrder;

        if (1 === this.trackViews.length) {
            return;
        }

        this.trackViews.forEach(function (tv, i, tvs) {

            indices.push({trackView: tv, index: i});

            if (trackView === tv) {
                raisable = indices[i];
            }

        });

        if (0 === raisable.index) {
            return;
        }

        raiseableOrder = raisable.trackView.track.order;
        raisable.trackView.track.order = indices[raisable.index - 1].trackView.track.order;
        indices[raisable.index - 1].trackView.track.order = raiseableOrder;

        this.reorderTracks();

    };

    igv.Browser.prototype.increaseTrackOrder = function (trackView) {

        var j,
            indices = [],
            raisable,
            raiseableOrder;

        if (1 === this.trackViews.length) {
            return;
        }

        this.trackViews.forEach(function (tv, i, tvs) {

            indices.push({trackView: tv, index: i});

            if (trackView === tv) {
                raisable = indices[i];
            }

        });

        if ((this.trackViews.length - 1) === raisable.index) {
            return;
        }

        raiseableOrder = raisable.trackView.track.order;
        raisable.trackView.track.order = indices[1 + raisable.index].trackView.track.order;
        indices[1 + raisable.index].trackView.track.order = raiseableOrder;

        this.reorderTracks();

    };

    igv.Browser.prototype.setTrackHeight = function (newHeight) {

        this.trackHeight = newHeight;

        this.trackViews.forEach(function (trackView) {
            trackView.setTrackHeight(newHeight);
        });

    };

    igv.Browser.prototype.resize = function () {

        var viewport;

        if (true === resizeWillExceedChromosomeLength(this.trackViews)) {

            viewport = _.first((_.first(this.trackViews)).viewports);
            this.search(viewport.genomicState.chromosome.name);
        } else {

            _.each(_.union([this.ideoPanel, this.karyoPanel, this.centerGuide], this.trackViews), function (renderable) {
                if (renderable) {
                    renderable.resize();
                }
            });
        }

        function resizeWillExceedChromosomeLength(trackViews) {
            var result,
                trackView,
                viewport,
                pixel,
                bpp,
                bp;

            if (_.size(trackViews) > 0) {

                trackView = _.first(trackViews);
                if (_.size(trackView.viewports) > 0) {

                    viewport = _.first(trackView.viewports);
                    pixel = viewport.$viewport.width();
                    bpp = viewport.genomicState.referenceFrame.bpPerPixel;
                    bp = pixel * bpp;

                    result = (bp > viewport.genomicState.chromosome.bpLength);

                } else {
                    result = false;
                }

            } else {
                result = false;
            }

            // console.log('resize(' + igv.prettyBasePairNumber(bp) + ') will exceed chromosomeLength(' + igv.prettyBasePairNumber(viewport.genomicState.chromosome.bpLength) + ') ' + ((true === result) ? 'YES' : 'NO'));

            return result;
        }

    };

    igv.Browser.prototype.repaint = function () {

        _.each(_.union([this.ideoPanel, this.karyoPanel, this.centerGuide], this.trackViews), function (renderable) {
            if (renderable) {
                renderable.repaint();
            }
        });

    };

    igv.Browser.prototype.repaintWithGenomicState = function (genomicState) {

        var viewports;

        if (this.karyoPanel) {
            this.karyoPanel.repaint();
        }

        if (this.ideoPanel) {
            this.ideoPanel.repaintPanelWithGenomicState(genomicState);
        }

        viewports = [];
        this.trackViews.forEach(function (trackView) {
            var viewport;
            viewport = trackView.viewportWithGenomicState(genomicState);
            if (viewport) {
                viewports.push(viewport);
            }
        });

        viewports.forEach(function (viewport) {
            viewport.repaint();
        });

    };

    igv.Browser.prototype.update = function () {

        this.updateLocusSearchWidget(this.genomicStateList[0]);

        this.windowSizePanel.updateWithGenomicState(this.genomicStateList[0]);

        _.each([this.ideoPanel, this.karyoPanel, this.centerGuide], function (renderable) {
            if (renderable) {
                renderable.repaint();
            }
        });

        _.each(this.trackViews, function (trackView) {
            trackView.update();
        });

    };

    igv.Browser.prototype.updateWithGenomicState = function (genomicState) {

        var viewports;

        igv.browser.updateLocusSearchWidget(this.genomicStateList[ 0 ]);

        if (0 === genomicState) {
            this.windowSizePanel.updateWithGenomicState(genomicState);
        }

        if (this.ideoPanel) {
            this.ideoPanel.repaintPanelWithGenomicState(genomicState);
        }

        if (this.karyoPanel) {
            this.karyoPanel.repaint();
        }

        viewports = [];
        this.trackViews.forEach(function (trackView) {
            var viewport;
            viewport = trackView.viewportWithGenomicState(genomicState);
            if (viewport) {
                viewports.push(viewport);
            }
        });

        viewports.forEach(function (viewport) {
            viewport.update();
        });

        if (this.centerGuide) {
            this.centerGuide.repaint();
        }

    };

    igv.Browser.prototype.loadInProgress = function () {

        var anyTrackViewIsLoading;

        anyTrackViewIsLoading = false;
        _.each(this.trackViews, function (t) {
            if (false === anyTrackViewIsLoading) {
                anyTrackViewIsLoading = t.isLoading();
            }
        });

        return anyTrackViewIsLoading;
    };

    igv.Browser.prototype.updateLocusSearchWidget = function (genomicState) {

        var self = this,
            referenceFrame,
            ss,
            ee,
            str,
            end,
            chromosome;


        if (0 === this.genomicStateList.indexOf(genomicState) && 1 === this.genomicStateList.length) {

            if (genomicState.locusSearchString && 'all' === genomicState.locusSearchString.toLowerCase()) {

                this.$searchInput.val(genomicState.locusSearchString);
                this.chromosomeSelectWidget.$select.val('all');
            } else {

                referenceFrame = genomicState.referenceFrame;
                this.chromosomeSelectWidget.$select.val(referenceFrame.chrName);

                if (this.$searchInput) {

                    end = referenceFrame.start + referenceFrame.bpPerPixel * (self.viewportContainerWidth() / this.genomicStateList.length);

                    if (this.genome) {
                        chromosome = this.genome.getChromosome(referenceFrame.chrName);
                        if (chromosome) {
                            end = Math.min(end, chromosome.bpLength);
                        }
                    }

                    ss = igv.numberFormatter(Math.floor(referenceFrame.start + 1));
                    ee = igv.numberFormatter(Math.floor(end));
                    str = referenceFrame.chrName + ":" + ss + "-" + ee;
                    this.$searchInput.val(str);
                }

                this.fireEvent('locuschange', [referenceFrame, str]);
            }

        } else {
            this.$searchInput.val('');
        }

    };

    igv.Browser.prototype.syntheticViewportContainerBBox = function () {

        var $trackContainer = $(this.trackContainerDiv),
            $track = $('<div class="igv-track-div">'),
            $viewportContainer = $('<div class="igv-viewport-container igv-viewport-container-shim">'),
            rect = {},
            trackContainerWidth,
            trackWidth;

        $trackContainer.append($track);
        $track.append($viewportContainer);

        rect =
            {
                position: $viewportContainer.position(),
                width: $viewportContainer.width(),
                height: $viewportContainer.height()
            };

        // rect.position = $viewportContainer.position();
        // rect.width = $viewportContainer.width();
        // rect.height = $viewportContainer.height();

        $track.remove();

        return rect;
    };

    igv.Browser.prototype.syntheticViewportContainerWidth = function () {
        return this.syntheticViewportContainerBBox().width;
    };

    /**
     * Return the visible width of a track.  All tracks should have the same width.
     */
    igv.Browser.prototype.viewportContainerWidth = function () {
        return (this.trackViews && this.trackViews.length > 0) ? this.trackViews[0].$viewportContainer.width() : this.syntheticViewportContainerWidth();
    };

    igv.Browser.prototype.viewportWidth = function () {
        var cw,
            vw;

        cw = this.viewportContainerWidth();
        vw = (undefined === this.genomicStateList || 1 === this.genomicStateList.length) ? cw : Math.round(cw/this.genomicStateList.length);

        return vw;
    };

    igv.Browser.prototype.minimumBasesExtent = function () {
        return this.config.minimumBases;
    };

    igv.Browser.prototype.goto = function (chrName, start, end) {

        var genomicState,
            viewportWidth,
            referenceFrame,
            width,
            maxBpPerPixel;

        if (igv.popover) {
            igv.popover.hide();
        }

        // Translate chr to official name
        if (undefined === this.genome) {
            console.log('Missing genome - bailing ...');
            return;
        }

        genomicState = this.genomicStateList[ 0 ];
        genomicState.chromosome = this.genome.getChromosome(chrName);
        viewportWidth = igv.browser.viewportContainerWidth() / this.genomicStateList.length;

        referenceFrame = genomicState.referenceFrame;
        referenceFrame.chrName = genomicState.chromosome.name;

        // If end is undefined,  interpret start as the new center, otherwise compute scale.
        if (undefined === end) {
            width = Math.round(viewportWidth * referenceFrame.bpPerPixel / 2);
            start = Math.max(0, start - width);
        } else {
            referenceFrame.bpPerPixel = (end - start) / viewportWidth;
        }

        if (!genomicState.chromosome) {

            if (console && console.log) {
                console.log("Could not find chromsome " + referenceFrame.chrName);
            }
        } else {

            if (!genomicState.chromosome.bpLength) {
                genomicState.chromosome.bpLength = 1;
            }

            maxBpPerPixel = genomicState.chromosome.bpLength / viewportWidth;
            if (referenceFrame.bpPerPixel > maxBpPerPixel) {
                referenceFrame.bpPerPixel = maxBpPerPixel;
            }

            if (undefined === end) {
                end = start + viewportWidth * referenceFrame.bpPerPixel;
            }

            if (genomicState.chromosome && end > genomicState.chromosome.bpLength) {
                start -= (end - genomicState.chromosome.bpLength);
            }
        }

        referenceFrame.start = start;

        this.update();

    };

    // Zoom in by a factor of 2, keeping the same center location
    igv.Browser.prototype.zoomIn = function () {

        var self = this;

        if (this.loadInProgress()) {
            return;
        }

        _.each(_.range(_.size(this.genomicStateList)), function (locusIndex) {
            zoomInWithLocusIndex(self, locusIndex);
        });

        function zoomInWithLocusIndex(browser, locusIndex) {

            var genomicState = browser.genomicStateList[locusIndex],
                referenceFrame = genomicState.referenceFrame,
                viewportWidth = Math.floor(browser.viewportContainerWidth() / browser.genomicStateList.length),
                centerBP,
                mbe,
                be;

            // Have we reached the zoom-in threshold yet? If so, bail.
            mbe = browser.minimumBasesExtent();
            be = basesExtent(viewportWidth, referenceFrame.bpPerPixel / 2.0);
            if (mbe > be) {
                return;
            }

            // window center (base-pair units)
            centerBP = referenceFrame.start + referenceFrame.bpPerPixel * (viewportWidth / 2);

            // derive scaled (zoomed in) start location (base-pair units) by multiplying half-width by halve'd bases-per-pixel
            // which results in base-pair units
            referenceFrame.start = centerBP - (viewportWidth / 2) * (referenceFrame.bpPerPixel / 2.0);

            // halve the bases-per-pixel
            referenceFrame.bpPerPixel /= 2.0;

            browser.updateWithGenomicState(genomicState);

            function basesExtent(width, bpp) {
                return Math.floor(width * bpp);
            }

        }
    };

    // Zoom out by a factor of 2, keeping the same center location if possible
    igv.Browser.prototype.zoomOut = function () {

        var self = this;

        if (this.loadInProgress()) {
            return;
        }

        _.each(_.range(_.size(this.genomicStateList)), function (locusIndex) {
            zoomOutWithLocusIndex(self, locusIndex);
        });

        function zoomOutWithLocusIndex(browser, locusIndex) {

            var genomicState = browser.genomicStateList[locusIndex],
                referenceFrame = genomicState.referenceFrame,
                viewportWidth = Math.floor(browser.viewportContainerWidth() / browser.genomicStateList.length),
                chromosome,
                newScale,
                maxScale,
                centerBP,
                chromosomeLengthBP,
                widthBP;

            newScale = referenceFrame.bpPerPixel * 2;
            chromosomeLengthBP = 250000000;
            if (browser.genome) {
                chromosome = browser.genome.getChromosome(referenceFrame.chrName);
                if (chromosome) {
                    chromosomeLengthBP = chromosome.bpLength;
                }
            }
            maxScale = chromosomeLengthBP / viewportWidth;
            if (newScale > maxScale) {
                newScale = maxScale;
            }

            centerBP = referenceFrame.start + referenceFrame.bpPerPixel * viewportWidth / 2;
            widthBP = newScale * viewportWidth;

            referenceFrame.start = Math.round(centerBP - widthBP / 2);

            if (referenceFrame.start < 0) {
                referenceFrame.start = 0;
            } else if (referenceFrame.start > chromosomeLengthBP - widthBP) {
                referenceFrame.start = chromosomeLengthBP - widthBP;
            }

            referenceFrame.bpPerPixel = newScale;

            browser.updateWithGenomicState(genomicState);

        }
    };

    igv.Browser.prototype.selectMultiLocusPanelWithGenomicState = function (selectedGenomicState) {
        var self = this,
            removable;

        removable = this.genomicStateList.filter(function (gs) {
            return selectedGenomicState !== gs;
        });

        removable.forEach(function (gs) {
            self.removeMultiLocusPanelWithGenomicState(gs, false);
        });

        this.resize();

    };

    igv.Browser.prototype.removeMultiLocusPanelWithGenomicState = function (genomicState, doResize) {
        var self = this,
            index,
            viewportContainerWidth,
            previousGenomicStateListLength;

        index = this.genomicStateList.indexOf(genomicState);

        if (this.ideoPanel) {
            this.ideoPanel.removePanelWithLocusIndex(index);
        }

        this.trackViews.forEach(function (trackView) {
            trackView.removeViewportWithLocusIndex(index);
        });

        viewportContainerWidth = this.viewportContainerWidth();
        previousGenomicStateListLength = this.genomicStateList.length;

        this.genomicStateList.splice(index, 1);

        this.genomicStateList.forEach(function (gs, i) {
            var bpp,
                ee;

            // ss = gs.referenceFrame.start;
            // ee = ss + gs.referenceFrame.bpPerPixel * (viewportContainerWidth / previousGenomicStateListLength);
            // bpp = (ee - ss) / (viewportContainerWidth / self.genomicStateList.length);

            ee = gs.referenceFrame.calculateEnd(viewportContainerWidth / previousGenomicStateListLength);
            bpp = gs.referenceFrame.calculateBPP(ee, viewportContainerWidth / self.genomicStateList.length);

            self.genomicStateList[ i ].referenceFrame = new igv.ReferenceFrame(gs.chromosome.name, gs.referenceFrame.start, bpp);
        });

        this.trackViews.forEach(function (trackView) {
            trackView.viewports.forEach(function (viewport) {
                viewport.setWidth(self.viewportContainerWidth() / self.genomicStateList.length);
            });
        });

        if (true === doResize) {
            this.resize();
        }

    };

    igv.Browser.prototype.addMultiLocusPanelWithGenomicStateAtIndex = function (genomicState, index, viewportWidth) {

        var self = this;

        if (this.ideoPanel) {
            this.ideoPanel.setWidth(viewportWidth, false);
        }

        this.trackViews.forEach(function (trackView) {
            trackView.viewports.forEach(function (viewport) {
                viewport.setWidth(viewportWidth);
            });
        });

        if (1 === this.genomicStateList.length) {

            this.genomicStateList.push(genomicState);

            if (this.ideoPanel) {
                this.ideoPanel.addPanelWithGenomicStateAtIndex(genomicState, index);
            }

            this.trackViews.forEach(function (trackView) {

                var viewport;
                viewport = new igv.Viewport(trackView, trackView.$viewportContainer, genomicState);
                trackView.viewports.push(viewport);

                trackView.decorateViewports();

                trackView.configureViewportContainer(trackView.$viewportContainer, trackView.viewports);
            });

        } else {

            this.genomicStateList.splice(index, 0, genomicState);

            if (this.ideoPanel) {
                this.ideoPanel.addPanelWithGenomicStateAtIndex(genomicState, index);
            }

            this.trackViews.forEach(function (trackView) {

                var viewport,
                $detached;

                viewport = new igv.Viewport(trackView, trackView.$viewportContainer, genomicState);
                trackView.viewports.splice(index, 0, viewport);

                // The viewport constructor always appends. Reorder here.
                $detached = viewport.$viewport.detach();
                $detached.insertAfter(trackView.viewports[ index - 1 ].$viewport);

                trackView.decorateViewports();

                trackView.configureViewportContainer(trackView.$viewportContainer, trackView.viewports);
            });

        }

        // this.update();
        this.resize();
        // this.repaint();
    };

    igv.Browser.prototype.emptyViewportContainers = function () {

        $('.igv-scrollbar-outer-div').remove();
        $('.igv-viewport-div').remove();
        $('.igv-ruler-sweeper-div').remove();

        $('#igv-content-header').empty();

        this.trackViews.forEach(function (trackView) {

            if (trackView.track instanceof igv.RulerTrack) {
                trackView.track.rulerSweepers = [];
            }

            trackView.viewports = [];
            trackView.scrollbar = undefined;

        });

    };

    igv.Browser.prototype.buildViewportsWithGenomicStateList = function (genomicStateList) {

        this.trackViews.forEach(function (trackView) {

            genomicStateList.forEach(function (genomicState, i) {

                var viewport ;
                viewport = new igv.Viewport(trackView, trackView.$viewportContainer, genomicState);
                trackView.viewports.push(viewport);

            });

            trackView.decorateViewports();

            trackView.configureViewportContainer(trackView.$viewportContainer, trackView.viewports);
        });

    };

    igv.Browser.prototype.search = function (string) {

        var self = this,
            loci;

        loci = string.split(' ');

        this.getGenomicStateList(loci, this.viewportContainerWidth())

            .then(function (genomicStateList) {
                var width;

                if (genomicStateList.length > 0) {

                    if (self.ideoPanel) {
                        self.ideoPanel.discardPanels();
                    }

                    self.emptyViewportContainers();

                    width = self.viewportContainerWidth();

                    self.genomicStateList = genomicStateList.map(function (gs) {
                        var obj;

                        gs.referenceFrame = new igv.ReferenceFrame(gs.chromosome.name, gs.start, (gs.end - gs.start) / (width / genomicStateList.length));
                        obj = _.omit(gs, 'start', 'end');
                        return gs;
                    });

                    self.toggleCenterGuide(self.genomicStateList);
                    self.toggleCursorGuide(self.genomicStateList);

                    if (self.ideoPanel) {
                        self.ideoPanel.buildPanels($('#igv-content-header'));
                    }

                    self.buildViewportsWithGenomicStateList(genomicStateList);

                    return genomicStateList

                } else {
                    throw new Error('Unrecognized locus ' + string);
                }

            })
            .then(function (genomicStateList) {
                self.update();
            })
            .catch(function (error) {
                igv.presentAlert(error);
            });
    };

    igv.Browser.prototype.zoomWidgetLayout = function () {
        var found;

        found = _.filter(this.genomicStateList, function (g) {
            return 'all' === g.locusSearchString.toLowerCase();
        });

        if (_.size(found) > 0) {
            this.disableZoomWidget();
        } else {
            this.enableZoomWidget();
        }

    };

    /**
     * getGenomicStateList takes loci (gene name or name:start:end) and maps them into a list of genomicStates.
     * A genomicState is fundamentally a referenceFrame. Plus some panel managment state.
     * Each mult-locus panel refers to a genomicState.
     *
     * @param loci - array of locus strings (e.g. chr1:1-100,  egfr)
     * @param viewportContainerWidth
     */
    igv.Browser.prototype.getGenomicStateList = function (loci, viewportContainerWidth) {

        var self = this,
            searchConfig = igv.browser.searchConfig,
            geneNameLoci,
            genomicState,
            locusGenomicStates = [],
            promises;

        geneNameLoci = [];

        // Try locus string first  (e.g.  chr1:100-200)
        loci.forEach(function (locus) {
            genomicState = isLocusChrNameStartEnd(locus, self.genome);
            if (genomicState) {
                genomicState.locusSearchString = locus;
                locusGenomicStates.push(genomicState);
            }
            else {
                geneNameLoci.push(locus);
            }
        });

        if (geneNameLoci.length === 0)
            return Promise.resolve(locusGenomicStates);

        else {
            // Search based on feature symbol

            // Try local feature cache first.  This is created from feature tracks tagged "searchable"
            promises = [];
            geneNameLoci.forEach(function (locus) {
                var result,
                    genomicState;

                result = self.featureDB[locus.toLowerCase()];
                if (result) {
                    genomicState = processSearchResult(result, locus);
                    if (genomicState) {
                        locusGenomicStates.push(genomicState);
                    }
                } else {
                    promises.push(searchPromise(locus));  // Not found, create promise to search via webservice
                }
            });

            // Finally try search webservice
            if (promises.length > 0) {

                return Promise
                    .all(promises)

                    .then(function (searchResponses) {

                        searchResponses.forEach(function (response) {
                            var genomicState = processSearchResult(response.result, response.locusSearchString);
                            if (genomicState) {
                                locusGenomicStates.push(genomicState);
                            }
                        });

                        return locusGenomicStates;
                    });
            }
        }

        /* End of function  */

        function searchPromise(locus) {

            var path = searchConfig.url.replace("$FEATURE$", locus);

            if (path.indexOf("$GENOME$") > -1) {
                path = path.replace("$GENOME$", (self.genome.id ? self.genome.id : "hg19"));
            }

            return igv.xhr.loadString(path)
                .then(function (result) {
                    return {
                        result: result,
                        locusSearchString: locus
                    }
                });

        }

        function processSearchResult(searchServiceResponse, locusSearchString) {

            var results,
                result,
                chr,
                start,
                end,
                geneNameLocusObject;

            if ('plain' === searchConfig.type) {
                results = parseSearchResults(searchServiceResponse);
            } else {
                results = JSON.parse(searchServiceResponse);
            }

            if (searchConfig.resultsField) {
                results = results[searchConfig.resultsField];
            }

            if (!results || 0 === results.length) {
                return undefined;
            } else {

                // Ingoring all but first result for now
                // TODO -- present all and let user select if results.length > 1
                result = results[0];

                //
                if (!(result.hasOwnProperty(searchConfig.chromosomeField) && (result.hasOwnProperty(searchConfig.startField)))) {
                    console.log("Search service results must includ chromosome and start fields: " + result);
                    return undefined;
                }

                chr = result[searchConfig.chromosomeField];
                start = result[searchConfig.startField] - searchConfig.coords;
                end = result[searchConfig.endField];

                if (undefined === end) {
                    end = start + 1;
                }

                if (igv.browser.flanking) {
                    start = Math.max(0, start - igv.browser.flanking);
                    end += igv.browser.flanking;
                }

                geneNameLocusObject = Object.assign({}, result);

                geneNameLocusObject.chromosome = self.genome.getChromosome(chr);
                geneNameLocusObject.start = start;
                geneNameLocusObject.end = end;
                geneNameLocusObject.locusSearchString = locusSearchString;

                geneNameLocusObject.selection = new igv.GtexSelection(result[searchConfig.geneField], result[searchConfig.snpField]);


                // geneName = result.geneSymbol || result.gene;
                // geneNameLocusObject.locusSearchString = ('gtex' === geneNameLocusObject.type || 'snp' === geneNameLocusObject.type) ? result.snpId : geneName;
                //
                // obj = ('gtex' === geneNameLocusObject.type || 'snp' === geneNameLocusObject.type) ? {snp: result.snpId} : {gene: geneName};
                // geneNameLocusObject.selection = new igv.GtexSelection(obj);

                return geneNameLocusObject;


            }

        }

        function isLocusChrNameStartEnd(locus, genome) {

            var a,
                b,
                numeric,
                chr,
                chromosome,
                locusObject;

            locusObject = {};
            a = locus.split(':');

            chr = a[0];
            chromosome = genome.getChromosome(chr);  // Map chr to official name from (possible) alias
            if (!chromosome) {
                return false;          // Unknown chromosome
            }
            locusObject.chromosome = chromosome;     // Map chr to offical name from possible alias
            locusObject.start = 0;
            locusObject.end = chromosome.bpLength;

            // if just a chromosome name we are done
            if (1 === a.length) {
                return locusObject;
            } else {

                b = _.last(a).split('-');

                if (b.length > 2) {
                    return false;                 // Not a locus string
                } else {

                    locusObject.start = locusObject.end = undefined;

                    numeric = b[0].replace(/\,/g, '');
                    if (isNaN(numeric)) {
                        return false;
                    }

                    locusObject.start = parseInt(numeric, 10) - 1;

                    if (2 === b.length) {

                        numeric = b[1].replace(/\,/g, '');
                        if (isNaN(numeric)) {
                            return false;
                        }

                        locusObject.end = parseInt(numeric, 10);
                    }

                }

                igv.Browser.validateLocusExtent(locusObject.chromosome, locusObject);

                return locusObject;

            }

        }

    };

    igv.Browser.validateLocusExtent = function (chromosome, extent) {

        var ss = extent.start,
            ee = extent.end,
            center;

        if (undefined === ee) {

            ss -= igv.browser.minimumBasesExtent() / 2;
            ee = ss + igv.browser.minimumBasesExtent();

            if (ee > chromosome.bpLength) {
                ee = chromosome.bpLength;
                ss = ee - igv.browser.minimumBasesExtent();
            } else if (ss < 0) {
                ss = 0;
                ee = igv.browser.minimumBasesExtent();
            }

        } else if (ee - ss < igv.browser.minimumBasesExtent()) {

            center = (ee + ss) / 2;
            if (center - igv.browser.minimumBasesExtent() / 2 < 0) {
                ss = 0;
                ee = ss + igv.browser.minimumBasesExtent();
            } else if (center + igv.browser.minimumBasesExtent() / 2 > chromosome.bpLength) {
                ee = chromosome.bpLength;
                ss = ee - igv.browser.minimumBasesExtent();
            } else {
                ss = center - igv.browser.minimumBasesExtent() / 2;
                ee = ss + igv.browser.minimumBasesExtent();
            }
        }

        extent.start = Math.ceil(ss);
        extent.end = Math.floor(ee);
    };

    /**
     * Parse the igv line-oriented (non json) search results.
     * Example
     *    EGFR    chr7:55,086,724-55,275,031    refseq
     *
     * @param data
     */
    function parseSearchResults(data) {

        var lines,
            linesTrimmed = [],
            results = [];

        lines = data.splitLines();

        lines.forEach(function (item) {
            if ("" === item) {
                // do nothing
            } else {
                linesTrimmed.push(item);
            }
        });

        linesTrimmed.forEach(function (line) {

            var tokens = line.split("\t"),
                source,
                locusTokens,
                rangeTokens,
                obj;

            if (tokens.length >= 3) {

                locusTokens = tokens[1].split(":");
                rangeTokens = locusTokens[1].split("-");
                source = tokens[2].trim();

                obj =
                    {
                        gene: tokens[0],
                        chromosome: igv.browser.genome.getChromosomeName(locusTokens[0].trim()),
                        start: parseInt(rangeTokens[0].replace(/,/g, '')),
                        end: parseInt(rangeTokens[1].replace(/,/g, '')),
                        type: ("gtex" === source ? "snp" : "gene")
                    };

                results.push(obj);

            }

        });

        return results;

    }

    igv.Browser.prototype.loadSampleInformation = function (url) {
        var name = url;
        if (url instanceof File) {
            name = url.name;
        }
        var ext = name.substr(name.lastIndexOf('.') + 1);
        if (ext === 'fam') {
            igv.sampleInformation.loadPlinkFile(url);
        }
    };

    // EVENTS 

    igv.Browser.prototype.on = function (eventName, fn) {
        if (!this.eventHandlers[eventName]) {
            this.eventHandlers[eventName] = [];
        }
        this.eventHandlers[eventName].push(fn);
    };

    igv.Browser.prototype.un = function (eventName, fn) {
        if (!this.eventHandlers[eventName]) {
            return;
        }

        var callbackIndex = this.eventHandlers[eventName].indexOf(fn);
        if (callbackIndex !== -1) {
            this.eventHandlers[eventName].splice(callbackIndex, 1);
        }
    };

    igv.Browser.prototype.fireEvent = function (eventName, args, thisObj) {
        var scope,
            results,
            eventHandler = this.eventHandlers[eventName];

        if (undefined === eventHandler || eventHandler.length === 0) {
            return undefined;
        }

        scope = thisObj || window;
        results = eventHandler.map(function (event) {
            return event.apply(scope, args);
        });

        return results[0];

    };

    return igv;
})
(igv || {});


