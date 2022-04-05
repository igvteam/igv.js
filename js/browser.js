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

import $ from "./vendor/jquery-3.3.1.slim.js"
import {Alert, InputDialog} from '../node_modules/igv-ui/dist/igv-ui.js'
import {
    BGZip,
    DOMUtils,
    FileUtils,
    GoogleUtils,
    Icon,
    igvxhr,
    StringUtils,
    URIUtils
} from "../node_modules/igv-utils/src/index.js"
import * as TrackUtils from './util/trackUtils.js'
import TrackView, {igv_axis_column_width, maxViewportContentHeight} from "./trackView.js"
import C2S from "./canvas2svg.js"
import TrackFactory from "./trackFactory.js"
import ROISet from "./roi/ROISet.js"
import XMLSession from "./session/igvXmlSession.js"
import GenomeUtils from "./genome/genome.js"
import loadPlinkFile from "./sampleInformation.js"
import ReferenceFrame, {createReferenceFrameList} from "./referenceFrame.js"
import {buildOptions, createColumn, doAutoscale, getElementAbsoluteHeight, getFilename} from "./util/igvUtils.js"
import {createViewport} from "./util/viewportUtils.js"
import GtexUtils from "./gtex/gtexUtils.js"
import {defaultSequenceTrackOrder} from './sequenceTrack.js'
import version from "./version.js"
import FeatureSource from "./feature/featureSource.js"
import {defaultNucleotideColors} from "./util/nucleotideColors.js"
import search from "./search.js"
import NavbarManager from "./navbarManager.js"
import ChromosomeSelectWidget from "./ui/chromosomeSelectWidget.js"
import WindowSizePanel from "./windowSizePanel.js"
import CursorGuide from "./ui/cursorGuide.js"
import CursorGuideButton from "./ui/cursorGuideButton.js"
import CenterLineButton from './ui/centerLineButton.js'
import TrackLabelControl from "./ui/trackLabelControl.js"
import SampleNameControl from "./ui/sampleNameControl.js"
import ZoomWidget from "./ui/zoomWidget.js"
import DataRangeDialog from "./ui/dataRangeDialog.js"
import HtsgetReader from "./htsget/htsgetReader.js"
import SVGSaveControl from "./ui/svgSaveControl.js"
import MenuPopup from "./ui/menuPopup.js"
import {viewportColumnManager} from './viewportColumnManager.js'
import GenericColorPicker from './ui/genericColorPicker.js'
import ViewportCenterLine from './ui/viewportCenterLine.js'
import IdeogramTrack from "./ideogramTrack.js"
import RulerTrack from "./rulerTrack.js"
import GtexSelection from "./gtex/gtexSelection.js"
import CircularViewControl from "./ui/circularViewControl.js"
import {createCircularView, makeCircViewChromosomes} from "./jbrowse/circularViewUtils.js"
import CustomButton from "./ui/customButton.js"
import ROIManager from './roi/ROIManager.js'
import ROITable from './roi/ROITable.js'
import ROIMenu from './roi/ROIMenu.js'
import TrackROISet from "./roi/trackROISet.js"

// css - $igv-scrollbar-outer-width: 14px;
const igv_scrollbar_outer_width = 14

// css - $igv-track-drag-column-width: 12px;
const igv_track_manipulation_handle_width = 12

// css - $igv-track-gear-menu-column-width: 28px;
const igv_track_gear_menu_column_width = 28

// $igv-column-shim-width: 1px;
// $igv-column-shim-margin: 2px;
const column_multi_locus_shim_width = 2 + 1 + 2

const defaultSampleNameViewportWidth = 200

class Browser {

    constructor(config, parentDiv) {

        this.config = config
        this.guid = DOMUtils.guid()
        this.namespace = '.browser_' + this.guid

        this.parent = parentDiv

        this.root = DOMUtils.div({class: 'igv-container'})
        parentDiv.appendChild(this.root)

        Alert.init(this.root)

        this.columnContainer = DOMUtils.div({class: 'igv-column-container'})
        this.root.appendChild(this.columnContainer)

        this.menuPopup = new MenuPopup(this.columnContainer)

        this.initialize(config)

        this.trackViews = []

        this.constants = {
            dragThreshold: 3,
            scrollThreshold: 5,
            defaultColor: "rgb(0,0,150)",
            doubleClickDelay: config.doubleClickDelay || 500
        }

        // Map of event name -> [ handlerFn, ... ]
        this.eventHandlers = {}

        this.addMouseHandlers()

        this.setControls(config)
    }

    initialize(config) {

        if (config.gtex) {
            GtexUtils.gtexLoaded = true
        }
        this.flanking = config.flanking
        this.crossDomainProxy = config.crossDomainProxy
        this.formats = config.formats
        this.trackDefaults = config.trackDefaults
        this.nucleotideColors = config.nucleotideColors || defaultNucleotideColors
        for (let key of Object.keys(this.nucleotideColors)) {
            this.nucleotideColors[key.toLowerCase()] = this.nucleotideColors[key]
        }

        this.trackLabelsVisible = config.showTrackLabels

        this.isCenterLineVisible = config.showCenterGuide

        this.cursorGuideVisible = config.showCursorGuide

        this.showSampleNames = config.showSampleNames
        this.showSampleNameButton = config.showSampleNameButton
        this.sampleNameViewportWidth = config.sampleNameViewportWidth || defaultSampleNameViewportWidth

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

        const $navBar = this.createStandardControls(config)
        $navBar.insertBefore($(this.columnContainer))
        this.$navigation = $navBar

        if (false === config.showControls) {
            $navBar.hide()
        }

    }

