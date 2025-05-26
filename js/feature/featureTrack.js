import FeatureSource from './featureSource.js'
import TrackBase from "../trackBase.js"
import {ColorTable, PaletteColorTable} from "../util/colorPalletes.js"
import FeatureRenderer from './render/featureRenderer.js'
import FeatureColorManager from './color/featureColorManager.js'
import FeaturePopupManager from './menu/featurePopupManager.js'
import FeatureMenuManager from './menu/featureMenuManager.js'

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
        this.renderer = new FeatureRenderer({...config, browser: this.browser})
        this.colorManager = new FeatureColorManager(config)
        this.popupManager = new FeaturePopupManager(config)
        this.menuManager = new FeatureMenuManager(config)

        if ("FusionJuncSpan" === config.type) {
            this.squishedRowHeight = config.squishedRowHeight || 50
            this.expandedRowHeight = config.expandedRowHeight || 50
            this.height = config.height || this.margin + 2 * this.expandedRowHeight
        } else if ("SNP" === config.type) {
            this.expandedRowHeight = config.expandedRowHeight || 10
            this.squishedRowHeight = config.squishedRowHeight || 5
            this.height = config.height || 30
        } else {
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

    get searchable() {
        return this.featureSource.searchable
    }

    async search(locus) {
        if (this.searchable) {
            return this.featureSource.search(locus)
        } else {
            return undefined
        }
    }

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

    computePixelHeight(features) {
        return this.renderer.computePixelHeight(features)
    }

    draw(options) {
        this.renderer.draw(options)
    }

    clickedFeatures(clickState) {
        return super.clickedFeatures(clickState)
    }

    popupData(clickState, features) {
        return this.popupManager.getPopupData(clickState, features)
    }

    menuItemList() {
        return this.menuManager.getMenuItemList()
    }

    getColorForFeature(feature) {
        return this.colorManager.getColorForFeature(feature)
    }

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
