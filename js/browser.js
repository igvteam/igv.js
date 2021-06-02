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
import {Alert, InputDialog} from '../node_modules/igv-ui/dist/igv-ui.js'
import { IGVMath, DOMUtils, FileUtils, GoogleUtils, igvxhr, StringUtils, TrackUtils, URIUtils } from "../node_modules/igv-utils/src/index.js";
import TrackView, { igv_axis_column_width, createAxisColumn, maxViewportContentHeight } from "./trackView.js";
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
import {buildOptions, doAutoscale, getFilename, inferTrackType, validateLocusExtent} from "./util/igvUtils.js";
import GtexUtils from "./gtex/gtexUtils.js";
import IdeogramTrack from "./ideogramTrack.js";
import {defaultSequenceTrackOrder} from './sequenceTrack.js';
import version from "./version.js";
import FeatureSource from "./feature/featureSource.js"
import {defaultNucleotideColors} from "./util/nucleotideColors.js"
import search from "./search.js"
import NavbarManager from "./navbarManager.js";
import { createSampleNameColumn } from './sampleNameViewport.js';
import TrackScrollbarControl, {igv_scrollbar_outer_width} from "./trackScrollbarControl.js";
import TrackDragControl, { igv_track_manipulation_handle_width } from "./trackDragControl.js";
import TrackGearControl, { igv_track_gear_menu_column_width } from "./trackGearControl.js";
import ChromosomeSelectWidget from "./ui/chromosomeSelectWidget.js";
import {createIcon} from "./igv-icons.js";
import WindowSizePanel from "./windowSizePanel.js";
import CursorGuide from "./ui/cursorGuide.js";
import CenterGuide from "./ui/centerGuide.js";
import TrackLabelControl from "./ui/trackLabelControl.js";
import SampleNameControl from "./ui/sampleNameControl.js";
import ZoomWidget from "./ui/zoomWidget.js";
import UserFeedback from "./ui/userFeedback.js";
import DataRangeDialog from "./ui/dataRangeDialog.js";
import HtsgetReader from "./htsget/htsgetReader.js";
import SVGSaveControl from "./ui/svgSaveControl.js";
import MenuPopup from "./ui/menuPopup.js";
import {randomRGB} from "./util/colorPalletes.js";
import { viewportColumnManager } from "./viewportColumnManager.js";

// $igv-column-shim-width: 1px;
// $igv-column-shim-margin: 2px;
const column_multi_locus_shim_width = 2 + 1 + 2

const defaultSampleNameViewportWidth = 200

class Browser {

