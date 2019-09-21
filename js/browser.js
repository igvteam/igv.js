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

import $ from "./vendor/jquery-3.3.1.slim.js";
import TrackView from "./trackView.js";
import ViewPort from "./viewport.js";
import C2S from "./canvas2svg.js";
import TrackFactory from "./trackFactory.js";
import ROI from "./roi.js";
import GtexSelection from "./gtex/gtexSelection.js";
import XMLSession from "./session/igvXmlSession.js";
import RulerTrack from "./rulerTrack.js";
import GenomeUtils from "./genome/genome.js";
import loadPlinkFile from "./sampleInformation.js";
import IdeoPanel from "./ideogram.js";
import ReferenceFrame from "./referenceFrame.js";
import igvxhr from "./igvxhr.js";
import Zlib from "./vendor/zlib_and_gzip.js";
import {getFilename, isFilePath} from './util/fileUtils.js'
import {inferTrackTypes, inferFileFormat} from "./util/trackUtils.js";
import {createIcon} from "./igv-icons.js";
import {isString, splitLines, numberFormatter} from "./util/stringUtils.js"
import {pageCoordinates, guid} from "./util/domUtils.js";
import {decodeDataURI} from "./util/uriUtils.js";
import {download, validateLocusExtent, doAutoscale} from "./util/igvUtils.js";
import google from "./google/googleUtils.js";


const Browser = function (options, trackContainerDiv) {
    let str;

    this.guid = guid();
    this.namespace = '.browser_' + this.guid;
    this.config = options;
    this.$root = $('<div class="igv-root-div">');

    initialize.call(this, options);

    this.trackContainerDiv = trackContainerDiv;
    this.trackViews = [];
    this.trackLabelsVisible = true;
    this.isCenterGuideVisible = false;
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

    this.$spinner = $('<div class="igv-track-container-spinner">');
    this.$spinner.append(createIcon("spinner"));
    $(this.trackContainerDiv).append(this.$spinner);
    this.stopSpinner();

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
    } else {

        if (options.reference && options.reference.id) {
            genomeId = options.reference.id;
        } else if (options.genome) {
            genomeId = options.genome;
        } else {
            genomeId = "hg19";
        }

        this.searchConfig = {
            // Legacy support -- deprecated
            type: "plain",
            url: 'https://igv.org/genomes/locus.php?genome=$GENOME$&name=$FEATURE$',
            coords: 0,
            chromosomeField: "chromosome",
            startField: "start",
            endField: "end",
            geneField: "gene",
            snpField: "snp"

        }
    }
}

Browser.prototype.startSpinner = function () {
    const $spinner = this.$spinner;
    if ($spinner) {
        $spinner.addClass("igv-fa5-spin");
        $spinner.show();
    }
};

Browser.prototype.stopSpinner = function () {
    const $spinner = this.$spinner;
    if ($spinner) {
        $spinner.hide();
        $spinner.removeClass("igv-fa5-spin");
    }
};

Browser.prototype.isMultiLocusMode = function () {
    return this.genomicStateList && this.genomicStateList.length > 1;
};

Browser.prototype.isMultiLocusWholeGenomeView = function () {

    if (undefined === this.genomicStateList || 1 === this.genomicStateList.length) {
        return false;
    }

    for (let genomicState of this.genomicStateList) {
        const chromosomeName = genomicState.referenceFrame.chrName.toLowerCase();
        if ('all' === chromosomeName) {
            return true;
        }
    }

    return false;
};

Browser.prototype.toSVG = function () {

    const trackContainerBBox = this.trackContainerDiv.getBoundingClientRect();
    const anyViewportContainerBBox = this.trackViews[0].$viewportContainer.get(0).getBoundingClientRect();
    const ideoPanelBBox = this.ideoPanel ? this.ideoPanel.panels[0].$ideogram.get(0).getBoundingClientRect() : {
        height: 0,
        width: 0
    };

    // multi-locus inter-panel gap
    const multiLocusGap = 8;

    const w = trackContainerBBox.width + (this.genomicStateList.length - 1) * multiLocusGap;

    const h_output = trackContainerBBox.height + ideoPanelBBox.height;
    const h_render = 8000;

    let svgContext = new C2S(
        {

            width: w,
            height: h_render,

            backdropColor: 'white',

            multiLocusGap: multiLocusGap,

            viewbox:
                {
                    x: 0,
                    y: 0,
                    width: w,
                    height: h_render
                }

        });

    const dx = anyViewportContainerBBox.x - trackContainerBBox.x;

    // ideoPanel -> SVG
    if (this.ideoPanel) {

        this.ideoPanel.renderSVGContext(svgContext, {deltaX: dx, deltaY: 0});
    }

    // tracks -> SVG
    for (let trackView of this.trackViews) {
        trackView.renderSVGContext(svgContext, {deltaX: dx, deltaY: (ideoPanelBBox.height - trackContainerBBox.y)});
    }

    // reset height to trim away unneeded svg canvas real estate. Yes, a bit of a hack.
    svgContext.setHeight(h_output);

    return svgContext.getSerializedSvg(true);

};

