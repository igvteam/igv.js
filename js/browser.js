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

        attachTrackContainerMouseHandlers(this.trackContainerDiv);

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

        window.onresize = igv.throttle(function () {
            igv.browser.resize();
        }, 10);

        $(document).mousedown(function (e) {
            igv.browser.isMouseDown = true;
        });

        $(document).mouseup(function (e) {

            igv.browser.isMouseDown = undefined;

            if (igv.browser.dragTrackView) {
                igv.browser.dragTrackView.$trackDragScrim.hide();
            }

            igv.browser.dragTrackView = undefined;

        });

        $(document).click(function (e) {
            var target = e.target;
            if (!igv.browser.$root.get(0).contains(target)) {
                // We've clicked outside the IGV div.  Close any open popovers.
                igv.popover.hide();
            }
        });



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
                url: "https://portals.broadinstitute.org/webservices/igv/locus?genome=" + genomeId + "&name=$FEATURE$",
                coords: 0,
                chromosomeField: "chromosome",
                startField: "start",
                endField: "end"

            }
        }
    }

    igv.Browser.hasKnownFileExtension = function (config) {
        var extension = igv.Browser.getExtension(config);

        if (undefined === extension) {
            return false;
        }
        return igv.Browser.knownFileExtensions.has(extension);
    };

    igv.Browser.getExtension = function (config) {
        var path,
            filename,
            index;

        if (undefined === config.url) {
            return undefined;
        }

        path = igv.isFilePath(config.url) ? config.url.name : config.url;
        filename = path.toLowerCase();

        //Strip parameters -- handle local files later
        index = filename.indexOf("?");
        if (index > 0) {
            filename = filename.substr(0, index);
        }

        //Strip aux extensions .gz, .tab, and .txt
        if (filename.endsWith(".gz")) {
            filename = filename.substr(0, filename.length - 3);
        } else if (filename.endsWith(".txt") || filename.endsWith(".tab")) {
            filename = filename.substr(0, filename.length - 4);
        }

        index = filename.lastIndexOf(".");

        return index < 0 ? filename : filename.substr(1 + index);
    };

    igv.Browser.prototype.disableZoomWidget = function () {

        this.$zoomContainer.find('.fa-minus-circle').off();
        this.$zoomContainer.find('.fa-plus-circle' ).off();

    };

    igv.Browser.prototype.enableZoomWidget = function (zoomHandlers) {

        this.$zoomContainer.find('.fa-minus-circle').on(zoomHandlers.out);
        this.$zoomContainer.find('.fa-plus-circle' ).on(zoomHandlers.in);

    };

    igv.Browser.prototype.toggleCursorGuide = function (genomicStateList) {

        if (_.size(genomicStateList) > 1 || 'all' === (_.first(genomicStateList)).locusSearchString) {

            if(this.$cursorTrackingGuide.is(":visible")) {
                this.$cursorTrackingGuideToggle.click();
            }

            this.$cursorTrackingGuideToggle.hide();

        } else {
            this.$cursorTrackingGuideToggle.show();
        }
    };

    igv.Browser.prototype.toggleCenterGuide = function (genomicStateList) {

        if (_.size(genomicStateList) > 1 || 'all' === (_.first(genomicStateList)).locusSearchString) {

            if(this.centerGuide.$container.is(":visible")) {
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

        _.each(configList, function (config) {
            var track = self.loadTrack(config);
            if (track) {
                loadedTracks.push( track );
            }
        });

        // Really we should just resize the new trackViews, but currently there is no way to get a handle on those
        _.each(this.trackViews, function (trackView) {
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

        newTrack = igv.createTrackWithConfiguration(config);

        if (undefined === newTrack) {
            igv.presentAlert("Unknown file type: " + config.url);
            return newTrack;
        }

        // Set order field of track here.  Otherwise track order might get shuffled during asynchronous load
        if (undefined === newTrack.order) {
            newTrack.order = this.trackViews.length;
        }

        // If defined, attempt to load the file header before adding the track.  This will catch some errors early
        if (typeof newTrack.getFileHeader === "function") {
            newTrack.getFileHeader().then(function (header) {
                self.addTrack(newTrack);
            }).catch(function (error) {
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

        trackView = new igv.TrackView(track, this);
        this.trackViews.push(trackView);
        this.reorderTracks();
        trackView.resize();
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

        // console.log('browser.resize begin');

        _.each(_.union([this.ideoPanel, this.karyoPanel, this.centerGuide], this.trackViews), function(renderable){
            if (renderable) {
                renderable.resize();
            }
        });

    };

    igv.Browser.prototype.repaint = function () {

        _.each(_.union([this.ideoPanel, this.karyoPanel, this.centerGuide], this.trackViews), function(renderable){
            if (renderable) {
                renderable.repaint();
            }
        });

    };

    igv.Browser.prototype.repaintWithLocusIndex = function (locusIndex) {

        if (this.karyoPanel) {
            this.karyoPanel.repaint();
        }

        if (this.ideoPanel) {
            igv.IdeoPanel.repaintPanel( this.ideoPanel.panelWithLocusIndex(locusIndex) );
        }

        _.each(igv.Viewport.viewportsWithLocusIndex(locusIndex), function (viewport) {
            viewport.repaint();
        });

    };

    igv.Browser.prototype.update = function () {

        this.updateLocusSearchWithGenomicState(_.first(this.genomicStateList));

        this.windowSizePanel.updateWithGenomicState(_.first(this.genomicStateList));

        _.each([this.ideoPanel, this.karyoPanel, this.centerGuide], function(renderable){
            if (renderable) {
                renderable.repaint();
            }
        });

        _.each(this.trackViews, function(trackView){
            trackView.update();
        });

    };

    igv.Browser.prototype.updateWithLocusIndex = function (locusIndex) {

        igv.browser.updateLocusSearchWithGenomicState(_.first(this.genomicStateList));

        if (0 === locusIndex) {
            this.windowSizePanel.updateWithGenomicState(this.genomicStateList[ locusIndex ]);
        }

        if (this.ideoPanel) {
            igv.IdeoPanel.repaintPanel( this.ideoPanel.panelWithLocusIndex(locusIndex) );
        }

        if (this.karyoPanel) {
            this.karyoPanel.repaint();
        }

        _.each(igv.Viewport.viewportsWithLocusIndex(locusIndex), function (viewport) {
            viewport.update();
        });

        if (this.centerGuide) {
            this.centerGuide.repaint();
        }

    };

    igv.Browser.prototype.loadInProgress = function () {

        var anyTrackViewIsLoading;

        anyTrackViewIsLoading = false;
        _.each(this.trackViews, function(t) {
            if (false === anyTrackViewIsLoading) {
                anyTrackViewIsLoading = t.isLoading();
            }
        });

        return anyTrackViewIsLoading;
    };

    igv.Browser.prototype.updateLocusSearchWithGenomicState = function (genomicState) {

        var self = this,
            referenceFrame,
            ss,
            ee,
            str,
            end,
            chromosome;

        if (0 === genomicState.locusIndex && 1 === genomicState.locusCount) {

            if ('all' === genomicState.locusSearchString) {

                this.$searchInput.val(genomicState.locusSearchString);
            } else {

                referenceFrame = genomicState.referenceFrame;

                if (this.$searchInput) {

                    end = referenceFrame.start + referenceFrame.bpPerPixel * (self.viewportContainerWidth()/genomicState.locusCount);

                    if (this.genome) {
                        chromosome = this.genome.getChromosome( referenceFrame.chrName );
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
        return (this.trackViews && this.trackViews.length > 0) ? this.trackViews[ 0 ].$viewportContainer.width() : this.syntheticViewportContainerWidth();
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

        genomicState = _.first(this.genomicStateList);
        genomicState.chromosome = this.genome.getChromosome(chrName);
        viewportWidth = igv.browser.viewportContainerWidth()/genomicState.locusCount;

        referenceFrame = genomicState.referenceFrame;
        referenceFrame.chrName = genomicState.chromosome.name;

        // If end is undefined,  interpret start as the new center, otherwise compute scale.
        if (undefined === end) {
            width = Math.round(viewportWidth * referenceFrame.bpPerPixel / 2);
            start = Math.max(0, start - width);
        } else {
            referenceFrame.bpPerPixel = (end - start)/viewportWidth;
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

        _.each(_.range(_.size(this.genomicStateList)), function(locusIndex){
            zoomInWithLocusIndex(self, locusIndex);
        });

        function zoomInWithLocusIndex(browser, locusIndex) {

            var genomicState = browser.genomicStateList[ locusIndex ],
                referenceFrame = genomicState.referenceFrame,
                viewportWidth = Math.floor(browser.viewportContainerWidth()/genomicState.locusCount),
                centerBP,
                mbe,
                be;

            // Have we reached the zoom-in threshold yet? If so, bail.
            mbe = browser.minimumBasesExtent();
            be = basesExtent(viewportWidth, referenceFrame.bpPerPixel/2.0);
            if (mbe > be) {
                return;
            }

            // window center (base-pair units)
            centerBP = referenceFrame.start + referenceFrame.bpPerPixel * (viewportWidth/2);

            // derive scaled (zoomed in) start location (base-pair units) by multiplying half-width by halve'd bases-per-pixel
            // which results in base-pair units
            referenceFrame.start = centerBP - (viewportWidth/2) * (referenceFrame.bpPerPixel/2.0);

            // halve the bases-per-pixel
            referenceFrame.bpPerPixel /= 2.0;

            browser.updateWithLocusIndex( locusIndex );

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

        _.each(_.range(_.size(this.genomicStateList)), function(locusIndex){
            zoomOutWithLocusIndex(self, locusIndex);
        });

        function zoomOutWithLocusIndex(browser, locusIndex) {

            var genomicState = igv.browser.genomicStateList[ locusIndex ],
                referenceFrame = genomicState.referenceFrame,
                viewportWidth = Math.floor( browser.viewportContainerWidth()/genomicState.locusCount ),
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

            centerBP = referenceFrame.start + referenceFrame.bpPerPixel * viewportWidth/2;
            widthBP = newScale * viewportWidth;

            referenceFrame.start = Math.round(centerBP - widthBP/2);

            if (referenceFrame.start < 0) {
                referenceFrame.start = 0;
            } else if (referenceFrame.start > chromosomeLengthBP - widthBP) {
                referenceFrame.start = chromosomeLengthBP - widthBP;
            }

            referenceFrame.bpPerPixel = newScale;

            browser.updateWithLocusIndex( locusIndex );

        }
    };

    igv.Browser.prototype.selectMultiLocusPanelWithGenomicState = function(genomicState) {

        this.multiLocusPanelLayoutWithTruthFunction(function (candidate) {
            return _.isEqual(candidate, genomicState);
        });

    };

    igv.Browser.prototype.closeMultiLocusPanelWithGenomicState = function(genomicState) {

        this.multiLocusPanelLayoutWithTruthFunction(function (candidate) {
            return !_.isEqual(candidate, genomicState);
        });

    };

    igv.Browser.prototype.multiLocusPanelLayoutWithTruthFunction = function (filterFunction) {

        var self = this,
            $content_header = $('#igv-content-header'),
            filtered;

        if (true === this.config.showIdeogram) {
            igv.IdeoPanel.$empty($content_header);
        }

        this.emptyViewportContainers($('.igv-track-container-div'));

        filtered = _.filter(_.clone(this.genomicStateList), function(gs) {
            return filterFunction(gs);
        });

        this.genomicStateList = _.map(filtered, function(f, i, list){
            f.locusIndex = i;
            f.locusCount = _.size(list);
            f.referenceFrame.bpPerPixel = (f.end - f.start) / (self.viewportContainerWidth()/f.locusCount);
            return f;
        });

        if (true === this.config.showIdeogram) {
            this.ideoPanel.buildPanels($content_header);
        }

        this.buildViewportsWithGenomicStateList(this.genomicStateList);

        this.toggleCenterGuide(this.genomicStateList);
        this.toggleCursorGuide(this.genomicStateList);

        this.resize();

    };

    igv.Browser.prototype.emptyViewportContainers = function ($trackContainer) {
        var $e;

        $e = $trackContainer.find('.igv-scrollbar-outer-div');
        $e.remove();

        $e = $trackContainer.find('.igv-viewport-div');
        $e.remove();

        _.each(this.trackViews, function(trackView){
            trackView.viewports = [];
            trackView.scrollbar = undefined;
        });
    };

    igv.Browser.prototype.buildViewportsWithGenomicStateList = function (genomicStateList) {

        _.each(this.trackViews, function(trackView){

            _.each(_.range(_.size(genomicStateList)), function(i) {
                trackView.viewports.push(new igv.Viewport(trackView, i));
                trackView.configureViewportContainer(trackView.$viewportContainer, trackView.viewports);
            });

        });

    };

    igv.Browser.prototype.parseSearchInput = function(string) {

        var self = this,
            loci = string.split(' ');

        this.getGenomicStateList(loci, this.viewportContainerWidth(), function (genomicStateList) {

            var errorString,
                $content_header = $('#igv-content-header');

            if (_.size(genomicStateList) > 0) {

                _.each(genomicStateList, function (genomicState, index) {

                    genomicState.locusIndex = index;
                    genomicState.locusCount = _.size(genomicStateList);

                    genomicState.referenceFrame = new igv.ReferenceFrame(genomicState.chromosome.name, genomicState.start, (genomicState.end - genomicState.start) / (self.viewportContainerWidth()/genomicState.locusCount));
                    genomicState.initialReferenceFrame = JSON.parse(JSON.stringify(genomicState.referenceFrame));
                });

                self.genomicStateList = genomicStateList;

                self.emptyViewportContainers($('.igv-track-container-div'));

                // return;

                self.updateLocusSearchWithGenomicState(_.first(self.genomicStateList));

                if (1 === _.size(self.genomicStateList) && 'all' === (_.first(self.genomicStateList)).locusSearchString) {
                    self.disableZoomWidget();
                } else {
                    self.enableZoomWidget(self.zoomHandlers);
                }

                self.toggleCenterGuide(self.genomicStateList);
                self.toggleCursorGuide(self.genomicStateList);

                if (true === self.config.showIdeogram) {
                    igv.IdeoPanel.$empty($content_header);
                    self.ideoPanel.buildPanels($content_header);
                }

                self.buildViewportsWithGenomicStateList(genomicStateList);

                self.update();
            } else {
                errorString = 'Unrecognized locus ' + string;
                igv.presentAlert(errorString);
            }

        });
    };

    /**
     * getGenomicStateList takes loci (gene name or name:start:end) and maps them into a list of genomicStates.
     * A genomicState is fundamentally a referenceFrame. Plus some panel managment state.
     * Each mult-locus panel refers to a genomicState.
     *
     * @param loci - array of locus strings (e.g. chr1:1-100,  egfr)
     * @param viewportContainerWidth - viewport width in pixels
     * @param continuation - callback to received the list of genomic states
     */
    igv.Browser.prototype.getGenomicStateList = function (loci, viewportContainerWidth, continuation) {

        var self = this,
            searchConfig = igv.browser.searchConfig,
            chrStartEndLoci,
            geneNameLoci,
            locusGenomicState,
            locusGenomicStates = [],
            featureDBGenomicStates,
            survivors,
            geneNameLookup;

        chrStartEndLoci = [];

        _.each(loci, function(locus) {

            locusGenomicState = {};
            if (igv.Browser.isLocusChrNameStartEnd(locus, self.genome, locusGenomicState)) {
                locusGenomicState.selection = undefined;
                locusGenomicState.locusSearchString = locus;
                locusGenomicStates.push(locusGenomicState);

                // accumulate successfully parsed loci
                chrStartEndLoci.push(locus);
            }
        });

        // isolate gene name loci
        geneNameLoci = _.difference(loci, chrStartEndLoci);

        // parse gene names
        if (_.size(geneNameLoci) > 0) {

            survivors = [];
            featureDBGenomicStates = [];
            _.each(geneNameLoci, function(locus){
                var result,
                    genomicState;

                result = self.featureDB[ locus.toUpperCase() ];
                if (result) {
                    genomicState = createFeatureDBGenomicState(result);
                    if (genomicState) {
                        genomicState.locusSearchString = locus;
                        featureDBGenomicStates.push( genomicState );
                    } else {
                        survivors.push(locus);
                    }
                } else {
                    survivors.push(locus);
                }
            });

            if (_.size(survivors) > 0) {

                geneNameLookup = new Promise(function(resolve) {
                    resolve( _.map(survivors, function(locus){

                        var path = searchConfig.url.replace("$FEATURE$", locus);

                        if (path.indexOf("$GENOME$") > -1) {
                            path.replace("$GENOME$", (self.genome.id ? self.genome.id : "hg19"));
                        }

                        return path;
                    }) );
                });

                geneNameLookup.then(function(response) {
                    return Promise.all(response.map(igvxhr.loadString));
                }).then(function (response) {
                    var filtered,
                        geneNameGenomicStates;

                    filtered = _.filter(response, function(geneNameLookupResult){
                        return geneNameLookupResult !== "";
                    });

                    geneNameGenomicStates = _.filter(_.map(filtered, createGeneNameGenomicState), function(genomicState){
                        return undefined !== genomicState;
                    });

                    continuation(_.union(locusGenomicStates, featureDBGenomicStates, geneNameGenomicStates));
                    return;
                });

            } else {
                continuation(_.union(locusGenomicStates, featureDBGenomicStates));
                return;
            }

        } else {
            continuation(locusGenomicStates);
            return;
        }



        function createFeatureDBGenomicState(featureDBLookupResult) {

            var start,
                end,
                locusString,
                geneNameLocusObject;

            end = (undefined === featureDBLookupResult.end) ? 1 + featureDBLookupResult.start : featureDBLookupResult.end;

            if (igv.browser.flanking) {
                start = Math.max(0, featureDBLookupResult.start - igv.browser.flanking);
                end += igv.browser.flanking;
            }

            locusString = featureDBLookupResult.chr + ':' + start.toString() + '-' + end.toString();

            geneNameLocusObject = {};
            if (igv.Browser.isLocusChrNameStartEnd(locusString, self.genome, geneNameLocusObject)) {
                geneNameLocusObject.selection = new igv.GtexSelection({ gene: featureDBLookupResult.name });
                return geneNameLocusObject;
            } else {
                return undefined;
            }

        }

        function createGeneNameGenomicState(geneNameLookupResponse) {

            var results,
                result,
                chr,
                start,
                end,
                type,
                string,
                geneNameLocusObject;

            results = ("plain" === searchConfig.type) ? parseSearchResults(geneNameLookupResponse) : JSON.parse(geneNameLookupResponse);

            if (searchConfig.resultsField) {
                results = results[searchConfig.resultsField];
            }

            if (0 === _.size(results)) {
                return undefined;
            } else if (1 === _.size(results)) {

                result = _.first(results);

                chr = result[ searchConfig.chromosomeField ];
                start = result[ searchConfig.startField ] - searchConfig.coords;
                end = result[ searchConfig.endField ];

                if (undefined === end) {
                    end = start + 1;
                }

                if (igv.browser.flanking) {
                    start = Math.max(0, start - igv.browser.flanking);
                    end += igv.browser.flanking;
                }

                string = chr + ':' + start.toString() + '-' + end.toString();

                geneNameLocusObject = {};
                if (igv.Browser.isLocusChrNameStartEnd(string, self.genome, geneNameLocusObject)) {

                    type = result["featureType"] || result["type"];

                    geneNameLocusObject.locusSearchString = _.first(geneNameLookupResponse.split('\t'));
                    geneNameLocusObject.selection = new igv.GtexSelection('gtex' === type || 'snp' === type ? { snp: result.gene } : { gene: result.gene });
                    return geneNameLocusObject;
                } else {
                    return undefined;
                }

            } else {
                return undefined;
            }

        }
    };

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
            results;

        if (undefined === this.eventHandlers[ eventName ]) {
            return undefined;
        }

        scope = thisObj || window;
        results = _.map(this.eventHandlers[ eventName ], function(event){
            return event.apply(scope, args);
        });

        return _.first(results);

    };

    igv.Browser.isLocusChrNameStartEnd = function (locus, genome, locusObject) {

        var a,
            b,
            numeric,
            success;

        a = locus.split(':');
        if ( undefined === genome.getChromosome(_.first(a)) ) {
            return false;
        } else if (locusObject) {

            // start and end will get overridden if explicit start AND end exits
            locusObject.chromosome = genome.getChromosome(_.first(a));
            locusObject.start = 0;
            locusObject.end = locusObject.chromosome.bpLength;
        }

        // if just a chromosome name we are done
        if (1 === _.size(a)) {
            return true;
        } else {

            b = _.last(a).split('-');
            if (_.size(b) > 2) {
                return false;
            } else if (1 === _.size(b)) {

                numeric = _.first(b).replace(/\,/g,'');
                success = !isNaN(numeric);
                if (true === success && locusObject) {
                    locusObject.start = parseInt(numeric, 10);
                    locusObject.end = undefined;
                }

            } else if (2 === _.size(b)) {

                success = true;
                _.each(b, function(bb, index) {

                    if (true === success) {
                        numeric = bb.replace(/\,/g,'');
                        success = !isNaN(numeric);
                        if (true === success && locusObject) {
                            locusObject[ 0 === index ? 'start' : 'end' ] = parseInt(numeric, 10);
                        }
                    }
                });

            }

            if (true === success && locusObject) {
                igv.Browser.validateLocusExtent(locusObject.chromosome, locusObject);
            }

            return success;
        }


    };

    igv.Browser.validateLocusExtent = function (chromosome, extent) {

        var ss = extent.start,
            ee = extent.end;

        if (undefined === ee) {

            ss -= igv.browser.minimumBasesExtent()/2;
            ee = ss + igv.browser.minimumBasesExtent();

            if (ee > chromosome.bpLength) {
                ee = chromosome.bpLength;
                ss = ee - igv.browser.minimumBasesExtent();
            } else if (ss < 0) {
                ss = 0;
                ee = igv.browser.minimumBasesExtent();
            }

        } else if (ee - ss < igv.browser.minimumBasesExtent()) {

            center = (ee + ss)/2;
            if (center - igv.browser.minimumBasesExtent()/2 < 0) {
                ss = 0;
                ee = ss + igv.browser.minimumBasesExtent();
            } else if (center + igv.browser.minimumBasesExtent()/2 > chromosome.bpLength) {
                ee = chromosome.bpLength;
                ss = ee - igv.browser.minimumBasesExtent();
            } else {
                ss = center - igv.browser.minimumBasesExtent()/2;
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

        var lines = data.splitLines(),
            linesTrimmed = [],
            results = [];

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
                rangeTokens;

            if (tokens.length >= 3) {

                locusTokens = tokens[1].split(":");
                rangeTokens = locusTokens[1].split("-");
                source = tokens[2].trim();

                results.push({
                    gene: tokens[ 0 ],
                    chromosome: igv.browser.genome.getChromosomeName(locusTokens[0].trim()),
                    start: parseInt(rangeTokens[0].replace(/,/g, '')),
                    end: parseInt(rangeTokens[1].replace(/,/g, '')),
                    type: ("gtex" === source ? "snp" : "gene")
                });

            }

        });

        return results;

    }

    function attachTrackContainerMouseHandlers(trackContainerDiv) {

        var $viewport,
            viewport,
            viewports,
            referenceFrame,
            isRulerTrack = false,
            isMouseDown = false,
            isDragging = false,
            lastMouseX = undefined,
            mouseDownX = undefined;

        $(trackContainerDiv).mousedown(function (e) {

            var coords,
                $target;

            e.preventDefault();

            if (igv.popover) {
                igv.popover.hide();
            }

            $target = $(e.target);
            $viewport = $target.parents('.igv-viewport-div');

            if (0 === _.size($viewport)) {
                $viewport = undefined;
                return;
            }

            isRulerTrack = $target.parents("div[data-ruler-track='rulerTrack']").get(0) ? true : false;
            if (isRulerTrack) {
                return;
            }

            isMouseDown = true;
            coords = igv.translateMouseCoordinates(e, $viewport.get(0));
            mouseDownX = lastMouseX = coords.x;

            // viewport object we are panning
            viewport = igv.Viewport.viewportWithID( $viewport.data('viewport') );
            referenceFrame = viewport.genomicState.referenceFrame;

            // list of all viewports in the locus 'column' containing the panning viewport
            viewports = igv.Viewport.viewportsWithLocusIndex( $viewport.data('locusindex') );

        });

        // Guide line is bound within track area, and offset by 5 pixels so as not to interfere mouse clicks.
        $(trackContainerDiv).mousemove(function (e) {
            var xy,
                _left,
                $element = igv.browser.$cursorTrackingGuide;

            e.preventDefault();

            xy = igv.translateMouseCoordinates(e, trackContainerDiv);
            _left = Math.max(50, xy.x - 5);

            _left = Math.min(igv.browser.trackContainerDiv.clientWidth - 65, _left);
            $element.css({left: _left + 'px'});
        });

        $(trackContainerDiv).mousemove(igv.throttle(function (e) {

            var coords,
                maxEnd,
                maxStart;

            e.preventDefault();

            if (true === isRulerTrack || undefined === $viewport) {
                return;
            }

            if ($viewport) {
                coords = igv.translateMouseCoordinates(e, $viewport.get(0));
            }

            if (referenceFrame && isMouseDown) { // Possibly dragging

                if (mouseDownX && Math.abs(coords.x - mouseDownX) > igv.browser.constants.dragThreshold) {

                    if (igv.browser.loadInProgress()) {
                        return;
                    }

                    isDragging = true;

                    referenceFrame.shiftPixels(lastMouseX - coords.x);

                    // clamp left
                    referenceFrame.start = Math.max(0, referenceFrame.start);

                    // clamp right
                    var chromosome = igv.browser.genome.getChromosome(referenceFrame.chrName);
                    maxEnd = chromosome.bpLength;
                    maxStart = maxEnd - viewport.$viewport.width() * referenceFrame.bpPerPixel;

                    if (referenceFrame.start > maxStart) {
                        referenceFrame.start = maxStart;
                    }

                    igv.browser.updateLocusSearchWithGenomicState(_.first(igv.browser.genomicStateList));

                    // igv.browser.repaint();
                    igv.browser.repaintWithLocusIndex(viewport.genomicState.locusIndex);

                    igv.browser.fireEvent('trackdrag');
                }

                lastMouseX = coords.x;

            }

        }, 10));

        $(trackContainerDiv).mouseup(mouseUpOrOut);

        $(trackContainerDiv).mouseleave(mouseUpOrOut);

        function mouseUpOrOut(e) {

            if (isRulerTrack) {
                return;
            }

            // Don't let vertical line interfere with dragging
            if (igv.browser.$cursorTrackingGuide && e.toElement === igv.browser.$cursorTrackingGuide.get(0) && e.type === 'mouseleave') {
                return;
            }

            if (isDragging) {
                igv.browser.fireEvent('trackdragend');
                isDragging = false;
            }

            isMouseDown = false;
            mouseDownX = lastMouseX = undefined;
            $viewport = viewport = undefined;
            referenceFrame = undefined;

        }

    }








    ////////////////////////////////// legacy ///////////////////////////////////////////

    /**
     *
     * @param feature
     * @param callback - function to call
     * @param force - force callback
     */
    igv.Browser.prototype.search = function (feature, callback, force) {
        var type,
            chr,
            start,
            end,
            searchConfig,
            url,
            result;

        // See if we're ready to respond to a search, if not just queue it up and return
        if (igv.browser === undefined || igv.browser.genome === undefined) {
            igv.browser.initialLocus = feature;
            if (callback) {
                callback();
            }
            return;
        }

        if (igv.Browser.isLocusChrNameStartEnd(feature, this.genome, undefined)) {

            var success =  igv.gotoLocusFeature(feature, this.genome, this);

            if ((force || true === success) && callback) {
                callback();
            }

        } else {

            // Try local feature cache first
            result = this.featureDB[feature.toUpperCase()];
            if (result) {

                handleSearchResult(result.name, result.chrName, result.start, result.end, "");

            } else if (this.searchConfig) {
                url = this.searchConfig.url.replace("$FEATURE$", feature);
                searchConfig = this.searchConfig;

                if (url.indexOf("$GENOME$") > -1) {
                    var genomeId = this.genome.id ? this.genome.id : "hg19";
                    url.replace("$GENOME$", genomeId);
                }

                igvxhr.loadString(url).then(function (data) {

                    var results = ("plain" === searchConfig.type) ? parseSearchResults(data) : JSON.parse(data);

                    if (searchConfig.resultsField) {
                        results = results[searchConfig.resultsField];
                    }

                    if (results.length == 0) {
                        //alert('No feature found with name "' + feature + '"');
                        igv.presentAlert('No feature found with name "' + feature + '"');
                    }
                    else if (results.length == 1) {
                        // Just take the first result for now
                        // TODO - merge results, or ask user to choose

                        r = results[0];
                        chr = r[searchConfig.chromosomeField];
                        start = r[searchConfig.startField] - searchConfig.coords;
                        end = r[searchConfig.endField];
                        type = r["featureType"] || r["type"];
                        handleSearchResult(feature, chr, start, end, type);
                    }
                    else {
                        presentSearchResults(results, searchConfig, feature);
                    }

                    if (callback) callback();
                });
            }
        }

    };

    igv.gotoLocusFeature = function (locusFeature, genome, browser) {

        var type,
            tokens,
            chr,
            start,
            end,
            chrName,
            startEnd,
            center,
            obj;


        type = 'locus';
        tokens = locusFeature.split(":");
        chrName = genome.getChromosomeName(tokens[0]);
        if (chrName) {
            chr = genome.getChromosome(chrName);
        }

        if (chr) {

            // returning undefined indicates locus is a chromosome name.
            start = end = undefined;
            if (1 === tokens.length) {
                start = 0;
                end = chr.bpLength;
            } else {
                startEnd = tokens[1].split("-");
                start = Math.max(0, parseInt(startEnd[0].replace(/,/g, "")) - 1);
                if (2 === startEnd.length) {
                    end = Math.min(chr.bpLength, parseInt(startEnd[1].replace(/,/g, "")));
                    if (end < 0) {
                        // This can happen from integer overflow
                        end = chr.bpLength;
                    }
                }
            }

            obj = { start: start, end: end };
            igv.Browser.validateLocusExtent(chr, obj);

            start = obj.start;
            end = obj.end;

        }

        if (undefined === chr || isNaN(start) || (start > end)) {
            igv.presentAlert("Unrecognized feature or locus: " + locusFeature);
            return false;
        }

        browser.goto(chrName, start, end);
        fireOnsearch.call(igv.browser, locusFeature, type);

        return true;
    };

    function presentSearchResults(loci, config, feature) {

        igv.browser.$searchResultsTable.empty();
        igv.browser.$searchResults.show();

        loci.forEach(function (locus) {

            var row = $('<tr>');
            row.text(locus.locusString);

            row.click(function () {

                igv.browser.$searchResults.hide();

                handleSearchResult(
                    feature,
                    locus[config.chromosomeField],
                    locus[config.startField] - config.coords,
                    locus[config.endField],
                    (locus["featureType"] || locus["type"]));

            });

            igv.browser.$searchResultsTable.append(row);

        });

    }

    function handleSearchResult(name, chr, start, end, type) {

        igv.browser.selection = new igv.GtexSelection('gtex' === type || 'snp' === type ? { snp: name } : { gene: name });

        if (end === undefined) {
            end = start + 1;
        }
        if (igv.browser.flanking) {
            start = Math.max(0, start - igv.browser.flanking);
            end += igv.browser.flanking;    // TODO -- set max to chromosome length
        }

        igv.browser.goto(chr, start, end);

        // Notify tracks (important for gtex).   TODO -- replace this with some sort of event model ?
        fireOnsearch.call(igv.browser, name, type);
    }

    function fireOnsearch(feature, type) {
        // Notify tracks (important for gtex).   TODO -- replace this with some sort of event model ?
        this.trackViews.forEach(function (tp) {
            var track = tp.track;
            if (track.onsearch) {
                track.onsearch(feature, type);
            }
        });
    }

    return igv;
})
(igv || {});


