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
import TrackView, {maxViewportContentHeight, updateViewportShims} from "./trackView.js";
import {createViewport} from "./viewportFactory.js";
import C2S from "./canvas2svg.js";
import TrackFactory from "./trackFactory.js";
import ROI from "./roi.js";
import GtexSelection from "./gtex/gtexSelection.js";
import XMLSession from "./session/igvXmlSession.js";
import RulerTrack from "./rulerTrack.js";
import GenomeUtils from "./genome/genome.js";
import loadPlinkFile from "./sampleInformation.js";
import ReferenceFrame, {
    adjustReferenceFrame,
    createReferenceFrameList,
    createReferenceFrameWithAlignment
} from "./referenceFrame.js";
import igvxhr from "./igvxhr.js";
import {createIcon} from "./igv-icons.js";
import {buildOptions, doAutoscale, inferTrackType, validateLocusExtent} from "./util/igvUtils.js";
import GtexUtils from "./gtex/gtexUtils.js";
import Alert from "./ui/alert.js";
import IdeogramTrack from "./ideogramTrack.js";
import {defaultSequenceTrackOrder} from './sequenceTrack.js';
import {
    DOMUtils,
    FileUtils,
    GoogleUtils,
    StringUtils,
    TrackUtils,
    URIUtils
} from "../node_modules/igv-utils/src/index.js";
import FeatureSource from "./feature/featureSource.js"

// igv.scss - $igv-multi-locus-gap-width
const multiLocusGapDivWidth = 1
const multiLocusGapMarginWidth = 2

const multiLocusGapWidth = (2 * multiLocusGapMarginWidth) + multiLocusGapDivWidth

const leftHandGutterWidth = 50
const rightHandGutterWidth = 36

const trackManipulationHandleWidth = 12
const trackManipulationHandleMarginWidth = 2

const viewportContainerShimWidth = leftHandGutterWidth + rightHandGutterWidth + trackManipulationHandleWidth + trackManipulationHandleMarginWidth

const Browser = function (options, parentDiv) {

    this.guid = DOMUtils.guid();
    this.namespace = '.browser_' + this.guid;
    this.config = options;

    this.parent = parentDiv;

    this.$root = $('<div>', {id: 'igv-root'});
    $(parentDiv).append(this.$root);

    const $trackContainer = $('<div>', { id: 'igv-track-container' });
    this.$root.append($trackContainer);

    this.alert = new Alert(this.$root.get(0))
    this.trackContainer = $trackContainer.get(0);

    initialize.call(this, options);

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

    this.$spinner = $('<div>', { id: 'igv-track-container-spinner' });
    $trackContainer.append(this.$spinner);

    this.$spinner.append(createIcon("spinner"));

    this.stopSpinner();

    addMouseHandlers.call(this);

};

function initialize(options) {

    var genomeId;

    if (options.gtex) {
        GtexUtils.gtexLoaded = true
    }
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
    return this.referenceFrameList && this.referenceFrameList.length > 1;
};

Browser.prototype.addTrackToFactory = function (name, track) {
    TrackFactory.addTrack(name, track);
}

Browser.prototype.isMultiLocusWholeGenomeView = function () {

    if (undefined === this.referenceFrameList || 1 === this.referenceFrameList.length) {
        return false;
    }

    for (let referenceFrame of this.referenceFrameList) {
        if ('all' === referenceFrame.chr.toLowerCase()) {
            return true;
        }
    }

    return false;
};

// Render browser display as SVG
Browser.prototype.toSVG = function () {

    const {x, y, width, height} = this.trackContainer.getBoundingClientRect();
    const {x: vpx} = this.trackViews[0].$viewportContainer.get(0).getBoundingClientRect();

    const w = width + (this.referenceFrameList.length - 1) * multiLocusGapWidth;

    const h_output = height;
    const h_render = 8000;

    let svgContext = new C2S(
        {

            width: w,
            height: h_render,

            backdropColor: 'white',

            multiLocusGap: multiLocusGapWidth,

            viewbox:
                {
                    x: 0,
                    y: 0,
                    width: w,
                    height: h_render
                }

        });

    const dx = vpx - x;

    // tracks -> SVG
    for (let trackView of this.trackViews) {
        trackView.renderSVGContext(svgContext, {deltaX: dx, deltaY: -y});
    }

    // reset height to trim away unneeded svg canvas real estate. Yes, a bit of a hack.
    svgContext.setHeight(h_output);

    return svgContext.getSerializedSvg(true);

};

Browser.prototype.saveSVGtoFile = function (config) {

    let svg = this.toSVG();

    if (config.$container) {

        const trackContainerBBox = this.trackContainer.getBoundingClientRect();

        config.$container.empty();
        config.$container.width(trackContainerBBox.width);
        config.$container.append(svg);
    }

    const path = config.filename || 'igv.svg';
    const data = URL.createObjectURL(new Blob([svg], {type: "application/octet-stream"}));
    FileUtils.download(path, data);
}

