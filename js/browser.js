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

    igv.Browser = function (options, trackContainer) {

        igv.browser = this;   // Make globally visible (for use in html markup).

        this.div = $('<div id="igvRootDiv" class="igv-root-div">')[0];

        initialize.call(this, options);

        $("input[id='trackHeightInput']").val(this.trackHeight);

        this.trackContainerDiv = trackContainer;

        addTrackContainerHandlers(trackContainer);

        this.trackViews = [];

        this.trackLabelsVisible = true;

        this.featureDB = {};   // Hash of name -> feature, used for search function.

        window.onresize = igv.throttle(function () {
            igv.browser.resize();
        }, 10);

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
                url: "//www.broadinstitute.org/webservices/igv/locus?genome=" + genomeId + "&name=$FEATURE$",
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

    igv.Browser.prototype.trackLabelWithPath = function (path) {

        var parser = document.createElement('a'),
            label;

        parser.href = path;

        //parser.protocol; // => "http:"
        //parser.hostname; // => "example.com"
        //parser.port;     // => "3000"
        //parser.pathname; // => "/pathname/"
        //parser.search;   // => "?search=test"
        //parser.hash;     // => "#hash"
        //parser.host;     // => "example.com:3000"

        label = parser.pathname.split('/');
        return label[label.length - 1].split('.')[0];

    };

    igv.Browser.prototype.loadTracksWithConfigList = function (configList) {

        var self = this;

        configList.forEach(function (config) {
            self.loadTrack(config);
        });

    };

    igv.Browser.prototype.loadTrack = function (config) {

        var self = this,
            settings, property;

        if (this.isDuplicateTrack(config)) {
            return;
        }

        // Set defaults if specified
        if (this.trackDefaults && config.trackType) {
            settings = this.trackDefaults[config.trackType];
            if (settings) {
                for (property in settings) {
                    if (settings.hasOwnProperty(property) && config[property] === undefined) {
                        config[property] = settings[property];
                    }
                }
            }
        }

        igv.inferTypes(config);


        var path = config.url,
            type = config.featureType,
            newTrack;

        switch (type) {
            case "gwas":
                newTrack = new igv.GWASTrack(config);
                break;
            case "annotation":
            case "genes":
            case "variant":
            case "FusionJuncSpan":
                newTrack = new igv.FeatureTrack(config);
                break;
            case "alignment":
                newTrack = new igv.BAMTrack(config);
                break;
            case "data":
                newTrack = new igv.WIGTrack(config);
                break;
            case "sequence":
                newTrack = new igv.SequenceTrack(config);
                break;
            case "eqtl":
                newTrack = new igv.EqtlTrack(config);
                break;
            case "seg":
                newTrack = new igv.SegTrack(config);
                break;
            case "aneu":
                newTrack = new igv.AneuTrack(config);
                break;
            default:
                alert("Unknown file type: " + path);
                return null;
        }

        loadHeader(newTrack);

        function loadHeader(track) {

            if (track.getHeader) {
                track.getHeader(function (header) {
                    self.addTrack(track);
                })
            }
            else {
                self.addTrack(newTrack);
            }
        }
    };

    igv.Browser.prototype.isDuplicateTrack = function (config) {

        var attemptedDuplicateTrackAddition = false;

        this.trackViews.forEach(function (tp) {

            if (false === attemptedDuplicateTrackAddition) {

                if (JSON.stringify(config) === JSON.stringify(tp.track.config)) {
                    attemptedDuplicateTrackAddition = true;
                }
            }
        });

        if (true === attemptedDuplicateTrackAddition) {
            window.alert("Attempt to load duplicate track.");
            return true;
        }

        return false;

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

        var myself = this,
            trackView = new igv.TrackView(track, this);

        if (igv.popover) {
            igv.popover.hide();
        }

        // Register view with track.  This is unfortunate, but is needed to support "resize" events.
        track.trackView = trackView;

        if (undefined === track.order) {
            track.order = this.trackViews.length;
        }

        this.trackViews.push(trackView);

        this.reorderTracks();

        if (this.cursorModel) {

            this.cursorModel.initializeHistogram(trackView.track, function () {

                if (myself.designatedTrack === track) {
                    myself.selectDesignatedTrack(myself.designatedTrack.trackFilter.trackPanel);
                }

                if (track.config && track.config.trackFilter) {

                    track.trackFilter.setWithJSON(track.config.trackFilter);


                }

                myself.resize();


            });
        }
        else {
            this.resize();
        }

    };

    igv.Browser.prototype.reorderTracks = function () {

        var myself = this;

        this.trackViews.sort(function (a, b) {
            var aOrder = a.track.order || 0;
            var bOrder = b.track.order || 0;
            return aOrder - bOrder;
        });

        // Reattach the divs to the dom in the correct order
        $(this.trackContainerDiv).children().detach();

        this.trackViews.forEach(function (trackView, index, trackViews) {

            //console.log(trackView.track.id + ".order " + trackView.track.order);

            if ("CURSOR" === myself.type) {
                myself.trackContainerDiv.appendChild(trackView.cursorTrackContainer);
            } else {
                myself.trackContainerDiv.appendChild(trackView.trackDiv);
            }

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

            this.trackViews.splice(this.trackViews.indexOf(trackPanelRemoved), 1);

            if ("CURSOR" === this.type) {
                this.trackContainerDiv.removeChild(trackPanelRemoved.cursorTrackContainer);
            } else {
                this.trackContainerDiv.removeChild(trackPanelRemoved.trackDiv);
            }

        }

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

        this.trackViews.forEach(function (panel) {
            panel.setTrackHeight(newHeight);
        });

    };

    igv.Browser.prototype.resize = function () {
        if (this.ideoPanel) this.ideoPanel.resize();
        if (this.karyoPanel) this.karyoPanel.resize();
        this.trackViews.forEach(function (panel) {
            panel.resize();
        })
    };

    igv.Browser.prototype.repaint = function () {

        if (this.ideoPanel) {
            this.ideoPanel.repaint();
        }

        if (this.karyoPanel) {
            this.karyoPanel.repaint();
        }
        this.trackViews.forEach(function (trackView) {
            trackView.repaint();
        });

        if (this.cursorModel) {
            this.horizontalScrollbar.update();
        }

    };

    igv.Browser.prototype.update = function () {

        this.updateLocusSearch(this.referenceFrame);

        if (this.ideoPanel) {
            this.ideoPanel.repaint();
        }

        if (this.karyoPanel) {
            this.karyoPanel.repaint();
        }

        this.trackViews.forEach(function (trackPanel) {
            trackPanel.update();
        });

        if (this.cursorModel) {
            this.horizontalScrollbar.update();
        }
    };

    igv.Browser.prototype.updateLocusSearch = function (referenceFrame) {

        var chr,
            ss,
            ee,
            str,
            end,
            chromosome;


        if (this.searchInput) {

            chr = referenceFrame.chr;
            ss = igv.numberFormatter(Math.floor(referenceFrame.start + 1));

            end = referenceFrame.start + this.trackViewportWidthBP();
            if (this.genome) {
                chromosome = this.genome.getChromosome(chr);
                if (chromosome) end = Math.min(end, chromosome.bpLength);
            }

            ee = igv.numberFormatter(Math.floor(end));

            str = chr + ":" + ss + "-" + ee;
            this.searchInput.val(str);

            this.windowSizePanel.update(Math.floor(end - referenceFrame.start));
        }

    };

    /**
     * Return the visible width of a track.  All tracks should have the same width.
     */
    igv.Browser.prototype.trackViewportWidth = function () {

        var width;

        if (this.trackViews && this.trackViews.length > 0) {
            width = this.trackViews[0].viewportDiv.clientWidth;
        }
        else {
            width = this.trackContainerDiv.clientWidth;
        }

        return width;

    };

    igv.Browser.prototype.pixelPerBasepairThreshold = function () {
        return 14.0;
    };

    igv.Browser.prototype.trackViewportWidthBP = function () {
        return this.referenceFrame.bpPerPixel * this.trackViewportWidth();
    };

    igv.Browser.prototype.removeAllTracks = function () {
        var tracks = this.trackViews;

        for (var i = 0; i < tracks.length; i++) {
            var track = this.trackViews[i].track;
            this.removeTrack(track);
        }
    };

    igv.Browser.prototype.setGotoCallback = function (gotocallback) {
        this.gotocallback = gotocallback;
    };

    igv.Browser.prototype.goto = function (chr, start, end) {

        if (typeof this.gotocallback != "undefined") {
            //console.log("Got chr="+chr+", start="+start+", end="+end+", also using callback "+this.gotocallback);
            this.gotocallback(chr, start, end);
        }

        var w,
            chromosome,
            viewportWidth = this.trackViewportWidth();

        if (igv.popover) {
            igv.popover.hide();
        }

        // Translate chr to official name
        if (this.genome) {
            chr = this.genome.getChromosomeName(chr);
        }

        this.referenceFrame.chr = chr;

        // If end is undefined,  interpret start as the new center, otherwise compute scale.
        if (!end) {
            w = Math.round(viewportWidth * this.referenceFrame.bpPerPixel / 2);
            start = Math.max(0, start - w);
        }
        else {
            this.referenceFrame.bpPerPixel = (end - start) / (viewportWidth);
        }

        if (this.genome) {
            chromosome = this.genome.getChromosome(this.referenceFrame.chr);
            if (!chromosome) {
                if (console && console.log) console.log("Could not find chromsome " + this.referenceFrame.chr);
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
        }

        this.referenceFrame.start = start;

        this.update();

    };

// Zoom in by a factor of 2, keeping the same center location
    igv.Browser.prototype.zoomIn = function () {

        var newScale,
            center,
            viewportWidth;

        viewportWidth = this.trackViewportWidth();

        newScale = Math.max(1.0 / this.pixelPerBasepairThreshold(), this.referenceFrame.bpPerPixel / 2);
        if (newScale === this.referenceFrame.bpPerPixel) {
            //console.log("zoom in bail bpp " + newScale + " width " + (viewportWidth/14.0));
            return;
        }

        center = this.referenceFrame.start + this.referenceFrame.bpPerPixel * viewportWidth / 2;
        this.referenceFrame.start = center - newScale * viewportWidth / 2;
        this.referenceFrame.bpPerPixel = newScale;
        this.update();
    };

// Zoom out by a factor of 2, keeping the same center location if possible
    igv.Browser.prototype.zoomOut = function () {

        var newScale, maxScale, center, chrLength, widthBP, viewportWidth;
        viewportWidth = this.trackViewportWidth();

        newScale = this.referenceFrame.bpPerPixel * 2;
        chrLength = 250000000;
        if (this.genome) {
            var chromosome = this.genome.getChromosome(this.referenceFrame.chr);
            if (chromosome) {
                chrLength = chromosome.bpLength;
            }
        }
        maxScale = chrLength / viewportWidth;
        if (newScale > maxScale) newScale = maxScale;

        center = this.referenceFrame.start + this.referenceFrame.bpPerPixel * viewportWidth / 2;
        widthBP = newScale * viewportWidth;

        this.referenceFrame.start = Math.round(center - widthBP / 2);

        if (this.referenceFrame.start < 0) this.referenceFrame.start = 0;
        else if (this.referenceFrame.start > chrLength - widthBP) this.referenceFrame.start = chrLength - widthBP;

        this.referenceFrame.bpPerPixel = newScale;
        this.update();
    };


    igv.Browser.prototype.search = function (feature, continuation) {

        // See if we're ready to respond to a search, if not just queue it up and return
        if (igv.browser === undefined || igv.browser.genome === undefined) {
            igv.browser.initialLocus = feature;
            if (continuation) continuation();
            return;
        }


        var type,
            chr,
            posTokens,
            start,
            end,
            searchConfig,
            tokens,
            url,
            chromosome,
            result;

        if (feature.contains(":") && feature.contains("-") || this.genome.getChromosome(feature)) {

            type = "locus";
            tokens = feature.split(":");
            chr = this.genome.getChromosomeName(tokens[0]);

            if (tokens.length == 1) {
                chromosome = this.genome.getChromosome(feature);
                start = 0;
                end = chromosome.bpLength;
            }
            else {
                posTokens = tokens[1].split("-");
                start = parseInt(posTokens[0].replace(/,/g, "")) - 1;
                end = parseInt(posTokens[1].replace(/,/g, ""));
            }

            if (end > start) {
                this.goto(chr, start, end);
                fireOnsearch.call(igv.browser, feature, type);
            }

            if (continuation) continuation();

        }
        else {

            // Try local feature cache first
            result = this.featureDB[feature.toUpperCase()];
            if (result) {
                handleSearchResult(result.name, result.chr, result.start, result.end, "");
            }

            else if (this.searchConfig) {
                url = this.searchConfig.url.replace("$FEATURE$", feature);
                searchConfig = this.searchConfig;

                if (url.indexOf("$GENOME$") > -1) {
                    var genomeId = this.genome.id ? this.genome.id : "hg19";
                    url.replace("$GENOME$", genomeId);
                }

                igv.loadData(url, function (data) {

                    var results = ("plain" === searchConfig.type) ? parseSearchResults(data) : JSON.parse(data);

                    if (searchConfig.resultsField) {
                        results = results[searchConfig.resultsField];
                    }

                    if (results.length == 0) {
                        alert('No feature found with name "' + feature + '"');
                    }
                    else if (results.length == 1) {

                        // Just take the first result for now
                        // TODO - merge results, or ask user to choose

                        r = results[0];
                        chr = r[searchConfig.chromosomeField];
                        start = r[searchConfig.startField] - searchConfig.coords;
                        end = r[searchConfig.endField];
                        type = r["featureType"];
                        handleSearchResult(feature, chr, start, end, chr, type);
                    }
                    else {
                        presentSearchResults(results, searchConfig, feature);
                    }

                    if (continuation) continuation();
                });
            }
        }


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
                    locus["featureType"]);

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
                    featureType: ("gtex" === source ? "snp" : "gene")
                });

            }

        });

        return results;

    }

    function handleSearchResult(name, chr, start, end, type) {

        igv.browser.selection = new igv.GtexSelection('gtex' === type || 'snp' === type ? {snp: name} : {gene: name});

        if (igv.browser.flanking) {
            start -= igv.browser.flanking;
            end += igv.browser.flanking;
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

    function addTrackContainerHandlers(trackContainerDiv) {

        var isRulerTrack = false,
            isMouseDown = false,
            lastMouseX = undefined,
            mouseDownX = undefined;

        $(trackContainerDiv).mousedown(function (e) {

            var coords = igv.translateMouseCoordinates(e, trackContainerDiv);

            isRulerTrack = ($(e.target).parent().parent().parent()[0].dataset.rulerTrack) ? true : false;

            if (isRulerTrack) {
                return;
            }

            isMouseDown = true;
            lastMouseX = coords.x;
            mouseDownX = lastMouseX;
        });

        $(trackContainerDiv).mousemove(igv.throttle(function (e) {

            var coords = igv.translateMouseCoordinates(e, trackContainerDiv),
                maxEnd,
                maxStart,
                referenceFrame = igv.browser.referenceFrame,
                isCursor = igv.browser.cursorModel;

            if (isRulerTrack) {
                return;
            }

            if (!referenceFrame) {
                return;
            }

            if (isMouseDown) { // Possibly dragging

                if (mouseDownX && Math.abs(coords.x - mouseDownX) > igv.constants.dragThreshold) {

                    referenceFrame.shiftPixels(lastMouseX - coords.x);

                    // TODO -- clamping code below is broken for regular IGV => disabled for now, needs fixed


                    // clamp left
                    referenceFrame.start = Math.max(0, referenceFrame.start);

                    // clamp right
                    if (isCursor) {
                        maxEnd = igv.browser.cursorModel.filteredRegions.length;
                        maxStart = maxEnd - igv.browser.trackViewportWidth() / igv.browser.cursorModel.framePixelWidth;
                    }
                    else {
                        var chromosome = igv.browser.genome.getChromosome(referenceFrame.chr);
                        maxEnd = chromosome.bpLength;
                        maxStart = maxEnd - igv.browser.trackViewportWidth() * referenceFrame.bpPerPixel;
                    }

                    if (referenceFrame.start > maxStart) referenceFrame.start = maxStart;

                    igv.browser.updateLocusSearch(referenceFrame);


                    igv.browser.repaint();
                }

                lastMouseX = coords.x;

            }

        }, 10));

        $(trackContainerDiv).mouseup(function (e) {

            if (isRulerTrack) {
                return;
            }

            mouseDownX = undefined;
            isMouseDown = false;
            lastMouseX = undefined;
        });

        $(trackContainerDiv).mouseleave(function (e) {

            if (isRulerTrack) {
                return;
            }
            isMouseDown = false;
            lastMouseX = undefined;
            mouseDownX = undefined;
        });

        $(trackContainerDiv).dblclick(function (e) {

            if (isRulerTrack) {
                return;
            }

            if (e.altKey) return;  // Ignore if alt key is down

            e = $.event.fix(e);   // Sets pageX and pageY for browsers that don't support them

            var canvasCoords = igv.translateMouseCoordinates(e, trackContainerDiv),
                referenceFrame = igv.browser.referenceFrame;

            if (!referenceFrame) return;

            var newCenter = Math.round(referenceFrame.start + canvasCoords.x * referenceFrame.bpPerPixel);
            referenceFrame.bpPerPixel /= 2;
            if (igv.browser.cursorModel) {
                igv.browser.cursorModel.framePixelWidth *= 2;
            }
            igv.browser.goto(referenceFrame.chr, newCenter);

        });

    }

    return igv;
})
(igv || {});