    createStandardControls(config) {

        this.navbarManager = new NavbarManager(this)

        const $navBar = $('<div>', {class: 'igv-navbar'})
        this.$navigation = $navBar

        const $navbarLeftContainer = $('<div>', {class: 'igv-navbar-left-container'})
        $navBar.append($navbarLeftContainer)

        // IGV logo
        const $logo = $('<div>', {class: 'igv-logo'})
        $navbarLeftContainer.append($logo)

        const logoSvg = logo()
        logoSvg.css("width", "34px")
        logoSvg.css("height", "32px")
        $logo.append(logoSvg)

        this.$current_genome = $('<div>', {class: 'igv-current-genome'})
        $navbarLeftContainer.append(this.$current_genome)
        this.$current_genome.text('')

        const $genomicLocation = $('<div>', {class: 'igv-navbar-genomic-location'})
        $navbarLeftContainer.append($genomicLocation)

        // chromosome select widget
        this.chromosomeSelectWidget = new ChromosomeSelectWidget(this, $genomicLocation.get(0))
        if (undefined === config.showChromosomeWidget) {
            config.showChromosomeWidget = true   // Default to true
        }
        if (true === config.showChromosomeWidget) {
            this.chromosomeSelectWidget.show()
        } else {
            this.chromosomeSelectWidget.hide()
        }

        const $locusSizeGroup = $('<div>', {class: 'igv-locus-size-group'})
        $genomicLocation.append($locusSizeGroup)

        const $searchContainer = $('<div>', {class: 'igv-search-container'})
        $locusSizeGroup.append($searchContainer)

        // browser.$searchInput = $('<input type="text" placeholder="Locus Search">');
        this.$searchInput = $('<input>', {class: 'igv-search-input', type: 'text', placeholder: 'Locus Search'})
        $searchContainer.append(this.$searchInput)

        this.$searchInput.change(() => this.doSearch(this.$searchInput.val()))

        const searchIconContainer = DOMUtils.div({class: 'igv-search-icon-container'})
        $searchContainer.append($(searchIconContainer))

        searchIconContainer.appendChild(Icon.createIcon("search"))

        searchIconContainer.addEventListener('click', () => this.doSearch(this.$searchInput.val()))

        this.windowSizePanel = new WindowSizePanel($locusSizeGroup.get(0), this)

        const $navbarRightContainer = $('<div>', {class: 'igv-navbar-right-container'})
        $navBar.append($navbarRightContainer)

        const $toggle_button_container = $('<div class="igv-navbar-toggle-button-container">')
        $navbarRightContainer.append($toggle_button_container)
        this.$toggle_button_container = $toggle_button_container

        this.cursorGuide = new CursorGuide(this.columnContainer, this)

        this.cursorGuideButton = new CursorGuideButton(this, $toggle_button_container.get(0))

        this.centerLineButton = new CenterLineButton(this, $toggle_button_container.get(0))

        this.setTrackLabelVisibility(config.showTrackLabels)
        this.trackLabelControl = new TrackLabelControl($toggle_button_container.get(0), this)

        this.sampleNameControl = new SampleNameControl($toggle_button_container.get(0), this)

        if (true === config.showSVGButton) {
            this.svgSaveControl = new SVGSaveControl($toggle_button_container.get(0), this)
        }

        if (config.customButtons) {
            for (let b of config.customButtons) {
                new CustomButton($toggle_button_container.get(0), this, b)
            }
        }

        this.zoomWidget = new ZoomWidget(this, $navbarRightContainer.get(0))

        if (false === config.showNavigation) {
            this.$navigation.hide()
        }

        this.inputDialog = new InputDialog(this.root)
        this.inputDialog.container.id = `igv-input-dialog-${DOMUtils.guid()}`

        this.dataRangeDialog = new DataRangeDialog($(this.root))
        this.dataRangeDialog.$container.get(0).id = `igv-data-range-dialog-${DOMUtils.guid()}`

        this.genericColorPicker = new GenericColorPicker({parent: this.columnContainer, width: 432})
        this.genericColorPicker.container.id = `igv-track-color-picker-${DOMUtils.guid()}`

        return $navBar

    }

    getSampleNameViewportWidth() {
        return false === this.showSampleNames ? 0 : this.sampleNameViewportWidth
    }

    isMultiLocusMode() {
        return this.referenceFrameList && this.referenceFrameList.length > 1
    };

    addTrackToFactory(name, track) {
        TrackFactory.addTrack(name, track)
    }

    isMultiLocusWholeGenomeView() {

        if (undefined === this.referenceFrameList || 1 === this.referenceFrameList.length) {
            return false
        }

        for (let referenceFrame of this.referenceFrameList) {
            if ('all' === referenceFrame.chr.toLowerCase()) {
                return true
            }
        }

        return false
    };

