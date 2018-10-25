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
        let str;

        this.guid = igv.guid();

        this.namespace = '.browser_' + this.guid;

        this.config = options;

        this.$root = $('<div class="igv-root-div">');

        initialize.call(this, options);

        this.trackContainerDiv = trackContainerDiv;

        this.trackViews = [];

        this.trackLabelsVisible = true;
        this.centerGuideVisible = false;
        this.cursorGuideVisible = false;

        this.featureDB = {};   // Hash of name -> feature, used for search function.

        this.constants = {
            dragThreshold: 3,
            scrollThreshold: 5,
            defaultColor: "rgb(0,0,150)",
            doubleClickDelay: options.doubleClickDelay || 500
        };

        // Map of event name -> [ handlerFn, ... ]
        this.eventHandlers = {};

        addMouseHandlers.call(this);

    };

    function initialize(options) {
        var genomeId;

        this.flanking = options.flanking;
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
                geneField: options.search.geneField || "gene",
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
                endField: "end",
                geneField: "gene",
                snpField: "snp"

            }
        }
    }

    igv.hasKnownFileExtension = function (config) {
        var extension = igv.getExtension(config);

        if (undefined === extension) {
            return false;
        }
        return igv.knownFileExtensions.has(extension);
    };

    igv.Browser.prototype.renderSVG = function ($container) {

        const trackContainerBBox = this.trackContainerDiv.getBoundingClientRect();
        const anyViewportContainerBBox = this.trackViews[ 0 ].$viewportContainer.get(0).getBoundingClientRect();
        const ideoPanelBBox = this.ideoPanel ? this.ideoPanel.panels[ 0 ].$ideogram.get(0).getBoundingClientRect() : { height: 0, width: 0 };

        const w = anyViewportContainerBBox.width;
        const h_output = trackContainerBBox.height + ideoPanelBBox.height;
        const h_render = 8000;

        let svgContext = new C2S(
            {

                width: w,
                height: h_render,

                viewbox:
                    {
                        x: 0,
                        y: 0,
                        width: w,
                        height: h_render
                    }

            });

        // accumulate svg rendering in svg context
        // ideoPanel -> SVG
        if (this.ideoPanel) {
            this.ideoPanel.renderSVGContext(svgContext, { deltaX: 0, deltaY: 0 });
        }

        // tracks -> SVG
        for (let trackView of this.trackViews) {
            trackView.renderSVGContext(svgContext, {deltaX: 0, deltaY: (ideoPanelBBox.height - trackContainerBBox.y)});
        }

        // reset height to trim away unneeded svg canvas real estate. Yes, a bit of a hack.
        svgContext.setHeight(h_output);

        let svg = svgContext.getSerializedSvg(true);

        if ($container) {
            $container.empty();
            $container.width(anyViewportContainerBBox.width);
            $container.append( svg );
        }

        const filename = 'igv.svg';
        const data = URL.createObjectURL(new Blob([svg], { type: "application/octet-stream" }));
        igv.download(filename, data);

    };


    /**
     * Load a session
     *
     * @param sessionURL
     * @param config
     * @returns {*}
     */
    igv.Browser.prototype.loadSession = function (sessionURL, config) {

        var self = this;

        if (!config) config = {};

        self.removeAllTracks(true);

        igv.TrackView.DisableUpdates = true;

        return loadSessionFile(sessionURL)

            .then(function (session) {
                // Merge session json with config object
                if (session) {
                    Object.assign(config, session);
                }
                return config;
            })

            .then(function (config) {
                return self.loadGenome(config.reference || config.genome, config.locus)
            })

            .then(function (genome) {

                // Restore gtex selections.  
                if (config.gtexSelections) {

                    const genomicStates = {};

                    for (let gs of self.genomicStateList) {
                        genomicStates[gs.locusSearchString] = gs;
                    }

                    for (let s of Object.getOwnPropertyNames(config.gtexSelections)) {
                        const gs = genomicStates[s];
                        if (gs) {
                            const gene = config.gtexSelections[s].gene;
                            const snp = config.gtexSelections[s].snp;
                            gs.selection = new igv.GtexSelection(gene, snp);
                        }
                    }
                }

                return genome;
            })

            .then(function (genome) {

                if (config.roi) {
                    self.roi = [];
                    config.roi.forEach(function (r) {
                        self.roi.push(new igv.ROI(r, self.genome));
                    });
                }

                if (config.tracks) {
                    return self.loadTrackList(config.tracks);
                }

            })

            .then(function (ignore) {

                var panelWidth;

                if (true === config.showIdeogram) {
                    panelWidth = self.viewportContainerWidth() / self.genomicStateList.length;
                    self.ideoPanel = new igv.IdeoPanel(self.$contentHeader, panelWidth, self);
                    self.ideoPanel.repaint();
                }

                self.updateLocusSearchWidget(self.genomicStateList[0]);

                self.windowSizePanel.updateWithGenomicState(self.genomicStateList[0]);

            })

            .then(function (ignore) {

                igv.TrackView.DisableUpdates = false;
                // Resize is called to address minor alignment problems with multi-locus view.
                self.resize();

            })

            .catch(function (error) {
                self.presentAlert(error, undefined);
                console.log(error);
            });

        function loadSessionFile(urlOrFile) {

            var filename, knownGenomes;

            if (!urlOrFile) {
                return Promise.resolve(undefined);
            }

            filename = (typeof urlOrFile === 'string' ? igv.getFilename(urlOrFile) : urlOrFile.name);

            if (filename.startsWith("blob:") || filename.startsWith("data:")) {
                var json = igv.Browser.uncompressSession(urlOrFile.substring(5));
                return Promise.resolve(JSON.parse(json));
            }
            else if (filename.endsWith(".xml")) {
                return igv.GenomeUtils.getKnownGenomes()
                    .then(function (g) {
                        knownGenomes = g;
                        return igv.xhr.loadString(urlOrFile)
                    })
                    .then(function (string) {
                        return new igv.XMLSession(string, knownGenomes);
                    })
            }
            else if (filename.endsWith(".json")) {
                return igv.xhr.loadJson(urlOrFile);
            } else {
                return Promise.resolve(undefined);
            }

        }

    }

    igv.Browser.prototype.loadGenome = function (idOrConfig, initialLocus) {

        var self = this,
            genomeChange,
            genomeConfig;

        // idOrConfig might be json
        if (igv.isString(idOrConfig) && idOrConfig.startsWith("{")) {
            try {
                idOrConfig = JSON.parse(idOrConfig);
            } catch (e) {
                console.error(e);
                // Apparently its not json,  just continue
            }
        }

        return expandReference(idOrConfig)

            .then(function (config) {

                genomeConfig = config;

                return igv.GenomeUtils.loadGenome(config);
            })

            .then(function (genome) {

                genomeChange = self.genome && (self.genome.id !== genome.id);
                self.genome = genome;
                self.$current_genome.text(genome.id || '');
                self.$current_genome.attr('title', genome.id || '');
                self.chromosomeSelectWidget.update(genome);

                if (genomeChange) {
                    self.removeAllTracks();
                }
                return genome;
            })

            .then(function (genome) {
                self.genome = genome;
                return self.search(getInitialLocus(initialLocus, genome), true);
            })

            .catch(function (error) {
                // Couldn't find initial locus
                console.error(error);
                return self.search(self.genome.getHomeChromosomeName());
            })

            .then(function (genomicStateList) {

                self.genomicStateList = genomicStateList;

                if (self.genomicStateList.length > 0) {
                    
                    if (!self.rulerTrack && false !== self.config.showRuler) {
                        self.rulerTrack = new igv.RulerTrack(self);
                        self.addTrack(self.rulerTrack);
                    }

                } else {
                    let errorString = 'Unrecognized locus ' + self.config.locus;
                    self.presentAlert(errorString, undefined);
                }

                if (genomeConfig.tracks) {
                    return self.loadTrackList(genomeConfig.tracks);
                } else {
                    return [];
                }
            })
            .then(function (ignore) {

                self.resize();    // Force recomputation and repaint

                return self.genome;
            })


        // Expand a genome id to a reference object, if needed
        function expandReference(conf) {

            var genomeID;

            if (igv.isString(conf)) {
                genomeID = conf;
            }
            else if (conf.genome) {
                genomeID = conf.genome;
            }
            else if (conf.id !== undefined && conf.fastaURL === undefined) {
                // Backward compatibility
                genomeID = conf.id;
            }

            if (genomeID) {
                return igv.GenomeUtils.getKnownGenomes()

                    .then(function (knownGenomes) {

                        var reference = knownGenomes[genomeID];
                        if (!reference) {
                            self.presentAlert("Uknown genome id: " + genomeID, undefined);
                        }
                        return reference;
                    })
            }
            else {
                return Promise.resolve(conf);
            }
        }

        function getInitialLocus(locus, genome) {

            var loci = [];

            if (locus) {
                if (Array.isArray(locus)) {
                    loci = locus.join(' ');

                } else {
                    loci = locus;
                }
            }
            else {
                loci = genome.getHomeChromosomeName();
            }

            return loci;
        }
    };


    igv.Browser.prototype.isMultiLocus = function () {
        return this.genomicStateList && this.genomicStateList.length > 1;
    };

    //
    igv.Browser.prototype.updateUIWithGenomicStateListChange = function (genomicStateList) {

        // multi-locus mode
        if (genomicStateList.length > 1) {
            this.centerGuide.disable();
            this.zoomWidget.hideSlider();
        }
        // whole-genome
        else if ('all' === genomicStateList[0].locusSearchString) {
            this.centerGuide.disable();
            this.disableZoomWidget();
        }
        // single locus
        else {
            this.centerGuide.enable();
            this.enableZoomWidget();
            this.zoomWidget.showSlider();
        }

        toggleTrackLabels(this.trackViews, this.trackLabelsVisible);

    };

    // track labels
    igv.Browser.prototype.setTrackLabelName = function (trackView, name) {

        trackView.viewports.forEach((viewport) => {
            igv.setTrackLabel(viewport.$trackLabel, trackView.track, name);
        });

    };

    igv.Browser.prototype.hideTrackLabels = function () {
        this.trackLabelsVisible = false;
        toggleTrackLabels(this.trackViews, this.trackLabelsVisible);
    };

    igv.Browser.prototype.showTrackLabels = function () {
        this.trackLabelsVisible = true;
        toggleTrackLabels(this.trackViews, this.trackLabelsVisible);
    };

    function toggleTrackLabels (trackViews, isVisible) {

        for (let trackView of trackViews) {
            for (let viewport of trackView.viewports) {
                if (viewport.$trackLabel) {
                    if (0 === trackView.viewports.indexOf(viewport) && true === isVisible) {
                        viewport.$trackLabel.show();
                    } else {
                        viewport.$trackLabel.hide();
                    }
                }
            }
        }
    }

    // cursor guide
    igv.Browser.prototype.hideCursorGuide = function () {
        this.cursorGuide.$guide.hide();
        this.cursorGuideVisible = false;
    };

    // // Guide line is bound within track area, and offset by 5 pixels so as not to interfere mouse clicks.
    // $(this.trackContainerDiv).on('mousemove.cursorTrackingGuide', igv.throttle(function (e) {
    //     var exe;
    //
    //     e.preventDefault();
    //
    //     exe = Math.max(50, igv.translateMouseCoordinates(e, self.trackContainerDiv).x);
    //     exe = Math.min(self.trackContainerDiv.clientWidth - 65, exe);
    //
    //     self.$cursorTrackingGuide.css({left: exe + 'px'});
    // }, 10));


    igv.Browser.prototype.showCursorGuide = function () {
        this.cursorGuide.$guide.show();
        this.cursorGuideVisible = true;
    };

    // center guide
    igv.Browser.prototype.hideCenterGuide = function () {
        this.centerGuide.$container.hide();
        this.centerGuideVisible = false;
    };

    igv.Browser.prototype.showCenterGuide = function () {
        this.centerGuide.$container.show();
        this.centerGuide.resize();
        this.centerGuideVisible = true;
    };

    igv.Browser.prototype.disableZoomWidget = function () {
        this.zoomWidget.hide();
    };

    igv.Browser.prototype.enableZoomWidget = function () {
        this.zoomWidget.show();
    };

    igv.Browser.prototype.loadTrackList = function (configList) {

        const self = this;

        const unloadableTracks = configList.filter(function (config) {
            return !knowHowToLoad(config);
        })


        if (unloadableTracks.length > 0) {
            let message = "The following tracks could not be loaded.  Are these local files?";
            unloadableTracks.forEach(function (config) {
                message += ", " + config.name;
            })
            self.presentAlert(message);
        }


        const promises = [];
        configList.filter(knowHowToLoad).forEach(function (config) {
            promises.push(self.loadTrack(config));
        });

        return Promise.all(promises)

            .then(function (loadedTracks) {

                const groupAutoscaleViews = self.trackViews.filter(function (trackView) {
                    return trackView.track.autoscaleGroup
                })

                if (groupAutoscaleViews.length > 0) {
                    self.updateViews(self.genomicStateList[0], groupAutoscaleViews);
                }

                return loadedTracks;
            })
    };


    function knowHowToLoad(config) {

        // config might be json
        if (igv.isString(config)) {
            config = JSON.parse(config);
        }

        const url = config.url;
        const features = config.features;
        return undefined === url || igv.isString(url) || igv.isFilePath(url);
    }

    /**
     * Return a promise to load a track
     *
     * @param config
     * @returns {*}
     */
    igv.Browser.prototype.loadTrack = function (config) {

        var self = this;

        // config might be json
        if (igv.isString(config)) {
            config = JSON.parse(config);
        }

        if (!knowHowToLoad(config)) {
            self.presentAlert("The following track could not be loaded.  Is this a local files? " + config.name);
            return Promise.resolve();
        }

        return resolveTrackProperties(config)

            .then(function (config) {

                var settings,
                    property,
                    newTrack;

                igv.inferTrackTypes(config);

                // Set defaults if specified
                if (self.trackDefaults && config.type) {
                    settings = self.trackDefaults[config.type];
                    if (settings) {
                        for (property in settings) {
                            if (settings.hasOwnProperty(property) && config[property] === undefined) {
                                config[property] = settings[property];
                            }
                        }
                    }
                }

                newTrack = igv.createTrack(config, self);

                if (undefined === newTrack) {
                    self.presentAlert("Unknown file type: " + config.url, undefined);
                    return newTrack;
                }

                // Set order field of track here.  Otherwise track order might get shuffled during asynchronous load
                if (undefined === newTrack.order) {
                    newTrack.order = self.trackViews.length;
                }

                self.addTrack(newTrack);

                return newTrack;
            })
            .then(function (newTrack) {
                return postInit(newTrack)
            })

        function resolveTrackProperties(config) {

            if (igv.isString(config.url) && config.url.startsWith("https://drive.google.com")) {

                return igv.google.getDriveFileInfo(config.url)

                    .then(function (json) {

                        config.url = "https://www.googleapis.com/drive/v3/files/" + json.id + "?alt=media";

                        if (!config.filename) {
                            config.filename = json.originalFileName;
                        }
                        if (!config.format) {
                            config.format = igv.inferFileFormat(config.filename);
                        }
                        if (config.indexURL && config.indexURL.startsWith("https://drive.google.com")) {
                            config.indexURL = igv.google.driveDownloadURL(config.indexURL);
                        }

                        return config;
                    })


            }
            else {
                if (config.url && !config.filename) {
                    config.filename = igv.getFilename(config.url);
                }

                return Promise.resolve(config);
            }


        }

        function postInit(track) {

            if (track && typeof track.postInit === 'function') {
                return track.postInit();
            }
            else {
                return Promise.resolve(track);
            }

        }


        function resolveTrackProperties(config) {

            if (igv.isString(config.url) && config.url.startsWith("https://drive.google.com")) {

                return igv.google.getDriveFileInfo(config.url)

                    .then(function (json) {

                        config.url = "https://www.googleapis.com/drive/v3/files/" + json.id + "?alt=media";

                        if (!config.filename) {
                            config.filename = json.originalFileName;
                        }
                        if (!config.format) {
                            config.format = igv.inferFileFormat(config.filename);
                        }
                        if (config.indexURL && config.indexURL.startsWith("https://drive.google.com")) {
                            config.indexURL = igv.google.driveDownloadURL(config.indexURL);
                        }

                        return config;
                    })


            }
            else {
                if (config.url && !config.filename) {
                    config.filename = igv.getFilename(config.url);
                }

                return Promise.resolve(config);
            }


        }
    }


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
        trackView = new igv.TrackView(this, $(this.trackContainerDiv), track);
        this.trackViews.push(trackView);

        toggleTrackLabels(this.trackViews, this.trackLabelsVisible);

        this.reorderTracks();
        if (!track.autoscaleGroup) {
            // Group autoscale groups will get updated later (as a group)
            trackView.updateViews();
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
            $(trackPanelRemoved.trackDiv).remove();
            this.fireEvent('trackremoved', [trackPanelRemoved.track]);
            trackPanelRemoved.dispose();
        }

    };

    /**
     * API function
     */
    igv.Browser.prototype.removeAllTracks = function (removeSequence) {
        var self = this,
            newTrackViews = [];

        for(let tv of this.trackViews) {



            if ((removeSequence || tv.track.id !== 'sequence') && tv.track.id !== 'ruler') {
                self.trackContainerDiv.removeChild(tv.trackDiv);
                self.fireEvent('trackremoved', [tv.track]);
                tv.dispose();
            } else {
                newTrackViews.push(tv);
            }
        }

        this.trackViews = newTrackViews;

    }

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

    igv.Browser.prototype.setTrackHeight = function (newHeight) {

        this.trackHeight = newHeight;

        this.trackViews.forEach(function (trackView) {
            trackView.setTrackHeight(newHeight);
        });

    };

    igv.Browser.prototype.visibilityChange = function () {
        this.resize();
    }

    igv.Browser.prototype.resize = function () {

        const self = this;

        // Recompute bpPerPixel -- if previous width was zero this can be infinity
        const viewportWidth = this.viewportWidth();

        if(viewportWidth === 0) {
            return;
        }

        if (this.genomicStateList && viewportWidth > 0) {
            this.genomicStateList.forEach(function (gstate) {
                const referenceFrame = gstate.referenceFrame;
                if (!isFinite(referenceFrame.bpPerPixel) && undefined !== referenceFrame.initialEnd) {
                    referenceFrame.bpPerPixel = (referenceFrame.initialEnd - referenceFrame.start) / viewportWidth;
                }
            })
        }

        if (this.genomicStateList && 1 === this.genomicStateList.length && resizeWillExceedChromosomeLength(this.genomicStateList[0])) {

            this.search(this.genomicStateList[0].chromosome.name);

        } else {

            if (this.ideoPanel) this.ideoPanel.resize();
            if (this.centerGuide) this.centerGuide.resize();
            this.trackViews.forEach(function (trackView) {
                trackView.resize();
            })
        }

        if (this.genomicStateList && this.genomicStateList.length > 0) {
            this.updateLocusSearchWidget(this.genomicStateList[0]);
            this.windowSizePanel.updateWithGenomicState(this.genomicStateList[0]);
        }

        this.updateViews();

        function resizeWillExceedChromosomeLength(genomicState) {

            const pixel = self.viewportContainerWidth();
            const bpp = genomicState.referenceFrame.bpPerPixel;
            const bp = pixel * bpp;
            return (bp > genomicState.chromosome.bpLength);
        }

    };

    igv.Browser.prototype.updateViews = function (genomicState, views) {

        var self = this,
            groupAutoscaleTracks, otherTracks;

        if (!genomicState) {
            genomicState = this.genomicStateList[0];
        }
        if (!views) {
            views = this.trackViews;
        }

        this.updateLocusSearchWidget(genomicState);

        this.windowSizePanel.updateWithGenomicState(genomicState);

        if (this.ideoPanel) {
            this.ideoPanel.repaint();
        }
        if (this.centerGuide) {
            this.centerGuide.repaint();
        }

        // Don't autoscale while dragging.
        if (self.isDragging) {
            views.forEach(function (trackView) {
                trackView.updateViews();
            })
        }
        else {
            // Group autoscale
            groupAutoscaleTracks = {};
            otherTracks = [];
            views.forEach(function (trackView) {
                var group = trackView.track.autoscaleGroup;
                if (group) {
                    var l = groupAutoscaleTracks[group];
                    if (!l) {
                        l = [];
                        groupAutoscaleTracks[group] = l;
                    }
                    l.push(trackView);
                }
                else {
                    otherTracks.push(trackView);
                }
            })

            Object.keys(groupAutoscaleTracks).forEach(function (group) {

                var groupTrackViews, promises;

                groupTrackViews = groupAutoscaleTracks[group];
                promises = [];

                groupTrackViews.forEach(function (trackView) {
                    promises.push(trackView.getInViewFeatures());
                });

                Promise.all(promises)

                    .then(function (featureArray) {

                        var allFeatures = [], dataRange;

                        featureArray.forEach(function (features) {
                            allFeatures = allFeatures.concat(features);
                        })
                        dataRange = igv.doAutoscale(allFeatures);

                        groupTrackViews.forEach(function (trackView) {
                            trackView.track.dataRange = dataRange;
                            trackView.track.autoscale = false;
                            trackView.updateViews();
                        })
                    })
            })

            otherTracks.forEach(function (trackView) {
                trackView.updateViews();
            })
        }
    };


    igv.Browser.prototype.loadInProgress = function () {
        var i;
        for (i = 0; i < this.trackViews.length; i++) {
            if (this.trackViews[i].isLoading()) return true;
        }
        return false;
    };

    igv.Browser.prototype.updateLocusSearchWidget = function (genomicState) {

        var self = this,
            referenceFrame,
            ss,
            ee,
            str,
            end,
            chromosome;


        if (this.rulerTrack) {
            this.rulerTrack.updateLocusLabel();
        }

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

    /**
     * Return the visible width of a track.  All tracks should have the same width.
     */
    igv.Browser.prototype.viewportContainerWidth = function () {

        if (this.trackViews && this.trackViews.length > 0) {

            return this.trackViews[0].$viewportContainer.width();
        } else {

            return syntheticViewportContainerWidth.call(this);
        }

        function syntheticViewportContainerWidth() {

            var $track,
                $viewportContainer,
                width;

            $track = $('<div class="igv-track-div">');
            $(this.trackContainerDiv).append($track);

            $viewportContainer = $('<div class="igv-viewport-container">');
            $track.append($viewportContainer);

            width = $viewportContainer.width();

            // discard temporary DOM elements
            $track.remove();

            return width;
        }

    };

    igv.Browser.prototype.viewportWidth = function () {
        var cw,
            vw;

        cw = this.viewportContainerWidth();
        vw = (undefined === this.genomicStateList || 1 === this.genomicStateList.length) ? cw : Math.round(cw / this.genomicStateList.length);

        return vw;
    };

    igv.Browser.prototype.minimumBases = function () {
        return this.config.minimumBases;
    };

    igv.Browser.prototype.updateZoomSlider = function ($slider) {

        const viewport = this.trackViews[0].viewports[0];
        const referenceFrame = viewport.genomicState.referenceFrame;

        const a = this.getChromosomeLengthBP(this.genome, referenceFrame)/viewport.$viewport.width();
        const b = this.minimumBases()/viewport.$viewport.width();
        const percentage = referenceFrame.bpPerPixel/ Math.abs(a - b);

        const value = Math.round(100 * (1.0 - percentage));

        $slider.val(value);

    };

    igv.Browser.prototype.zoomWithRangePercentage = function (percentage) {

        if (this.loadInProgress()) {
            return;
        }

        let self = this;
        this.trackViews[0].viewports.forEach((viewport) => {

            let referenceFrame = viewport.genomicState.referenceFrame;

            const centerBP = referenceFrame.start + referenceFrame.toBP(viewport.$viewport.width()/2.0);

            const chromosomeLengthBP = self.getChromosomeLengthBP(self.genome, referenceFrame);

            const bpp = igv.Math.lerp(chromosomeLengthBP/viewport.$viewport.width(), this.minimumBases()/viewport.$viewport.width(), percentage);

            const viewportWidthBP = bpp * viewport.$viewport.width();

            referenceFrame.start = igv.Math.clamp(Math.round(centerBP - (viewportWidthBP/2.0)), 0, chromosomeLengthBP - viewportWidthBP);

            referenceFrame.bpPerPixel = bpp;

            self.updateViews(viewport.genomicState);

        });

    };

    igv.Browser.prototype.zoom = function (scaleFactor) {
        let nuthin = undefined;
        this.zoomWithScaleFactor(nuthin, nuthin, scaleFactor)
    };

    // Zoom in by a factor of 2, keeping the same center location
    igv.Browser.prototype.zoomIn = function () {
        let nuthin = undefined;
        this.zoomWithScaleFactor(nuthin, nuthin, 0.5)
    };

    // Zoom out by a factor of 2, keeping the same center location if possible
    igv.Browser.prototype.zoomOut = function () {
        let nuthin = undefined;
        this.zoomWithScaleFactor(nuthin, nuthin, 2.0)
    };

    igv.Browser.prototype.zoomWithScaleFactor = function (centerBPOrUndefined, viewportOrUndefined, scaleFactor) {

        if (this.loadInProgress()) {
            return;
        }

        let self = this;

        let viewports = viewportOrUndefined ? [ viewportOrUndefined ] : this.trackViews[0].viewports;
        viewports.forEach((viewport) => {

            const chromosomeLengthBP = self.getChromosomeLengthBP(self.genome, viewport.genomicState.referenceFrame);
            const bppThreshold = scaleFactor < 1.0 ? self.minimumBases()/viewport.$viewport.width() : chromosomeLengthBP/viewport.$viewport.width();

            const centerBP = undefined === centerBPOrUndefined ? (viewport.genomicState.referenceFrame.start + viewport.genomicState.referenceFrame.toBP(viewport.$viewport.width()/2.0)) : centerBPOrUndefined;

            let bpp;

            if(scaleFactor < 1.0) {
                bpp = Math.max(viewport.genomicState.referenceFrame.bpPerPixel * scaleFactor, bppThreshold);
            } else {
                bpp = Math.min(viewport.genomicState.referenceFrame.bpPerPixel * scaleFactor, bppThreshold);
            }

            const viewportWidthBP = bpp * viewport.$viewport.width();

            viewport.genomicState.referenceFrame.start = igv.Math.clamp(Math.round(centerBP - (viewportWidthBP/2.0)), 0, chromosomeLengthBP - viewportWidthBP);

            viewport.genomicState.referenceFrame.bpPerPixel = bpp;

            self.updateViews(viewport.genomicState);

        });


    };

    igv.Browser.prototype.getChromosomeLengthBP =  function (genome, referenceFrame) {

        if (genome && genome.getChromosome(referenceFrame.chrName)) {
            return genome.getChromosome(referenceFrame.chrName).bpLength;
        } else {
            return 250000000;
        }

    };

    igv.Browser.prototype.presentSplitScreenMultiLocusPanel = function (alignment, genomicState) {

        const genome = this.genome;

        var referenceFrame,
            viewportWidth,
            leftMatePairGenomicState,
            rightMatePairGenomicState;

        // account for reduced viewport width as a result of adding right mate pair panel
        viewportWidth = (this.viewportContainerWidth() / (1 + this.genomicStateList.length));

        // adjust left mate pair reference frame
        leftMatePairGenomicState = genomicState;
        referenceFrame = leftMatePairGenomicState.referenceFrame;
        leftMatePairGenomicState.referenceFrame = createReferenceFrame(alignment.chr, referenceFrame.bpPerPixel, viewportWidth, alignment.start, alignment.lengthOnRef);

        // create right mate pair reference frame
        rightMatePairGenomicState = {};
        rightMatePairGenomicState.chromosome = leftMatePairGenomicState.chromosome;
        rightMatePairGenomicState.referenceFrame = createReferenceFrame(alignment.chr, referenceFrame.bpPerPixel, viewportWidth, alignment.mate.position, alignment.lengthOnRef);

        // add right mate panel beside left mate panel
        this.addMultiLocusPanelWithGenomicStateAtIndex(rightMatePairGenomicState, 1 + (this.genomicStateList.indexOf(leftMatePairGenomicState)), viewportWidth);

        function createReferenceFrame(chromosomeName, bpp, pixels, alignmentStart, alignmentLength) {

            var ss,
                ee,
                alignmentEE,
                alignmentCC;

            alignmentEE = alignmentStart + alignmentLength;
            alignmentCC = (alignmentStart + alignmentEE) / 2;

            ss = alignmentCC - (bpp * (pixels / 2));
            ee = ss + (bpp * pixels);

            return new igv.ReferenceFrame(genome, chromosomeName, ss, ee, bpp);
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

        const genome = this.genome;

        var self = this,
            index,
            viewportContainerWidth,
            previousGenomicStateListLength,
            width;

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

            const ee = gs.referenceFrame.calculateEnd(viewportContainerWidth / previousGenomicStateListLength);
            const bpp = gs.referenceFrame.calculateBPP(ee, viewportContainerWidth / self.genomicStateList.length);

            self.genomicStateList[i].referenceFrame = new igv.ReferenceFrame(genome, gs.chromosome.name, gs.referenceFrame.start, ee, bpp);
        });

        this.updateUIWithGenomicStateListChange(this.genomicStateList);

        if (true === doResize) {
            this.resize();
        }

    };

    igv.Browser.prototype.addMultiLocusPanelWithGenomicStateAtIndex = function (genomicState, index, viewportWidth) {

        if (index === this.genomicStateList.length) {

            this.genomicStateList.push(genomicState);

            if (this.ideoPanel) {
                this.ideoPanel.addPanelWithGenomicStateAtIndex(genomicState, index, viewportWidth);
            }

            this.trackViews.forEach(function (trackView) {

                var viewport;
                viewport = new igv.Viewport(trackView, trackView.$viewportContainer, genomicState, viewportWidth);
                trackView.viewports.push(viewport);

                trackView.decorateViewports();

                trackView.configureViewportContainer(trackView.$viewportContainer, trackView.viewports);
            });

        } else {

            this.genomicStateList.splice(index, 0, genomicState);

            if (this.ideoPanel) {
                this.ideoPanel.addPanelWithGenomicStateAtIndex(genomicState, index, viewportWidth);
            }

            this.trackViews.forEach(function (trackView) {

                var viewport,
                    $detached;

                viewport = new igv.Viewport(trackView, trackView.$viewportContainer, genomicState, viewportWidth);
                trackView.viewports.splice(index, 0, viewport);

                // The viewport constructor always appends. Reorder here.
                $detached = viewport.$viewport.detach();
                $detached.insertAfter(trackView.viewports[index - 1].$viewport);

                trackView.decorateViewports();

                trackView.configureViewportContainer(trackView.$viewportContainer, trackView.viewports);
            });

        }

        if (this.rulerTrack) {
            this.rulerTrack.updateLocusLabel();
        }

        this.updateUIWithGenomicStateListChange(this.genomicStateList);

        this.resize();
    };

    igv.Browser.prototype.emptyViewportContainers = function () {

        $(this.trackContainerDiv).find('.igv-scrollbar-outer-div').remove();
        $(this.trackContainerDiv).find('.igv-viewport-div').remove();
        $(this.trackContainerDiv).find('.igv-ruler-sweeper-div').remove();
        this.$contentHeader.empty();

        this.trackViews.forEach(function (trackView) {

            if (trackView.track instanceof igv.RulerTrack) {
                trackView.track.rulerSweepers = [];
            }

            trackView.viewports = [];
            trackView.scrollbar = undefined;

        });

    };

    igv.Browser.prototype.buildViewportsWithGenomicStateList = function (genomicStateList) {
        var width;

        width = this.viewportContainerWidth() / this.genomicStateList.length;

        this.trackViews.forEach(function (trackView) {

            genomicStateList.forEach(function (genomicState) {

                var viewport;
                viewport = new igv.Viewport(trackView, trackView.$viewportContainer, genomicState, width);

                trackView.viewports.push(viewport);
            });

            trackView.decorateViewports();

            trackView.configureViewportContainer(trackView.$viewportContainer, trackView.viewports);
        });

    };

    igv.Browser.prototype.goto = function (chrName, start, end) {
        return this.search(chrName + ":" + start + "-" + end);
    };

    igv.Browser.prototype.search = function (string, init) {

        var self = this,
            loci;

        const genome = this.genome;

        if (string && string.trim().toLowerCase() === "all") string = "all";

        loci = string.split(' ');

        return createGenomicStateList(loci)

            .then(function (genomicStateList) {

                if (genomicStateList.length > 0) {

                    self.emptyViewportContainers();

                    self.genomicStateList = genomicStateList;

                    self.buildViewportsWithGenomicStateList(genomicStateList);

                    // assign ids to the state objects
                    for(let gs of genomicStateList) {
                        gs.id = igv.guid();
                    }

                    return genomicStateList

                } else {
                    throw new Error('Unrecognized locus ' + string);
                }

            })
            .then(function (genomicStateList) {

                var panelWidth;

                if (self.ideoPanel) {
                    self.ideoPanel.discardPanels();
                    panelWidth = self.viewportContainerWidth() / genomicStateList.length;
                    self.ideoPanel.buildPanels(self.$contentHeader, panelWidth);
                }

                self.updateUIWithGenomicStateListChange(genomicStateList);

                if (!init) {
                    self.updateViews();
                }

                return genomicStateList;
            })


        /**
         * createGenomicStateList takes loci (gene name or name:start:end) and maps them into a list of genomicStates.
         * A genomicState is fundamentally a referenceFrame. Plus some panel managment state.
         * Each mult-locus panel refers to a genomicState.
         *
         * @param loci - array of locus strings (e.g. chr1:1-100,  egfr)
         */
        function createGenomicStateList(loci) {


            let searchConfig = self.searchConfig;
            let ordered = {};
            let unique = [];

            // prune duplicates as the order list is built
            loci.forEach(function (locus, index) {
                if (undefined === ordered[locus]) {
                    unique.push(locus);
                    ordered[locus] = unique.indexOf(locus);
                }
            });

            let result = [];
            let geneNameLoci = [];
            let dictionary = {};

            // Try locus string first  (e.g.  chr1:100-200)
            unique.forEach(function (locus) {

                let genomicState = isLocusChrNameStartEnd(locus, self.genome);

                if (genomicState) {
                    genomicState.locusSearchString = locus;
                    result.push(genomicState);
                    dictionary[locus] = genomicState;
                }
                else {
                    geneNameLoci.push(locus);
                }
            });

            if (geneNameLoci.length === 0) {

                return Promise.resolve(appendReferenceFrames(result));

            } else {

                // Search based on feature symbol
                // Try local feature cache first.  This is created from feature tracks tagged "searchable"
                let promises = [];
                geneNameLoci.forEach(function (locus) {
                    var feature, genomicState, chromosome;

                    feature = self.featureDB[locus.toLowerCase()];
                    if (feature) {
                        chromosome = self.genome.getChromosome(feature.chr);
                        if (chromosome) {
                            genomicState = {
                                chromosome: chromosome,
                                start: feature.start,
                                end: feature.end,
                                locusSearchString: locus
                            }
                            igv.Browser.validateLocusExtent(genomicState.chromosome.bpLength, genomicState, self.minimumBases());
                            result.push(genomicState);
                            dictionary[locus] = genomicState;
                        }
                    } else {
                        promises.push(searchPromise(locus));  // Not found, create promise to search via webservice
                    }
                });

                // Finally try search webservice
                if (promises.length > 0) {

                    return Promise.all(promises)

                        .then(function (searchResponses) {

                            searchResponses.forEach(function (response) {

                                const genomicState = processSearchResult(response.result, response.locusSearchString);

                                if (genomicState) {
                                    result.push(genomicState);
                                    dictionary[genomicState.locusSearchString] = genomicState;
                                }
                            });

                            let cooked = Array(Object.keys(dictionary).length);

                            result.forEach(function (r) {
                                let key = r.locusSearchString;
                                let index = ordered[key];
                                cooked[index] = r;
                            });

                            return appendReferenceFrames(preserveOrder(result, dictionary, ordered));
                        });
                } else {

                    return Promise.resolve(appendReferenceFrames(preserveOrder(result, dictionary, ordered)));
                }
            }


            function appendReferenceFrames(genomicStateList) {

                const viewportWidth = self.viewportContainerWidth() / genomicStateList.length;

                genomicStateList.forEach(function (gs) {
                    gs.referenceFrame = new igv.ReferenceFrame(genome, gs.chromosome.name, gs.start, gs.end, (gs.end - gs.start) / viewportWidth);
                });

                return genomicStateList;
            }

            /* End of function  */
            function preserveOrder(list, dictionary, indexDictionary) {
                var orderedList;

                orderedList = Array(Object.keys(dictionary).length);

                list.forEach(function (g) {
                    var key,
                        index;
                    key = g.locusSearchString;
                    index = indexDictionary[key];
                    orderedList[index] = g;
                });

                return orderedList;
                // return list;

            }

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

                    if (self.flanking) {
                        start = Math.max(0, start - self.flanking);
                        end += self.flanking;
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

                    lines = igv.splitLines(data);

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
                                    chromosome: self.genome.getChromosomeName(locusTokens[0].trim()),
                                    start: parseInt(rangeTokens[0].replace(/,/g, '')),
                                    end: parseInt(rangeTokens[1].replace(/,/g, '')),
                                    type: ("gtex" === source ? "snp" : "gene")
                                };

                            results.push(obj);

                        }

                    });

                    return results;

                }

                s

            }

            function isLocusChrNameStartEnd(locus, genome) {

                var a, b, numeric, chr, chromosome, locusObject;

                locusObject = {};
                a = locus.split(':');

                chr = a[0];
                chromosome = genome.getChromosome(chr);  // Map chr to official name from (possible) alias
                if (!chromosome) {
                    return undefined;          // Unknown chromosome
                }
                locusObject.chromosome = chromosome;     // Map chr to offical name from possible alias
                locusObject.start = 0;
                locusObject.end = chromosome.bpLength;

                // if just a chromosome name we are done
                if (1 === a.length) {
                    return locusObject;
                } else {

                    b = a[1].split('-');

                    if (b.length > 2) {
                        return undefined;                 // Not a locus string
                    } else {

                        locusObject.start = locusObject.end = undefined;

                        numeric = b[0].replace(/\,/g, '');
                        if (isNaN(numeric)) {
                            return undefined;
                        }

                        locusObject.start = parseInt(numeric, 10) - 1;

                        if(isNaN(locusObject.start)) {
                            return undefined;
                        }

                        if (2 === b.length) {

                            numeric = b[1].replace(/\,/g, '');
                            if (isNaN(numeric)) {
                                return false;
                            }

                            locusObject.end = parseInt(numeric, 10);
                        }

                    }

                    igv.Browser.validateLocusExtent(locusObject.chromosome.bpLength, locusObject, self.minimumBases());

                    return locusObject;

                }

            }
        }
    };

    igv.Browser.validateLocusExtent = function (chromosomeLengthBP, extent, minimumBP) {

        let ss = extent.start;
        let ee = extent.end;

        if (undefined === ee) {

            ss -= minimumBP / 2;
            ee = ss + minimumBP;

            if (ee > chromosomeLengthBP) {
                ee = chromosomeLengthBP;
                ss = ee - minimumBP;
            } else if (ss < 0) {
                ss = 0;
                ee = minimumBP;
            }

        } else if (ee - ss < minimumBP) {

            const center = (ee + ss) / 2;

            if (center - minimumBP / 2 < 0) {
                ss = 0;
                ee = ss + minimumBP;
            } else if (center + minimumBP / 2 > chromosomeLengthBP) {
                ee = chromosomeLengthBP;
                ss = ee - minimumBP;
            } else {
                ss = center - minimumBP / 2;
                ee = ss + minimumBP;
            }
        }

        extent.start = Math.ceil(ss);
        extent.end = Math.floor(ee);
    };


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

    igv.Browser.prototype.dispose = function () {

        $(window).off(this.namespace);
        $(document).off(this.namespace);

        this.trackViews.forEach(function (tv) {
            tv.dispose();
        })

    };

    igv.Browser.prototype.toJSON = function () {

        var json, trackJson, order;

        json = {
            "reference": this.genome.toJSON()
        };

        // Use first available trackView.
        const locus = [];
        const gtexSelections = {};
        let anyTrackView = this.trackViews[ 0 ];
        anyTrackView.viewports.forEach(function (viewport) {

            const genomicState = viewport.genomicState;
            const pixelWidth = viewport.$viewport[0].clientWidth;
            const locusString = genomicState.referenceFrame.showLocus(pixelWidth);
            locus.push(locusString);

            if (genomicState.selection) {
                const selection = {
                    gene: genomicState.selection.gene,
                    snp: genomicState.selection.snp
                };

                gtexSelections[locusString] = selection;
            }
        });

        json["locus"] = locus;

        const gtexKeys = Object.getOwnPropertyNames(gtexSelections);
        if (gtexKeys.length > 0) {
            json["gtexSelections"] = gtexSelections;
        }

        trackJson = [];
        order = 0;
        this.trackViews.forEach(function (tv) {

            var track, config;

            track = tv.track;
            if (typeof track.getState === "function") {
                config = track.getState();
            }
            else {
                config = track.config;
            }

            if (config) {
                // null backpointer to browser
                if (config.browser) {
                    delete config.browser;
                }
                config.order = track.order; //order++;
                trackJson.push(config);
            }
        });

        json["tracks"] = trackJson;

        return json;        // This is an object, not a json string

    }

    igv.Browser.prototype.compressedSession = function () {

        var json, bytes, deflate, compressedBytes, compressedString, enc;

        json = JSON.stringify(this.toJSON());
        bytes = [];
        for (var i = 0; i < json.length; i++) {
            bytes.push(json.charCodeAt(i));
        }
        compressedBytes = new Zlib.RawDeflate(bytes).compress();            // UInt8Arry
        compressedString = String.fromCharCode.apply(null, compressedBytes);      // Convert to string
        enc = btoa(compressedString);
        enc = enc.replace(/\+/g, '.').replace(/\//g, '_').replace(/\=/g, '-');   // URL safe

        //console.log(json);
        //console.log(enc);

        return enc;
    }

    igv.Browser.uncompressSession = function (enc) {

        var compressedString, compressedBytes, bytes, decompressedString, json, i;

        enc = enc.replace(/\./g, '+').replace(/_/g, '/').replace(/-/g, '=')

        compressedString = atob(enc);
        compressedBytes = [];
        for (i = 0; i < compressedString.length; i++) {
            compressedBytes.push(compressedString.charCodeAt(i));
        }
        bytes = new Zlib.RawInflate(compressedBytes).decompress();
        json = String.fromCharCode.apply(null, bytes);

        console.log(json);

        return json;
    }

    igv.Browser.prototype.sessionURL = function () {
        var surl, path, idx;

        path = window.location.href.slice();
        idx = path.indexOf("?");

        surl = (idx > 0 ? path.substring(0, idx) : path) + "?sessionURL=data:" + this.compressedSession();

        return surl;

    }

    const httpMessages =
        {
            "401": "Access unauthorized",
            "403": "Access forbidden",
            "404": "Not found"
        };

    igv.Browser.prototype.presentAlert = function (alert, $parent) {

        var string;

        string = alert.message || alert;

        if (httpMessages.hasOwnProperty(string)) {
            string = httpMessages[string];
        }

        this.alertDialog.configure({label: string});
        this.alertDialog.present($parent);
    };


    /**
     * Record a mouse click on a specific viewport.   This might be the start of a drag operation.   Dragging
     * (panning) is handled here so that the mouse can move out of a specific viewport (e.g. stray into another
     * track) without halting the drag.
     *
     * @param e
     * @param viewport
     */
    igv.Browser.prototype.mouseDownOnViewport = function (e, viewport) {

        var coords;
        coords = igv.pageCoordinates(e);
        this.vpMouseDown = {
            viewport: viewport,
            lastMouseX: coords.x,
            mouseDownX: coords.x,
            lastMouseY: coords.y,
            mouseDownY: coords.y,
            genomicState: viewport.genomicState,
            referenceFrame: viewport.genomicState.referenceFrame
        };
    };


    igv.Browser.prototype.cancelTrackPan = function () {

        if (this.isDragging) {
            this.updateViews();
            this.fireEvent('trackdragend');
        }
        this.isDragging = false;
        this.isScrolling = false;
        this.vpMouseDown = undefined;

    }


    igv.Browser.prototype.startTrackDrag = function (trackView) {

        this.dragTrack = trackView;

    }

    igv.Browser.prototype.updateTrackDrag = function (dragDestination) {

        if (dragDestination && this.dragTrack) {

            const dragged = this.dragTrack;
            const indexDestination = this.trackViews.indexOf(dragDestination);
            const indexDragged = this.trackViews.indexOf(dragged);
            const trackViews = this.trackViews;

            trackViews[indexDestination] = dragged;
            trackViews[indexDragged] = dragDestination;

            const newOrder = this.trackViews[indexDestination].track.order;
            this.trackViews[indexDragged].track.order = newOrder;

            const nTracks = trackViews.length;
            let lastOrder = newOrder;

            if (indexDestination < indexDragged) {
                // Displace tracks below

                for (let i = indexDestination + 1; i < nTracks; i++) {
                    const track = trackViews[i].track;
                    if (track.order <= lastOrder) {
                        track.order = Math.min(Number.MAX_VALUE, lastOrder + 1);
                        lastOrder = track.order;
                    }
                    else {
                        break;
                    }
                }
            }
            else {
                // Displace tracks above.  First track (index 0) is "ruler"
                for (let i = indexDestination - 1; i > 0; i--) {
                    const track = trackViews[i].track;
                    if (track.order >= lastOrder) {
                        track.order = Math.max(-Number.MAX_VALUE, lastOrder - 1);
                        lastOrder = track.order;
                    }
                    else {
                        break;
                    }
                }
            }
            this.reorderTracks();
        }
    }

    igv.Browser.prototype.endTrackDrag = function () {
        if (this.dragTrack) {
            this.dragTrack.$trackDragScrim.hide();
        }
        this.dragTrack = undefined;
    }


    /**
     * Mouse handlers to support drag (pan)
     */
    function addMouseHandlers() {

        var self = this;

        $(window).on('resize' + this.namespace, function () {
            self.resize();
        });

        $(this.root).on('mouseup', mouseUpOrLeave);
        $(this.root).on('mouseleave', mouseUpOrLeave);

        $(this.trackContainerDiv).on('mousemove', handleMouseMove);

        $(this.trackContainerDiv).on('touchmove', handleMouseMove);

        $(this.trackContainerDiv).on('mouseleave', mouseUpOrLeave);

        $(this.trackContainerDiv).on('mouseup', mouseUpOrLeave);

        $(this.trackContainerDiv).on('touchend', mouseUpOrLeave);

        function handleMouseMove(e) {

            var coords, viewport, viewportWidth, referenceFrame;

            e.preventDefault();


            if (self.loadInProgress()) {
                return;
            }

            coords = igv.pageCoordinates(e);

            if (self.vpMouseDown) {

                // Determine direction,  true == horizontal
                const horizontal = Math.abs((coords.x - self.vpMouseDown.mouseDownX)) > Math.abs((coords.y - self.vpMouseDown.mouseDownY));

                viewport = self.vpMouseDown.viewport;
                viewportWidth = viewport.$viewport.width();
                referenceFrame = viewport.genomicState.referenceFrame;

                if (!self.isDragging && !self.isScrolling) {
                    if (horizontal) {
                        if (self.vpMouseDown.mouseDownX && Math.abs(coords.x - self.vpMouseDown.mouseDownX) > self.constants.dragThreshold) {
                            self.isDragging = true;
                        }
                    }
                    else {
                        if (self.vpMouseDown.mouseDownY &&
                            Math.abs(coords.y - self.vpMouseDown.mouseDownY) > self.constants.scrollThreshold) {
                            self.isScrolling = true;
                            const trackView = viewport.trackView;
                            const viewportContainerHeight = trackView.$viewportContainer.height();
                            const contentHeight = trackView.maxContentHeight();
                            self.vpMouseDown.r = viewportContainerHeight / contentHeight;
                        }
                    }
                }

                if (self.isDragging) {

                    referenceFrame.shiftPixels(self.vpMouseDown.lastMouseX - coords.x, viewportWidth);
                    self.updateLocusSearchWidget(self.vpMouseDown.genomicState);
                    self.updateViews();
                    self.fireEvent('trackdrag');
                }


                if (self.isScrolling) {
                    const delta = self.vpMouseDown.r * (self.vpMouseDown.lastMouseY - coords.y);
                    self.vpMouseDown.viewport.trackView.scrollBy(delta);
                }


                self.vpMouseDown.lastMouseX = coords.x;
                self.vpMouseDown.lastMouseY = coords.y
            }
        }

        function mouseUpOrLeave(e) {
            self.cancelTrackPan();
            self.endTrackDrag();
        }
    }


    return igv;
})
(igv || {});


