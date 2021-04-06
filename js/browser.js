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
import {Alert, InputDialog} from '../node_modules/igv-ui/dist/igv-ui.js';
import TrackView, {
    emptyViewportContainers,
    maxViewportContentHeight,
    updateViewportShims
} from "./trackView.js";
import {createViewport} from "./viewportFactory.js";
import C2S from "./canvas2svg.js";
import TrackFactory from "./trackFactory.js";
import ROI from "./roi.js";
import GtexSelection from "./gtex/gtexSelection.js";
import XMLSession from "./session/igvXmlSession.js";
import RulerTrack from "./rulerTrack.js";
import GenomeUtils from "./genome/genome.js";
import loadPlinkFile from "./sampleInformation.js";
import {adjustReferenceFrame, createReferenceFrameList, createReferenceFrameWithAlignment} from "./referenceFrame.js";
import {
    DOMUtils,
    FileUtils,
    GoogleUtils,
    igvxhr,
    StringUtils,
    TrackUtils,
    URIUtils
} from "../node_modules/igv-utils/src/index.js";
import {createIcon} from "./igv-icons.js";
import {buildOptions, doAutoscale, getFilename, inferTrackType, validateLocusExtent} from "./util/igvUtils.js";
import GtexUtils from "./gtex/gtexUtils.js";
import IdeogramTrack from "./ideogramTrack.js";
import {defaultSequenceTrackOrder} from './sequenceTrack.js';
import version from "./version.js";
import FeatureSource from "./feature/featureSource.js"
import {defaultNucleotideColors} from "./util/nucleotideColors.js"
import search from "./search.js"
import NavbarManager from "./navbarManager.js";
import ChromosomeSelectWidget from "./ui/chromosomeSelectWidget.js";
import WindowSizePanel from "./windowSizePanel.js";
import CursorGuide from "./ui/cursorGuide.js";
import CenterGuide from "./ui/centerGuide.js";
import TrackLabelControl from "./ui/trackLabelControl.js";
import SampleNameControl from "./ui/sampleNameControl.js";
import SVGSaveControl from "./ui/svgSaveControl.js";
import ZoomWidget from "./ui/zoomWidget.js";
import UserFeedback from "./ui/userFeedback.js";
import DataRangeDialog from "./ui/dataRangeDialog.js";

// igv.scss - $igv-multi-locus-gap-width
const multiLocusGapDivWidth = 1
const multiLocusGapMarginWidth = 2

const multiLocusGapWidth = (2 * multiLocusGapMarginWidth) + multiLocusGapDivWidth

const rightHandGutterWidth = 36

const trackManipulationHandleWidth = 12
const trackManipulationHandleMarginWidth = 0
const trackManipulationHandleShim = trackManipulationHandleWidth + trackManipulationHandleMarginWidth

const scrollbarOuterWidth = 14

// igv.scss - $igv-viewport-container-shim-width
const viewportContainerShimWidth = rightHandGutterWidth + trackManipulationHandleShim + scrollbarOuterWidth

const defaultSampleNameViewportWidth = 200

class Browser {

    constructor(config, parentDiv) {

        this.config = config;
        this.guid = DOMUtils.guid();
        this.namespace = '.browser_' + this.guid;

        this.parent = parentDiv;

        this.$root = $('<div>', {class: 'igv-root'});
        $(parentDiv).append(this.$root);

        const $trackContainer = $('<div>', {class: 'igv-track-container'});
        this.$root.append($trackContainer);

        Alert.init(this.$root.get(0))
        this.trackContainer = $trackContainer.get(0);

        this.initialize(config);

        this.trackViews = [];
        this.trackLabelsVisible = true;
        this.isCenterGuideVisible = false;

        this.showSampleNames = false;

        this.cursorGuideVisible = false;
        this.constants = {
            dragThreshold: 3,
            scrollThreshold: 5,
            defaultColor: "rgb(0,0,150)",
            doubleClickDelay: config.doubleClickDelay || 500
        }

        // Map of event name -> [ handlerFn, ... ]
        this.eventHandlers = {};

        this.$spinner = $('<div>', {class: 'igv-track-container-spinner'});
        $trackContainer.append(this.$spinner);

        this.$spinner.append(createIcon("spinner"));

        this.stopSpinner();

        this.addMouseHandlers();

        this.setControls(config);
    }

