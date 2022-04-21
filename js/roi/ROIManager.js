import {DOMUtils,StringUtils} from '../../node_modules/igv-utils/src/index.js'
import ROISet, {ROI_DEFAULT_COLOR, screenCoordinates} from './ROISet.js'

class ROIManager {
    constructor(browser, roiMenu, roiTable, top, roiSets) {

        this.browser = browser
        this.roiMenu = roiMenu
        this.roiTable = roiTable
        this.top = top
        this.roiSets = roiSets || []

        const config =
            {
                isUserDefined: true,
                features: [],
                color: ROI_DEFAULT_COLOR
            };

        this.userDefinedROISet = new ROISet(config, browser.genome)

        browser.on('locuschange', () => this.renderAllROISets())
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

    }

    async updateUserDefinedROISet(region) {
        this.userDefinedROISet.features.push(region)
        await this.renderROISet({browser: this.browser, pixelTop: this.top, roiSet: this.userDefinedROISet})
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

                    const regionKey = `region-key-${ regionStartBP }-${ regionEndBP }`
                    const selector = `[data-region="${ regionKey }"]`

                    const el = columns[ i ].querySelector(selector)
                    const isRegionInDOM = null !== el

                    if (regionEndBP < startBP || regionStartBP > endBP || chr !== regionChr) {

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

        const container = DOMUtils.div({class: 'igv-roi-region'})

        container.style.top = `${pixelTop}px`
        container.style.left = `${pixelX}px`

        container.style.width = `${pixelWidth}px`

        container.style.backgroundColor = roiSet.color

        container.dataset.region = regionKey

        // header
        const header = DOMUtils.div()
        header.style.backgroundColor = roiSet.headerColor
        container.appendChild(header)

        header.addEventListener('click', event => {
            event.preventDefault()
            event.stopPropagation()

            const {x, y} = DOMUtils.translateMouseCoordinates(event, columnContainer)
            // this.roiMenu.present(x, y, roiSet, columnContainer, regionKey, this)
            this.roiTable.present(x, y, this.userDefinedROISet)
        })

        return container
    }

    toJSON() {
        return [ ...this.roiSets, this.userDefinedROISet ].map(roiSet => roiSet.toJSON())
    }
}

export default ROIManager
