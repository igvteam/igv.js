import FeatureSource from './featureSource.js'
import TrackBase from "../trackBase.js"
import IGVGraphics from "../igv-canvas.js"
import {createCheckbox} from "../igv-icons.js"
import {reverseComplementSequence} from "../util/sequenceUtils.js"
import {aminoAcidSequenceRenderThreshold, renderFeature} from "./render/renderFeature.js"
import {renderSnp} from "./render/renderSnp.js"
import {renderFusionJuncSpan} from "./render/renderFusionJunction.js"
import {StringUtils, FeatureUtils} from "../../node_modules/igv-utils/src/index.js"
import {ColorTable, PaletteColorTable} from "../util/colorPalletes.js"
import {isSecureContext} from "../util/igvUtils.js"
import {IGVColor} from "../../node_modules/igv-utils/src/index.js"
import FeatureRenderer from './render/FeatureRenderer.js'
import FeatureColorManager from './color/FeatureColorManager.js'
import FeaturePopupManager from './popup/FeaturePopupManager.js'
import FeatureMenuManager from './menu/FeatureMenuManager.js'


class FeatureTrack extends TrackBase {

    static defaultColor = 'rgb(0,0,150)'

    static defaults = {
        type: "annotation",
        maxRows: 1000, // protects against pathological feature packing cases (# of rows of overlapping feaures)
        displayMode: "EXPANDED", // COLLAPSED | EXPANDED | SQUISHED
        margin: 10,
        featureHeight: 14,
        useScore: false
    }

    constructor(config, browser) {
        super(config, browser)
    }

    init(config) {
        super.init(config)

        // Obscure option, not common or supoorted, included for backward compatibility
        this.labelDisplayMode = config.labelDisplayMode

        if (config._featureSource) {
            this.featureSource = config._featureSource
            delete config._featureSource
        } else if ('blat' !== config.type) {
            this.featureSource = config.featureSource ?
                config.featureSource :
                FeatureSource(config, this.browser.genome)
        }

        // Initialize managers
        this.renderer = new FeatureRenderer(config)
        this.colorManager = new FeatureColorManager(config)
        this.popupManager = new FeaturePopupManager(config)
        this.menuManager = new FeatureMenuManager(config)

        if ("FusionJuncSpan" === config.type) {
            this.render = config.render || renderFusionJuncSpan
            this.squishedRowHeight = config.squishedRowHeight || 50
            this.expandedRowHeight = config.expandedRowHeight || 50
            this.height = config.height || this.margin + 2 * this.expandedRowHeight
        } else if ('snp' === config.type) {
            this.render = config.render || renderSnp
            // colors ordered based on priority least to greatest
            this.snpColors = ['rgb(0,0,0)', 'rgb(0,0,255)', 'rgb(0,255,0)', 'rgb(255,0,0)']
            this.colorBy = 'function'
            this.expandedRowHeight = config.expandedRowHeight || 10
            this.squishedRowHeight = config.squishedRowHeight || 5
            this.height = config.height || 30
        } else {
            this.render = config.render || renderFeature
            this.arrowSpacing = 30
            // adjust label positions to make sure they're always visible
            monitorTrackDrag(this)
            this.squishedRowHeight = config.squishedRowHeight || 15
            this.expandedRowHeight = config.expandedRowHeight || 30
            this.height = config.height || this.margin + 2 * this.expandedRowHeight

            // Set colorBy fields considering legacy options for backward compatibility
            if (config.colorBy) {
                if (config.colorBy.field) {
                    config.colorTable = config.colorBy.pallete || config.colorBy.palette
                    config.colorBy = config.colorBy.field
                }
                this.colorBy = config.colorBy   // Can be undefined => default
                if (config.colorTable) {
                    this.colorTable = new ColorTable(config.colorTable)
                } else {
                    this.colorTable = new PaletteColorTable("Set1")
                }
            }
        }
    }

    async postInit() {

        if (typeof this.featureSource.getHeader === "function") {
            this.header = await this.featureSource.getHeader()
            if (this.disposed) return   // This track was removed during async load
        }

        // Set properties from track line
        if (this.header) {
            this.setTrackProperties(this.header)
        }

        if (this.visibilityWindow === undefined && typeof this.featureSource.defaultVisibilityWindow === 'function') {
            this.visibilityWindow = await this.featureSource.defaultVisibilityWindow()
        }

        this._initialColor = this.color || this.constructor.defaultColor
        this._initialAltColor = this.altColor || this.constructor.defaultColor

        return this

    }

    /**
     * Return true if this track can be searched for genome location by feature property.
     * This track is searchable if its featureSource is searchable.
     * @returns {boolean}
     */
    get searchable() {
        return this.featureSource.searchable
    }

