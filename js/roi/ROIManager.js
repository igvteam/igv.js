import {DOMUtils,StringUtils} from '../../node_modules/igv-utils/src/index.js'
import ROISet, {ROI_USER_DEFINED_COLOR, screenCoordinates} from './ROISet.js'


class ROIManager {
    constructor(browser, roiMenu, roiTable, top, roiSets) {

        this.browser = browser

        this.roiMenu = roiMenu

        this.roiTable = roiTable

        this.top = top

        this.roiSets = []
        this.userDefinedROISet = undefined

        if (roiSets) {

            for (let roiSet of roiSets) {
                if (roiSet.isUserDefined) {
                    this.userDefinedROISet = roiSet
                } else {
                    this.roiSets.push(roiSet)
                }
            }
        }

        if (undefined === this.userDefinedROISet) {

            const config =
                {
                    isUserDefined: true,
                    features: [],
                    color: ROI_USER_DEFINED_COLOR
                };

            this.userDefinedROISet = new ROISet(config, browser.genome)
        }

        // browser.on('locuschange', this.renderAllROISets())

        this.boundLocusChangeHandler = locusChangeHandler.bind(this)
        browser.on('locuschange', this.boundLocusChangeHandler)

    }

    async initialize() {

        const promises = this.roiSets.map(roiSet => {

            const config =
                {
                    browser: this.browser,
                    pixelTop: this.top,
                    roiSet
                };

            return this.renderROISet(config)

        })

        if (promises.length > 0) {
            await Promise.all(promises)
        }

        this.roiTable.renderTable(this.userDefinedROISet)

    }

    presentTable() {
        this.roiTable.present()
    }

    dismissTable() {
        this.roiTable.dismiss()
    }

    async updateUserDefinedROISet(region) {

        this.userDefinedROISet.features.push(region)

        await this.renderROISet({browser: this.browser, pixelTop: this.top, roiSet: this.userDefinedROISet})

        this.roiTable.renderTable(this.userDefinedROISet)

    }

    async renderAllROISets() {

        const list = this.userDefinedROISet.features.length > 0 ? [ ...this.roiSets, this.userDefinedROISet ]  : this.roiSets

        for (let roiSet of list) {

            const config =
                {
                    browser: this.browser,
                    pixelTop: this.top,
                    roiSet
                };

            await this.renderROISet(config)

        }
    }

    async renderROISet({browser, pixelTop, roiSet}) {

        const columns = browser.columnContainer.querySelectorAll('.igv-column')

        for (let i = 0; i < columns.length; i++) {

            let { chr, start:startBP, end:endBP, bpPerPixel:bpp } = browser.referenceFrameList[ i ]

            const regions = await roiSet.getFeatures(chr, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)

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

        if (true === roiSet.isUserDefined) {

            header.addEventListener('click', event => {
                event.preventDefault()
                event.stopPropagation()

                const {x, y} = DOMUtils.translateMouseCoordinates(event, columnContainer)
                this.roiMenu.present(x, y, this, columnContainer, regionElement)
            })

        }

        return regionElement
    }

    async import(file) {
        await this.roiTable.import(file)
    }

    toJSON() {
        return [ ...this.roiSets, this.userDefinedROISet ].map(roiSet => roiSet.toJSON())
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

        const list = [ ...this.roiSets, this.userDefinedROISet]
        for (let roiSet of list) {
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

function deleteRegionWithKey(userDefinedROISet, regionKey, columnContainer) {

    columnContainer.querySelectorAll(createSelector(regionKey)).forEach(node => node.remove())

    const { chr:chrKey, start:startKey, end:endKey } = parseRegionKey(regionKey)

    // const indices = userDefinedROISet.features.map((feature, i) => i).join(' ')

    let indexToRemove
    for (let r = 0; r < userDefinedROISet.features.length; r++) {
        const { chr, start, end } = userDefinedROISet.features[ r ]
        if (chrKey === chr && startKey === start && endKey === end) {
            indexToRemove = r
        }
    }

    // console.log(`${ Date.now() } "${ roiSet.name }" indices ${ indices } index-to-remove ${indexToRemove  }`)

    userDefinedROISet.features.splice(indexToRemove, 1)

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

export { createRegionKey, parseRegionKey, deleteRegionWithKey }

export default ROIManager
