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

    var knownFileTypes = new Set(["narrowpeak", "broadpeak", "peaks", "bedgraph", "wig", "gff3", "gff",
        "gtf", "aneu", "fusionjuncspan", "refflat", "seg", "bed", "vcf", "bb", "bigbed", "bw", "bigwig", "bam"]);

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

    igv.Browser.prototype.getFormat = function (name) {
        if (this.formats === undefined) return undefined;
        return this.formats[name];
    };

    igv.Browser.prototype.loadTracksWithConfigList = function (configList) {

        var self = this;

        configList.forEach(function (config) {
            self.loadTrack(config);
        });

        // Really we should just resize the new trackViews, but currently there is no way to get a handle on those
        this.trackViews.forEach(function (trackView) {
            trackView.resize();
        })

    };

    igv.Browser.prototype.loadTrack = function (config) {

        var self = this,
            settings,
            property,
            newTrack,
            featureSource,
            nm;

        inferTypes(config);

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

        newTrack = createTrackWithConfiguration(config);
        if (undefined === newTrack) {
            igv.presentAlert("Unknown file type: " + config.url);
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

        function createTrackWithConfiguration(conf) {

            switch (conf.type.toLowerCase()) {
                case "gwas":
                    return new igv.GWASTrack(conf);
                    break;

                case "annotation":
                case "genes":
                case "fusionjuncspan":
                    return new igv.FeatureTrack(conf);
                    break;

                case "variant":
                    return new igv.VariantTrack(conf);
                    break;

                case "alignment":
                    return new igv.BAMTrack(conf, featureSource);
                    break;

                case "data":  // deprecated
                case "wig":
                    return new igv.WIGTrack(conf);
                    break;

                case "sequence":
                    return new igv.SequenceTrack(conf);
                    break;

                case "eqtl":
                    return new igv.EqtlTrack(conf);
                    break;

                case "seg":
                    return new igv.SegTrack(conf);
                    break;

                case "aneu":
                    return new igv.AneuTrack(conf);
                    break;

                default:
                    return undefined;
            }

        }

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

    igv.Browser.prototype.update = function () {

        this.updateLocusSearchWithGenomicState(_.first(this.genomicStateList));

        _.each([this.ideoPanel, this.karyoPanel, this.centerGuide], function(renderable){
            if (renderable) {
                renderable.repaint();
            }
        });

        _.each(this.trackViews, function(trackView){
            trackView.update();
        });

    };

    igv.Browser.prototype.repaintWithLocusIndex = function (locusIndex) {

        if (this.ideoPanel) {
            igv.IdeoPanel.repaintPanel( this.ideoPanel.panelWithLocusIndex(locusIndex) );
        }

        _.each(igv.Viewport.viewportsWithLocusIndex(locusIndex), function (viewport) {
            viewport.repaint();
        });

    };

    igv.Browser.prototype.updateWithLocusIndex = function (locusIndex) {

        if (this.ideoPanel) {
            igv.IdeoPanel.repaintPanel( this.ideoPanel.panelWithLocusIndex(locusIndex) );
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

        var referenceFrame,
            ss,
            ee,
            str,
            end,
            chromosome;

        if (0 === genomicState.locusIndex) {

            referenceFrame = genomicState.referenceFrame;

            if (this.$searchInput) {

                end = referenceFrame.start + referenceFrame.bpPerPixel * genomicState.viewportWidth;

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

                // this.windowSizePanel.update(Math.floor(end - referenceFrame.start));
            }

            this.fireEvent('locuschange', [referenceFrame, str]);

        }

    };

    igv.Browser.prototype.syntheticViewportContainerBBox = function () {
        var $trackContainer = $(this.trackContainerDiv),
            $track = $('<div class="igv-track-div">'),
            $viewportContainer = $('<div class="igv-viewport-container igv-viewport-container-shim">'),
            rect = {},
            trackContainerWidth,
            trackWidth;

        trackContainerWidth = $trackContainer.width();

        $trackContainer.append($track);
        trackWidth = $track.width();

        $track.append($viewportContainer);

        rect.position = $viewportContainer.position();
        rect.width = $viewportContainer.width();
        rect.height = $viewportContainer.height();

        $track.remove();

        return rect;
    };

    igv.Browser.prototype.syntheticViewportContainerWidth = function () {
        var rect = this.syntheticViewportContainerBBox();

        return rect.width;
    };

    /**
     * Return the visible width of a track.  All tracks should have the same width.
     */
    igv.Browser.prototype.viewportContainerWidth = function () {

        var width = (this.trackViews && this.trackViews.length > 0) ? this.trackViews[ 0 ].$viewportContainer.width() : this.syntheticViewportContainerWidth();

        return width;
    };

    igv.Browser.prototype.viewportContainerWidthBP = function () {
        return this.referenceFrame.bpPerPixel * this.viewportContainerWidth();
    };

    igv.Browser.prototype.minimumBasesExtent = function () {
        return 40;
    };

    igv.Browser.prototype.removeAllTracks = function () {
        var tracks = this.trackViews;

        for (var i = 0; i < tracks.length; i++) {
            var track = this.trackViews[i].track;
            this.removeTrack(track);
        }
    };

    igv.Browser.prototype.goto = function (chr, start, end) {

        var w,
            chromosome,
            viewportWidth = this.viewportContainerWidth();

        if (igv.popover) {
            igv.popover.hide();
        }

        // Translate chr to official name
        if (undefined === this.genome) {
            console.log('Missing genome - bailing ...');
            return;
        }

        chr = this.genome.getChromosomeName(chr);

        this.referenceFrame.chrName = chr;

        // If end is undefined,  interpret start as the new center, otherwise compute scale.
        if (undefined === end) {
            w = Math.round(viewportWidth * this.referenceFrame.bpPerPixel / 2);
            start = Math.max(0, start - w);
        } else {
            this.referenceFrame.bpPerPixel = (end - start) / (viewportWidth);
        }

        chromosome = this.genome.getChromosome(this.referenceFrame.chrName);
        if (!chromosome) {
            if (console && console.log) console.log("Could not find chromsome " + this.referenceFrame.chrName);
        }
        else {
            if (!chromosome.bpLength) chromosome.bpLength = 1;

            var maxBpPerPixel = chromosome.bpLength / viewportWidth;
            if (this.referenceFrame.bpPerPixel > maxBpPerPixel) this.referenceFrame.bpPerPixel = maxBpPerPixel;

            if (!end) {
                end = start + viewportWidth * this.referenceFrame.bpPerPixel;
            }

            if (chromosome && end > chromosome.bpLength) {
                start -= (end - chromosome.bpLength);
            }
        }

        this.referenceFrame.start = start;

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

            var busyViewports,
                genomicState = browser.genomicStateList[ locusIndex ],
                referenceFrame = genomicState.referenceFrame,
                viewportWidth = genomicState.viewportContainerPercentage * browser.viewportContainerWidth(),
                centerBP;

            // if (browser.loadInProgress()) {
            //     return;
            // }

            busyViewports = _.filter(igv.Viewport.viewportsWithLocusIndex(locusIndex), function (viewport) {
                return !(false === viewport.loading);
            });

            // if (_.size(busyViewports) > 0) {
            //     console.log('bail zoom - ' + locusIndex + ' viewports ' + _.size(busyViewports));
            //     return;
            // }

            // Have we reached the zoom-in threshold yet? If so, bail.
            if (browser.minimumBasesExtent() > basesExtent(viewportWidth, referenceFrame.bpPerPixel/2.0)) {
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
                viewportWidth = genomicState.viewportContainerPercentage * browser.viewportContainerWidth(),
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

    igv.Browser.prototype.$emptyAllViewportContainers = function ( $trackContainer ) {
        var $e = this;

        $e = $trackContainer.find('.igv-viewport-div');
        $e.remove();

        _.each(this.trackViews, function(trackView){
            trackView.viewports = [];
        });
    };

    igv.Browser.prototype.buildViewportsWithGenomicStateList = function (genomicStateList) {

        _.each(this.trackViews, function(trackView){

            trackView.viewports = [];
            _.each(_.range(_.size(genomicStateList)), function(i) {
                trackView.viewports.push(new igv.Viewport(trackView, i));
            });

        });

    };

    igv.Browser.prototype.parseSearchInput = function(string) {

        var self = this,
            loci = string.split(' ');

        this.getGenomicStateList(loci, this.viewportContainerWidth(), function (genomicStateList) {

            var $content_header = $('#igv-content-header');

            if (_.size(genomicStateList) > 0) {

                _.each(genomicStateList, function (genomicState, index) {

                    genomicState.viewportWidth = self.viewportContainerWidth() / _.size(genomicStateList);
                    genomicState.viewportContainerPercentage = 1.0 / _.size(genomicStateList);

                    genomicState.referenceFrame = new igv.ReferenceFrame(genomicState.chromosome.name, genomicState.start, (genomicState.end - genomicState.start) / genomicState.viewportWidth);

                    genomicState.locusIndex = index;
                    genomicState.locusCount = _.size(genomicStateList);
                });

                if (_.size(genomicStateList) === _.size(self.genomicStateList)) {
                    self.genomicStateList = genomicStateList;
                } else {

                    self.genomicStateList = genomicStateList;

                    if (false === self.config.hideIdeogram) {
                        igv.IdeoPanel.$empty($content_header);
                        self.ideoPanel.buildPanels($content_header);
                    }

                    self.$emptyAllViewportContainers($('.igv-track-container-div'));

                    self.buildViewportsWithGenomicStateList(genomicStateList);
                }

                self.update();
            } // if (_.size(genomicStateList) > 0)

        });
    };

    igv.Browser.prototype.getGenomicStateList = function (loci, viewportContainerWidth, continuation) {

        var self = this,
            searchConfig = igv.browser.searchConfig,
            chrStartEndLoci,
            geneNameLoci,
            locusObject,
            locusObjects = [],
            geneNameLookup;

        chrStartEndLoci = [];
        _.each(loci, function(locus) {

            locusObject = {};
            if (igv.isLocusChrNameStartEnd(locus, self.genome, locusObject)) {
                locusObject.gtexSelection = undefined;
                locusObjects.push(locusObject);

                // accumulate successfully parsed loci
                chrStartEndLoci.push(locus);
            }
        });

        // isolate gene name loci
        geneNameLoci = _.difference(loci, chrStartEndLoci);

        // parse gene names
        if (_.size(geneNameLoci) > 0) {

            geneNameLookup = new Promise(function(resolve) {
                resolve( _.map(geneNameLoci, function(loci){ return searchConfig.url.replace("$FEATURE$", loci); }) );
            });

            geneNameLookup.then(function(response) {
                return Promise.all(response.map(igvxhr.loadString));
            }).then(function (response) {
                var filtered,
                    geneNameLocusObjects;

                filtered = _.filter(response, function(geneNameLookupResult){
                    return geneNameLookupResult !== "";
                });

                geneNameLocusObjects = _.filter(_.map(filtered, createGeneNameLocusObject), function(geneNameLocusObject){
                    return undefined !== geneNameLocusObject;
                });

                continuation(_.union(locusObjects, geneNameLocusObjects));

            });

        } else {
            continuation(locusObjects);
        }

        function createGeneNameLocusObject(geneNameLookupResponse) {

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

                if (igv.browser.flanking) {
                    start = Math.max(0, start - igv.browser.flanking);
                    end += igv.browser.flanking;
                }

                string = chr + ':' + start.toString() + '-' + end.toString();

                geneNameLocusObject = {};
                if (igv.isLocusChrNameStartEnd(string, self.genome, geneNameLocusObject)) {

                    type = result["featureType"] || result["type"];
                    geneNameLocusObject.gtexSelection = new igv.GtexSelection('gtex' === type || 'snp' === type ? {snp: name} : {gene: name});
                    return geneNameLocusObject;
                } else {
                    return undefined;
                }

            } else {
                return undefined;
            }

        }
    };

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

        if (igv.isLocusChrNameStartEnd(feature, this.genome, undefined)) {

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

                // var loader = new igv.DataLoader(url);
                // if (range)  loader.range = range;
                // loader.loadBinaryString(callback);

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

    igv.isLocusChrNameStartEnd = function (locus, genome, locusObject) {

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
                igv.validateLocusExtent(locusObject.chromosome, locusObject);
            }

            return success;
        }


    };

    igv.validateLocusExtent = function (chromosome, extent) {

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

        if (igv.isLocusChrNameStartEnd(feature, this.genome, undefined)) {

            var success = igv.gotoLocusFeature(feature, this.genome, this);

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

                // var loader = new igv.DataLoader(url);
                // if (range)  loader.range = range;
                // loader.loadBinaryString(callback);

                igvxhr.loadString(url).then(function (data) {

                    var results = ("plain" === searchConfig.type) ? parseSearchResults(data) : JSON.parse(data);

                    if (searchConfig.resultsField) {
                        results = results[searchConfig.resultsField];
                    }

                    if (results.length == 0) {
                        //alert('No feature found with name "' + feature + '"');
                        igv.presentAlert('No feature found with name "' + feature + '"');
                    }
                    else {

                        // Just take the first result for now
                        // TODO - merge results, or ask user to choose

                        r = results[0];
                        chr = r[searchConfig.chromosomeField];
                        start = r[searchConfig.startField] - searchConfig.coords;
                        end = r[searchConfig.endField];
                        type = r["featureType"] || r["type"];
                        handleSearchResult(feature, chr, start, end, type);
                    }
                    //else {
                    //    presentSearchResults(results, searchConfig, feature);
                    //}

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
        chrName = genome.getChromosomeName(tokens[ 0 ]);
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
                startEnd = tokens[ 1 ].split("-");
                start = Math.max(0, parseInt(startEnd[ 0 ].replace(/,/g, "")) - 1);
                if (2 === startEnd.length) {
                    end = Math.min(chr.bpLength, parseInt(startEnd[ 1 ].replace(/,/g, "")));
                    if (end < 0) {
                        // This can happen from integer overflow
                        end = chr.bpLength;
                    }
                }
            }

            obj = { start: start, end: end };
            igv.validateLocusExtent(chr, obj);
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

            var row = $('<tr class="igvNavigationSearchResultsTableRow">');
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
                    chromosome: igv.browser.genome.getChromosomeName(locusTokens[0].trim()),
                    start: parseInt(rangeTokens[0].replace(/,/g, '')),
                    end: parseInt(rangeTokens[1].replace(/,/g, '')),
                    type: ("gtex" === source ? "snp" : "gene")
                });

            }

        });

        return results;

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
            referenceFrame = igv.browser.genomicStateList[ viewport.locusIndex ].referenceFrame;

            // list of all viewports in the locus 'column' containing the panning viewport
            viewports = igv.Viewport.viewportsWithLocusIndex( $viewport.data('locusindex') );

        });

        // Guide line is bound within track area, and offset by 5 pixels so as not to interfere mouse clicks.
        $(trackContainerDiv).mousemove(function (e) {
            var xy,
                _left,
                $element = igv.browser.$cursorTrackingGuide;

            xy = igv.translateMouseCoordinates(e, trackContainerDiv);
            _left = Math.max(50, xy.x - 5);

            _left = Math.min(igv.browser.trackContainerDiv.clientWidth - 65, _left);
            $element.css({ left: _left + 'px' });
        });

        $(trackContainerDiv).mousemove(igv.throttle(function (e) {

            var coords,
                maxEnd,
                maxStart;

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
                    igv.browser.repaintWithLocusIndex(viewport.locusIndex);

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

    /**
     * Infer properties format and track type from legacy "config.type" property
     *
     * @param config
     */
    function inferTypes(config) {

        function translateDeprecatedTypes(config) {

            if (config.featureType) {  // Translate deprecated "feature" type
                config.type = config.type || config.featureType;
                config.featureType = undefined;
            }

            if ("bed" === config.type) {
                config.type = "annotation";
                config.format = config.format || "bed";

            }

            else if ("bam" === config.type) {
                config.type = "alignment";
                config.format = "bam"
            }

            else if ("vcf" === config.type) {
                config.type = "variant";
                config.format = "vcf"
            }

            else if ("t2d" === config.type) {
                config.type = "gwas";
            }

            else if ("FusionJuncSpan" === config.type) {
                config.format = "fusionjuncspan";
            }
        }

        function inferFileFormat(config) {

            if (config.format) {
                config.format = config.format.toLowerCase();
                return;
            }

            var path = config.url || config.localFile.name,
                fn = path.toLowerCase(),
                idx,
                ext;

            //Strip parameters -- handle local files later
            idx = fn.indexOf("?");
            if (idx > 0) {
                fn = fn.substr(0, idx);
            }

            //Strip aux extensions .gz, .tab, and .txt
            if (fn.endsWith(".gz")) {
                fn = fn.substr(0, fn.length - 3);
            } else if (fn.endsWith(".txt") || fn.endsWith(".tab")) {
                fn = fn.substr(0, fn.length - 4);
            }


            idx = fn.lastIndexOf(".");
            ext = idx < 0 ? fn : fn.substr(idx + 1);

            switch (ext.toLowerCase()) {

                case "bw":
                    config.format = "bigwig";
                    break;
                case "bb":
                    config.format = "bigbed";

                default:
                    if (knownFileTypes.has(ext)) {
                        config.format = ext;
                    }
            }
        }

        function inferTrackType(config) {

            if (config.type) return;

            if (config.format !== undefined) {
                switch (config.format.toLowerCase()) {
                    case "bw":
                    case "bigwig":
                    case "wig":
                    case "bedgraph":
                        config.type = "wig";
                        break;
                    case "vcf":
                        config.type = "variant";
                        break;
                    case "seg":
                        config.type = "seg";
                        break;
                    case "bam":
                        config.type = "alignment";
                        break;
                    default:
                        config.type = "annotation";
                }
            }
        }

        translateDeprecatedTypes(config);

        if (undefined === config.sourceType && (config.url || config.localFile)) {
            config.sourceType = "file";
        }

        if ("file" === config.sourceType) {
            if (undefined === config.format) {
                inferFileFormat(config);
            }
        }

        if (undefined === config.type) {
            inferTrackType(config);
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

        if (!this.eventHandlers[eventName]) {
            return;
        }

        var scope = thisObj || window;
        for (var i = 0, l = this.eventHandlers[eventName].length; i < l; i++) {
            var item = this.eventHandlers[eventName][i];
            var result = item.apply(scope, args);

            // If any of the handlers return any value, then return it
            if (result !== undefined) {
                return result;
            }
        }
    };

    return igv;
})
(igv || {});