Browser.prototype.renderSVG = function (config) {

    let svg = this.toSVG();

    if (config.$container) {

        const trackContainerBBox = this.trackContainerDiv.getBoundingClientRect();

        config.$container.empty();
        config.$container.width(trackContainerBBox.width);
        config.$container.append(svg);
    }

    const path = config.filename || 'igv.svg';
    const data = URL.createObjectURL(new Blob([svg], {type: "application/octet-stream"}));
    download(path, data);

};

/**
 * Initialize a session from an object, json, or by loading from a file.
 *
 * TODO Really should be split into at least 2 functions, load from file and load from object/json
 *
 * @param options
 * @param config
 * @returns {*}
 */
Browser.prototype.loadSession = async function (options) {

    var self = this;

    let session
    if (options.url || options.file) {
        session = await loadSessionFile(options)
    } else {
        session = options
    }
    return self.loadSessionObject(session);


    async function loadSessionFile(options) {

        const urlOrFile = options.url || options.file


        if (options.url && (options.url.startsWith("blob:") || options.url.startsWith("data:"))) {

            var json = Browser.uncompressSession(options.url);
            return JSON.parse(json);

        } else {
            let filename = options.filename
            if (!filename) {
                filename = (options.url ? getFilename(options.url) : options.file.name)
            }

            if (filename.endsWith(".xml")) {

                const knownGenomes = await GenomeUtils.getKnownGenomes()

                const string = await igvxhr.loadString(urlOrFile)

                return new XMLSession(string, knownGenomes);


            } else if (filename.endsWith(".json")) {
                return igvxhr.loadJson(urlOrFile);
            } else {
                return undefined;
            }
        }

    }
}

Browser.prototype.loadSessionObject = async function (session) {

    this.removeAllTracks(true);

    const genome = await this.loadGenome(session.reference || session.genome, session.locus)

    // Restore gtex selections.
    if (session.gtexSelections) {

        const genomicStates = {};
        for (let gs of this.genomicStateList) {
            genomicStates[gs.locusSearchString] = gs;
        }

        for (let s of Object.getOwnPropertyNames(session.gtexSelections)) {
            const gs = genomicStates[s];
            if (gs) {
                const gene = session.gtexSelections[s].gene;
                const snp = session.gtexSelections[s].snp;
                gs.selection = new GtexSelection(gene, snp);
            }
        }
    }

    if (session.roi) {
        this.roi = [];
        for(let r of session.roi) {
            this.roi.push(new ROI(r, genome));
        }
    }

    if (!session.tracks) {
        // eslint-disable-next-line require-atomic-updates
        session.tracks = [];
    }
    if (session.tracks.filter(track => track.type === 'sequence').length === 0) {
        session.tracks.push({type: "sequence", order: -Number.MAX_VALUE})
    }

    await this.loadTrackList(session.tracks);

    var panelWidth;

    if (false !== session.showIdeogram && !this.ideoPanel) {
        panelWidth = this.viewportContainerWidth() / this.genomicStateList.length;
        this.ideoPanel = new IdeoPanel(this.$contentHeader, panelWidth, this);
        this.ideoPanel.repaint();
    }

    this.updateLocusSearchWidget(this.genomicStateList[0]);

    this.windowSizePanel.updateWithGenomicState(this.genomicStateList[0]);

    // Resize is called to address minor alignment problems with multi-locus view.
    this.resize();

}