    constructor(config, parentDiv) {

        this.config = config;
        this.guid = DOMUtils.guid();
        this.namespace = '.browser_' + this.guid;

        this.parent = parentDiv;

        this.$root = $('<div>', {class: 'igv-root'});
        $(parentDiv).append(this.$root);

        Alert.init(this.$root.get(0))

        this.columnContainer = DOMUtils.div({ class: 'igv-column-container' });
        this.$root.get(0).appendChild(this.columnContainer);

        this.menuPopup = new MenuPopup($(this.columnContainer));
        this.menuPopup.$popover.hide();

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
        }
    }

    setControls(config) {

        const $navBar = this.createStandardControls(config);
        $navBar.insertBefore($(this.columnContainer));
        this.$navigation = $navBar;

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
        if (config.showChromosomeWidget !== false) {
            this.chromosomeSelectWidget = new ChromosomeSelectWidget(this, $genomicLocation);
            this.chromosomeSelectWidget.$container.show();
        }

        const $locusSizeGroup = $('<div>', {class: 'igv-locus-size-group'});
        $genomicLocation.append($locusSizeGroup);

        const $searchContainer = $('<div>', {class: 'igv-search-container'});
        $locusSizeGroup.append($searchContainer);

        // browser.$searchInput = $('<input type="text" placeholder="Locus Search">');
        this.$searchInput = $('<input>', {class: 'igv-search-input', type: 'text', placeholder: 'Locus Search'});
        $searchContainer.append(this.$searchInput);

        this.$searchInput.change(() => this.search( this.$searchInput.val() ) )

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

        this.cursorGuide = new CursorGuide($(this.columnContainer), $toggle_button_container, config, this);

        this.centerGuide = new CenterGuide($(this.columnContainer), $toggle_button_container, config, this);

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

        this.userFeedback = new UserFeedback($(this.columnContainer));
        this.userFeedback.hide();
        this.inputDialog = new InputDialog(this.$root.get(0));
        this.dataRangeDialog = new DataRangeDialog(this.$root);

        return $navBar;

    }

    getSampleNameViewportWidth() {
        return false === this.showSampleNames ? 0 : this.sampleNameViewportWidth
    }

    startSpinner() {}

    _startSpinner() {
        const $spinner = this.$spinner;
        if ($spinner) {
            $spinner.addClass("igv-fa5-spin");
            $spinner.show();
        }
    };

    stopSpinner() {}

    _stopSpinner() {
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

        let { x, y, width, height } = this.columnContainer.getBoundingClientRect();

        const h_render = 8000;

        let context = new C2S(
            {

                width,
                height: h_render,

                backdropColor: 'white',

                multiLocusGap: 0,

                viewbox:
                    {
                        x: 0,
                        y: 0,
                        width,
                        height: h_render
                    }

            });

        const dx = x;

        // tracks -> SVG
        for (let trackView of this.trackViews) {
            trackView.renderSVGContext(context, { deltaX: 0, deltaY: -y })
        }

        // reset height to trim away unneeded svg canvas real estate. Yes, a bit of a hack.
        context.setHeight(height);

        return context.getSerializedSvg(true);

    };

    async renderSVG($container) {
        const svg = await this.toSVG()
        $container.empty()
        $container.append(svg)

        return svg
    }

    async saveSVGtoFile(config) {

        let svg = await this.toSVG()

        if (config.$container) {
            config.$container.empty()
            config.$container.append(svg)
        }

        const path = config.filename || 'igvjs.svg'
        const data = URL.createObjectURL(new Blob([svg], {type: "application/octet-stream"}))
        FileUtils.download(path, data)
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

        // prepare to load a new session, discarding DOM and state
        this.cleanHouseForSession()

        this.showSampleNames = session.showSampleNames || false;
        this.sampleNameControl.setState(this.showSampleNames === true);

        if (session.sampleNameViewportWidth) {
            this.sampleNameViewportWidth = session.sampleNameViewportWidth
        }

        const genomeConfig = await GenomeUtils.expandReference(session.reference || session.genome);

        await this.loadReference(genomeConfig, session.locus);

        this.axisColumn = createAxisColumn(this.columnContainer)

        viewportColumnManager.createColumns(this.columnContainer, this.referenceFrameList.length)

        // Add sample name column
        this.sampleNameColumn = createSampleNameColumn(this.columnContainer)

        // Add track scrollbar manager
        this.trackScrollbarControl = new TrackScrollbarControl(this.columnContainer)

        // Add track drag/reorder control
        this.trackDragControl = new TrackDragControl(this.columnContainer)

        // Add track drag/reorder control
        this.trackGearControl = new TrackGearControl(this.columnContainer)

        // Create ideogram and ruler track.  Really this belongs in browser initialization, but creation is
        // deferred because ideogram and ruler are treated as "tracks", and tracks require a reference frame
        if (undefined === this.ideogram && false !== session.showIdeogram) {
            this.ideogram = new IdeogramTrack(this)
            this.trackViews.push( new TrackView(this, this.columnContainer, this.ideogram));
            this.ideogram.trackView.updateViews();
         }

        if (undefined === this.rulerTrack && false !== session.showRuler) {
            this.rulerTrack = new RulerTrack(this);
            this.trackViews.push( new TrackView(this, this.columnContainer, this.rulerTrack));
            this.rulerTrack.trackView.updateViews();
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
                this.roi.push(new ROI(r, this.genome));
            }
        }

        // Tracks.  Start with genome tracks, if any, then append session tracks
        const genomeTracks = genomeConfig.tracks || [];
        const trackConfigurations = session.tracks ? genomeTracks.concat(session.tracks) : genomeTracks;

        // Insure that we always have a sequence track
        const pushSequenceTrack = trackConfigurations.filter(track => track.type === 'sequence').length === 0;
        if (pushSequenceTrack /*&& false !== this.config.showSequence*/) {
            trackConfigurations.push({type: "sequence", order: defaultSequenceTrackOrder})
        }

        // Maintain track order unless explicitly set
        let trackOrder = 1;
        for (let t of trackConfigurations) {
            if (undefined === t.order) {
                t.order = trackOrder++;
            }
        }

        await this.loadTrackList(trackConfigurations);

        toggleTrackLabels(this.trackViews, this.trackLabelsVisible);

        if (this.centerGuide) {
            this.centerGuide.repaint();
        }

        this.updateLocusSearchWidget(this.referenceFrameList);

        this.windowSizePanel.updatePanel(this.referenceFrameList);

        const isWGV = this.isMultiLocusWholeGenomeView() || GenomeUtils.isWholeGenomeView(this.referenceFrameList[0].chr);

        if (this.isMultiLocusMode() || isWGV) {
            this.centerGuide.forcedHide();
        } else {
            this.centerGuide.forcedShow();
        }
        this.navbarManager.navbarDidResize(this.$navigation.width(), isWGV);

    }

    /**
     * Load a reference genome object.  This includes the fasta, and optional cytoband, but no tracks.  This method
     * is used by loadGenome and loadSession.
     *
     * @param genomeConfig
     * @param initialLocus
     */
    async loadReference(genomeConfig, initialLocus) {

        const genome = await GenomeUtils.loadGenome(genomeConfig)

        const genomeChange = undefined === this.genome || (this.genome.id !== genome.id)

        this.genome = genome

        this.updateNavbarDOMWithGenome(genome)

        if (genomeChange) {
            this.removeAllTracks();
        }

        let locus
        try {
            locus = getInitialLocus(initialLocus, genome)
            await this.search(locus, true)
        } catch (error) {
            Alert.presentAlert(new Error(`Error searching for locus ${initialLocus}  [${error}]`), undefined)

            locus = this.genome.getHomeChromosomeName()
            await this.search(locus);
        }

    }

    cleanHouseForSession() {

        // empty columns
        for (let trackView of this.trackViews) {

            // empty axis column
            // empty viewport columns
            // empty sampleName column
            trackView.removeDOMFromColumnContainer()

            // empty trackScrollbarControl column
            this.trackScrollbarControl.removeScrollbar(trackView, this.columnContainer)

            // empty trackDragControl column
            this.trackDragControl.removeDragHandle(trackView)

            // empty trackGearControl column
            this.trackGearControl.removeGearContainer(trackView)
        }

        // discard columns

        // axis column
        if (this.axisColumn) this.axisColumn.remove()

        // viewport columns
        viewportColumnManager.discardAllColumns(this.columnContainer)

        // sample name column
        if (this.sampleNameColumn) this.sampleNameColumn.remove()

        // scrollbar column
        if (this.trackScrollbarControl) this.trackScrollbarControl.column.remove()

        // drag column
        if (this.trackDragControl) this.trackDragControl.column.remove()

        // gear column
        if (this.trackGearControl) this.trackGearControl.column.remove()

        // discard remaining state
        if (this.ideogram) this.ideogram.dispose()
        this.ideogram = undefined

        if (this.rulerTrack) this.rulerTrack.dispose()
        this.rulerTrack = undefined

        this.trackViews = []

    }

    updateNavbarDOMWithGenome(genome) {
        this.$current_genome.text(genome.id || '');
        this.$current_genome.attr('title', genome.id || '');
        this.chromosomeSelectWidget.update(genome);
    }

    /**
     * Load a genome, defined by a string ID or a json-like configuration object. This includes a fasta reference
     * as well as optional cytoband and annotation tracks.
     *
     * @param idOrConfig
     * @returns genome
     */
    async loadGenome(idOrConfig) {

        const genomeConfig = await GenomeUtils.expandReference(idOrConfig);
        await this.loadReference(genomeConfig, undefined);

        const tracks = genomeConfig.tracks || [];

        // Insure that we always have a sequence track
        const pushSequenceTrack = tracks.filter(track => track.type === 'sequence').length === 0;
        if (pushSequenceTrack) {
            tracks.push({type: "sequence", order: defaultSequenceTrackOrder})
        }

        await this.loadTrackList(tracks);

        await this.updateViews();

        return this.genome;
    }

