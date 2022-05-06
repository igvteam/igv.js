import {DOMUtils,StringUtils} from '../../node_modules/igv-utils/src/index.js'
import ROISet, {ROI_USER_DEFINED_COLOR, screenCoordinates} from './ROISet.js'

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

        const promises = this.roiSets.map(roiSet => this.renderROISet({ browser: this.browser, pixelTop: this.top, roiSet }))

        if (promises.length > 0) {
            await Promise.all(promises)
        }

        const records = await this.getTableRecords()
        this.roiTable.renderTable(records)

    }

    async loadROI(config, genome) {

        const configs = Array.isArray(config) ? config : [ config ]

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

        for (let set of this.roiSets) {
            const regions = await set.getAllFeatures()
            const acc = regions.map(region => Object.assign({ name:set.name }, region))
            records.push(...acc)
        }

        return records
    }

    presentTable() {
        this.roiTable.present()
    }

    dismissTable() {
        this.roiTable.dismiss()
    }

    async updateUserDefinedROISet(region) {

        if (0 === this.roiSets.length) {

            const config =
                {
                    isUserDefined: true,
                    features: [],
                    color: ROI_USER_DEFINED_COLOR
                };

            this.roiSets.push(new ROISet(config, this.browser.genome))

        } else {

            const result = this.roiSets.filter(roiSet => true === roiSet.isUserDefined)

            if (0 === result.length) {

                const config =
                    {
                        isUserDefined: true,
                        features: [],
                        color: ROI_USER_DEFINED_COLOR
                    };

                this.roiSets.push(new ROISet(config, this.browser.genome))
            }

        }

        const [ userDefinedROISet ] = this.roiSets.filter(roiSet => true === roiSet.isUserDefined)

        userDefinedROISet.features.push(region)

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
            await this.renderROISet({ browser: this.browser, pixelTop: this.top, roiSet })
        }
    }

    async renderROISet({browser, pixelTop, roiSet}) {

        const columns = browser.columnContainer.querySelectorAll('.igv-column')

        for (let i = 0; i < columns.length; i++) {

            let { chr, start:startBP, end:endBP, bpPerPixel:bpp } = browser.referenceFrameList[ i ]

            const regions = await roiSet.getAllFeatures()

            if (regions && regions.length > 0) {

                for (let r = 0; r < regions.length; r++ ) {

                    const { chr:regionChr, start:regionStartBP, end:regionEndBP } = regions[ r ]

                    const regionKey = createRegionKey(regionChr, regionStartBP, regionEndBP)
                    const el = columns[ i ].querySelector(createSelector(regionKey))
                    const isRegionInDOM = null !== el

                    if (regionChr !== chr || regionEndBP < startBP || regionStartBP > endBP) {

                        if (isRegionInDOM) {
                            el.remove()
                        }

                    } else {

                        const { x:pixelX, width:pixelWidth } = screenCoordinates(Math.max(regionStartBP, startBP), Math.min(regionEndBP, endBP), startBP, bpp)

                        if (isRegionInDOM) {
                            el.style.left = `${pixelX}px`
                            el.style.width = `${pixelWidth}px`
                        } else {
                            const element = this.createRegionElement(browser.columnContainer, pixelTop, pixelX, pixelWidth, roiSet, regionKey)
                            columns[ i ].appendChild(element)
                        }

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

        const header = DOMUtils.div()
        regionElement.appendChild(header)

        header.style.backgroundColor = roiSet.headerColor

        header.addEventListener('click', event => {
            event.preventDefault()
            event.stopPropagation()

            const {x, y} = DOMUtils.translateMouseCoordinates(event, columnContainer)
            this.roiMenu.present(x, y, this, columnContainer, regionElement, roiSet.isUserDefined)
        })

        return regionElement
    }

    async deleteRegionWithKey(regionKey, columnContainer) {

        columnContainer.querySelectorAll(createSelector(regionKey)).forEach(node => node.remove())

        const { chr:chrKey, start:startKey, end:endKey } = parseRegionKey(regionKey)

        // const indices = userDefinedROISet.features.map((feature, i) => i).join(' ')

        const [ userDefinedROISet ] = this.roiSets.filter(roiSet => true === roiSet.isUserDefined)

        let indexToRemove
        for (let r = 0; r < userDefinedROISet.features.length; r++) {

            const { chr, start, end } = userDefinedROISet.features[ r ]

            if (chrKey === chr && startKey === start && endKey === end) {
                indexToRemove = r
            }

        }

        // console.log(`${ Date.now() } "${ roiSet.name }" indices ${ indices } index-to-remove ${indexToRemove  }`)

        userDefinedROISet.features.splice(indexToRemove, 1)

        const allFeatures = await this.getTableRecords()

        // console.log(`userDefinedROISet.features(${ allFeatures.length })`)

        if (0 === allFeatures.length) {
            this.browser.roiTableControl.buttonHandler(false)
            this.setROITableButtonVisibility(false)
        }

    }

    async import(file) {
        await this.roiTable.import(file)
    }

    export() {
        this.roiTable.export()
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
    return `region-key-${ chr }-${ start }-${ end }`
}

function createSelector(regionKey) {
    return `[data-region="${ regionKey }"]`
}

function parseRegionKey(regionKey) {
    let [ _region_, _key_, chr, ss, ee ] = regionKey.split('-')
    ss = parseInt(ss)
    ee = parseInt(ee)

    return { chr, start:ss, end:ee, locus:`${chr}:${ss}-${ee}`, bedRecord:`${chr}\t${ss}\t${ee}` }
}

export { createRegionKey, parseRegionKey }

export default ROIManager