Browser.prototype.loadGenome = async function (idOrConfig, initialLocus) {

    // idOrConfig might be json
    if (isString(idOrConfig) && idOrConfig.startsWith("{")) {
        try {
            idOrConfig = JSON.parse(idOrConfig);
        } catch (e) {
            // Apparently its not json,  just continue
        }
    }

    const genomeConfig = await expandReference.call(this, idOrConfig)
    const genome = await GenomeUtils.loadGenome(genomeConfig)
    const genomeChange = this.genome && (this.genome.id !== genome.id);
    this.genome = genome;
    this.$current_genome.text(genome.id || '');
    this.$current_genome.attr('title', genome.id || '');
    this.chromosomeSelectWidget.update(genome);
    if (genomeChange) {
        this.removeAllTracks();
    }
    this.genome = genome;

    let genomicStateList
    try {
        genomicStateList = await this.search(getInitialLocus(initialLocus, genome), true)
    } catch (error) {
        // Couldn't find initial locus
        console.error(error);
        genomicStateList = await this.search(this.genome.getHomeChromosomeName());
    }
    this.genomicStateList = genomicStateList;
    if (this.genomicStateList.length > 0) {
        if (!this.rulerTrack && false !== this.config.showRuler) {
            this.rulerTrack = new RulerTrack(this);
            this.addTrack(this.rulerTrack);
        }
    } else {
        const errorString = 'Unrecognized locus ' + this.config.locus;
        this.presentAlert(errorString, undefined);
    }

    if (genomeConfig.tracks) {
        await this.loadTrackList(genomeConfig.tracks);
    }

    this.resize();    // Force recomputation and repaint
    return this.genome;


    // Expand a genome id to a reference object, if needed
    async function expandReference(conf) {

        var genomeID;

        if (isString(conf)) {
            genomeID = conf;
        } else if (conf.genome) {
            genomeID = conf.genome;
        } else if (conf.id !== undefined && conf.fastaURL === undefined) {
            // Backward compatibility
            genomeID = conf.id;
        }

        if (genomeID) {
            const knownGenomes = await GenomeUtils.getKnownGenomes()

            var reference = knownGenomes[genomeID];
            if (!reference) {
                this.presentAlert("Uknown genome id: " + genomeID, undefined);
            }
            return reference;
        } else {
            return conf;
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
        } else {
            loci = genome.getHomeChromosomeName();
        }

        return loci;
    }
};

//
Browser.prototype.updateUIWithGenomicStateListChange = function (genomicStateList) {

    const isWGV = (this.isMultiLocusWholeGenomeView() || GenomeUtils.isWholeGenomeView(genomicStateList[0].referenceFrame));

    if (isWGV || this.isMultiLocusMode()) {
        this.centerGuide.forcedHide();
    } else {
        this.centerGuide.forcedShow();
    }

    this.navbarManager.navbarDidResize(this.$navigation.width(), isWGV);

    toggleTrackLabels(this.trackViews, this.trackLabelsVisible);

};

// track labels
Browser.prototype.setTrackLabelName = function (trackView, name) {
    trackView.viewports.forEach((viewport) => {
        viewport.setTrackLabel(name);
    });
};

Browser.prototype.hideTrackLabels = function () {
    this.trackLabelsVisible = false;
    toggleTrackLabels(this.trackViews, this.trackLabelsVisible);
};

Browser.prototype.showTrackLabels = function () {
    this.trackLabelsVisible = true;
    toggleTrackLabels(this.trackViews, this.trackLabelsVisible);
};