//
    updateUIWithReferenceFrameList(referenceFrameList) {

        this.updateLocusSearchWidget(referenceFrameList)

        this.windowSizePanel.updatePanel(referenceFrameList)

        const isWGV = (this.isMultiLocusWholeGenomeView() || GenomeUtils.isWholeGenomeView(referenceFrameList[0].chr));

        (isWGV || this.isMultiLocusMode()) ? this.centerGuide.forcedHide() : this.centerGuide.forcedShow()

        this.isMultiLocusMode() ? this.zoomWidget.disable() : this.zoomWidget.enable()

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
        this.centerGuide.repaint();
        this.isCenterGuideVisible = true;
    };

    async loadTrackList(configList) {

        try {
            // this.startSpinner();
            const promises = [];
            for (let config of configList) {
                promises.push(this.loadTrack(config, false));
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
            await this.resize()
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
     * @param doResize - undefined by default
     * @returns {*}
     */

    async loadTrack(config, doResize) {


        // config might be json
        if (StringUtils.isString(config)) {
            config = JSON.parse(config);
        }

        try {

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

            if (typeof newTrack.hasSamples === 'function' && newTrack.hasSamples()) {
                if (this.config.showSampleNameButton !== false) {
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
            // TODO: If loadTrack() is called individually - not via loadTrackList() - call this.resize()
            if (false === doResize) {
                // do nothing
            } else {
                await this.resize()
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

                if (!config.format && (config.sourceType === undefined || config.sourceType === "htsget")) {
                    // Check for htsget URL.  This is a longshot
                    await HtsgetReader.inferFormat(config);
                }
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
        trackView = new TrackView(this, this.columnContainer, track);
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

        // discard current track order
        for (let { axis, viewports, sampleNameViewport, outerScroll, dragHandle, gearContainer } of this.trackViews) {

            axis.remove()

            for (let { $viewport } of viewports) {
                $viewport.detach()
            }

            sampleNameViewport.$viewport.detach()

            outerScroll.remove()
            dragHandle.remove()
            gearContainer.remove()
        }

        // Reattach the divs to the dom in the correct order
        const viewportColumns = this.columnContainer.querySelectorAll('.igv-column')

        for (let { axis, viewports, sampleNameViewport, outerScroll, dragHandle, gearContainer } of this.trackViews) {

            this.axisColumn.append(axis)

            for (let i = 0; i < viewportColumns.length; i++) {
                const { $viewport } = viewports[ i ]
                viewportColumns[ i ].appendChild($viewport.get(0))
            }

            this.sampleNameColumn.appendChild(sampleNameViewport.$viewport.get(0))

            this.trackScrollbarControl.column.appendChild(outerScroll)
            this.trackDragControl.column.appendChild(dragHandle)
            this.trackGearControl.column.appendChild(gearContainer)
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

        this.trackViews.splice(this.trackViews.indexOf(track.trackView), 1)

        this.fireEvent('trackremoved', [track])
        this.fireEvent('trackorderchanged', [this.getTrackOrder()])

        track.trackView.dispose()
    }

    /**
     * API function
     */
    removeAllTracks() {

        const remainingTrackViews = [];

        for (let trackView of this.trackViews) {

            if (trackView.track.id !== 'ruler' && trackView.track.id !== 'ideogram') {
                this.fireEvent('trackremoved', [trackView.track]);
                trackView.dispose();
             } else {
                remainingTrackViews.push(trackView);
            }
        }

        this.trackViews = remainingTrackViews;
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

        const viewportWidth = this.calculateViewportWidth(this.referenceFrameList.length)

        for (let referenceFrame of this.referenceFrameList) {

            const {bpLength} = this.genome.getChromosome(referenceFrame.chr)

            if (referenceFrame.toBP(viewportWidth) > bpLength) {
                referenceFrame.bpPerPixel = bpLength / viewportWidth
            }

        }

        this.updateUIWithReferenceFrameList(this.referenceFrameList);

        for (let trackView of this.trackViews) {
            trackView.resize(viewportWidth)
        }

        await this.updateViews(undefined, undefined, true);
    }

    async updateViews(referenceFrame, trackViews, force) {

        if (!trackViews) {
            trackViews = this.trackViews;
        }

        if (undefined === referenceFrame && this.referenceFrameList && 1 === this.referenceFrameList.length) {
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

            if (Object.entries(groupAutoscaleTracks).length > 0) {

                const keys = Object.keys(groupAutoscaleTracks)
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

            }

            for (let trackView of otherTracks) {
                await trackView.updateViews(force);
            }
        }
    };

    loadInProgress() {
        for (let trackView of this.trackViews) {
            if (trackView.isLoading()) return true;
        }
        return false;
    };

    updateLocusSearchWidget(referenceFrameList) {

        if (referenceFrameList.length > 1) {
            this.$searchInput.val('')
            this.chromosomeSelectWidget.$select.val('')

            if (this.rulerTrack) {
                for (let rulerViewport of this.rulerTrack.trackView.viewports) {
                    rulerViewport.updateLocusLabel();
                }
            }

        } else {

            const width = this.calculateViewportWidth(this.referenceFrameList.length)
            const locus = referenceFrameList[ 0 ].getPresentationLocusComponents(width)

            this.chromosomeSelectWidget.$select.val(locus.chr)

            if ('all' === locus.chr) {
                this.$searchInput.val(locus.chr)
            } else {
                const { chr, start, end } = locus
                const str = `${ chr }:${ start }-${ end }`
                this.$searchInput.val(str)
                this.fireEvent('locuschange', [{ chr, start, end, label: str }]);
            }

        }

    };

    calculateViewportWidth(columnCount) {

        let { width } = this.columnContainer.getBoundingClientRect()
        // console.log(`${ Date.now() }  column-container ${ StringUtils.numberFormatter(width) }  root ${ StringUtils.numberFormatter(this.$root.get(0).clientWidth) } `)

        const sampleNameViewportWidth = this.getSampleNameViewportWidth()

        width -= igv_axis_column_width + sampleNameViewportWidth + igv_scrollbar_outer_width + igv_track_manipulation_handle_width + igv_track_gear_menu_column_width

        width -= column_multi_locus_shim_width * (columnCount - 1)

        // console.log(`${ Date.now() }  column-container ${ width } viewport ${ Math.floor(width/columnCount) } sample-name-viewport ${ sampleNameViewportWidth }`)

        return Math.floor(width/columnCount)
    }

    minimumBases() {
        return this.config.minimumBases;
    };

    updateZoomSlider($slider) {

        const referenceFrame = this.referenceFrameList[0];
        const viewportWidthBP = this.calculateViewportWidth(this.referenceFrameList.length) * referenceFrame.bpPerPixel;
        const maxBP = referenceFrame.getChromosome().bpLength;
        const minBP = this.minimumBases();
        const percent = (maxBP - viewportWidthBP) / (maxBP - minBP)
        const value = Math.round(100 * percent);

        $slider.val(value);

    };

    zoomWithRangePercentage(percentage) {

        // Only zoom when in single locus view mode
        if (this.referenceFrameList.length > 1 || this.loadInProgress()) {
            return;
        }

        const referenceFrame = this.referenceFrameList[0]
        const { $viewport } = this.trackViews[0].viewports[0];

        const centerBP = referenceFrame.start + referenceFrame.toBP($viewport.width() / 2.0);
        const { bpStart, bpLength } = referenceFrame.getChromosome();
        const bpp = IGVMath.lerp((bpLength - bpStart) / $viewport.width(), this.minimumBases() / $viewport.width(), percentage);
        const viewportWidthBP = this.calculateViewportWidth(this.referenceFrameList.length) * bpp;

        referenceFrame.start = centerBP - (viewportWidthBP / 2);
        referenceFrame.bpPerPixel = bpp;
        referenceFrame.clamp($viewport.width())

        this.updateViews(referenceFrame);

    };

    zoomWithScaleFactor(scaleFactor, centerBPOrUndefined, viewportOrUndefined) {

        // Only zoom when in single locus view mode
        if (this.referenceFrameList.length > 1 || this.loadInProgress()) {
            return;
        }

        const referenceFrame = this.referenceFrameList[0]
        const currentReferenceFrameStart = referenceFrame.start;
        const currentBPP = referenceFrame.bpPerPixel;

        const { $viewport } = this.trackViews[0].viewports[0];

        const { bpStart, bpLength } = referenceFrame.getChromosome();
        const bppThreshold = scaleFactor < 1.0 ?  this.minimumBases() / $viewport.width() : (bpLength - bpStart) / $viewport.width();

        // Current center of scale
        const centerBP = centerBPOrUndefined || (referenceFrame.start + referenceFrame.toBP($viewport.width() / 2.0));

        let bpp;
        if (scaleFactor < 1.0) {
            bpp = Math.max(referenceFrame.bpPerPixel * scaleFactor, bppThreshold);
        } else {
            bpp = Math.min(referenceFrame.bpPerPixel * scaleFactor, bppThreshold);
        }

        // Update reference frame start and bpp
        const viewportWidthBP = this.calculateViewportWidth(this.referenceFrameList.length) * bpp;
        referenceFrame.start = centerBP - (viewportWidthBP / 2)
        referenceFrame.bpPerPixel = bpp;
        referenceFrame.clamp($viewport.width())

        const viewChanged = currentReferenceFrameStart !== referenceFrame.start || currentBPP !== referenceFrame.bpPerPixel;
        if (viewChanged) {
            this.updateViews(referenceFrame);
        }
    }

    async presentMultiLocusPanel(alignment, referenceFrameLeft) {

        // account for reduced viewport width as a result of adding right mate pair panel
        const viewportWidth = this.calculateViewportWidth(1 + this.referenceFrameList.length);

        const scaleFactor = this.calculateViewportWidth(this.referenceFrameList.length) / this.calculateViewportWidth(1 + this.referenceFrameList.length)
        adjustReferenceFrame(scaleFactor, referenceFrameLeft, viewportWidth, alignment.start, alignment.lengthOnRef)

        // create right mate pair reference frame
        const mateChrName = this.genome.getChromosomeName(alignment.mate.chr);

        const referenceFrameRight = createReferenceFrameWithAlignment(this.genome, mateChrName, referenceFrameLeft.bpPerPixel, viewportWidth, alignment.mate.position, alignment.lengthOnRef);

        // add right mate panel beside left mate panel
        const indexLeft = this.referenceFrameList.indexOf(referenceFrameLeft)
        const indexRight = 1 + (this.referenceFrameList.indexOf(referenceFrameLeft))

        const { $viewport } = this.trackViews[ 0 ].viewports[ indexLeft ]
        const viewportColumn = viewportColumnManager.insertAfter($viewport.parent())

        if (indexRight === this.referenceFrameList.length) {

            this.referenceFrameList.push(referenceFrameRight)

            for (let trackView of this.trackViews) {
                const viewport = createViewport(trackView, viewportColumn, referenceFrameRight)
                trackView.viewports.push(viewport);
            }

        } else {

            this.referenceFrameList.splice(indexRight, 0, referenceFrameRight);

            for (let trackView of this.trackViews) {
                const viewport = createViewport(trackView, viewportColumn, referenceFrameRight)
                trackView.viewports.splice(indexRight, 0, viewport)
            }

        }

        await this.resize();

        if (this.rulerTrack) {

            for (let rulerViewport of this.rulerTrack.trackView.viewports) {
                rulerViewport.presentLocusLabel();
            }
        }

    }

    removeMultiLocusPanel(referenceFrame) {

        // find the $column corresponding to this referenceFrame and remove it
        const index = this.referenceFrameList.indexOf(referenceFrame);
        const { $viewport } = this.trackViews[ 0 ].viewports[ index ];
        viewportColumnManager.removeColumnAtIndex(index, $viewport.parent().get(0))

        for (let { viewports } of this.trackViews) {
            viewports[ index ].dispose();
            viewports.splice(index, 1);
        }

        this.referenceFrameList.splice(index, 1);

        if (1 === this.referenceFrameList.length && this.rulerTrack) {
            for (let rulerViewport of this.rulerTrack.trackView.viewports) {
                rulerViewport.dismissLocusLabel()
            }
        }

        const scaleFactor = this.calculateViewportWidth(1 + this.referenceFrameList.length) / this.calculateViewportWidth(this.referenceFrameList.length)

        this.rescaleForMultiLocus(scaleFactor)
    }

    async rescaleForMultiLocus(scaleFactor) {

        const viewportWidth = this.calculateViewportWidth(this.referenceFrameList.length)

        for (let referenceFrame of this.referenceFrameList) {
            referenceFrame.bpPerPixel *= scaleFactor
            // console.log(`rescaleForMultiLocus - locus ${ referenceFrame.getPresentionLocus(viewportWidth) }`)
        }

        for (let { viewports } of this.trackViews) {

            for (let viewport of viewports) {
                viewport.setWidth(viewportWidth);
            }
        }

        await this.updateViews(undefined, undefined, true);

    }

    /**
     * @deprecated  This is a deprecated method with no known usages.  To be removed in a future release.
     */
    async goto(chr, start, end) {
        await this.search(chr + ":" + start + "-" + end);
    }

    async search(string, init) {

        let loci

        try {
            loci = await search(this, string);
        } catch (error) {
            Alert.presentAlert(error)
            return
        }

        if (loci && loci.length > 0) {

            // create reference frame list based on search loci
            this.referenceFrameList = createReferenceFrameList(loci, this.genome, this.flanking, this.minimumBases(), this.calculateViewportWidth(loci.length))


            // discard viewport DOM elements
            for (let trackView of this.trackViews) {

                trackView.removeDOMFromColumnContainer()

                this.trackScrollbarControl.removeScrollbar(trackView, this.columnContainer)

                this.trackDragControl.removeDragHandle(trackView)

                this.trackGearControl.removeGearContainer(trackView)
            }

            // discard track columns
            viewportColumnManager.discardAllColumns(this.columnContainer)




            viewportColumnManager.insertBefore($(this.sampleNameColumn), this.referenceFrameList.length)

            for (let trackView of this.trackViews) {
                trackView.addDOMToColumnContainer(this, this.columnContainer, this.referenceFrameList);
            }

            this.updateUIWithReferenceFrameList(this.referenceFrameList);

            if (!init) {
                await this.updateViews();
            }

        } else {
            Alert.presentAlert( new Error(`Error searching for locus ${ string }`) )
        }
    }

    async createReferenceFrameList(lociString) {

        const loci = await search(this, lociString)
        if (loci && loci.length > 0) {
            return createReferenceFrameList(loci, this.genome, this.flanking, this.minimumBases(), this.calculateViewportWidth(loci.length))
        } else {
            throw new Error(`Unrecognized locus ${lociString}`)
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
            const locusString = referenceFrame.getPresentionLocus(pixelWidth);
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
            const locusString = referenceFrame.getPresentionLocus(pixelWidth);
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
            // this.dragTrack.$trackDragScrim.hide();
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

        $(this.columnContainer).on('mousemove', handleMouseMove);

        $(this.columnContainer).on('touchmove', handleMouseMove);

        $(this.columnContainer).on('mouseleave', mouseUpOrLeave);

        $(this.columnContainer).on('mouseup', mouseUpOrLeave);

        $(this.columnContainer).on('touchend', mouseUpOrLeave);

        function handleMouseMove(e) {

            e.preventDefault();

            if (self.loadInProgress()) {
                return;
            }

            const { x, y } = DOMUtils.pageCoordinates(e);

            if (self.vpMouseDown) {

                const { viewport, referenceFrame } = self.vpMouseDown;

                // Determine direction,  true == horizontal
                const horizontal = Math.abs((x - self.vpMouseDown.mouseDownX)) > Math.abs((y - self.vpMouseDown.mouseDownY));

                if (!self.dragObject && !self.isScrolling) {
                    if (horizontal) {
                        if (self.vpMouseDown.mouseDownX && Math.abs(x - self.vpMouseDown.mouseDownX) > self.constants.dragThreshold) {
                            self.dragObject = { viewport, start: referenceFrame.start };
                        }
                    } else {
                        if (self.vpMouseDown.mouseDownY &&
                            Math.abs(y - self.vpMouseDown.mouseDownY) > self.constants.scrollThreshold) {
                            self.isScrolling = true;
                            const viewportHeight = viewport.$viewport.height();
                            const contentHeight = maxViewportContentHeight(viewport.trackView.viewports);
                            self.vpMouseDown.r = viewportHeight / contentHeight;
                        }
                    }
                }

                if (self.dragObject) {
                    const viewChanged = referenceFrame.shiftPixels(self.vpMouseDown.lastMouseX - x, viewport.$viewport.width());
                    if (viewChanged) {

                        if (self.referenceFrameList.length > 1) {
                            self.updateLocusSearchWidget(self.referenceFrameList);
                        } else {
                            self.updateLocusSearchWidget([referenceFrame]);
                        }

                        self.updateViews();
                    }
                    self.fireEvent('trackdrag');
                }


                if (self.isScrolling) {
                    const delta = self.vpMouseDown.r * (self.vpMouseDown.lastMouseY - y);
                    viewport.trackView.scrollBy(delta);
                }


                self.vpMouseDown.lastMouseX = x;
                self.vpMouseDown.lastMouseY = y
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

function getInitialLocus(locus, genome) {
    if (locus) {
        return Array.isArray(locus) ? locus.join(' ') : locus
    } else {
        return genome.getHomeChromosomeName()
    }
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

export {isLocusString, searchWebService}
export default Browser