    async search(locus) {
        if (this.featureSource && this.featureSource.searchable) {
            return this.featureSource.search(locus)
        } else {
            return undefined
        }
    }

    /**
     * Return boolean indicating if this track supports the whole genome view.  Generally this is non-indexed feature
     * tracks.
     *
     * @returns {*|boolean}
     */
    get supportsWholeGenome() {
        if (this.config.supportsWholeGenome !== undefined) {
            return this.config.supportsWholeGenome
        } else if (this.featureSource && typeof this.featureSource.supportsWholeGenome === 'function') {
            return this.featureSource.supportsWholeGenome()
        } else {
            if (this.visibilityWindow === undefined && (this.config.indexed === false || !this.config.indexURL)) {
                return true
            }
        }
    }

    async getFeatures(chr, start, end, bpPerPixel) {
        const visibilityWindow = this.visibilityWindow
        return this.featureSource.getFeatures({chr, start, end, bpPerPixel, visibilityWindow})
    }

    /**
     * The required height in pixels required for the track content.   This is not the visible track height, which
     * can be smaller (with a scrollbar) or larger.
     *
     * @param features
     * @returns {*}
     */
    computePixelHeight(features) {
        return this.renderer.computePixelHeight(features)
    }

    /**
     *                 context: ctx,
     *                 pixelXOffset,
     *                 pixelWidth,
     *                 pixelHeight,
     *                 pixelTop,
     *                 bpStart,
     *                 bpEnd: bpEnd,
     *                 bpPerPixel,
     *                 windowFunction: this.windowFunction,
     *                 referenceFrame: this.referenceFrame,
     *                 selection: this.selection,
     *                 viewport: this,
     *                 viewportWidth: this.$viewport.width()
     * @param options
     */
    draw(options) {
        this.renderer.draw(options)
    }

    clickedFeatures(clickState) {
        const y = clickState.y - this.margin
        const allFeatures = super.clickedFeatures(clickState)

        let row
        switch (this.displayMode) {
            case 'SQUISHED':
                row = Math.floor(y / this.squishedRowHeight)
                break
            case 'EXPANDED':
                row = Math.floor(y / this.expandedRowHeight)
                break
            default:
                row = undefined
        }

        return allFeatures.filter(function (feature) {
            return (row === undefined || feature.row === undefined || row === feature.row)
        })
    }

    /**
     * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
     */
    popupData(clickState, features) {
        return this.popupManager.getPopupData(clickState, features)
    }

    menuItemList() {
        return this.menuManager.getMenuItemList()
    }

    contextMenuItemList(clickState) {
        return this.menuManager.getContextMenuItemList(clickState)
    }

    description() {

        // if('snp' === this.type) {
        if (renderSnp === this.render) {
            let desc = "<html>" + this.name + '<hr/>'
            desc += '<em>Color By Function:</em><br>'
            desc += '<span style="color:red">Red</span>: Coding-Non-Synonymous, Splice Site<br>'
            desc += '<span style="color:green">Green</span>: Coding-Synonymous<br>'
            desc += '<span style="color:blue">Blue</span>: Untranslated<br>'
            desc += '<span style="color:black">Black</span>: Intron, Locus, Unknown<br><br>'
            desc += '<em>Color By Class:</em><br>'
            desc += '<span style="color:red">Red</span>: Deletion<br>'
            desc += '<span style="color:green">Green</span>: MNP<br>'
            desc += '<span style="color:blue">Blue</span>: Microsatellite, Named<br>'
            desc += '<span style="color:black">Black</span>: Indel, Insertion, SNP'
            desc += "</html>"
            return desc
        } else {
            return super.description()
        }

    };

    /**
     * Return color for feature.
     * @param feature
     * @returns {string}
     */

    getColorForFeature(feature) {
        return this.colorManager.getColorForFeature(feature)
    }

    /**
     * Called when the track is removed.  Do any needed cleanup here
     */
    dispose() {
        this.trackView = undefined
    }
}

/**
 * Monitors track drag events, updates label position to ensure that they're always visible.
 * @param track
 */
function monitorTrackDrag(track) {
    if (track.browser.on) {
        track.browser.on('trackdragend', onDragEnd)
        track.browser.on('trackremoved', unSubscribe)
    }

    function onDragEnd() {
        if (track.trackView && track.displayMode !== "SQUISHED") {
            track.trackView.repaintViews()
        }
    }

    function unSubscribe(removedTrack) {
        if (track.browser.un && track === removedTrack) {
            track.browser.un('trackdragend', onDragEnd)
            track.browser.un('trackremoved', unSubscribe)
        }
    }
}

export default FeatureTrack