/**
 * Initialize a session from an object, json, or by loading from a file.
 *
 * TODO Really should be split into at least 2 functions, load from file and load from object/json
 *
 * @param options
 * @returns {*}
 */
Browser.prototype.loadSession = async function (options) {

    this.roi = [];
    let session;
    if (options.url || options.file) {
        session = await loadSessionFile(options)
    } else {
        session = options;
    }
    return this.loadSessionObject(session);


    async function loadSessionFile(options) {

        const urlOrFile = options.url || options.file

        if (options.url && (options.url.startsWith("blob:") || options.url.startsWith("data:"))) {

            var json = Browser.uncompressSession(options.url);
            return JSON.parse(json);

        } else {
            let filename = options.filename
            if (!filename) {
                filename = (options.url ? FileUtils.getFilename(options.url) : options.file.name)
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


/**
 * Note:  public API function
 * @param session
 * @returns {Promise<void>}
 */
Browser.prototype.loadSessionObject = async function (session) {

    this.removeAllTracks(true);

    const genome = await this.loadGenome(session.reference || session.genome, session.locus, false)

    // Restore gtex selections.
    if (session.gtexSelections) {

        const referenceFrames = {};
        for (let referenceFrame of this.referenceFrameList) {
            referenceFrames[referenceFrame.locusSearchString] = referenceFrame;
        }

        for (let s of Object.getOwnPropertyNames(session.gtexSelections)) {
            const referenceFrame = referenceFrames[s];
            if (referenceFrame) {
                const gene = session.gtexSelections[s].gene;
                const snp = session.gtexSelections[s].snp;
                referenceFrame.selection = new GtexSelection(gene, snp);
            }
        }
    }

    if (session.roi) {
        this.roi = [];
        for (let r of session.roi) {
            this.roi.push(new ROI(r, genome));
        }
    }

    if (!session.tracks) {
        // eslint-disable-next-line require-atomic-updates
        session.tracks = [];
    }
    if (session.tracks.filter(track => track.type === 'sequence').length === 0) {
        // session.tracks.push({type: "sequence", order: -Number.MAX_SAFE_INTEGER})
        session.tracks.push({type: "sequence", order: defaultSequenceTrackOrder})
    }

    await this.loadTrackList(session.tracks);

    if (false !== session.showIdeogram) {

        if (undefined === this.ideoPanel) {
            this.ideoPanel = new IdeogramTrack(this)
            this.addTrack(this.ideoPanel);
        }

        //this.ideoPanel.trackView.updateViews();
    }


    if (this.rulerTrack) {
        this.rulerTrack.trackView.updateViews();
    }

    this.updateLocusSearchWidget(this.referenceFrameList[0]);

    this.windowSizePanel.updateWithReferenceFrame(this.referenceFrameList[0]);

}

Browser.prototype.loadGenome = async function (idOrConfig, initialLocus, update) {

    // idOrConfig might be json
    if (StringUtils.isString(idOrConfig) && idOrConfig.startsWith("{")) {
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

    let referenceFrameList
    try {
        referenceFrameList = await this.search(getInitialLocus(initialLocus, genome), true)
    } catch (error) {
        // Couldn't find initial locus
        console.error(error);
        referenceFrameList = await this.search(this.genome.getHomeChromosomeName());
    }
    this.referenceFrameList = referenceFrameList;
    if (this.referenceFrameList.length > 0) {

        if (!this.rulerTrack && false !== this.config.showRuler) {
            this.rulerTrack = new RulerTrack(this);
            this.addTrack(this.rulerTrack);
        }

    } else {
        const errorString = 'Unrecognized locus ' + this.config.locus;
        this.alert.present(errorString, undefined);
    }

    if (genomeConfig.tracks) {
        await this.loadTrackList(genomeConfig.tracks);
    }

    if (update !== false) {
        this.updateViews();
    }
    return this.genome;


    // Expand a genome id to a reference object, if needed
    async function expandReference(conf) {

        var genomeID;

        if (StringUtils.isString(conf)) {
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
                this.present("Unknown genome id: " + genomeID, undefined);
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
Browser.prototype.updateUIWithReferenceFrameListChange = function (referenceFrameList) {

    const isWGV = (this.isMultiLocusWholeGenomeView() || GenomeUtils.isWholeGenomeView(referenceFrameList[0].chr));

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

    try {
        this.startSpinner();
        const promises = [];
        for (let config of configList) {
            config.noSpinner = true;
            promises.push(this.loadTrack(config));
        }

        const loadedTracks = await Promise.all(promises)
        const groupAutoscaleViews = this.trackViews.filter(function (trackView) {
            return trackView.track.autoscaleGroup
        })
        if (groupAutoscaleViews.length > 0) {
            this.updateViews(this.referenceFrameList[0], groupAutoscaleViews);
        }
        return loadedTracks;
    } finally {
        this.stopSpinner();
    }
};

Browser.prototype.loadROI = async function (config) {
    if (!this.roi) {
        this.roi = [];
    }
    if (Array.isArray(config)) {
        for (let c of config) {
            this.roi.push(new ROI(c, this.genome));
        }
    } else {
        this.roi.push(new ROI(config, this.genome));
    }
    await this.updateViews(undefined, undefined, true);
}

Browser.prototype.removeROI = function (roiToRemove) {
    for (let i = 0; i < this.roi.length; i++) {
        if (this.roi[i].name === roiToRemove.name) {
            this.roi.splice(i, 1);
            break;
        }
    }
    for (let tv of this.trackViews) {
        tv.updateViews(undefined, undefined, true);
    }
}

Browser.prototype.clearROIs = function () {
    this.roi = [];
    for (let tv of this.trackViews) {
        tv.updateViews(undefined, undefined, true);
    }
}

/**
 * Return a promise to load a track
 *
 * @param config
 * @returns {*}
 */

Browser.prototype.loadTrack = async function (config) {


    // config might be json
    if (StringUtils.isString(config)) {
        config = JSON.parse(config);
    }

    try {
        if (!config.noSpinner) this.startSpinner();

        const newTrack = await this.createTrack(config);

        if (undefined === newTrack) {
            this.alert.present("Unknown file type: " + url, undefined);
            return newTrack;
        }

        // Set order field of track here.  Otherwise track order might get shuffled during asynchronous load
        if (undefined === newTrack.order) {
            newTrack.order = this.trackViews.length;
        }

        if (typeof newTrack.postInit === 'function') {
            await newTrack.postInit();
        }

        if (config.sync) {
            await this.addTrack(newTrack);
        } else {
            this.addTrack(newTrack);
        }

        return newTrack;

    } catch (error) {
        const httpMessages =
            {
                "401": "Access unauthorized",
                "403": "Access forbidden",
                "404": "Not found"
            };
        console.error(error);
        let msg = error.message || error.toString();
        if (httpMessages.hasOwnProperty(msg)) {
            msg = httpMessages[msg] + ": " + config.url;
        }
        this.alert.present(msg, undefined);
    } finally {
        if (!config.noSpinner) this.stopSpinner();
    }
}

Browser.prototype.createTrack = async function (config) {

    // Resolve function and promise urls
    let url = await URIUtils.resolveURL(config.url);
    if (StringUtils.isString(url)) {
        url = url.trim();
    }

    if(url) {
        if (config.format) {
            config.format = config.format.toLowerCase();
        } else {
            let filename = config.filename;
            if (!filename) {
                if (StringUtils.isString(url) && url.startsWith("https://drive.google.com")) {
                    const json = await getDriveFileInfo(url)
                    filename = json.originalFileName || json.name;
                } else {
                    filename = FileUtils.getFilename(url);
                }
            }
            config.format = TrackUtils.inferFileFormat(filename);
        }
    }

    let type = config.type;
    if (type) {
        type = type.toLowerCase();
    } else {
        type = inferTrackType(config);
        if ("bedtype" === config.type) {
            // Bed files must be read to determine track type
            const featureSource = FeatureSource(config, this.genome);
            config.featureSource = featureSource;
            const trackType = await featureSource.trackType();
            if (trackType) {
                type = trackType;
            } else {
                type = "annotation";
            }
        }
    }

    // Set defaults if specified
    if (this.trackDefaults && type) {
        const settings = this.trackDefaults[type];
        if (settings) {
            for (let property in settings) {
                if (settings.hasOwnProperty(property) && config[property] === undefined) {
                    config[property] = settings[property];
                }
            }
        }
    }


    // add browser to track config
    config.browser = this;

    let track
    switch (type) {
        case "annotation":
        case "genes":
        case "fusionjuncspan":
        case "junctions":
        case "splicejunctions":
        case "snp":
            track = TrackFactory.getTrack("feature")(config, this);
            break;
        default:
            if (TrackFactory.tracks.hasOwnProperty(type)) {
                track = TrackFactory.getTrack(type)(config, this);
            } else {
                track = undefined;
            }
    }

    if (config.roi && track) {
        track.roi = [];
        for (let r of config.roi) {
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
Browser.prototype.addTrack = async function (track) {

    var trackView;
    trackView = new TrackView(this, $(this.trackContainer), track);
    this.trackViews.push(trackView);

    toggleTrackLabels(this.trackViews, this.trackLabelsVisible);

    this.reorderTracks();
    if (!track.autoscaleGroup) {
        // Group autoscale groups will get updated later (as a group)
        return trackView.updateViews();
    }
}

Browser.prototype.reorderTracks = function () {

    var myself = this;

    this.trackViews.sort(function (a, b) {
        var aOrder = a.track.order || 0;
        var bOrder = b.track.order || 0;
        return aOrder - bOrder;
    });

    // Reattach the divs to the dom in the correct order
    $(this.trackContainer).children("igv-track").detach();

    this.trackViews.forEach(function (trackView) {
        myself.trackContainer.appendChild(trackView.trackDiv);
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
            self.trackContainer.removeChild(tv.trackDiv);
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

    let f = typeof property === 'function' ?
        trackView => property(trackView.track) :
        trackView => value === trackView.track[property]

    return this.trackViews.filter(f).map(tv => tv.track);
};

Browser.prototype.setTrackHeight = function (newHeight) {

    this.trackHeight = newHeight;

    this.trackViews.forEach(function (trackView) {
        trackView.setTrackHeight(newHeight);
    });

};

Browser.prototype.visibilityChange = async function () {

    const status = this.referenceFrameList.find(referenceFrame => referenceFrame.bpPerPixel < 0)

    if (status) {
        const viewportWidth = this.calculateViewportWidth(this.referenceFrameList.length)
        for (let referenceFrame of this.referenceFrameList) {
            referenceFrame.bpPerPixel = (referenceFrame.initialEnd - referenceFrame.start) / viewportWidth
        }
    }

    await this.resize();
};

Browser.prototype.resize = async function () {

    if (this.referenceFrameList) {

        const isWGV = this.isMultiLocusWholeGenomeView() || GenomeUtils.isWholeGenomeView(this.referenceFrameList[0].chr);

        if (isWGV || this.isMultiLocusMode()) {
            this.centerGuide.forcedHide();
        } else {
            this.centerGuide.forcedShow();
        }

        this.navbarManager.navbarDidResize(this.$navigation.width(), isWGV);

        for (let referenceFrame of this.referenceFrameList) {
            if (!isFinite(referenceFrame.bpPerPixel) && undefined !== referenceFrame.initialEnd) {
                referenceFrame.bpPerPixel = (referenceFrame.initialEnd - referenceFrame.start) / this.viewportWidth();
            }
        }

    }

    if (this.referenceFrameList && 1 === this.referenceFrameList.length && resizeWillExceedChromosomeLength(this, this.viewportContainerWidth(), this.referenceFrameList[0])) {
        this.search(this.referenceFrameList[0].chr);
    } else {

        if (this.centerGuide) this.centerGuide.resize();
        this.trackViews.forEach(function (trackView) {
            trackView.resize();
        })
    }

    if (this.referenceFrameList && this.referenceFrameList.length > 0) {
        this.updateLocusSearchWidget(this.referenceFrameList[0]);
        this.windowSizePanel.updateWithReferenceFrame(this.referenceFrameList[0]);
    }

    await this.updateViews();

    for (let {viewports, $viewportContainer} of this.trackViews) {
        updateViewportShims(viewports, $viewportContainer)
    }

};

const resizeWillExceedChromosomeLength = (browser, viewportContainerWidth, referenceFrame) => {
    const bp = viewportContainerWidth * referenceFrame.bpPerPixel
    const {bpLength} = browser.genome.getChromosome(referenceFrame.chr)
    return (bp > bpLength);
}

Browser.prototype.updateViews = async function (referenceFrame, views, force) {

    if (!views) {
        views = this.trackViews;
    }

    if (!referenceFrame && this.referenceFrameList && 1 === this.referenceFrameList.length) {
        referenceFrame = this.referenceFrameList[0];
    }
    if (referenceFrame) {
        this.updateLocusSearchWidget(referenceFrame);
        this.windowSizePanel.updateWithReferenceFrame(referenceFrame);
    }

    if (this.centerGuide) {
        this.centerGuide.repaint();
    }

    // Don't autoscale while dragging.
    if (this.dragObject) {
        for (let trackView of views) {
            await trackView.updateViews(force);
        }
    } else {
        // Group autoscale
        const groupAutoscaleTracks = {};
        const otherTracks = [];
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

        const keys = Object.keys(groupAutoscaleTracks);
        for (let group of keys) {

            var groupTrackViews, promises;

            groupTrackViews = groupAutoscaleTracks[group];
            promises = [];

            groupTrackViews.forEach(function (trackView) {
                promises.push(trackView.getInViewFeatures());
            });

            const featureArray = await Promise.all(promises)

            var allFeatures = [], dataRange;

            for (let features of featureArray) {
                allFeatures = allFeatures.concat(features);
            }
            dataRange = doAutoscale(allFeatures);

            for (let trackView of groupTrackViews) {
                trackView.track.dataRange = dataRange;
                trackView.track.autoscale = false;
                await trackView.updateViews(force);
            }

        }

        for (let trackView of otherTracks) {
            await trackView.updateViews(force);
        }
    }
};

Browser.prototype.loadInProgress = function () {
    var i;
    for (i = 0; i < this.trackViews.length; i++) {
        if (this.trackViews[i].isLoading()) return true;
    }
    return false;
};

Browser.prototype.updateLocusSearchWidget = function (referenceFrame) {

    var self = this,
        ss,
        ee,
        str,
        end,
        chromosome;


    if (this.rulerTrack) {
        this.rulerTrack.updateLocusLabel();
    }

    if (0 === this.referenceFrameList.indexOf(referenceFrame) && 1 === this.referenceFrameList.length) {

        if (referenceFrame.locusSearchString && 'all' === referenceFrame.locusSearchString.toLowerCase()) {

            this.$searchInput.val(referenceFrame.locusSearchString);
            this.chromosomeSelectWidget.$select.val('all');
        } else {

            this.chromosomeSelectWidget.$select.val(referenceFrame.chr);

            if (this.$searchInput) {

                end = referenceFrame.start + referenceFrame.bpPerPixel * self.viewportWidth();

                if (this.genome) {
                    chromosome = this.genome.getChromosome(referenceFrame.chr);
                    if (chromosome) {
                        end = Math.min(end, chromosome.bpLength);
                    }
                }

                ss = StringUtils.numberFormatter(Math.floor(referenceFrame.start + 1));
                ee = StringUtils.numberFormatter(Math.floor(end));
                str = referenceFrame.chr + ":" + ss + "-" + ee;
                this.$searchInput.val(str);
            }

            this.fireEvent('locuschange', [{chr: referenceFrame.chr, start: ss, end: ee, label: str}]);
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

    let ww
    if (this.trackViews && this.trackViews.length > 0) {
        ww = this.trackViews[0].$viewportContainer.width()
    } else {
        const {width} = this.trackContainer.getBoundingClientRect();
        ww = width - viewportContainerShimWidth
    }

    return ww
};

Browser.prototype.calculateViewportWidth = function (referenceFrameListLength) {
    if (1 === referenceFrameListLength) {
        return this.viewportContainerWidth()
    } else {
        return Math.floor((this.viewportContainerWidth() - (referenceFrameListLength - 1) * multiLocusGapWidth) / referenceFrameListLength)
    }
}

Browser.prototype.viewportWidth = function () {
    return this.trackViews[0].viewports[0].$viewport.width()
};

Browser.prototype.minimumBases = function () {
    return this.config.minimumBases;
};

Browser.prototype.updateZoomSlider = function ($slider) {

    const viewport = this.trackViews[0].viewports[0];
    const referenceFrame = viewport.referenceFrame;

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

    const viewports = this.trackViews[0].viewports;
    for (let viewport of viewports) {

        const referenceFrame = viewport.referenceFrame;
        const centerBP = referenceFrame.start + referenceFrame.toBP(viewport.$viewport.width() / 2.0);
        const chromosome = referenceFrame.getChromosome();
        const bpp = lerp(
            (chromosome.bpLength - chromosome.bpStart) / viewport.$viewport.width(),
            this.minimumBases() / viewport.$viewport.width(),
            percentage);
        const viewportWidthBP = bpp * viewport.$viewport.width();

        referenceFrame.start = centerBP - (viewportWidthBP / 2);
        referenceFrame.bpPerPixel = bpp;
        referenceFrame.clamp(viewport.$viewport.width())
        this.updateViews(viewport.referenceFrame);

        function lerp(v0, v1, t) {
            return (1 - t) * v0 + t * v1;
        }

    }
};

Browser.prototype.zoomWithScaleFactor = function (scaleFactor, centerBPOrUndefined, viewportOrUndefined) {

    let viewports = viewportOrUndefined ? [viewportOrUndefined] : this.trackViews[0].viewports;
    for (let viewport of viewports) {

        const referenceFrame = viewport.referenceFrame;
        const chromosome = referenceFrame.getChromosome();
        const start = referenceFrame.start;
        const bpPerPixel = referenceFrame.bpPerPixel;
        const chromosomeLengthBP = chromosome.bpLength - chromosome.bpStart;
        const bppThreshold = scaleFactor < 1.0 ?
            this.minimumBases() / viewport.$viewport.width() :
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

        const viewChanged = start !== referenceFrame.start || bpPerPixel !== referenceFrame.bpPerPixel;
        if (viewChanged) {
            this.updateViews(viewport.referenceFrame);
        }

    }


};

Browser.prototype.presentSplitScreenMultiLocusPanel = function (alignment, leftMatePairReferenceFrame) {

    // account for reduced viewport width as a result of adding right mate pair panel
    const viewportWidth = this.calculateViewportWidth(1 + this.referenceFrameList.length);

    adjustReferenceFrame(leftMatePairReferenceFrame, viewportWidth, alignment.start, alignment.lengthOnRef)

    // create right mate pair reference frame
    const mateChrName = this.genome.getChromosomeName(alignment.mate.chr);

    const rightMatePairReferenceFrame = createReferenceFrameWithAlignment(this.genome, mateChrName, leftMatePairReferenceFrame.bpPerPixel, viewportWidth, alignment.mate.position, alignment.lengthOnRef);

    // add right mate panel beside left mate panel
    this.addMultiLocusPanelWithReferenceFrameIndex(rightMatePairReferenceFrame, 1 + (this.referenceFrameList.indexOf(leftMatePairReferenceFrame)), viewportWidth);

};

Browser.prototype.selectMultiLocusPanelWithReferenceFrame = function (referenceFrame) {

    const removable = this.referenceFrameList.filter(r => referenceFrame !== r);

    removable.forEach(r => this.removeMultiLocusPanelWithReferenceFrame(r, false));

    this.resize();
};

Browser.prototype.removeMultiLocusPanelWithReferenceFrame = function (referenceFrame, doResize) {

    const index = this.referenceFrameList.indexOf(referenceFrame);

    for (let trackView of this.trackViews) {
        trackView.removeViewportWithLocusIndex(index);
    }

    const previousListLength = this.referenceFrameList.length;
    const previousViewportWidth = this.calculateViewportWidth(previousListLength)

    this.referenceFrameList.splice(index, 1);
    const viewportWidth = this.calculateViewportWidth(this.referenceFrameList.length)

    for (let i = 0; i < this.referenceFrameList.length; i++) {
        const ee = this.referenceFrameList[i].calculateEnd(previousViewportWidth);
        const bpp = this.referenceFrameList[i].calculateBPP(ee, viewportWidth);

        const {chr, start} = this.referenceFrameList[i]
        this.referenceFrameList[i].referenceFrame = new ReferenceFrame(this.genome, chr, start, ee, bpp);
    }

    this.updateUIWithReferenceFrameListChange(this.referenceFrameList);

    if (true === doResize) {
        this.resize();
    } else {

        for (let {viewports, $viewportContainer} of this.trackViews) {
            updateViewportShims(viewports, $viewportContainer)
        }

    }


};

Browser.prototype.addMultiLocusPanelWithReferenceFrameIndex = function (referenceFrame, index, viewportWidth) {

    if (index === this.referenceFrameList.length) {

        this.referenceFrameList.push(referenceFrame);

        for (let trackView of this.trackViews) {
            const viewport = createViewport(trackView, this.referenceFrameList, index, viewportWidth)
            trackView.viewports.push(viewport);
        }

    } else {

        this.referenceFrameList.splice(index, 0, referenceFrame);

        for (let trackView of this.trackViews) {

            const viewport = createViewport(trackView, this.referenceFrameList, index, viewportWidth)
            trackView.viewports.splice(index, 0, viewport)

            // The viewport constructor always appends. Reorder here.
            const $detached = viewport.$viewport.detach()
            $detached.insertAfter(trackView.viewports[index - 1].$viewport)

        }

    }

    for (let trackView of this.trackViews) {
        trackView.updateViewportForMultiLocus();
        trackView.attachScrollbar(trackView.$viewportContainer, trackView.viewports);
    }

    if (this.rulerTrack) {
        this.rulerTrack.updateLocusLabel();
    }

    this.updateUIWithReferenceFrameListChange(this.referenceFrameList);

    this.resize();

};

Browser.prototype.emptyViewportContainers = function () {

    for (let trackView of this.trackViews) {

        if (trackView.scrollbar) {
            trackView.scrollbar.$outerScroll.remove()
            trackView.scrollbar = null
            trackView.scrollbar = undefined
        }

        for (let viewport of trackView.viewports) {

            if (viewport.rulerSweeper) {
                viewport.rulerSweeper.$rulerSweeper.remove();
            }

            if (viewport.popover) {
                viewport.popover.dispose()
            }

            viewport.$viewport.remove();
        }

        delete trackView.viewports;
        trackView.viewports = [];

        delete trackView.scrollbar;
    }

};

Browser.prototype.buildViewportsWithReferenceFrameList = function (referenceFrameList) {

    const width = this.calculateViewportWidth(referenceFrameList.length);

    for (let trackView of this.trackViews) {

        for (let referenceFrame of referenceFrameList) {
            const viewport = createViewport(trackView, referenceFrameList, referenceFrameList.indexOf(referenceFrame), width)
            trackView.viewports.push(viewport);
        }

        trackView.updateViewportForMultiLocus();
        trackView.attachScrollbar(trackView.$viewportContainer, trackView.viewports);

    }

    for (let {viewports, $viewportContainer} of this.trackViews) {
        updateViewportShims(viewports, $viewportContainer)
    }

};

Browser.prototype.getViewportWithGUID = function (guid) {

    let result = undefined;
    for (let trackView of this.trackViews) {
        for (let viewport of trackView.viewports) {
            if (guid === viewport.guid) {
                result = viewport;
            }
        }
    }

    return result;
};

Browser.prototype.goto = function (chr, start, end) {
    return this.search(chr + ":" + start + "-" + end);
};

Browser.prototype.search = async function (string, init) {

    if (undefined === string || '' === string) {
        return
    }

    if (string && string.trim().toLowerCase() === "all" || string === "*") {
        string = "all";
    }

    const loci = string.split(' ')

    let referenceFrameList = await createReferenceFrameList(this, loci)
    // if (undefined === referenceFrameList) {
    //     // If nothing is found and there are spaces, consider the possibility that the search term itself has spaces
    //     referenceFrameList = await createReferenceFrameList(this, [string])
    // }

    if (referenceFrameList && referenceFrameList.length > 0) {
        this.emptyViewportContainers();
        this.referenceFrameList = referenceFrameList;
        this.buildViewportsWithReferenceFrameList(referenceFrameList);
    } else {
        throw new Error(`Unrecognized locus ${ string }`);
    }

    this.updateUIWithReferenceFrameListChange(referenceFrameList);

    if (!init) {
        this.updateViews();
    }

    return referenceFrameList;
};

function isLocusString(browser, locus) {

    const a = locus.split(':')
    const chr = a[0]

    if ('all' === chr && browser.genome.getChromosome(chr)) {
        return {browser, chr, start: 0, end: browser.genome.getChromosome(chr).bpLength, locus}
    } else if (undefined === browser.genome.getChromosome(chr)) {

        return undefined

    } else {

        const extent = {}
        extent.start = 0;
        extent.end = browser.genome.getChromosome(chr).bpLength;

        if (a.length > 1) {

            const b = a[1].split('-')

            if (b.length > 2) {
                return undefined
            } else {

                let numeric
                numeric = b[0].replace(/,/g, '')

                if (isNaN(numeric)) {
                    return undefined
                } else {
                    extent.start = parseInt(numeric, 10) - 1
                }

                if (2 === b.length) {

                    numeric = b[1].replace(/,/g, '')

                    if (isNaN(numeric)) {
                        return undefined;
                    } else {
                        extent.end = parseInt(numeric, 10)
                    }
                }
            }
        }

        validateLocusExtent(browser.genome.getChromosome(chr).bpLength, extent, browser.minimumBases());
        const queryChr = browser.genome.getChromosomeName(chr);
        return {browser, chr: queryChr, start: extent.start, end: extent.end, locus}

    }
}

async function searchWebService(browser, locus, searchConfig) {

    let path = searchConfig.url.replace("$FEATURE$", locus.toUpperCase());
    if (path.indexOf("$GENOME$") > -1) {
        path = path.replace("$GENOME$", (browser.genome.id ? browser.genome.id : "hg19"));
    }
    const result = await igvxhr.loadString(path)
    return {result: result, locusSearchString: locus}
}

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

    const json = {
        "reference": this.genome.toJSON()
    };

    if (FileUtils.isFilePath(json.reference.fastaURL)) {
        throw new Error(`Error. Sessions cannot include local file references ${json.reference.fastaURL.name}.`);
    } else if (FileUtils.isFilePath(json.reference.indexURL)) {
        throw new Error(`Error. Sessions cannot include local file references ${json.reference.indexURL.name}.`);
    }

    // Use first available trackView.
    const locus = [];
    const gtexSelections = {};
    let anyTrackView = this.trackViews[0];
    anyTrackView.viewports.forEach(function (viewport) {

        const referenceFrame = viewport.referenceFrame;
        const pixelWidth = viewport.$viewport[0].clientWidth;
        const locusString = referenceFrame.presentLocus(pixelWidth);
        locus.push(locusString);

        if (referenceFrame.selection) {
            const selection = {
                gene: referenceFrame.selection.gene,
                snp: referenceFrame.selection.snp
            };

            gtexSelections[locusString] = selection;
        }
    });

    json["locus"] = locus;

    const gtexKeys = Object.getOwnPropertyNames(gtexSelections);
    if (gtexKeys.length > 0) {
        json["gtexSelections"] = gtexSelections;
    }

    const trackJson = [];
    for (let {track} of this.trackViews) {

        let config;
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
    }
    const locaTrackFiles = trackJson.filter(({type}) => 'sequence' !== type).filter(({url}) => FileUtils.isFilePath(url))
    if (locaTrackFiles.length > 0) {
        throw new Error(`Error. Sessions cannot include local file references.`);
    }

    json["tracks"] = trackJson;

    return json;        // This is an object, not a json string

}

Browser.prototype.compressedSession = function () {

    var json, bytes, deflate, compressedBytes, compressedString, enc;

    json = JSON.stringify(this.toJSON());
    return StringUtils.compressString(json);
}

Browser.uncompressSession = function (url) {

    let bytes
    if (url.indexOf('/gzip;base64') > 0) {
        //Proper dataURI
        bytes = URIUtils.decodeDataURI(url);
        let json = ''
        for (let b of bytes) {
            json += String.fromCharCode(b)
        }
        return json;
    } else {

        let enc = url.substring(5);
        return StringUtils.uncompressString(enc);
    }
}

Browser.prototype.sessionURL = function () {
    var surl, path, idx;

    path = window.location.href.slice();
    idx = path.indexOf("?");

    surl = (idx > 0 ? path.substring(0, idx) : path) + "?sessionURL=data:" + this.compressedSession();

    return surl;

}

Browser.prototype.currentLoci = function () {
    const loci = [];
    const anyTrackView = this.trackViews[0];
    for (let viewport of anyTrackView.viewports) {
        const referenceFrame = viewport.referenceFrame;
        const pixelWidth = viewport.$viewport[0].clientWidth;
        const locusString = referenceFrame.presentLocus(pixelWidth);
        loci.push(locusString);
    }
    return loci;
}

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
    coords = DOMUtils.pageCoordinates(e);
    this.vpMouseDown = {
        viewport: viewport,
        lastMouseX: coords.x,
        mouseDownX: coords.x,
        lastMouseY: coords.y,
        mouseDownY: coords.y,
        referenceFrame: viewport.referenceFrame
    };
};


Browser.prototype.cancelTrackPan = function () {

    const dragObject = this.dragObject;
    this.dragObject = undefined;
    this.isScrolling = false;
    this.vpMouseDown = undefined;


    if (dragObject && dragObject.viewport.referenceFrame.start !== dragObject.start) {
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
                    track.order = Math.min(Number.MAX_SAFE_INTEGER, lastOrder + 1);
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
                    track.order = Math.max(-Number.MAX_SAFE_INTEGER, lastOrder - 1);
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

    $(this.trackContainer).on('mousemove', handleMouseMove);

    $(this.trackContainer).on('touchmove', handleMouseMove);

    $(this.trackContainer).on('mouseleave', mouseUpOrLeave);

    $(this.trackContainer).on('mouseup', mouseUpOrLeave);

    $(this.trackContainer).on('touchend', mouseUpOrLeave);

    function handleMouseMove(e) {

        var coords, viewport, viewportWidth, referenceFrame;

        e.preventDefault();


        if (self.loadInProgress()) {
            return;
        }

        coords = DOMUtils.pageCoordinates(e);

        if (self.vpMouseDown) {

            // Determine direction,  true == horizontal
            const horizontal = Math.abs((coords.x - self.vpMouseDown.mouseDownX)) > Math.abs((coords.y - self.vpMouseDown.mouseDownY));

            viewport = self.vpMouseDown.viewport;
            viewportWidth = viewport.$viewport.width();
            referenceFrame = viewport.referenceFrame;

            if (!self.dragObject && !self.isScrolling) {
                if (horizontal) {
                    if (self.vpMouseDown.mouseDownX && Math.abs(coords.x - self.vpMouseDown.mouseDownX) > self.constants.dragThreshold) {
                        self.dragObject = {
                            viewport: viewport,
                            start: referenceFrame.start
                        };
                    }
                } else {
                    if (self.vpMouseDown.mouseDownY &&
                        Math.abs(coords.y - self.vpMouseDown.mouseDownY) > self.constants.scrollThreshold) {
                        self.isScrolling = true;
                        const trackView = viewport.trackView;
                        const viewportContainerHeight = trackView.$viewportContainer.height();
                        const contentHeight = maxViewportContentHeight(trackView.viewports);
                        self.vpMouseDown.r = viewportContainerHeight / contentHeight;
                    }
                }
            }

            if (self.dragObject) {
                const viewChanged = referenceFrame.shiftPixels(self.vpMouseDown.lastMouseX - coords.x, viewportWidth);
                if (viewChanged) {
                    self.updateLocusSearchWidget(self.vpMouseDown.referenceFrame);
                    self.updateViews();
                }
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

async function getDriveFileInfo(googleDriveURL) {
    const id = GoogleUtils.getGoogleDriveFileID(googleDriveURL);
    const endPoint = "https://www.googleapis.com/drive/v3/files/" + id + "?supportsTeamDrives=true";
    return igvxhr.loadJson(endPoint, buildOptions({}));
}

export {isLocusString, searchWebService}
export default Browser


