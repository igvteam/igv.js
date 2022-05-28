import {DOMUtils, StringUtils} from '../../node_modules/igv-utils/src/index.js'
import ROISet, {screenCoordinates} from './ROISet.js'

class ROIManager {
    constructor(browser, roiMenu, roiTable, top, roiSets) {

        this.browser = browser
        this.roiMenu = roiMenu
        this.roiTable = roiTable
        this.top = top
        this.roiSets = roiSets || []
        this.boundLocusChangeHandler = locusChangeHandler.bind(this)
        browser.on('locuschange', this.boundLocusChangeHandler)

    }

    async initialize() {

        if (this.roiSets.length > 0) {
            this.browser.showROITableButton = true
            this.browser.roiTableControl.setVisibility(this.browser.showROITableButton)
        }

        const promises = this.roiSets.map(roiSet => this.renderROISet({
            browser: this.browser,
            pixelTop: this.top,
            roiSet
        }))

        if (promises.length > 0) {
            await Promise.all(promises)
        }

        const records = await this.getTableRecords()
        this.roiTable.renderTable(records)

    }

    async loadROI(config, genome) {

        const configs = Array.isArray(config) ? config : [config]

        for (let c of configs) {
            this.roiSets.push(new ROISet(c, genome))
        }

        await this.initialize()

    }

    clearROIs() {

        this.roiTable.clearTable()

        const elements = this.browser.columnContainer.querySelectorAll('.igv-roi-region')
        for (let el of elements) {
            el.remove()
        }

        for (let roiSet of this.roiSets) {
            roiSet.dispose()
        }

        this.roiSets = []

    }

    async getTableRecords() {

        const records = []

        for (let roiSet of this.roiSets) {
            const setName = roiSet.isUserDefined ? '' : (roiSet.name || '')
            const allFeatures = await roiSet.getAllFeatures()
            for (let chr of Object.keys(allFeatures)) {
                for (let feature of allFeatures[chr]) {
                    records.push({setName, feature})
                }
            }
        }

        return records
    }

    presentTable() {
        this.roiTable.present()
    }

    async repaintTable() {
        const records = await this.getTableRecords()
        this.roiTable.renderTable(records)
    }

    dismissTable() {
        this.roiTable.dismiss()
    }

    async updateUserDefinedROISet(feature) {

        const userDefinedROISet = this.getUserDefinedROISet()

        userDefinedROISet.addFeature(feature)

        if (false === this.browser.showROITableButton) {
            this.setROITableButtonVisibility(true)
        }

        await this.renderROISet({browser: this.browser, pixelTop: this.top, roiSet: userDefinedROISet})

        const records = await this.getTableRecords()
        this.roiTable.renderTable(records)
    }

    setROITableButtonVisibility(isVisible) {
        this.browser.showROITableButton = isVisible
        this.browser.roiTableControl.setVisibility(this.browser.showROITableButton)
    }

    async renderAllROISets() {

        for (let roiSet of this.roiSets) {
            await this.renderROISet({browser: this.browser, pixelTop: this.top, roiSet})
        }
    }

    async renderROISet({browser, pixelTop, roiSet}) {

        const columns = browser.columnContainer.querySelectorAll('.igv-column')

        for (let i = 0; i < columns.length; i++) {

            let {chr, start: viewStart, end: viewEnd, bpPerPixel} = browser.referenceFrameList[i]

            const elements = columns[i].querySelectorAll('.igv-roi-region')
            for (let el of elements) {
                const regionKey = el.dataset.region
                const {chr: regionChr, start: regionStart, end: regionEnd} = parseRegionKey(regionKey)
                if (regionChr !== chr || regionEnd < viewStart || regionStart > viewEnd) {
                    el.remove()
                }
            }

            const features = await roiSet.getFeatures(chr, viewStart, viewEnd)

            if (features) {

                for (let feature of features) {

                    const regionKey = createRegionKey(chr, feature.start, feature.end)

                    const {
                        x: pixelX,
                        width: pixelWidth
                    } = screenCoordinates(Math.max(viewStart, feature.start), Math.min(viewEnd, feature.end), viewStart, bpPerPixel)


                    const el = columns[i].querySelector(createSelector(regionKey))

                    if (el) {
                        el.style.left = `${pixelX}px`
                        el.style.width = `${pixelWidth}px`
                    } else {
                        const element = this.createRegionElement(browser.columnContainer, pixelTop, pixelX, pixelWidth, roiSet, regionKey)
                        columns[i].appendChild(element)
                    }
                }
            }
        }
    }