    initialize(config) {

        var genomeId;

        if (config.gtex) {
            GtexUtils.gtexLoaded = true
        }
        this.flanking = config.flanking;
        this.crossDomainProxy = config.crossDomainProxy;
        this.formats = config.formats;
        this.trackDefaults = config.trackDefaults;
        this.nucleotideColors = config.nucleotideColors || defaultNucleotideColors;
        for (let key of Object.keys(this.nucleotideColors)) {
            this.nucleotideColors[key.toLowerCase()] = this.nucleotideColors[key];
        }

        this.showSampleNames = config.showSampleNames;
        this.showSampleNameButton = config.showSampleNameButton;
        this.sampleNameViewportWidth = config.sampleNameViewportWidth || defaultSampleNameViewportWidth;


        if (config.search) {
            this.searchConfig = {
                type: "json",
                url: config.search.url,
                coords: config.search.coords === undefined ? 1 : config.search.coords,
                chromosomeField: config.search.chromosomeField || "chromosome",
                startField: config.search.startField || "start",
                endField: config.search.endField || "end",
                geneField: config.search.geneField || "gene",
                snpField: config.search.snpField || "snp",
                resultsField: config.search.resultsField
            }
        } else {

            if (config.reference && config.reference.id) {
                genomeId = config.reference.id;
            } else if (config.genome) {
                genomeId = config.genome;
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


    setControls(config) {

        const $navBar = this.createStandardControls(config);

        $navBar.insertBefore($(this.trackContainer));

        if (false === config.showControls) {
            $navBar.hide();
        }

        if (false === config.showTrackLabels) {
            this.hideTrackLabels();
        } else {
            this.showTrackLabels();
            if (this.trackLabelControl) {
                this.trackLabelControl.setState(this.trackLabelsVisible);
            }
        }

        if (false === config.showCursorTrackingGuide) {
            this.cursorGuide.doHide();
        } else {
            this.cursorGuide.doShow();
        }
        if (false === config.showCenterGuide) {
            this.centerGuide.doHide();
        } else {
            this.centerGuide.doShow();
        }

    }

    createStandardControls(config) {

        this.navbarManager = new NavbarManager(this);

        const $navBar = $('<div>', {class: 'igv-navbar'});
        this.$navigation = $navBar;

        const $navbarLeftContainer = $('<div>', {class: 'igv-navbar-left-container'});
        $navBar.append($navbarLeftContainer);

        // IGV logo
        const $logo = $('<div>', {class: 'igv-logo'});
        $navbarLeftContainer.append($logo);

        const logoSvg = logo();
        logoSvg.css("width", "34px");
        logoSvg.css("height", "32px");
        $logo.append(logoSvg);

        this.$current_genome = $('<div>', {class: 'igv-current-genome'});
        $navbarLeftContainer.append(this.$current_genome);
        this.$current_genome.text('');

        const $genomicLocation = $('<div>', {class: 'igv-navbar-genomic-location'});
        $navbarLeftContainer.append($genomicLocation);

        // chromosome select widget
        this.chromosomeSelectWidget = new ChromosomeSelectWidget(this, $genomicLocation);
        if (undefined === config.showChromosomeWidget) {
            config.showChromosomeWidget = true;   // Default to true
        }
        if (true === config.showChromosomeWidget) {
            this.chromosomeSelectWidget.$container.show();
        } else {
            this.chromosomeSelectWidget.$container.hide();
        }

        const $locusSizeGroup = $('<div>', {class: 'igv-locus-size-group'});
        $genomicLocation.append($locusSizeGroup);

        const $searchContainer = $('<div>', {class: 'igv-search-container'});
        $locusSizeGroup.append($searchContainer);

        // browser.$searchInput = $('<input type="text" placeholder="Locus Search">');
        this.$searchInput = $('<input>', {class: 'igv-search-input', type: 'text', placeholder: 'Locus Search'});
        $searchContainer.append(this.$searchInput);

        this.$searchInput.change(async () => {
            try {
                const str = this.$searchInput.val()
                const referenceFrameList = await this.search(str)

                if (referenceFrameList.length > 1) {
                    this.updateLocusSearchWidget(referenceFrameList)
                    this.windowSizePanel.updatePanel(referenceFrameList)
                }

            } catch (error) {
                Alert.presentAlert(error)
            }
        })

        const $searchIconContainer = $('<div>', {class: 'igv-search-icon-container'});
        $searchContainer.append($searchIconContainer);

        $searchIconContainer.append(createIcon("search"));

        $searchIconContainer.on('click', () => this.search(this.$searchInput.val()));

        this.windowSizePanel = new WindowSizePanel($locusSizeGroup, this);

        const $navbarRightContainer = $('<div>', {class: 'igv-navbar-right-container'});
        $navBar.append($navbarRightContainer);

        const $toggle_button_container = $('<div class="igv-navbar-toggle-button-container">');
        $navbarRightContainer.append($toggle_button_container);
        this.$toggle_button_container = $toggle_button_container;

        this.cursorGuide = new CursorGuide($(this.trackContainer), $toggle_button_container, config, this);

        this.centerGuide = new CenterGuide($(this.trackContainer), $toggle_button_container, config, this);

        if (true === config.showTrackLabelButton) {
            this.trackLabelControl = new TrackLabelControl($toggle_button_container, this);
        }

        // if (true === config.showSampleNameButton) {
        this.sampleNameControl = new SampleNameControl($toggle_button_container, this)
        if (!config.showSampleNameButton) {
            this.sampleNameControl.hide();
        }
        //  }

        if (true === config.showSVGButton) {
            this.svgSaveControl = new SVGSaveControl($toggle_button_container, this);
        }

        this.zoomWidget = new ZoomWidget(this, $navbarRightContainer);

        if (false === config.showNavigation) {
            this.$navigation.hide();
        }

        this.userFeedback = new UserFeedback($(this.trackContainer));
        this.userFeedback.hide();
        this.inputDialog = new InputDialog(this.$root.get(0));
        this.dataRangeDialog = new DataRangeDialog(this.$root);

        return $navBar;

    }


    getSampleNameViewportWidth() {
        return false === this.showSampleNames ? 0 : this.sampleNameViewportWidth
    }

    startSpinner() {
        const $spinner = this.$spinner;
        if ($spinner) {
            $spinner.addClass("igv-fa5-spin");
            $spinner.show();
        }
    };

    stopSpinner() {
        const $spinner = this.$spinner;
        if ($spinner) {
            $spinner.hide();
            $spinner.removeClass("igv-fa5-spin");
        }
    };

    isMultiLocusMode() {
        return this.referenceFrameList && this.referenceFrameList.length > 1;
    };

    addTrackToFactory(name, track) {
        TrackFactory.addTrack(name, track);
    }

    isMultiLocusWholeGenomeView() {

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

    /**
     * Render browse display as SVG
     * @returns {string}
     */
    async toSVG() {

        let {x, y, width, height} = this.trackContainer.getBoundingClientRect();
        const {x: vpx} = this.trackViews[0].$viewportContainer.get(0).getBoundingClientRect();

        width += (this.referenceFrameList.length - 1) * multiLocusGapWidth

        const h_render = 8000;

        let svgContext = new C2S(
            {

                width,
                height: h_render,

                backdropColor: 'white',

                multiLocusGap: multiLocusGapWidth,

                viewbox:
                    {
                        x: 0,
                        y: 0,
                        width,
                        height: h_render
                    }

            });

        const dx = vpx - x;

        // tracks -> SVG
        for (let trackView of this.trackViews) {
            trackView.renderSVGContext(svgContext, {deltaX: dx, deltaY: -y})
        }

        // reset height to trim away unneeded svg canvas real estate. Yes, a bit of a hack.
        svgContext.setHeight(height);

        return svgContext.getSerializedSvg(true);

    };

    async saveSVGtoFile(config) {

        let svg = await this.toSVG();

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
    async loadSession(options) {

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
                const json = Browser.uncompressSession(options.url);
                return JSON.parse(json);

            } else {
                let filename = options.filename
                if (!filename) {
                    filename = (options.url ? await getFilename(options.url) : options.file.name)
                }

                if (filename.endsWith(".xml")) {

                    const knownGenomes = GenomeUtils.KNOWN_GENOMES;
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
    async loadSessionObject(session) {

        this.removeAllTracks();

        this.showSampleNames = session.showSampleNames
        this.sampleNameControl.setState(this.showSampleNames === true);

        if (session.sampleNameViewportWidth) {
            this.sampleNameViewportWidth = session.sampleNameViewportWidth

        }

        const genomeConfig = await GenomeUtils.expandReference(session.reference || session.genome);
        const genome = await this.loadReference(genomeConfig, session.locus);

        // Create ideogram and ruler track.  Really this belongs in browser initialization, but creation is
        // deferred because ideogram and ruler are treated as "tracks", and tracks require a reference frame
        if (undefined === this.ideogram && false !== this.config.showIdeogram) {
            this.ideogram = new IdeogramTrack(this)
            this.addTrack(this.ideogram)
        }

        if (undefined === this.rulerTrack && false !== this.config.showRuler) {
            this.rulerTrack = new RulerTrack(this);
            this.addTrack(this.rulerTrack);
        }


        // Restore gtex selections.
        if (session.gtexSelections) {
            for (let referenceFrame of this.referenceFrameList) {
                for (let s of Object.keys(session.gtexSelections)) {
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

        // Tracks.  Start with genome tracks, if any, then append session tracks
        const genomeTracks = genomeConfig.tracks || [];
        const tracks = session.tracks ? genomeTracks.concat(session.tracks) : genomeTracks;

        // Insure that we always have a sequence track
        const pushSequenceTrack = tracks.filter(track => track.type === 'sequence').length === 0;
        if (pushSequenceTrack && false !== this.config.showSequence) {
            tracks.push({type: "sequence", order: defaultSequenceTrackOrder})
        }

        // Maintain track order unless explicitly set
        let trackOrder = 1;
        for (let t of tracks) {
            if (undefined === t.order) {
                t.order = trackOrder++;
            }
        }

        await this.loadTrackList(tracks);

        if (this.ideogram) {
            this.ideogram.trackView.updateViews();
        }

        if (this.rulerTrack) {
            this.rulerTrack.trackView.updateViews();
        }

        if (this.centerGuide) {
            this.centerGuide.repaint();
        }

        this.updateLocusSearchWidget(this.referenceFrameList);

        this.windowSizePanel.updatePanel(this.referenceFrameList);
    }

    /**
     * Load a genome, defined by a string ID or a json-like configuration object. This includes a fasta reference
     * as well as optional cytoband and annotation tracks.
     *
     * @param idOrConfig
     * @returns {Promise<void>}
     */
    async loadGenome(idOrConfig) {

        const genomeConfig = await GenomeUtils.expandReference(idOrConfig);
        const genome = await this.loadReference(genomeConfig);

        const tracks = genomeConfig.tracks || [];

        // Insure that we always have a sequence track
        const pushSequenceTrack = tracks.filter(track => track.type === 'sequence').length === 0;
        if (pushSequenceTrack) {
            tracks.push({type: "sequence", order: defaultSequenceTrackOrder})
        }

        await this.loadTrackList(tracks);

        this.updateViews();
        return genome;
    }

    /**
     * Load a reference genome object.  This includes the fasta, and optional cytoband, but no tracks.  This method
     * is used by loadGenome and loadSession.
     *
     * @param genomeConfig
     * @param initialLocus
     * @returns {Promise<void>}
     */
    async loadReference(genomeConfig, initialLocus) {

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

        try {
            this.referenceFrameList = await this.search(getInitialLocus(initialLocus, genome), true)
        } catch (error) {
            // Couldn't find initial locus
            Alert.presentAlert(new Error(`Error searching for locus ${initialLocus}  [${error}]`), undefined);
            this.referenceFrameList = await this.search(this.genome.getHomeChromosomeName());
        }
        return this.genome;


        function getInitialLocus(locus, genome) {
            let loci = [];
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
    }

//
    updateUIWithReferenceFrameListChange(referenceFrameList) {

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
    setTrackLabelName(trackView, name) {
        trackView.viewports.forEach((viewport) => {
            viewport.setTrackLabel(name);
        });
    };

    hideTrackLabels() {
        this.trackLabelsVisible = false;
        toggleTrackLabels(this.trackViews, this.trackLabelsVisible);
    };

    showTrackLabels() {
        this.trackLabelsVisible = true;
        toggleTrackLabels(this.trackViews, this.trackLabelsVisible);
    };


// cursor guide
    hideCursorGuide() {
        this.cursorGuide.$verticalGuide.hide();
        this.cursorGuide.$horizontalGuide.hide();
        this.cursorGuideVisible = false;
    };

    showCursorGuide() {
        this.cursorGuide.$verticalGuide.show();
        this.cursorGuide.$horizontalGuide.show();
        this.cursorGuideVisible = true;
    };

    setCustomCursorGuideMouseHandler(mouseHandler) {
        this.cursorGuide.customMouseHandler = mouseHandler;
    };


// center guide
    hideCenterGuide() {
        this.centerGuide.$container.hide();
        this.isCenterGuideVisible = false;
    };

    showCenterGuide() {
        this.centerGuide.$container.show();
        this.centerGuide.resize();
        this.isCenterGuideVisible = true;
    };

    async loadTrackList(configList) {

        try {
            this.startSpinner();
            const promises = [];
            for (let config of configList) {
                const noSpinner = true;
                promises.push(this.loadTrack(config, noSpinner));
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

    async loadROI(config) {
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

    removeROI(roiToRemove) {
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

    clearROIs() {
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

    async loadTrack(config, noSpinner) {


        // config might be json
        if (StringUtils.isString(config)) {
            config = JSON.parse(config);
        }

        try {
            if (!noSpinner) this.startSpinner();

            const newTrack = await this.createTrack(config);

            if (undefined === newTrack) {
                Alert.presentAlert(new Error(`Unknown file type: ${config.url || config}`), undefined);
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

            if(typeof newTrack.hasSamples === 'function' && newTrack.hasSamples()) {
                if(this.config.showSampleNameButton !== false) {
                    this.sampleNameControl.show();   // If not explicitly set
                }
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
            let msg = error.message || error.error || error.toString();
            if (httpMessages.hasOwnProperty(msg)) {
                msg = httpMessages[msg];
            }
            msg += (": " + config.url);
            Alert.presentAlert(new Error(msg), undefined);
        } finally {
            if (!noSpinner) {
                this.stopSpinner();
            }
        }
    }

    async createTrack(config) {

        // Resolve function and promise urls
        let url = await URIUtils.resolveURL(config.url);
        if (StringUtils.isString(url)) {
            url = url.trim();
        }

        if (url) {
            if (config.format) {
                config.format = config.format.toLowerCase();
            } else {
                let filename = config.filename;
                if (!filename) {
                    filename = await getFilename(url);
                }
                config.format = TrackUtils.inferFileFormat(filename);
            }
        }

        let type = config.type;
        if (type && "bedtype" !== type) {
            type = type.toLowerCase();
        } else {
            type = inferTrackType(config);
            if ("bedtype" === type) {
                // Bed files must be read to determine track type
                const featureSource = FeatureSource(config, this.genome);
                config._featureSource = featureSource;    // This is a temp variable, bit of a hack
                const trackType = await featureSource.trackType();
                if (trackType) {
                    type = trackType;
                } else {
                    type = "annotation";
                }
                // Record in config to make type persistent in session
                config.type = type;
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
    async addTrack(track) {

        var trackView;
        trackView = new TrackView(this, $(this.trackContainer), track);
        this.trackViews.push(trackView);

        toggleTrackLabels(this.trackViews, this.trackLabelsVisible);

        this.reorderTracks();
        this.fireEvent('trackorderchanged', [this.getTrackOrder()])

        if (!track.autoscaleGroup) {
            // Group autoscale groups will get updated later (as a group)
            return trackView.updateViews();
        }
    }

    reorderTracks() {

        this.trackViews.sort(function (a, b) {

            const firstSortOrder = tv => {
                return 'ideogram' === tv.track.id ? 1 :
                    'ruler' === tv.track.id ? 2 :
                        3
            }

            const aOrder1 = firstSortOrder(a);
            const bOrder1 = firstSortOrder(b);
            if (aOrder1 === bOrder1) {
                const aOrder2 = a.track.order || 0;
                const bOrder2 = b.track.order || 0;
                return aOrder2 - bOrder2;
            } else {
                return aOrder1 - bOrder1;
            }
        });

        // Reattach the divs to the dom in the correct order
        $(this.trackContainer).children("igv-track").detach();

        for (let trackView of this.trackViews) {
            this.trackContainer.appendChild(trackView.trackDiv);
        }
    }

    getTrackOrder() {
        return this.trackViews.filter(tv => tv.track && tv.track.name).map(tv => tv.track.name)
    }

    removeTrackByName(name) {
        const copy = this.trackViews.slice();
        for (let trackView of copy) {
            if (name === trackView.track.name) {
                this.removeTrack(trackView.track);
            }
        }
    }

    removeTrack(track) {

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
            this.fireEvent('trackremoved', [trackPanelRemoved.track])
            this.fireEvent('trackorderchanged', [this.getTrackOrder()])
            trackPanelRemoved.dispose();
        }

    };

    /**
     * API function
     */
    removeAllTracks() {

        const newTrackViews = [];

        for (let trackView of this.trackViews) {
            const trackId = trackView.track.id;
            if (trackId !== 'ruler' && trackId !== 'ideogram') {
                this.trackContainer.removeChild(trackView.trackDiv);
                this.fireEvent('trackremoved', [trackView.track]);
                trackView.dispose();
            } else {
                newTrackViews.push(trackView);
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
    findTracks(property, value) {

        let f = typeof property === 'function' ?
            trackView => property(trackView.track) :
            trackView => value === trackView.track[property]

        return this.trackViews.filter(f).map(tv => tv.track);
    }

    setTrackHeight(newHeight) {

        this.trackHeight = newHeight;

        this.trackViews.forEach(function (trackView) {
            trackView.setTrackHeight(newHeight);
        });

    }

    async visibilityChange() {

        const status = this.referenceFrameList.find(referenceFrame => referenceFrame.bpPerPixel < 0)

        if (status) {
            const viewportWidth = this.calculateViewportWidth(this.referenceFrameList.length)
            for (let referenceFrame of this.referenceFrameList) {
                referenceFrame.bpPerPixel = (referenceFrame.initialEnd - referenceFrame.start) / viewportWidth
            }
        }

        if (this.referenceFrameList) {
            const isWGV = this.isMultiLocusWholeGenomeView() || GenomeUtils.isWholeGenomeView(this.referenceFrameList[0].chr);
            if (isWGV || this.isMultiLocusMode()) {
                this.centerGuide.forcedHide();
            } else {
                this.centerGuide.forcedShow();
            }
            this.navbarManager.navbarDidResize(this.$navigation.width(), isWGV);
        }

        await this.resize();
    }

    async resize() {

        const viewportWidth = this.computeViewportWidth(this.referenceFrameList.length, this.getViewportContainerWidth())

        for (let referenceFrame of this.referenceFrameList) {

            const viewportWidthBP = referenceFrame.toBP(viewportWidth)
            const {bpLength} = this.genome.getChromosome(referenceFrame.chr)

            if (viewportWidthBP > bpLength) {
                // console.log(`viewport-length-bp ${ StringUtils.numberFormatter(Math.round(viewportWidthBP))} chr-length-bp ${ StringUtils.numberFormatter(Math.round(bpLength)) }`)
                referenceFrame.bpPerPixel = bpLength / viewportWidth
            }

        }

        // console.log(`${ Date.now() } - browser - resize`)

        if (this.centerGuide) this.centerGuide.resize();

        for (let trackView of this.trackViews) {
            trackView.resize(viewportWidth)
        }

        if (this.centerGuide) this.centerGuide.resize();

        if (this.referenceFrameList && this.referenceFrameList.length > 0) {
            this.updateLocusSearchWidget(this.referenceFrameList);
            this.windowSizePanel.updatePanel(this.referenceFrameList);
        }

        await this.updateViews();

        for (let {viewports, $viewportContainer} of this.trackViews) {
            updateViewportShims(viewports, $viewportContainer)
        }
    }

    async updateViews(referenceFrame, trackViews, force) {

        if (!trackViews) {
            trackViews = this.trackViews;
        }

        if (!referenceFrame && this.referenceFrameList && 1 === this.referenceFrameList.length) {
            referenceFrame = this.referenceFrameList[0];
        }
        if (referenceFrame) {

            if (this.referenceFrameList.length > 1) {
                this.updateLocusSearchWidget(this.referenceFrameList);
                this.windowSizePanel.updatePanel(this.referenceFrameList);
            } else {
                this.updateLocusSearchWidget([referenceFrame]);
                this.windowSizePanel.updatePanel([referenceFrame]);
            }
        }

        if (this.centerGuide) {
            this.centerGuide.repaint();
        }

        // Don't autoscale while dragging.
        if (this.dragObject) {
            for (let trackView of trackViews) {
                await trackView.updateViews(force);
            }
        } else {
            // Group autoscale
            const groupAutoscaleTracks = {};
            const otherTracks = [];
            for (let trackView of trackViews) {
                const group = trackView.track.autoscaleGroup;
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
            }

            const keys = Object.keys(groupAutoscaleTracks);
            for (let group of keys) {

                const groupTrackViews = groupAutoscaleTracks[group];
                const promises = [];

                for (let trackView of groupTrackViews) {
                    promises.push(trackView.getInViewFeatures());
                }

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

    loadInProgress() {
        var i;
        for (i = 0; i < this.trackViews.length; i++) {
            if (this.trackViews[i].isLoading()) return true;
        }
        return false;
    };

    updateLocusSearchWidget(referenceFrameList) {

        if (referenceFrameList.length > 1) {
            this.$searchInput.val('')
            this.chromosomeSelectWidget.$select.val('')
            return
        }

        if (this.rulerTrack) {
            this.rulerTrack.updateLocusLabel()
        }

        const referenceFrame = referenceFrameList[0]
        if (referenceFrame.locusSearchString && 'all' === referenceFrame.locusSearchString.toLowerCase()) {

            this.$searchInput.val(referenceFrame.locusSearchString);
            this.chromosomeSelectWidget.$select.val('all');
        } else {

            this.chromosomeSelectWidget.$select.val(referenceFrame.chr);

            let ss
            let ee
            let str
            if (this.$searchInput) {

                let end = referenceFrame.start + referenceFrame.bpPerPixel * this.getViewportWidth();

                if (this.genome) {
                    const chromosome = this.genome.getChromosome(referenceFrame.chr);
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

    };

    /**
     * Return the visible width of a track.  All tracks should have the same width.
     */
    getViewportContainerWidth() {

        let ww
        if (this.trackViews && this.trackViews.length > 0) {
            ww = this.trackViews[0].$viewportContainer.width()
        } else {
            const {width} = this.trackContainer.getBoundingClientRect();
            ww = width - viewportContainerShimWidth
        }

        return ww
    };

    computeViewportWidth(referenceFrameListLength, viewportContainerWidth) {

        const containerWidth = TrackView.computeViewportWidth(this, viewportContainerWidth)
        return 1 === referenceFrameListLength ? containerWidth : Math.floor((containerWidth - (referenceFrameListLength - 1) * multiLocusGapWidth) / referenceFrameListLength)
    }

    getViewportWidth() {
        return this.trackViews[0].viewports[0].$viewport.width()
    };

    minimumBases() {
        return this.config.minimumBases;
    };

    updateZoomSlider($slider) {

        const viewport = this.trackViews[0].viewports[0];
        const referenceFrame = viewport.referenceFrame;

        const window = viewport.$viewport.width() * referenceFrame.bpPerPixel;
        const maxWindow = referenceFrame.getChromosome().bpLength;
        const minWindow = this.minimumBases();
        const v = (maxWindow - window) / (maxWindow - minWindow)
        const value = Math.round(100 * v);

        $slider.val(value);

    };

    zoom(scaleFactor) {
        let nuthin = undefined;
        this.zoomWithScaleFactor(scaleFactor)
    };

    // Zoom in by a factor of 2, keeping the same center location
    zoomIn() {
        this.zoomWithScaleFactor(0.5)
    };

    // Zoom out by a factor of 2, keeping the same center location if possible
    zoomOut() {
        this.zoomWithScaleFactor(2.0)
    };


    zoomWithRangePercentage(percentage) {

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

    zoomWithScaleFactor(scaleFactor, centerBPOrUndefined, viewportOrUndefined) {

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
    }

    presentSplitScreenMultiLocusPanel(alignment, leftMatePairReferenceFrame) {

        // account for reduced viewport width as a result of adding right mate pair panel
        const viewportWidth = this.calculateViewportWidth(1 + this.referenceFrameList.length);

        adjustReferenceFrame(leftMatePairReferenceFrame, viewportWidth, alignment.start, alignment.lengthOnRef)

        // create right mate pair reference frame
        const mateChrName = this.genome.getChromosomeName(alignment.mate.chr);

        const rightMatePairReferenceFrame = createReferenceFrameWithAlignment(this.genome, mateChrName, leftMatePairReferenceFrame.bpPerPixel, viewportWidth, alignment.mate.position, alignment.lengthOnRef);

        // add right mate panel beside left mate panel
        this.addMultiLocusPanelWithReferenceFrameIndex(rightMatePairReferenceFrame, 1 + (this.referenceFrameList.indexOf(leftMatePairReferenceFrame)), viewportWidth);
    }

    selectMultiLocusPanelWithReferenceFrame(referenceFrame) {

        const removable = this.referenceFrameList.filter(r => referenceFrame !== r);

        removable.forEach(r => this.removeMultiLocusPanelWithReferenceFrame(r, false));

        this.resize();
    }

    removeMultiLocusPanelWithReferenceFrame(referenceFrame, doResize) {

        for (let trackView of this.trackViews) {
            trackView.removeViewportForReferenceFrame(referenceFrame);
        }

        const index = this.referenceFrameList.indexOf(referenceFrame);
        this.referenceFrameList.splice(index, 1);
        this.updateUIWithReferenceFrameListChange(this.referenceFrameList);

        if (true === doResize) {
            this.resize();
        } else {

            for (let {viewports, $viewportContainer} of this.trackViews) {
                updateViewportShims(viewports, $viewportContainer)
            }
        }
    }

    addMultiLocusPanelWithReferenceFrameIndex(referenceFrame, index, viewportWidth) {

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
            // trackView.attachScrollbar($(trackView.trackDiv), trackView.$viewportContainer, trackView.viewports);
        }

        if (this.rulerTrack) {
            this.rulerTrack.updateLocusLabel();
        }

        this.updateUIWithReferenceFrameListChange(this.referenceFrameList);

        this.resize();
    }

    getViewportWithGUID(guid) {

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

    /**
     * @deprecated  This is a deprecated method with no known usages.  To be removed in a future release.
     */
    async goto(chr, start, end) {
        return this.search(chr + ":" + start + "-" + end);
    }

    async search(string, init) {

        const locusObjects = await search(this, string);
        if (locusObjects && (await locusObjects).length > 0) {

            const referenceFrameList = createReferenceFrameList(this, locusObjects)

            this.referenceFrameList = referenceFrameList
            emptyViewportContainers(this.trackViews)
            for (let trackView of this.trackViews) {
                trackView.populateViewportContainer(this, referenceFrameList);
            }

            this.updateUIWithReferenceFrameListChange(referenceFrameList);

            if (!init) {
                this.updateViews();
            }

            return referenceFrameList;
        } else {
            throw new Error(`Unrecognized locus ${string}`)
        }
    }

    async loadSampleInformation(url) {
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

    on(eventName, fn) {
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
    un(eventName, fn) {
        if (!this.eventHandlers[eventName]) {
            return;
        }

        var callbackIndex = this.eventHandlers[eventName].indexOf(fn);
        if (callbackIndex !== -1) {
            this.eventHandlers[eventName].splice(callbackIndex, 1);
        }
    };

    off(eventName, fn) {

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
    }

    fireEvent(eventName, args, thisObj) {

        const handlers = this.eventHandlers[eventName];
        if (undefined === handlers || handlers.length === 0) {
            return undefined;
        }

        const scope = thisObj || window;
        const results = handlers.map(function (event) {
            return event.apply(scope, args);
        });

        return results[0];
    }

    dispose() {

        $(window).off(this.namespace);
        $(document).off(this.namespace);
        this.eventHandlers = undefined;
        this.trackViews.forEach(function (tv) {
            tv.dispose();
        })
    }

    toJSON() {

        const json = {
            "version": version()
        }

        if (this.showSampleNames !== undefined) {
            json['showSampleNames'] = this.showSampleNames;
        }
        if (this.sampleNameViewportWidth !== defaultSampleNameViewportWidth) {
            json['sampleNameViewportWidth'] = this.sampleNameViewportWidth;
        }

        json["reference"] = this.genome.toJSON();
        if (FileUtils.isFilePath(json.reference.fastaURL)) {
            throw new Error(`Error. Sessions cannot include local file references ${json.reference.fastaURL.name}.`);
        } else if (FileUtils.isFilePath(json.reference.indexURL)) {
            throw new Error(`Error. Sessions cannot include local file references ${json.reference.indexURL.name}.`);
        }

        // Build locus array (multi-locus view).  Use the first track to extract the loci, any track could be used.
        const locus = [];
        const gtexSelections = {};
        let anyTrackView = this.trackViews[0];
        for (let viewport of anyTrackView.viewports) {
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
        }
        json["locus"] = locus.length === 1 ? locus[0] : locus;

        const gtexKeys = Object.getOwnPropertyNames(gtexSelections);
        if (gtexKeys.length > 0) {
            json["gtexSelections"] = gtexSelections;
        }

        const trackJson = [];
        const errors = [];
        for (let {track} of this.trackViews) {
            try {
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
            } catch (e) {
                errors.push(e);
            }
        }

        if (errors.length > 0) {
            let n = 1;
            let message = 'Errors encountered saving session:';
            for (let e of errors) {
                message += ` (${n++}) ${e.toString()}.`;
            }
            throw Error(message);
        }


        const locaTrackFiles = trackJson.filter((track) => {
            track.url && FileUtils.isFilePath(track.url)
        })

        if (locaTrackFiles.length > 0) {
            throw new Error(`Error. Sessions cannot include local file references.`);
        }

        json["tracks"] = trackJson;

        return json;        // This is an object, not a json string

    }

    compressedSession() {
        const json = JSON.stringify(this.toJSON());
        return StringUtils.compressString(json);
    }

    sessionURL() {
        const path = window.location.href.slice();
        const idx = path.indexOf("?");
        const surl = (idx > 0 ? path.substring(0, idx) : path) + "?sessionURL=blob:" + this.compressedSession();
        return surl;
    }

    currentLoci() {
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
    mouseDownOnViewport(e, viewport) {

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


    cancelTrackPan() {

        const dragObject = this.dragObject;
        this.dragObject = undefined;
        this.isScrolling = false;
        this.vpMouseDown = undefined;


        if (dragObject && dragObject.viewport.referenceFrame.start !== dragObject.start) {
            this.updateViews();
            this.fireEvent('trackdragend');
        }

    }


    startTrackDrag(trackView) {

        this.dragTrack = trackView;

    }

    updateTrackDrag(dragDestination) {

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

    endTrackDrag() {
        if (this.dragTrack) {
            this.dragTrack.$trackDragScrim.hide();
            this.dragTrack = undefined;
            this.fireEvent('trackorderchanged', [this.getTrackOrder()])
        } else {
            this.dragTrack = undefined;
        }
    }

    /**
     * Mouse handlers to support drag (pan)
     */
    addMouseHandlers() {

        var self = this;

        $(window).on('resize' + this.namespace, () => {
            this.resize();
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

                        if (self.referenceFrameList.length > 1) {
                            self.updateLocusSearchWidget(self.referenceFrameList);
                        } else {
                            self.updateLocusSearchWidget([self.vpMouseDown.referenceFrame]);
                        }

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

    async getDriveFileInfo(googleDriveURL) {
        const id = GoogleUtils.getGoogleDriveFileID(googleDriveURL);
        const endPoint = "https://www.googleapis.com/drive/v3/files/" + id + "?supportsTeamDrives=true";
        return igvxhr.loadJson(endPoint, buildOptions({}));
    }


    static uncompressSession(url) {

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

}

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

            const b = a[1].split('-');

            if (b.length > 2) {
                return undefined;
            } else {

                let numeric
                numeric = b[0].replace(/,/g, '')
                if (isNaN(numeric)) {
                    return undefined;
                }

                extent.start = parseInt(numeric, 10) - 1;

                if (1 === b.length) {
                    extent.start = extent.start - 20;
                    extent.end = extent.start + 20;
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

function logo() {

    return $(
        '<svg width="690px" height="324px" viewBox="0 0 690 324" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<title>IGV</title>' +
        '<g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">' +
        '<g id="IGV" fill="#666666">' +
        '<polygon id="Path" points="379.54574 8.00169252 455.581247 8.00169252 515.564813 188.87244 532.884012 253.529506 537.108207 253.529506 554.849825 188.87244 614.833392 8.00169252 689.60164 8.00169252 582.729511 320.722144 486.840288 320.722144"></polygon>' +
        '<path d="M261.482414,323.793286 C207.975678,323.793286 168.339046,310.552102 142.571329,284.069337 C116.803612,257.586572 103.919946,217.158702 103.919946,162.784513 C103.919946,108.410325 117.437235,67.8415913 144.472217,41.0770945 C171.507199,14.3125977 212.903894,0.930550071 268.663545,0.930550071 C283.025879,0.930550071 298.232828,1.84616386 314.284849,3.6774189 C330.33687,5.50867394 344.839793,7.97378798 357.794056,11.072835 L357.794056,68.968378 C339.48912,65.869331 323.578145,63.5450806 310.060654,61.9955571 C296.543163,60.4460336 284.574731,59.6712835 274.154998,59.6712835 C255.850062,59.6712835 240.502308,61.4320792 228.111274,64.9537236 C215.720241,68.4753679 205.793482,74.2507779 198.330701,82.2801269 C190.867919,90.309476 185.587729,100.87425 182.48997,113.974767 C179.392212,127.075284 177.843356,143.345037 177.843356,162.784513 C177.843356,181.942258 179.251407,198.000716 182.067551,210.960367 C184.883695,223.920018 189.671068,234.41436 196.429813,242.443709 C203.188559,250.473058 212.059279,256.178037 223.042241,259.558815 C234.025202,262.939594 247.683295,264.629958 264.01693,264.629958 C268.241146,264.629958 273.098922,264.489094 278.590403,264.207362 C284.081883,263.925631 289.643684,263.50304 295.275972,262.939577 L295.275972,159.826347 L361.595831,159.826347 L361.595831,308.579859 C344.698967,313.087564 327.239137,316.750019 309.215815,319.567334 C291.192494,322.38465 275.281519,323.793286 261.482414,323.793286 L261.482414,323.793286 L261.482414,323.793286 Z" id="Path"></path>;' +
        '<polygon id="Path" points="0.81355666 5.00169252 73.0472883 5.00169252 73.0472883 317.722144 0.81355666 317.722144"></polygon>' +
        '</g> </g> </svg>'
    );
}

export {isLocusString, searchWebService}
export default Browser