    /**
     * Render browse display as SVG
     * @returns {string}
     */
    toSVG() {

        let {x, y, width, height} = this.columnContainer.getBoundingClientRect()

        const h_render = 8000

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

            })

        const dx = x

        // tracks -> SVG
        for (let trackView of this.trackViews) {
            trackView.renderSVGContext(context, {deltaX: 0, deltaY: -y})
        }

        // reset height to trim away unneeded svg canvas real estate. Yes, a bit of a hack.
        context.setHeight(height)

        return context.getSerializedSvg(true)

    }

    renderSVG($container) {
        const svg = this.toSVG()
        $container.empty()
        $container.append(svg)

        return svg
    }

    saveSVGtoFile(config) {

        let svg = this.toSVG()

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

        this.roi = []
        let session
        if (options.url || options.file) {
            session = await loadSessionFile(options)
        } else {
            session = options
        }
        return this.loadSessionObject(session)


        async function loadSessionFile(options) {

            const urlOrFile = options.url || options.file

            if (options.url && (options.url.startsWith("blob:") || options.url.startsWith("data:"))) {
                const json = Browser.uncompressSession(options.url)
                return JSON.parse(json)

            } else {
                let filename = options.filename
                if (!filename) {
                    filename = (options.url ? await getFilename(options.url) : options.file.name)
                }

                if (filename.endsWith(".xml")) {

                    const knownGenomes = GenomeUtils.KNOWN_GENOMES
                    const string = await igvxhr.loadString(urlOrFile)
                    return new XMLSession(string, knownGenomes)

                } else if (filename.endsWith(".json")) {
                    return igvxhr.loadJson(urlOrFile)
                } else {
                    return undefined
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

        this.showSampleNames = session.showSampleNames || false
        this.sampleNameControl.setState(this.showSampleNames === true)

        if (session.sampleNameViewportWidth) {
            this.sampleNameViewportWidth = session.sampleNameViewportWidth
        }

        // axis column
        createColumn(this.columnContainer, 'igv-axis-column')

        // SampleName column
        createColumn(this.columnContainer, 'igv-sample-name-column')

        // Track scrollbar column
        createColumn(this.columnContainer, 'igv-scrollbar-column')

        // Track drag/reorder column
        createColumn(this.columnContainer, 'igv-track-drag-column')

        // Track gear column
        createColumn(this.columnContainer, 'igv-gear-menu-column')

        const genomeConfig = await GenomeUtils.expandReference(session.reference || session.genome)
        await this.loadReference(genomeConfig, session.locus)

        this.centerLineList = this.createCenterLineList(this.columnContainer)

        // Create ideogram and ruler track.  Really this belongs in browser initialization, but creation is
        // deferred because ideogram and ruler are treated as "tracks", and tracks require a reference frame
        let ideogramHeight = 0
        if (false !== session.showIdeogram) {

            const track = new IdeogramTrack(this)
            track.id = 'ideogram'

            const trackView = new TrackView(this, this.columnContainer, track)
            const { $viewport } = trackView.viewports[ 0 ]
            ideogramHeight = getElementAbsoluteHeight($viewport.get(0))

            this.trackViews.push(trackView)
        }

        if (false !== session.showRuler) {
            this.trackViews.push(new TrackView(this, this.columnContainer, new RulerTrack(this)))
        }

        // Restore gtex selections.
        if (session.gtexSelections) {
            for (let referenceFrame of this.referenceFrameList) {
                for (let s of Object.keys(session.gtexSelections)) {
                    const gene = session.gtexSelections[s].gene
                    const snp = session.gtexSelections[s].snp
                    referenceFrame.selection = new GtexSelection(gene, snp)
                }
            }
        }

        const roiTable = new ROITable(this.columnContainer)
        const roiMenu = new ROIMenu(this.columnContainer)
        if (session.roi) {
            this.roiManager = new ROIManager(this, roiMenu, roiTable, ideogramHeight, session.roi.map(r => {
                return new ROISet(r, this.genome)
            }))
        } else {
            this.roiManager = new ROIManager(this, roiMenu, roiTable, ideogramHeight, undefined)
        }

        await this.roiManager.initialize()

        // Tracks.  Start with genome tracks, if any, then append session tracks
        const genomeTracks = genomeConfig.tracks || []
        const trackConfigurations = session.tracks ? genomeTracks.concat(session.tracks) : genomeTracks

        // Insure that we always have a sequence track
        const pushSequenceTrack = trackConfigurations.filter(track => track.type === 'sequence').length === 0
        if (pushSequenceTrack /*&& false !== this.config.showSequence*/) {
            trackConfigurations.push({type: "sequence", order: defaultSequenceTrackOrder})
        }

        // Maintain track order unless explicitly set
        let trackOrder = 1
        for (let t of trackConfigurations) {
            if (undefined === t.order) {
                t.order = trackOrder++
            }
        }

        await this.loadTrackList(trackConfigurations)

        // The ruler and ideogram tracks are not explicitly loaded, but needs updated nonetheless.
        for (let rtv of this.trackViews.filter((tv) => tv.track.type === 'ruler' || tv.track.type === 'ideogram')) {
            rtv.updateViews()
        }

        this.updateUIWithReferenceFrameList()

    }

    createCenterLineList(columnContainer) {

        const centerLines = columnContainer.querySelectorAll('.igv-center-line')
        for (let i = 0; i < centerLines.length; i++) {
            centerLines[i].remove()
        }

        const centerLineList = []
        const viewportColumns = columnContainer.querySelectorAll('.igv-column')
        for (let i = 0; i < viewportColumns.length; i++) {
            centerLineList.push(new ViewportCenterLine(this, this.referenceFrameList[i], viewportColumns[i]))
        }

        return centerLineList
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
            this.removeAllTracks()
        }

        let locus = getInitialLocus(initialLocus, genome)
        const locusFound = await this.search(locus, true)
        if (!locusFound) {
            console.log("Initial locus not found: " + locus)
            locus = genome.getHomeChromosomeName()
            const locusFound = await this.search(locus, true)
            if (!locusFound) {
                throw new Error("Cannot set initial locus")
            }
        }

        if (genomeChange && this.circularView) {
            this.circularView.setAssembly({
                name: this.genome.id,
                id: this.genome.id,
                chromosomes: makeCircViewChromosomes(this.genome)
            })
        }
    }

    cleanHouseForSession() {

        for (let trackView of this.trackViews) {
            // empty axis column, viewport columns, sampleName column, scroll column, drag column, gear column
            trackView.removeDOMFromColumnContainer()
        }

        // discard all columns
        const elements = this.columnContainer.querySelectorAll('.igv-axis-column, .igv-column-shim, .igv-column, .igv-sample-name-column, .igv-scrollbar-column, .igv-track-drag-column, .igv-gear-menu-column')
        elements.forEach(column => column.remove())

        this.trackViews = []

        if (this.circularView) {
            this.circularView.clearChords()
        }

    }

    updateNavbarDOMWithGenome(genome) {
        this.$current_genome.text(genome.id || '')
        this.$current_genome.attr('title', genome.id || '')
        this.chromosomeSelectWidget.update(genome)
    }

    /**
     * Load a genome, defined by a string ID or a json-like configuration object. This includes a fasta reference
     * as well as optional cytoband and annotation tracks.
     *
     * @param idOrConfig
     * @returns genome
     */
    async loadGenome(idOrConfig) {

        const genomeConfig = await GenomeUtils.expandReference(idOrConfig)
        await this.loadReference(genomeConfig, undefined)

        const tracks = genomeConfig.tracks || []

        // Insure that we always have a sequence track
        const pushSequenceTrack = tracks.filter(track => track.type === 'sequence').length === 0
        if (pushSequenceTrack) {
            tracks.push({type: "sequence", order: defaultSequenceTrackOrder})
        }

        await this.loadTrackList(tracks)

        await this.updateViews()

        return this.genome
    }

    /**
     * Called after a session load, search, pan (horizontal drag), or resize
     *
     * @param referenceFrameList
     */
    updateUIWithReferenceFrameList() {

        const referenceFrameList = this.referenceFrameList

        this.updateLocusSearchWidget()

        const isWGV = (this.isMultiLocusWholeGenomeView() || GenomeUtils.isWholeGenomeView(referenceFrameList[0].chr))

        this.navbarManager.navbarDidResize(this.$navigation.width(), isWGV)

        toggleTrackLabels(this.trackViews, this.trackLabelsVisible)

        this.setCenterLineAndCenterLineButtonVisibility(!GenomeUtils.isWholeGenomeView(referenceFrameList[0].chr))

    }

    setTrackLabelVisibility(isVisible) {
        toggleTrackLabels(this.trackViews, isVisible)
    }

    // cursor guide
    setCursorGuideVisibility(cursorGuideVisible) {

        if (cursorGuideVisible) {
            this.cursorGuide.show()
        } else {
            this.cursorGuide.hide()
        }
    }

    setCustomCursorGuideMouseHandler(mouseHandler) {
        this.cursorGuide.customMouseHandler = mouseHandler
    }

    // center line
    setCenterLineVisibility(isCenterLineVisible) {
        for (let centerLine of this.centerLineList) {
            if (true === isCenterLineVisible) {
                centerLine.show()
                centerLine.repaint()
            } else {
                centerLine.hide()
            }
        }
    }

    setCenterLineAndCenterLineButtonVisibility(isCenterLineVisible) {

        for (let centerLine of this.centerLineList) {
            const isShown = isCenterLineVisible && centerLine.isVisible
            isShown ? centerLine.show() : centerLine.container.style.display = 'none'
        }

        const isShown = isCenterLineVisible && this.centerLineButton.isVisible
        isShown ? this.centerLineButton.show() : this.centerLineButton.button.style.display = 'none'

    }

    async loadTrackList(configList) {

        const promises = []
        for (let config of configList) {
            promises.push(this.loadTrack(config))
        }

        const loadedTracks = await Promise.all(promises)
        const groupAutoscaleViews = this.trackViews.filter(function (trackView) {
            return trackView.track.autoscaleGroup
        })
        if (groupAutoscaleViews.length > 0) {
            this.updateViews()
        }
        return loadedTracks
    }

    async loadROI(config) {

        console.error('browser.loadROI() is under development and not available')
        return

        if (!this.roi) {
            this.roi = []
        }
        if (Array.isArray(config)) {
            for (let c of config) {
                this.roi.push(new ROISet(c, this.genome))
            }
        } else {
            this.roi.push(new ROISet(config, this.genome))
        }
        // Force reload all views (force = true) to insure ROISet features are loaded.  Wasteful but this function is
        // rarely called.
        await this.updateViews(true)
    }

    removeROI(roiToRemove) {

        console.error('browser.removeROI() is under development and not available')
        return

        for (let i = 0; i < this.roi.length; i++) {
            if (this.roi[i].name === roiToRemove.name) {
                this.roi.splice(i, 1)
                break
            }
        }
        for (let tv of this.trackViews) {
            tv.repaintViews()
        }
    }

    clearROIs() {

        console.error('browser.clearROIs() is under development and not available')
        return

        this.roi = []
        for (let tv of this.trackViews) {
            tv.repaintViews()
        }
    }

    getRulerTrackView() {
        const list = this.trackViews.filter(({track}) => 'ruler' === track.id)
        return list.length > 0 ? list[0] : undefined
    }

    /**
     * Return a promise to load a track.
     *
     * @param config
     * @returns {*}
     */

    async loadTrack(config) {


        // config might be json
        if (StringUtils.isString(config)) {
            config = JSON.parse(config)
        }

        try {

            const newTrack = await this.createTrack(config)

            if (undefined === newTrack) {
                Alert.presentAlert(new Error(`Unknown file type: ${config.url || config}`), undefined)
                return newTrack
            }

            // Set order field of track here.  Otherwise track order might get shuffled during asynchronous load
            if (undefined === newTrack.order) {
                newTrack.order = this.trackViews.length
            }

            const trackView = new TrackView(this, this.columnContainer, newTrack)
            this.trackViews.push(trackView)
            toggleTrackLabels(this.trackViews, this.trackLabelsVisible)
            this.reorderTracks()
            this.fireEvent('trackorderchanged', [this.getTrackOrder()])

            if (typeof newTrack.postInit === 'function') {
                try {
                    trackView.startSpinner()
                    await newTrack.postInit()
                } finally {
                    trackView.stopSpinner()
                }
            }

            if (!newTrack.autoscaleGroup) {
                // Group autoscale will get updated later (as a group)
                if (config.sync) {
                    await trackView.updateViews()
                } else {
                    trackView.updateViews()
                }
            }

            if (typeof newTrack.hasSamples === 'function' && newTrack.hasSamples()) {
                if (this.config.showSampleNameButton !== false) {
                    this.sampleNameControl.show()   // If not explicitly set
                }
            }

            return newTrack

        } catch (error) {
            const httpMessages =
                {
                    "401": "Access unauthorized",
                    "403": "Access forbidden",
                    "404": "Not found"
                }
            console.error(error)
            let msg = error.message || error.error || error.toString()
            if (httpMessages.hasOwnProperty(msg)) {
                msg = httpMessages[msg]
            }
            msg += (": " + config.url)
            Alert.presentAlert(new Error(msg), undefined)
        }
    }

    /**
     * Create a Track object.
     * @param config
     * @returns {Promise<*>}
     */
    async createTrack(config) {

        // Resolve function and promise urls
        let url = await URIUtils.resolveURL(config.url)
        if (StringUtils.isString(url)) {
            url = url.trim()
        }

        if (url) {
            if (config.format) {
                config.format = config.format.toLowerCase()
            } else {
                let filename = config.filename
                if (!filename) {
                    filename = await getFilename(url)
                }
                config.format = TrackUtils.inferFileFormat(filename)
                if (!config.format && (config.sourceType === undefined || config.sourceType === "htsget")) {
                    // Check for htsget URL.  This is a longshot
                    await HtsgetReader.inferFormat(config)
                }
            }
        }


        let type = config.type ? config.type.toLowerCase() : undefined

        if (!type) {
            type = TrackUtils.inferTrackType(config)
            if ("bedtype" === type) {
                // Bed files must be read to determine track type
                const featureSource = FeatureSource(config, this.genome)
                config._featureSource = featureSource    // This is a temp variable, bit of a hack
                const trackType = await featureSource.trackType()
                if (trackType) {
                    type = trackType
                } else {
                    type = "annotation"
                }
            }
            // Record in config to make type persistent in session
            config.type = type
        }

        // Set defaults if specified
        if (this.trackDefaults && type) {
            const settings = this.trackDefaults[type]
            if (settings) {
                for (let property in settings) {
                    if (settings.hasOwnProperty(property) && config[property] === undefined) {
                        config[property] = settings[property]
                    }
                }
            }
        }

        const track = TrackFactory.getTrack(type, config, this)

        if (track && config.roi && config.roi.length > 0) {
            track.roi = config.roi.map(r => new TrackROISet(r, this.genome))
         }

        return track

    }


    reorderTracks() {

        this.trackViews.sort(function (a, b) {

            const firstSortOrder = tv => {
                return 'ideogram' === tv.track.id ? 1 :
                    'ruler' === tv.track.id ? 2 :
                        3
            }

            const aOrder1 = firstSortOrder(a)
            const bOrder1 = firstSortOrder(b)
            if (aOrder1 === bOrder1) {
                const aOrder2 = a.track.order || 0
                const bOrder2 = b.track.order || 0
                return aOrder2 - bOrder2
            } else {
                return aOrder1 - bOrder1
            }
        })

        // discard current track order
        for (let {axis, viewports, sampleNameViewport, outerScroll, dragHandle, gearContainer} of this.trackViews) {

            axis.remove()

            for (let {$viewport} of viewports) {
                $viewport.detach()
            }

            sampleNameViewport.viewport.remove()

            outerScroll.remove()
            dragHandle.remove()
            gearContainer.remove()
        }

        // Reattach the divs to the dom in the correct order
        const viewportColumns = this.columnContainer.querySelectorAll('.igv-column')

        for (let {axis, viewports, sampleNameViewport, outerScroll, dragHandle, gearContainer} of this.trackViews) {

            this.columnContainer.querySelector('.igv-axis-column').appendChild(axis)

            for (let i = 0; i < viewportColumns.length; i++) {
                const {$viewport} = viewports[i]
                viewportColumns[i].appendChild($viewport.get(0))
            }

            this.columnContainer.querySelector('.igv-sample-name-column').appendChild(sampleNameViewport.viewport)

            this.columnContainer.querySelector('.igv-scrollbar-column').appendChild(outerScroll)

            this.columnContainer.querySelector('.igv-track-drag-column').appendChild(dragHandle)

            this.columnContainer.querySelector('.igv-gear-menu-column').appendChild(gearContainer)
        }

    }

    getTrackOrder() {
        return this.trackViews.filter(tv => tv.track && tv.track.name).map(tv => tv.track.name)
    }

    removeTrackByName(name) {
        const copy = this.trackViews.slice()
        for (let trackView of copy) {
            if (name === trackView.track.name) {
                this.removeTrack(trackView.track)
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

        const remainingTrackViews = []

        for (let trackView of this.trackViews) {

            if (trackView.track.id !== 'ruler' && trackView.track.id !== 'ideogram') {
                this.fireEvent('trackremoved', [trackView.track])
                trackView.dispose()
            } else {
                remainingTrackViews.push(trackView)
            }
        }

        this.trackViews = remainingTrackViews
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

        return this.trackViews.filter(f).map(tv => tv.track)
    }

    /**
     * Set the track height globally for all tracks.  (Note: Its not clear why this is useful).
     * @param newHeight
     */
    setTrackHeight(newHeight) {

        this.trackHeight = newHeight

        this.trackViews.forEach(function (trackView) {
            trackView.setTrackHeight(newHeight)
        })

    }

    /**
     * API function to signal that this browser visibility has changed, e.g. from hiding/showing in a tab interface.
     *
     * @returns {Promise<void>}
     */
    async visibilityChange() {
        this.layoutChange()
    }

    async layoutChange() {

        const status = this.referenceFrameList.find(referenceFrame => referenceFrame.bpPerPixel < 0)

        if (status) {
            const viewportWidth = this.calculateViewportWidth(this.referenceFrameList.length)
            for (let referenceFrame of this.referenceFrameList) {
                referenceFrame.bpPerPixel = (referenceFrame.end - referenceFrame.start) / viewportWidth
            }
        }

        if (this.referenceFrameList) {
            const isWGV = this.isMultiLocusWholeGenomeView() || GenomeUtils.isWholeGenomeView(this.referenceFrameList[0].chr)
            this.navbarManager.navbarDidResize(this.$navigation.width(), isWGV)
        }

        resize.call(this)
        await this.updateViews()
    }

    async updateViews() {

        const trackViews = this.trackViews

        this.updateLocusSearchWidget()

        for (let centerGuide of this.centerLineList) {
            centerGuide.repaint()
        }

        // Don't autoscale while dragging.
        if (this.dragObject) {
            for (let trackView of trackViews) {
                await trackView.updateViews()
            }
        } else {
            // Group autoscale
            const groupAutoscaleTracks = {}
            const otherTracks = []
            for (let trackView of trackViews) {
                const group = trackView.track.autoscaleGroup
                if (group) {
                    var l = groupAutoscaleTracks[group]
                    if (!l) {
                        l = []
                        groupAutoscaleTracks[group] = l
                    }
                    l.push(trackView)
                } else {
                    otherTracks.push(trackView)
                }
            }

            if (Object.entries(groupAutoscaleTracks).length > 0) {

                const keys = Object.keys(groupAutoscaleTracks)
                for (let group of keys) {

                    const groupTrackViews = groupAutoscaleTracks[group]
                    const promises = []

                    for (let trackView of groupTrackViews) {
                        promises.push(trackView.getInViewFeatures())
                    }

                    const featureArray = await Promise.all(promises)

                    var allFeatures = [], dataRange

                    for (let features of featureArray) {
                        allFeatures = allFeatures.concat(features)
                    }
                    dataRange = doAutoscale(allFeatures)

                    const p = []
                    for (let trackView of groupTrackViews) {
                        trackView.track.dataRange = dataRange
                        trackView.track.autoscale = false
                        p.push(trackView.updateViews())
                    }
                    await Promise.all(p)
                }

            }

            await Promise.all(otherTracks.map(tv => tv.updateViews()))
            // for (let trackView of otherTracks) {
            //     await trackView.updateViews(force);
            // }
        }

    }

    repaintViews() {
        for (let trackView of this.trackViews) {
            trackView.repaintViews()
        }
    }

    updateLocusSearchWidget() {

        const referenceFrameList = this.referenceFrameList

        // Update end position of reference frames based on pixel widths.  This is hacky, but its been done here
        // for a long time, although indirectly.
        const width = this.calculateViewportWidth(this.referenceFrameList.length)
        for (let referenceFrame of referenceFrameList) {
            referenceFrame.end = referenceFrame.start + referenceFrame.bpPerPixel * width
        }

        this.chromosomeSelectWidget.select.value = referenceFrameList.length === 1 ? this.referenceFrameList[0].chr : ''

        const loc = this.referenceFrameList.map(rf => rf.getLocusString()).join(' ')
        //const loc = this.referenceFrameList.length === 1 ?   this.referenceFrameList[0].getLocusString() : '';
        this.$searchInput.val(loc)

        this.fireEvent('locuschange', [this.referenceFrameList])
    }

    calculateViewportWidth(columnCount) {

        let {width} = this.columnContainer.getBoundingClientRect()

        const sampleNameViewportWidth = this.getSampleNameViewportWidth()

        width -= igv_axis_column_width + sampleNameViewportWidth + igv_scrollbar_outer_width + igv_track_manipulation_handle_width + igv_track_gear_menu_column_width

        width -= column_multi_locus_shim_width * (columnCount - 1)

        return Math.floor(width / columnCount)
    }

    getCenterLineXOffset() {
        let {width: columnContainerWidth} = this.columnContainer.getBoundingClientRect()
        columnContainerWidth -= igv_axis_column_width + this.getSampleNameViewportWidth() + igv_scrollbar_outer_width + igv_track_manipulation_handle_width + igv_track_gear_menu_column_width
        return Math.floor(columnContainerWidth / 2 + igv_axis_column_width)
    }

    minimumBases() {
        return this.config.minimumBases
    }

    // Zoom in by a factor of 2, keeping the same center location
    zoomIn() {
        this.zoomWithScaleFactor(0.5)
    };

    // Zoom out by a factor of 2, keeping the same center location if possible
    zoomOut() {
        this.zoomWithScaleFactor(2.0)
    };

    async zoomWithScaleFactor(scaleFactor, centerBPOrUndefined, referenceFrameOrUndefined) {

        const viewportWidth = this.calculateViewportWidth(this.referenceFrameList.length)

        let referenceFrames = referenceFrameOrUndefined ? [referenceFrameOrUndefined] : this.referenceFrameList

        for (let referenceFrame of referenceFrames) {
            referenceFrame.zoomWithScaleFactor(this, scaleFactor, viewportWidth, centerBPOrUndefined)
        }
    }

    /**
     * Add a new multi-locus panel for the specified region
     * @param chr
     * @param start
     * @param end
     * @param referenceFrameLeft - optional, if supplied new panel should be placed to the immediate right
     */
    async addMultiLocusPanel(chr, start, end, referenceFrameLeft) {

        // account for reduced viewport width as a result of adding right mate pair panel
        const viewportWidth = this.calculateViewportWidth(1 + this.referenceFrameList.length)
        const scaleFactor = this.calculateViewportWidth(this.referenceFrameList.length) / this.calculateViewportWidth(1 + this.referenceFrameList.length)
        for (let refFrame of this.referenceFrameList) {
            refFrame.bpPerPixel *= scaleFactor
        }

        const bpp = (end - start) / viewportWidth
        const newReferenceFrame = new ReferenceFrame(this.genome, chr, start, end, bpp)
        const indexLeft = referenceFrameLeft ? this.referenceFrameList.indexOf(referenceFrameLeft) : this.referenceFrameList.length - 1
        const indexRight = 1 + indexLeft

        // TODO -- this is really ugly
        const {$viewport} = this.trackViews[0].viewports[indexLeft]
        const viewportColumn = viewportColumnManager.insertAfter($viewport.get(0).parentElement)

        if (indexRight === this.referenceFrameList.length) {
            this.referenceFrameList.push(newReferenceFrame)
            for (let trackView of this.trackViews) {
                const viewport = createViewport(trackView, viewportColumn, newReferenceFrame)
                trackView.viewports.push(viewport)
            }
        } else {
            this.referenceFrameList.splice(indexRight, 0, newReferenceFrame)
            for (let trackView of this.trackViews) {
                const viewport = createViewport(trackView, viewportColumn, newReferenceFrame)
                trackView.viewports.splice(indexRight, 0, viewport)
            }
        }


        this.centerLineList = this.createCenterLineList(this.columnContainer)

        resize.call(this)
        await this.updateViews(true)
    }

    async removeMultiLocusPanel(referenceFrame) {

        // find the $column corresponding to this referenceFrame and remove it
        const index = this.referenceFrameList.indexOf(referenceFrame)
        const {$viewport} = this.trackViews[0].viewports[index]
        viewportColumnManager.removeColumnAtIndex(index, $viewport.parent().get(0))

        for (let {viewports} of this.trackViews) {
            viewports[index].dispose()
            viewports.splice(index, 1)
        }

        this.referenceFrameList.splice(index, 1)

        if (1 === this.referenceFrameList.length && this.getRulerTrackView()) {
            for (let rulerViewport of this.getRulerTrackView().viewports) {
                rulerViewport.dismissLocusLabel()
            }
        }

        const scaleFactor = this.calculateViewportWidth(1 + this.referenceFrameList.length) / this.calculateViewportWidth(this.referenceFrameList.length)

        await this.rescaleForMultiLocus(scaleFactor)

    }

    /**
     * Goto the locus represented by the selected referenceFrame, discarding all other panels
     *
     * @param referenceFrame
     * @returns {Promise<void>}
     */
    async gotoMultilocusPanel(referenceFrame) {

        const referenceFrameIndex = this.referenceFrameList.indexOf(referenceFrame)

        // Remove columns for unselected panels
        this.columnContainer.querySelectorAll('.igv-column').forEach((column, c) => {
            if (c === referenceFrameIndex) {
                // do nothing
            } else {
                column.remove()
            }
        })

        // Remove all column shims
        this.columnContainer.querySelectorAll('.igv-column-shim').forEach(shim => shim.remove())

        // Discard viewports
        for (let trackView of this.trackViews) {
            const retain = trackView.viewports[referenceFrameIndex]
            trackView.viewports.filter((viewport, i) => i !== referenceFrameIndex).forEach(viewport => viewport.dispose())
            trackView.viewports = [retain]
        }

        const viewportWidth = this.calculateViewportWidth(1)
        referenceFrame.bpPerPixel = (referenceFrame.end - referenceFrame.start) / viewportWidth
        this.referenceFrameList = [referenceFrame]

        this.trackViews.forEach(({viewports}) => viewports.forEach(viewport => viewport.setWidth(viewportWidth)))

        this.centerLineList = this.createCenterLineList(this.columnContainer)

        this.updateUIWithReferenceFrameList()

        await this.updateViews(true)

    }

    async rescaleForMultiLocus(scaleFactor) {

        const viewportWidth = this.calculateViewportWidth(this.referenceFrameList.length)

        for (let referenceFrame of this.referenceFrameList) {
            referenceFrame.bpPerPixel *= scaleFactor
        }

        for (let {viewports} of this.trackViews) {

            for (let viewport of viewports) {
                viewport.setWidth(viewportWidth)
            }
        }

        this.centerLineList = this.createCenterLineList(this.columnContainer)

        this.updateUIWithReferenceFrameList()

        await this.updateViews()

    }

    /**
     * @deprecated  This is a deprecated method with no known usages.  To be removed in a future release.
     */
    async goto(chr, start, end) {
        await this.search(chr + ":" + start + "-" + end)
    }

    /**

     * Search for the locus string -- this function is called from various igv.js GUI elements, and is not part of the
     * API.  Wraps ```search``` and presents an error dialog if false.
     *
     * @param string
     * @param init
     * @returns {Promise<void>}
     */
    async doSearch(string, init) {
        const success = await this.search(string, init)
        if (!success) {
            Alert.presentAlert(new Error(`Unrecognized locus: <b> ${string} </b>`))
        }
        return success
    }


    /**
     * Search for the locus string
     * NOTE: This is part of the API
     * @param string
     * @param init  true if called during browser initialization
     * @returns {Promise<boolean>}  true if found, false if not
     */
    async search(string, init) {

        const loci = await search(this, string)

        if (loci && loci.length > 0) {

            // create reference frame list based on search loci
            this.referenceFrameList = createReferenceFrameList(loci, this.genome, this.flanking, this.minimumBases(), this.calculateViewportWidth(loci.length))

            // discard viewport DOM elements
            for (let trackView of this.trackViews) {
                // empty axis column, viewport columns, sampleName column, scroll column, drag column, gear column
                trackView.removeDOMFromColumnContainer()
            }

            // discard ONLY viewport columns
            this.columnContainer.querySelectorAll('.igv-column-shim, .igv-column').forEach(el => el.remove())

            // Insert viewport columns preceding the sample-name column
            viewportColumnManager.insertBefore(this.columnContainer.querySelector('.igv-sample-name-column'), this.referenceFrameList.length)

            this.centerLineList = this.createCenterLineList(this.columnContainer)

            // Populate the columns
            for (let trackView of this.trackViews) {
                trackView.addDOMToColumnContainer(this, this.columnContainer, this.referenceFrameList)
            }

            this.updateUIWithReferenceFrameList()

            if (!init) {
                await this.updateViews()
            }
            return true
        } else {
            return false
        }
    }

    async loadSampleInformation(url) {
        var name = url
        if (FileUtils.isFile(url)) {
            name = url.name
        }
        var ext = name.substr(name.lastIndexOf('.') + 1)
        if (ext === 'fam') {
            this.sampleInformation = await loadPlinkFile(url)
        }
    };

// EVENTS

    on(eventName, fn) {
        if (!this.eventHandlers[eventName]) {
            this.eventHandlers[eventName] = []
        }
        this.eventHandlers[eventName].push(fn)
    };

    /**
     * @deprecated use off()
     * @param eventName
     * @param fn
     */
    un(eventName, fn) {
        this.off(eventName, fn)
    };

    off(eventName, fn) {

        if (!eventName) {
            this.eventHandlers = {}   // Remove all event handlers
        } else if (!fn) {
            this.eventHandlers[eventName] = [] // Remove all eventhandlers matching name
        } else {
            // Remove specific event handler
            const handlers = this.eventHandlers[eventName]
            if (!handlers || handlers.length === 0) {
                console.warn("No handlers to remove for event: " + eventName)
            } else {
                const callbackIndex = handlers.indexOf(fn)
                if (callbackIndex !== -1) {
                    this.eventHandlers[eventName].splice(callbackIndex, 1)
                }
            }
        }
    }

    fireEvent(eventName, args, thisObj) {

        const handlers = this.eventHandlers[eventName]
        if (undefined === handlers || handlers.length === 0) {
            return undefined
        }

        const scope = thisObj || window
        const results = handlers.map(function (event) {
            return event.apply(scope, args)
        })

        return results[0]
    }

    dispose() {
        this.removeMouseHandlers()
        for (let trackView of this.trackViews) {
            trackView.dispose()
        }
    }

    toJSON() {

        const json = {
            "version": version()
        }

        if (this.showSampleNames !== undefined) {
            json['showSampleNames'] = this.showSampleNames
        }
        if (this.sampleNameViewportWidth !== defaultSampleNameViewportWidth) {
            json['sampleNameViewportWidth'] = this.sampleNameViewportWidth
        }

        json["reference"] = this.genome.toJSON()
        if (FileUtils.isFilePath(json.reference.fastaURL)) {
            throw new Error(`Error. Sessions cannot include local file references ${json.reference.fastaURL.name}.`)
        } else if (FileUtils.isFilePath(json.reference.indexURL)) {
            throw new Error(`Error. Sessions cannot include local file references ${json.reference.indexURL.name}.`)
        }

        // Build locus array (multi-locus view).  Use the first track to extract the loci, any track could be used.
        const locus = []
        const gtexSelections = {}
        let hasGtexSelections = false
        let anyTrackView = this.trackViews[0]
        for (let {referenceFrame} of anyTrackView.viewports) {
            const locusString = referenceFrame.getLocusString()
            locus.push(locusString)
            if (referenceFrame.selection) {
                const selection = {
                    gene: referenceFrame.selection.gene,
                    snp: referenceFrame.selection.snp
                }
                gtexSelections[locusString] = selection
                hasGtexSelections = true
            }
        }
        json["locus"] = locus.length === 1 ? locus[0] : locus
        if (hasGtexSelections) {
            json["gtexSelections"] = gtexSelections
        }

        const trackJson = []
        const errors = []
        for (let {track} of this.trackViews) {
            try {
                let config
                if (typeof track.getState === "function") {
                    config = track.getState()
                } else {
                    config = track.config
                }

                if (config) {
                    // null backpointer to browser
                    if (config.browser) {
                        delete config.browser
                    }
                    config.order = track.order //order++;
                    trackJson.push(config)
                }
            } catch (e) {
                console.error(`Track: ${track.name}: ${e}`)
                errors.push(`Track: ${track.name}: ${e}`)
            }
        }

        if (errors.length > 0) {
            let n = 1
            let message = 'Errors encountered saving session: </br>'
            for (let e of errors) {
                message += ` (${n++}) ${e.toString()} <br/>`
            }
            throw Error(message)
        }


        json["tracks"] = trackJson

        return json        // This is an object, not a json string

    }

    compressedSession() {
        const json = JSON.stringify(this.toJSON())
        return BGZip.compressString(json)
    }

    sessionURL() {
        const path = window.location.href.slice()
        const idx = path.indexOf("?")
        const surl = (idx > 0 ? path.substring(0, idx) : path) + "?sessionURL=blob:" + this.compressedSession()
        return surl
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

        var coords
        coords = DOMUtils.pageCoordinates(e)
        this.vpMouseDown = {
            viewport,
            lastMouseX: coords.x,
            mouseDownX: coords.x,
            lastMouseY: coords.y,
            mouseDownY: coords.y,
            referenceFrame: viewport.referenceFrame
        }
    };

    cancelTrackPan() {

        const dragObject = this.dragObject
        this.dragObject = undefined
        this.isScrolling = false
        this.vpMouseDown = undefined


        if (dragObject && dragObject.viewport.referenceFrame.start !== dragObject.start) {
            this.updateViews()
            this.fireEvent('trackdragend')
        }

    }

    /**
     * Track drag here refers to vertical dragging to reorder tracks, not horizontal panning.
     *
     * @param trackView
     */
    startTrackDrag(trackView) {

        this.dragTrack = trackView

    }

    /**
     * Track drag here refers to vertical dragging to reorder tracks, not horizontal panning.
     *
     * @param dragDestination
     */
    updateTrackDrag(dragDestination) {

        if (dragDestination && this.dragTrack) {

            const dragged = this.dragTrack
            const indexDestination = this.trackViews.indexOf(dragDestination)
            const indexDragged = this.trackViews.indexOf(dragged)
            const trackViews = this.trackViews

            trackViews[indexDestination] = dragged
            trackViews[indexDragged] = dragDestination

            const newOrder = this.trackViews[indexDestination].track.order
            this.trackViews[indexDragged].track.order = newOrder

            const nTracks = trackViews.length
            let lastOrder = newOrder

            if (indexDestination < indexDragged) {
                // Displace tracks below

                for (let i = indexDestination + 1; i < nTracks; i++) {
                    const track = trackViews[i].track
                    if (track.order <= lastOrder) {
                        track.order = Math.min(Number.MAX_SAFE_INTEGER, lastOrder + 1)
                        lastOrder = track.order
                    } else {
                        break
                    }
                }
            } else {
                // Displace tracks above.  First track (index 0) is "ruler"
                for (let i = indexDestination - 1; i > 0; i--) {
                    const track = trackViews[i].track
                    if (track.order >= lastOrder) {
                        track.order = Math.max(-Number.MAX_SAFE_INTEGER, lastOrder - 1)
                        lastOrder = track.order
                    } else {
                        break
                    }
                }
            }
            this.reorderTracks()
        }
    }

    endTrackDrag() {
        if (this.dragTrack) {
            // this.dragTrack.$trackDragScrim.hide();
            this.dragTrack = undefined
            this.fireEvent('trackorderchanged', [this.getTrackOrder()])
        } else {
            this.dragTrack = undefined
        }
    }

    /**
     * Mouse handlers to support drag (pan)
     */
    addMouseHandlers() {
        this.addWindowResizeHandler()
        this.addRootMouseUpHandler()
        this.addRootMouseLeaveHandler()
        this.addColumnContainerEventHandlers()
    }

    removeMouseHandlers() {
        this.removeWindowResizeHandler()
        this.removeRootMouseUpHandler()
        this.removeRootMouseLeaveHandler()
        this.removeColumnContainerEventHandlers()
    }

    addWindowResizeHandler() {
        // Create a copy of the prototype "resize" function bound to this instance.  Neccessary to support removing.
        this.boundWindowResizeHandler = resize.bind(this)
        window.addEventListener('resize', this.boundWindowResizeHandler)
    }

    removeWindowResizeHandler() {
        window.removeEventListener('resize', this.boundWindowResizeHandler)
    }

    addRootMouseUpHandler() {
        this.boundRootMouseUpHandler = mouseUpOrLeave.bind(this)
        this.root.addEventListener('mouseup', this.boundRootMouseUpHandler)
    }

    removeRootMouseUpHandler() {
        this.root.removeEventListener('mouseup', this.boundRootMouseUpHandler)
    }

    addRootMouseLeaveHandler() {
        this.boundRootMouseLeaveHandler = mouseUpOrLeave.bind(this)
        this.root.addEventListener('mouseleave', this.boundRootMouseLeaveHandler)
    }

    removeRootMouseLeaveHandler() {
        this.root.removeEventListener('mouseleave', this.boundRootMouseLeaveHandler)
    }

    addColumnContainerEventHandlers() {
        this.boundColumnContainerMouseMoveHandler = handleMouseMove.bind(this)
        this.boundColumnContainerTouchMoveHandler = handleMouseMove.bind(this)
        this.boundColumnContainerMouseLeaveHandler = mouseUpOrLeave.bind(this)
        this.boundColumnContainerMouseUpHandler = mouseUpOrLeave.bind(this)
        this.boundColumnContainerTouchEndHandler = mouseUpOrLeave.bind(this)

        this.columnContainer.addEventListener('mousemove', this.boundColumnContainerMouseMoveHandler)
        this.columnContainer.addEventListener('touchmove', this.boundColumnContainerTouchMoveHandler)

        this.columnContainer.addEventListener('mouseleave', this.boundColumnContainerMouseLeaveHandler)

        this.columnContainer.addEventListener('mouseup', this.boundColumnContainerMouseUpHandler)
        this.columnContainer.addEventListener('touchend', this.boundColumnContainerTouchEndHandler)
    }

    removeColumnContainerEventHandlers() {
        this.columnContainer.removeEventListener('mousemove', this.boundColumnContainerMouseMoveHandler)
        this.columnContainer.removeEventListener('touchmove', this.boundColumnContainerTouchMoveHandler)

        this.columnContainer.removeEventListener('mouseleave', this.boundColumnContainerMouseLeaveHandler)

        this.columnContainer.removeEventListener('mouseup', this.boundColumnContainerMouseUpHandler)
        this.columnContainer.removeEventListener('touchend', this.boundColumnContainerTouchEndHandler)
    }

    async getDriveFileInfo(googleDriveURL) {
        const id = GoogleUtils.getGoogleDriveFileID(googleDriveURL)
        const endPoint = "https://www.googleapis.com/drive/v3/files/" + id + "?supportsTeamDrives=true"
        return igvxhr.loadJson(endPoint, buildOptions({}))
    }

    static uncompressSession(url) {

        let bytes
        if (url.indexOf('/gzip;base64') > 0) {
            //Proper dataURI
            bytes = BGZip.decodeDataURI(url)
            let json = ''
            for (let b of bytes) {
                json += String.fromCharCode(b)
            }
            return json
        } else {

            let enc = url.substring(5)
            return BGZip.uncompressString(enc)
        }
    }

    createCircularView(container, show) {
        show = show === true   // convert undefined to boolean
        this.circularView = createCircularView(container, this)
        this.circularViewControl = new CircularViewControl(this.$toggle_button_container.get(0), this)
        this.circularView.setAssembly({
            name: this.genome.id,
            id: this.genome.id,
            chromosomes: makeCircViewChromosomes(this.genome)
        })
        this.circularViewVisible = show
        return this.circularView
    }

    get circularViewVisible() {
        return this.circularView !== undefined && this.circularView.visible
    }

    set circularViewVisible(isVisible) {
        if (this.circularView) {
            this.circularView.visible = isVisible
            this.circularViewControl.setState(isVisible)
        }
    }
}

/**
 * Function called win window is resized, or visibility changed (e.g. "show" from a tab).  This is a function rather
 * than class method because it needs to be copied and bound to specific instances of browser to support listener
 * removal
 *
 * @returns {Promise<void>}
 */
async function resize() {

    const viewportWidth = this.calculateViewportWidth(this.referenceFrameList.length)

    for (let referenceFrame of this.referenceFrameList) {

        const index = this.referenceFrameList.indexOf(referenceFrame)

        const {chr, genome} = referenceFrame

        const {bpLength} = genome.getChromosome(referenceFrame.chr)

        const viewportWidthBP = referenceFrame.toBP(viewportWidth)

        // viewportWidthBP > bpLength occurs when locus is full chromosome and user widens browser
        if (GenomeUtils.isWholeGenomeView(chr) || viewportWidthBP > bpLength) {
            // console.log(`${ Date.now() } Recalc referenceFrame(${ index }) bpp. viewport ${ StringUtils.numberFormatter(viewportWidthBP) } > ${ StringUtils.numberFormatter(bpLength) }.`)
            referenceFrame.bpPerPixel = bpLength / viewportWidth
        } else {
            // console.log(`${ Date.now() } Recalc referenceFrame(${ index }) end.`)
            referenceFrame.end = referenceFrame.start + referenceFrame.toBP(viewportWidth)
        }

        for (let {viewports} of this.trackViews) {
            viewports[index].setWidth(viewportWidth)
        }

    }

    this.updateUIWithReferenceFrameList()

     //TODO -- update view only if needed.  Reducing size never needed.  Increasing size maybe

     await this.updateViews(true)
}


function handleMouseMove(e) {

    e.preventDefault()

    const {x, y} = DOMUtils.pageCoordinates(e)

    if (this.vpMouseDown) {

        const {viewport, referenceFrame} = this.vpMouseDown

        // Determine direction,  true == horizontal
        const horizontal = Math.abs((x - this.vpMouseDown.mouseDownX)) > Math.abs((y - this.vpMouseDown.mouseDownY))

        if (!this.dragObject && !this.isScrolling) {
            if (horizontal) {
                if (this.vpMouseDown.mouseDownX && Math.abs(x - this.vpMouseDown.mouseDownX) > this.constants.dragThreshold) {
                    this.dragObject = {viewport, start: referenceFrame.start}
                }
            } else {
                if (this.vpMouseDown.mouseDownY &&
                    Math.abs(y - this.vpMouseDown.mouseDownY) > this.constants.scrollThreshold) {
                    this.isScrolling = true
                    const viewportHeight = viewport.$viewport.height()
                    const contentHeight = maxViewportContentHeight(viewport.trackView.viewports)
                    this.vpMouseDown.r = viewportHeight / contentHeight
                }
            }
        }

        if (this.dragObject) {
            const viewChanged = referenceFrame.shiftPixels(this.vpMouseDown.lastMouseX - x, viewport.$viewport.width())
            if (viewChanged) {
                this.updateViews()
            }
            this.fireEvent('trackdrag')
        }


        if (this.isScrolling) {
            const delta = this.vpMouseDown.r * (this.vpMouseDown.lastMouseY - y)
            viewport.trackView.moveScroller(delta)
        }


        this.vpMouseDown.lastMouseX = x
        this.vpMouseDown.lastMouseY = y
    }
}

function mouseUpOrLeave(e) {
    this.cancelTrackPan()
    this.endTrackDrag()
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
    )
}

function toggleTrackLabels(trackViews, isVisible) {

    for (let {viewports} of trackViews) {
        for (let viewport of viewports) {
            if (viewport.$trackLabel) {
                if (0 === viewports.indexOf(viewport) && true === isVisible) {
                    viewport.$trackLabel.show()
                } else {
                    viewport.$trackLabel.hide()
                }
            }
        }
    }
}

async function searchWebService(browser, locus, searchConfig) {

    let path = searchConfig.url.replace("$FEATURE$", locus.toUpperCase())
    if (path.indexOf("$GENOME$") > -1) {
        path = path.replace("$GENOME$", (browser.genome.id ? browser.genome.id : "hg19"))
    }
    const result = await igvxhr.loadString(path)
    return {result: result, locusSearchString: locus}
}

export {searchWebService}
export default Browser