function toggleTrackLabels(trackViews, isVisible) {

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
Browser.prototype.hideCursorGuide = function () {
    this.cursorGuide.$guide.hide();
    this.cursorGuideVisible = false;
};

Browser.prototype.showCursorGuide = function () {
    this.cursorGuide.$guide.show();
    this.cursorGuideVisible = true;
};

Browser.prototype.setCustomCursorGuideMouseHandler = function (mouseHandler) {
    this.cursorGuide.customMouseHandler = mouseHandler;
};


// center guide
Browser.prototype.hideCenterGuide = function () {
    this.centerGuide.$container.hide();
    this.isCenterGuideVisible = false;
};

Browser.prototype.showCenterGuide = function () {
    this.centerGuide.$container.show();
    this.centerGuide.resize();
    this.isCenterGuideVisible = true;
};

Browser.prototype.loadTrackList = async function (configList) {

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


    try {
        this.startSpinner();
        const promises = [];
        configList.filter(knowHowToLoad).forEach(function (config) {
            config.noSpinner = true;
            promises.push(self.loadTrack(config));
        });

        const loadedTracks = await Promise.all(promises)
        const groupAutoscaleViews = self.trackViews.filter(function (trackView) {
            return trackView.track.autoscaleGroup
        })
        if (groupAutoscaleViews.length > 0) {
            self.updateViews(self.genomicStateList[0], groupAutoscaleViews);
        }
        return loadedTracks;
    } finally {
        this.stopSpinner();
    }

};

function knowHowToLoad(config) {

    // config might be json
    if (isString(config)) {
        config = JSON.parse(config);
    }

    const url = config.url;
    const features = config.features;
    return undefined === url || isString(url) || url instanceof File;
}

/**
 * Return a promise to load a track
 *
 * @param config
 * @returns {*}
 */
Browser.prototype.loadTrack = async function (config) {

    // config might be json
    if (isString(config)) {
        config = JSON.parse(config);
    }

    if (!knowHowToLoad(config)) {
        this.presentAlert("The following track could not be loaded.  Is this a local file? " + config.name);
        return;
    }

    if (isString(config.url) && config.url.startsWith("https://drive.google.com")) {
        const json = await google.getDriveFileInfo(config.url)
        config.url = "https://www.googleapis.com/drive/v3/files/" + json.id + "?alt=media";
        if (!config.filename) {
            config.filename = json.originalFileName;
        }
        if (!config.format) {
            config.format = inferFileFormat(config.filename);
        }
        if (config.indexURL && config.indexURL.startsWith("https://drive.google.com")) {
            config.indexURL = google.driveDownloadURL(config.indexURL);
        }

    } else {
        if (config.url && !config.filename) {
            config.filename = getFilename(config.url);
        }
    }

    inferTrackTypes(config);

    // Set defaults if specified
    if (this.trackDefaults && config.type) {
        const settings = this.trackDefaults[config.type];
        if (settings) {
            for (let property in settings) {
                if (settings.hasOwnProperty(property) && config[property] === undefined) {
                    config[property] = settings[property];
                }
            }
        }
    }

    try {
        if (!config.noSpinner) this.startSpinner();

        const newTrack = this.createTrack(config);

        if (undefined === newTrack) {
            this.presentAlert("Unknown file type: " + config.url, undefined);
            return newTrack;
        }

        // Set order field of track here.  Otherwise track order might get shuffled during asynchronous load
        if (undefined === newTrack.order) {
            newTrack.order = this.trackViews.length;
        }

        if (typeof newTrack.postInit === 'function') {
            await newTrack.postInit();
        }

        this.addTrack(newTrack);

        return newTrack;
    } finally {
        if (!config.noSpinner) this.stopSpinner();
    }
}


Browser.prototype.createTrack = function (config) {

    // Lowercase format
    if (config.format) {
        config.format = config.format.toLowerCase();
    }


    let type = (undefined === config.type) ? 'unknown_type' : config.type.toLowerCase();

    if ("data" === type) type = "wig";   // deprecated

    // add browser to track config
    let trackConfig = Object.assign({}, config);

    trackConfig.browser = this;

    let track
    switch (type) {

        case "annotation":
        case "genes":
        case "fusionjuncspan":
        case "snp":
            track = TrackFactory["feature"](trackConfig, this);
            break;
        default:
            if (TrackFactory.hasOwnProperty(type)) {
                track = TrackFactory[type](trackConfig, this);
            } else {
                track = undefined;
            }
    }

    if (config.roi && track) {
        track.roi = [];
        for(let r of config.roi) {
            track.roi.push(new ROI(r, this.genome));
        }
    }

    return track

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
Browser.prototype.addTrack = function (track) {

    var trackView;
    trackView = new TrackView(this, $(this.trackContainerDiv), track);
    this.trackViews.push(trackView);

    toggleTrackLabels(this.trackViews, this.trackLabelsVisible);

    this.reorderTracks();
    if (!track.autoscaleGroup) {
        // Group autoscale groups will get updated later (as a group)
        trackView.updateViews();
    }

};

Browser.prototype.reorderTracks = function () {

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


Browser.prototype.removeTrackByName = function (name) {
    const copy = this.trackViews.slice();
    for (let trackView of copy) {
        if (name === trackView.track.name) {
            this.removeTrack(trackView.track);
        }
    }
}

Browser.prototype.removeTrack = function (track) {

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
Browser.prototype.removeAllTracks = function (removeSequence) {
    var self = this,
        newTrackViews = [];

    for (let tv of this.trackViews) {

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
Browser.prototype.findTracks = function (property, value) {

    var tracks = [];
    this.trackViews.forEach(function (trackView) {
        if (value === trackView.track[property]) {
            tracks.push(trackView.track)
        }
    })
    return tracks;
};

Browser.prototype.setTrackHeight = function (newHeight) {

    this.trackHeight = newHeight;

    this.trackViews.forEach(function (trackView) {
        trackView.setTrackHeight(newHeight);
    });

};

Browser.prototype.visibilityChange = function () {
    this.resize();
};

Browser.prototype.resize = function () {

    const self = this;

    // Recompute bpPerPixel -- if previous width was zero this can be infinity
    const viewportWidth = this.viewportWidth();

    if (viewportWidth === 0) {
        return;
    }

    if (this.genomicStateList && viewportWidth > 0) {

        const isWGV = this.isMultiLocusWholeGenomeView() || GenomeUtils.isWholeGenomeView(this.genomicStateList[0].referenceFrame);

        if (isWGV || this.isMultiLocusMode()) {
            this.centerGuide.forcedHide();
        } else {
            this.centerGuide.forcedShow();
        }

        this.navbarManager.navbarDidResize(this.$navigation.width(), isWGV);

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

Browser.prototype.updateViews = function (genomicState, views) {

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
    } else {
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
            } else {
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
                    dataRange = doAutoscale(allFeatures);

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

Browser.prototype.loadInProgress = function () {
    var i;
    for (i = 0; i < this.trackViews.length; i++) {
        if (this.trackViews[i].isLoading()) return true;
    }
    return false;
};

Browser.prototype.updateLocusSearchWidget = function (genomicState) {

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

                ss = numberFormatter(Math.floor(referenceFrame.start + 1));
                ee = numberFormatter(Math.floor(end));
                str = referenceFrame.chrName + ":" + ss + "-" + ee;
                this.$searchInput.val(str);
            }

            this.fireEvent('locuschange', [{chr: referenceFrame.chrName, start: ss, end: ee, label: str}]);
        }

    } else {
        this.$searchInput.val('');
        this.chromosomeSelectWidget.$select.val('');
    }

};

/**
 * Return the visible width of a track.  All tracks should have the same width.
 */
Browser.prototype.viewportContainerWidth = function () {

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

Browser.prototype.viewportWidth = function () {
    var cw,
        vw;

    cw = this.viewportContainerWidth();
    vw = (undefined === this.genomicStateList || 1 === this.genomicStateList.length) ? cw : Math.round(cw / this.genomicStateList.length);

    return vw;
};

Browser.prototype.minimumBases = function () {
    return this.config.minimumBases;
};

Browser.prototype.updateZoomSlider = function ($slider) {

    const viewport = this.trackViews[0].viewports[0];
    const referenceFrame = viewport.genomicState.referenceFrame;

    const window = viewport.$viewport.width() * referenceFrame.bpPerPixel;
    const maxWindow = referenceFrame.getChromosome().bpLength;
    const minWindow = this.minimumBases();
    const v = (maxWindow - window) / (maxWindow - minWindow)
    const value = Math.round(100 * v);

    $slider.val(value);

};

Browser.prototype.zoom = function (scaleFactor) {
    let nuthin = undefined;
    this.zoomWithScaleFactor(scaleFactor)
};

// Zoom in by a factor of 2, keeping the same center location
Browser.prototype.zoomIn = function () {
    this.zoomWithScaleFactor(0.5)
};

// Zoom out by a factor of 2, keeping the same center location if possible
Browser.prototype.zoomOut = function () {
    this.zoomWithScaleFactor(2.0)
};


Browser.prototype.zoomWithRangePercentage = function (percentage) {

    if (this.loadInProgress()) {
        return;
    }
    let self = this;
    this.trackViews[0].viewports.forEach((viewport) => {

        const referenceFrame = viewport.genomicState.referenceFrame;
        const centerBP = referenceFrame.start + referenceFrame.toBP(viewport.$viewport.width() / 2.0);
        const chromosome = referenceFrame.getChromosome();
        const bpp = lerp(
            (chromosome.bpLength - chromosome.bpStart) / viewport.$viewport.width(),
            this.minimumBases() / viewport.$viewport.width(),
            percentage);
        const viewportWidthBP = bpp * viewport.$viewport.width();

        referenceFrame.start = centerBP - (viewportWidthBP / 2);
        referenceFrame.bpPerPixel = bpp;
        self.updateViews(viewport.genomicState);

        function lerp(v0, v1, t) {
            return (1 - t) * v0 + t * v1;
        }

    });
};

Browser.prototype.zoomWithScaleFactor = function (scaleFactor, centerBPOrUndefined, viewportOrUndefined) {

    if (this.loadInProgress()) {
        return;
    }

    let self = this;

    let viewports = viewportOrUndefined ? [viewportOrUndefined] : this.trackViews[0].viewports;
    viewports.forEach((viewport) => {

        const referenceFrame = viewport.genomicState.referenceFrame
        const chromosome = referenceFrame.getChromosome();
        const chromosomeLengthBP = chromosome.bpLength - chromosome.bpStart;

        const bppThreshold = scaleFactor < 1.0 ?
            self.minimumBases() / viewport.$viewport.width() :
            chromosomeLengthBP / viewport.$viewport.width();

        const centerBP = undefined === centerBPOrUndefined ?
            (referenceFrame.start + referenceFrame.toBP(viewport.$viewport.width() / 2.0)) :
            centerBPOrUndefined;

        let bpp;
        if (scaleFactor < 1.0) {
            bpp = Math.max(referenceFrame.bpPerPixel * scaleFactor, bppThreshold);
        } else {
            bpp = Math.min(referenceFrame.bpPerPixel * scaleFactor, bppThreshold);
        }

        const viewportWidthBP = bpp * viewport.$viewport.width();
        referenceFrame.start = centerBP - (viewportWidthBP / 2)
        referenceFrame.bpPerPixel = bpp;
        referenceFrame.clamp(viewport.$viewport.width())
        self.updateViews(viewport.genomicState);

    });


};

Browser.prototype.presentSplitScreenMultiLocusPanel = function (alignment, genomicState) {

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

    const chrName = genome.getChromosomeName(alignment.chr);
    leftMatePairGenomicState.referenceFrame = createReferenceFrame(chrName, referenceFrame.bpPerPixel, viewportWidth, alignment.start, alignment.lengthOnRef);

    // create right mate pair reference frame
    const mateChrName = genome.getChromosomeName(alignment.mate.chr);
    rightMatePairGenomicState = {};
    rightMatePairGenomicState.chromosome = leftMatePairGenomicState.chromosome;
    rightMatePairGenomicState.referenceFrame = createReferenceFrame(mateChrName, referenceFrame.bpPerPixel, viewportWidth, alignment.mate.position, alignment.lengthOnRef);

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

        return new ReferenceFrame(genome, chromosomeName, ss, ee, bpp);
    }

};

Browser.prototype.selectMultiLocusPanelWithGenomicState = function (selectedGenomicState) {
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

Browser.prototype.removeMultiLocusPanelWithGenomicState = function (genomicState, doResize) {

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

        self.genomicStateList[i].referenceFrame = new ReferenceFrame(genome, gs.chromosome.name, gs.referenceFrame.start, ee, bpp);
    });

    this.updateUIWithGenomicStateListChange(this.genomicStateList);

    if (true === doResize) {
        this.resize();
    }

};

Browser.prototype.addMultiLocusPanelWithGenomicStateAtIndex = function (genomicState, index, viewportWidth) {

    if (index === this.genomicStateList.length) {

        this.genomicStateList.push(genomicState);

        if (this.ideoPanel) {
            this.ideoPanel.addPanelWithGenomicStateAtIndex(genomicState, index, viewportWidth);
        }

        this.trackViews.forEach(function (trackView) {

            var viewport;
            viewport = new ViewPort(trackView, trackView.$viewportContainer, genomicState, viewportWidth);
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

            viewport = new ViewPort(trackView, trackView.$viewportContainer, genomicState, viewportWidth);
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

Browser.prototype.emptyViewportContainers = function () {

    for (let trackView of this.trackViews) {

        if (trackView.$outerScroll) {
            trackView.$outerScroll.remove();
        }

        for (let viewport of trackView.viewports) {

            if (viewport.rulerSweeper) {
                viewport.rulerSweeper.$rulerSweeper.remove();
            }

            if (viewport.popover) {
                viewport.popover.$popover.off();
                viewport.popover.$popover.empty();
                viewport.popover.$popover.remove();
            }

            viewport.$viewport.remove();
        }

        delete trackView.viewports;
        trackView.viewports = [];

        delete trackView.scrollbar;
    }

    this.$contentHeader.empty();

};

Browser.prototype.buildViewportsWithGenomicStateList = function (genomicStateList) {
    var width;

    width = this.viewportContainerWidth() / this.genomicStateList.length;

    this.trackViews.forEach(function (trackView) {

        genomicStateList.forEach(function (genomicState) {

            var viewport;
            viewport = new ViewPort(trackView, trackView.$viewportContainer, genomicState, width);

            trackView.viewports.push(viewport);
        });

        trackView.decorateViewports();

        trackView.configureViewportContainer(trackView.$viewportContainer, trackView.viewports);
    });

};

Browser.prototype.goto = function (chrName, start, end) {
    return this.search(chrName + ":" + start + "-" + end);
};

Browser.prototype.search = async function (string, init) {

    const self = this

    const genome = this.genome

    if (string && string.trim().toLowerCase() === "all") string = "all";

    const loci = string.split(' ')

    let genomicStateList = await createGenomicStateList(loci)
    if (!genomicStateList || genomicStateList.length === 0) {
        // If nothing is found and there are spaces, consider the possibility that the search term itself has spaces
        genomicStateList = await createGenomicStateList([string])
    }

    if (genomicStateList.length > 0) {

        this.emptyViewportContainers();
        this.genomicStateList = genomicStateList;
        this.buildViewportsWithGenomicStateList(genomicStateList);

        // assign ids to the state objects
        for (let gs of genomicStateList) {
            gs.id = guid();
        }

    } else {
        throw new Error('Unrecognized locus ' + string);
    }

    if (this.ideoPanel) {
        this.ideoPanel.discardPanels();
        const panelWidth = self.viewportContainerWidth() / genomicStateList.length;
        this.ideoPanel.buildPanels(this.$contentHeader, panelWidth);
    }

    this.updateUIWithGenomicStateListChange(genomicStateList);

    if (!init) {
        this.updateViews();
    }

    return genomicStateList;


    /**
     * createGenomicStateList takes loci (gene name or name:start:end) and maps them into a list of genomicStates.
     * A genomicState is fundamentally a referenceFrame. Plus some panel managment state.
     * Each mult-locus panel refers to a genomicState.
     *
     * @param loci - array of locus strings (e.g. chr1:1-100,  egfr)
     */
    async function createGenomicStateList(loci) {

        let searchConfig = self.searchConfig;
        let result = [];

        // Try locus string first  (e.g.  chr1:100-200)
        for (let locus of loci) {
            let genomicState = isLocusChrNameStartEnd(locus, self.genome);
            if (genomicState) {
                genomicState.locusSearchString = locus;
                result.push(genomicState);
            } else {
                // Try local feature cache.    This is created from feature tracks tagged "searchable"
                const feature = self.featureDB[locus.toUpperCase()];
                if (feature) {
                    const chromosome = self.genome.getChromosome(feature.chr);
                    if (chromosome) {
                        genomicState = {
                            chromosome: chromosome,
                            start: feature.start,
                            end: feature.end,
                            locusSearchString: locus
                        }
                        validateLocusExtent(genomicState.chromosome.bpLength, genomicState, self.minimumBases());
                        result.push(genomicState);
                    }
                } else {
                    // Try webservice
                    let response = await searchWebService(locus)
                    const genomicState = processSearchResult(response.result, response.locusSearchString);
                    if (genomicState) {
                        result.push(genomicState);
                    }
                }
            }
            appendReferenceFrames(result);
        }

        return result;

        function appendReferenceFrames(genomicStateList) {
            const viewportWidth = self.viewportContainerWidth() / genomicStateList.length;
            genomicStateList.forEach(function (gs) {
                gs.referenceFrame = new ReferenceFrame(genome, gs.chromosome.name, gs.start, gs.end, (gs.end - gs.start) / viewportWidth);
            });
            return genomicStateList;
        }

        async function searchWebService(locus) {
            let path = searchConfig.url.replace("$FEATURE$", locus.toUpperCase());
            if (path.indexOf("$GENOME$") > -1) {
                path = path.replace("$GENOME$", (self.genome.id ? self.genome.id : "hg19"));
            }
            const result = await igvxhr.loadString(path)
            return {
                result: result,
                locusSearchString: locus
            }
        }

        function processSearchResult(searchServiceResponse, locusSearchString) {

            let results
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
                const result = results[0];

                if (!(result.hasOwnProperty(searchConfig.chromosomeField) && (result.hasOwnProperty(searchConfig.startField)))) {
                    console.log("Search service results must include chromosome and start fields: " + result);
                    return undefined;
                }

                const chr = result[searchConfig.chromosomeField];
                let start = result[searchConfig.startField] - searchConfig.coords;
                let end = result[searchConfig.endField];

                if (undefined === end) {
                    end = start + 1;
                }

                if (self.flanking) {
                    start = Math.max(0, start - self.flanking);
                    end += self.flanking;
                }

                const geneNameLocusObject = Object.assign({}, result);
                geneNameLocusObject.chromosome = self.genome.getChromosome(chr);
                geneNameLocusObject.start = start;
                geneNameLocusObject.end = end;
                geneNameLocusObject.locusSearchString = locusSearchString;
                geneNameLocusObject.selection = new GtexSelection(result[searchConfig.geneField], result[searchConfig.snpField]);

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

                const linesTrimmed = []
                const results = []
                const lines = splitLines(data);

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

                    numeric = b[0].replace(/,/g, '');
                    if (isNaN(numeric)) {
                        return undefined;
                    }

                    locusObject.start = parseInt(numeric, 10) - 1;

                    if (isNaN(locusObject.start)) {
                        return undefined;
                    }

                    if (2 === b.length) {

                        numeric = b[1].replace(/,/g, '');
                        if (isNaN(numeric)) {
                            return false;
                        }

                        locusObject.end = parseInt(numeric, 10);
                    }

                }

                validateLocusExtent(locusObject.chromosome.bpLength, locusObject, self.minimumBases());

                return locusObject;

            }

        }
    }
};

Browser.prototype.loadSampleInformation = async function (url) {
    var name = url;
    if (url instanceof File) {
        name = url.name;
    }
    var ext = name.substr(name.lastIndexOf('.') + 1);
    if (ext === 'fam') {
        this.sampleInformation = await loadPlinkFile(url);
    }
};

// EVENTS

Browser.prototype.on = function (eventName, fn) {
    if (!this.eventHandlers[eventName]) {
        this.eventHandlers[eventName] = [];
    }
    this.eventHandlers[eventName].push(fn);
};

/**
 * @deprecated use off()
 * @param eventName
 * @param fn
 */
Browser.prototype.un = function (eventName, fn) {
    if (!this.eventHandlers[eventName]) {
        return;
    }

    var callbackIndex = this.eventHandlers[eventName].indexOf(fn);
    if (callbackIndex !== -1) {
        this.eventHandlers[eventName].splice(callbackIndex, 1);
    }
};

Browser.prototype.off = function (eventName, fn) {

    if (!eventName) {
        this.eventHandlers = {}   // Remove all event handlers
    } else if (!fn) {
        this.eventHandlers[eventName] = []  // Remove all eventhandlers matching name
    } else {
        // Remove specific event handler
        const callbackIndex = this.eventHandlers[eventName].indexOf(fn);
        if (callbackIndex !== -1) {
            this.eventHandlers[eventName].splice(callbackIndex, 1);
        }
    }
};

Browser.prototype.fireEvent = function (eventName, args, thisObj) {
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

Browser.prototype.dispose = function () {

    $(window).off(this.namespace);
    $(document).off(this.namespace);
    this.eventHandlers = undefined;
    this.trackViews.forEach(function (tv) {
        tv.dispose();
    })

};

Browser.prototype.toJSON = function () {

    var json, trackJson, order;

    json = {
        "reference": this.genome.toJSON()
    };

    // Use first available trackView.
    const locus = [];
    const gtexSelections = {};
    let anyTrackView = this.trackViews[0];
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
        } else {
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

Browser.prototype.compressedSession = function () {

    var json, bytes, deflate, compressedBytes, compressedString, enc;

    json = JSON.stringify(this.toJSON());
    bytes = [];
    for (var i = 0; i < json.length; i++) {
        bytes.push(json.charCodeAt(i));
    }
    compressedBytes = new Zlib.RawDeflate(bytes).compress();            // UInt8Arry
    compressedString = String.fromCharCode.apply(null, compressedBytes);      // Convert to string
    enc = btoa(compressedString);
    enc = enc.replace(/\+/g, '.').replace(/\//g, '_').replace(/=/g, '-');   // URL safe

    //console.log(json);
    //console.log(enc);

    return enc;
}

Browser.uncompressSession = function (url) {

    let bytes
    if (url.indexOf('/gzip;base64') > 0) {
        //Proper dataURI
        bytes = decodeDataURI(url);
    } else {

        let enc = url.substring(5);
        enc = enc.replace(/\./g, '+').replace(/_/g, '/').replace(/-/g, '=')

        const compressedString = atob(enc);
        const compressedBytes = [];
        for (let i = 0; i < compressedString.length; i++) {
            compressedBytes.push(compressedString.charCodeAt(i));
        }
        bytes = new Zlib.RawInflate(compressedBytes).decompress();
    }
    let json = ''
    for (let b of bytes) {
        json += String.fromCharCode(b)
    }

    return json;


}

Browser.prototype.sessionURL = function () {
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

Browser.prototype.presentAlert = function (alert, $parent) {

    var string;

    string = alert.message || alert;

    if (httpMessages.hasOwnProperty(string)) {
        string = httpMessages[string];
    }

    this.alertDialog.configure({label: string});
    this.alertDialog.present($parent);
};

Browser.prototype.presentMessageWithCallback = function (message, callback) {
    this.alertDialog.presentMessageWithCallback(message, callback);
};


/**
 * Record a mouse click on a specific viewport.   This might be the start of a drag operation.   Dragging
 * (panning) is handled here so that the mouse can move out of a specific viewport (e.g. stray into another
 * track) without halting the drag.
 *
 * @param e
 * @param viewport
 */
Browser.prototype.mouseDownOnViewport = function (e, viewport) {

    var coords;
    coords = pageCoordinates(e);
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


Browser.prototype.cancelTrackPan = function () {

    const dragEnd = this.isDragging
    this.isDragging = false;
    this.isScrolling = false;
    this.vpMouseDown = undefined;


    if (dragEnd) {
        this.updateViews();
        this.fireEvent('trackdragend');
    }

}


Browser.prototype.startTrackDrag = function (trackView) {

    this.dragTrack = trackView;

}

Browser.prototype.updateTrackDrag = function (dragDestination) {

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
                } else {
                    break;
                }
            }
        } else {
            // Displace tracks above.  First track (index 0) is "ruler"
            for (let i = indexDestination - 1; i > 0; i--) {
                const track = trackViews[i].track;
                if (track.order >= lastOrder) {
                    track.order = Math.max(-Number.MAX_VALUE, lastOrder - 1);
                    lastOrder = track.order;
                } else {
                    break;
                }
            }
        }
        this.reorderTracks();
    }
}

Browser.prototype.endTrackDrag = function () {
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

        coords = pageCoordinates(e);

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
                } else {
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


export default Browser


