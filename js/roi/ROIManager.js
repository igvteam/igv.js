import {DOMUtils,StringUtils} from '../../node_modules/igv-utils/src/index.js'
import ROISet, {ROI_DEFAULT_COLOR, ROI_HEADER_DEFAULT_COLOR, screenCoordinates} from './ROISet.js'

class ROIManager {
    constructor(browser, roiMenu, roiTable, top, roiSets) {

        this.browser = browser
        this.roiMenu = roiMenu
        this.roiTable = roiTable
        this.top = top
        this.roiSets = roiSets || []

        const interativeROISetConfig =
            {
                name: `Interactive ROI Set`,
                features:
                [

                ],
                color: ROI_HEADER_DEFAULT_COLOR
            };

        this.interativeROISet = new ROISet(interativeROISetConfig, browser.genome)

        browser.on('locuschange',       () => this.renderAllROISets())
        // browser.on('trackremoved',      () => this.paint(browser, top, this.roiSets))
        // browser.on('trackorderchanged', () => this.paint(browser, top, this.roiSets))
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

    async updateInteractiveROISet(region) {

        this.interativeROISet.features.push(region)

        // const json = this.toJSON()
        //
        // const str = JSON.stringify(json)
        // const parsed = JSON.parse(str)
        //
        // console.log(`${ JSON.stringify(json) }`)

        await this.renderROISet({browser: this.browser, pixelTop: this.top, roiSet: this.interativeROISet})


    }

    async renderAllROISets() {

        const list = this.interativeROISet.features.length > 0 ? [ ...this.roiSets, this.interativeROISet ]  : this.roiSets

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

        const container = DOMUtils.div({class: 'igv-roi'})

        container.style.top = `${pixelTop}px`
        container.style.left = `${pixelX}px`

        container.style.width = `${pixelWidth}px`

        container.style.backgroundColor = ROI_DEFAULT_COLOR

        container.dataset.region = regionKey

        // header
        const header = DOMUtils.div()
        header.style.backgroundColor = roiSet.color
        container.appendChild(header)

        if (false === roiSet.isImmutable) {

            header.addEventListener('click', event => {
                const {x, y} = DOMUtils.translateMouseCoordinates(event, columnContainer)
                this.roiMenu.present(x, y, roiSet, columnContainer, regionKey)
            })

        }

        return container
    }

    toJSON() {
        return [ ...this.roiSets, this.interativeROISet ].filter(roiSet => !roiSet.isImmutable).map(roiSet => roiSet.toJSON())
    }
}

export default ROIManager