    createRegionElement(columnContainer, pixelTop, pixelX, pixelWidth, roiSet, regionKey) {

        const regionElement = DOMUtils.div({class: 'igv-roi-region'})

        regionElement.style.top = `${pixelTop}px`
        regionElement.style.left = `${pixelX}px`

        regionElement.style.width = `${pixelWidth}px`

        regionElement.style.backgroundColor = roiSet.color

        regionElement.dataset.region = regionKey

        if (true === roiSet.isUserDefined) {

            const header = DOMUtils.div()
            regionElement.appendChild(header)

            header.style.backgroundColor = roiSet.headerColor

            header.addEventListener('click', event => {
                event.preventDefault()
                event.stopPropagation()

                const {x, y} = DOMUtils.translateMouseCoordinates(event, columnContainer)
                this.roiMenu.present(x, y, this, columnContainer, regionElement)
            })
        }

        return regionElement
    }

    async findFeatureWithRegionKey(regionKey) {

        const {chr, start, end} = parseRegionKey(regionKey)
        const userDefinedROISet = this.getUserDefinedROISet()

        if (userDefinedROISet) {
            const features = await userDefinedROISet.getFeatures(chr, start, end)

            for (let feature of features) {
                if (feature.chr === chr && feature.start >= start && feature.end <= end) {
                    return feature
                }
            }
        }
        return undefined
    }

    getUserDefinedROISet() {
        let userDefinedROISet = this.roiSets.find(roiSet => true === roiSet.isUserDefined)
        if (!userDefinedROISet) {
            const config =
                {
                    isUserDefined: true,
                    features: []
                }
            userDefinedROISet = new ROISet(config, this.browser.genome)
            this.roiSets.push(userDefinedROISet)
        }
        return userDefinedROISet
    }

    async deleteRegionWithKey(regionKey, columnContainer) {

        columnContainer.querySelectorAll(createSelector(regionKey)).forEach(node => node.remove())

        const feature = this.findFeatureWithRegionKey(regionKey)

        this.getUserDefinedROISet().removeFeature(feature)

        const records = await this.getTableRecords()

        if (0 === records.length) {
            this.browser.roiTableControl.buttonHandler(false)
            this.setROITableButtonVisibility(false)
        }

    }

    toJSON() {
        return this.roiSets.map(roiSet => roiSet.toJSON())
    }

    dispose() {

        this.browser.off('locuschange', this.boundLocusChangeHandler)

        const removable = this.browser.columnContainer.querySelectorAll('.igv-roi-region')

        for (let el of removable) {
            el.remove()
        }

        if (this.roiMenu) {
            this.roiMenu.dispose()
        }

        if (this.roiTable) {
            this.roiTable.dispose()
        }

        for (let roiSet of this.roiSets) {
            roiSet.dispose()
        }

        for (let key of Object.keys(this)) {
            this[key] = undefined
        }

    }
}

function locusChangeHandler() {
    this.renderAllROISets()
}

function createRegionKey(chr, start, end) {
    return `${chr}-${start}-${end}`
}

function createSelector(regionKey) {
    return `[data-region="${regionKey}"]`
}

function parseRegionKey(regionKey) {
    let [chr, ss, ee] = regionKey.split('-')
    ss = parseInt(ss)
    ee = parseInt(ee)

    return {chr, start: ss, end: ee, locus: `${chr}:${ss}-${ee}`, bedRecord: `${chr}\t${ss}\t${ee}`}
}

export {createRegionKey, parseRegionKey}

export default ROIManager
