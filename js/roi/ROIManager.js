import Picker from '../../node_modules/vanilla-picker/dist/vanilla-picker.mjs'
import {DOMUtils,StringUtils} from '../../node_modules/igv-utils/src/index.js'
import ROISet, {ROI_DEFAULT_COLOR, ROI_HEADER_DEFAULT_COLOR, screenCoordinates} from './ROISet.js'
import ROIMenu from './ROIMenu.js'

class ROIManager {
    constructor(browser, roiMenu, roiTable, top, roiSets) {

        this.browser = browser
        this.roiMenu = roiMenu
        this.roiTable = roiTable
        this.top = top
        this.roiSets = roiSets || []

        // browser.on('locuschange',       () => this.echoLocus())
        browser.on('locuschange',       () => this.renderAllFeatureElements())
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

            return this.presentFeatureElements(config)

        })

        if (promises.length > 0) {
            await Promise.all(promises)
        }

    }

    addROISet(region) {

        const roiSetConfig =
            {
                name: `roi-element-${ DOMUtils.guid() }`,
                featureSource:
                    {
                        getFeatures :(chr, start, end) => [ region ]
                    },
                color: ROI_HEADER_DEFAULT_COLOR
            };

        const roiSet = new ROISet(roiSetConfig, this.browser.genome)
        this.roiSets.push(roiSet)

        this.presentFeatureElements({ browser: this.browser, pixelTop: this.top, roiSet })

    }

    async echoLocus() {

        const columns = this.browser.columnContainer.querySelectorAll('.igv-column')

        for (let i = 0; i < columns.length; i++) {
            let { chr, start:startBP, end:endBP, bpPerPixel:bpp } = this.browser.referenceFrameList[ i ]

            // const regions = await this.roiSets[ 0 ].getFeatures(chr, startBP, endBP)
            const regions = await this.roiSets[ 0 ].getFeatures(chr, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)

            console.log(`frame(${i}) ${ chr } start ${ StringUtils.numberFormatter(Math.floor(startBP)) } region retrieved(${regions.length})`)

        }

    }

    async renderAllFeatureElements() {

        for (let roiSet of this.roiSets) {

            const config =
                {
                    browser: this.browser,
                    pixelTop: this.top,
                    roiSet
                };

            await this.presentFeatureElements(config)

        }
    }

    async presentFeatureElements({ browser, pixelTop, roiSet }) {

        const columns = browser.columnContainer.querySelectorAll('.igv-column')

        for (let i = 0; i < columns.length; i++) {

            let { chr, start:startBP, end:endBP, bpPerPixel:bpp } = browser.referenceFrameList[ i ]

            const regions = await roiSet.getFeatures(chr, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)

            if (regions && regions.length > 0) {

                for (let { chr:featureChr, start:featureStartBP, end:featureEndBP } of regions) {

                    featureStartBP = Math.floor(featureStartBP)
                    featureEndBP = Math.floor(featureEndBP)

                    const featureKey = `feature-key-${ featureStartBP }-${ featureEndBP }`
                    const selector = `[data-feature="${ featureKey }"]`

                    const el = columns[ i ].querySelector(selector)
                    const featureIsInDOM = null !== el

                    // console.log(`presentFeatureElements - selector ${ selector } ${ featureIsInDOM }`)

                    // console.log(`reference frame start ${ StringUtils.numberFormatter(startBP) } end ${ StringUtils.numberFormatter(endBP) }`)

                    if (featureEndBP < startBP || featureStartBP > endBP || chr !== featureChr) {

                        if (featureIsInDOM) {
                            el.remove()
                        }

                    } else {

                        const { x:pixelX, width:pixelWidth } = screenCoordinates(Math.max(featureStartBP, startBP), Math.min(featureEndBP, endBP), startBP, bpp)

                        if (featureIsInDOM) {
                            el.style.left = `${pixelX}px`
                            el.style.width = `${pixelWidth}px`
                        } else {
                            const featureDOM = this.createFeatureDOM(browser, browser.columnContainer, pixelTop, pixelX, pixelWidth, roiSet.color, featureKey)
                            columns[ i ].appendChild(featureDOM)
                        }

                    }

                }
            }

        }

    }

    createFeatureDOM(browser, columnContainer, pixelTop, pixelX, pixelWidth, color, featureKey) {

        // ROISet container
        const container = DOMUtils.div({class: 'igv-roi'})

        container.style.top = `${pixelTop}px`
        container.style.left = `${pixelX}px`

        container.style.width = `${pixelWidth}px`

        container.style.backgroundColor = ROI_DEFAULT_COLOR

        container.dataset.feature = featureKey

        // header
        const header = DOMUtils.div()
        header.style.backgroundColor = color
        container.appendChild(header)

        // header.addEventListener('click', event => {
        //     const {x, y} = DOMUtils.translateMouseCoordinates(event, columnContainer)
        //     this.roiMenu.present(x, y)
        // })

        return container
    }

    clearGlobalROIDOMElement(column) {
        const regionElements = column.querySelectorAll('.igv-roi')
        for (let i = 0; i < regionElements.length; i++) {
            regionElements[ i ].remove()
        }
    }

    async paint(browser, top, roiSets) {

        const columns = browser.columnContainer.querySelectorAll('.igv-column')

        for (let i = 0; i < columns.length; i++) {

            this.clearGlobalROIDOMElement(columns[i])

            const { chr, start:startBP, end:endBP, bpPerPixel:bpp } = browser.referenceFrameList[ i ]

            for (let roi of roiSets) {

                const regions = await roi.getFeatures(chr, startBP, endBP)

                if (regions && regions.length > 0) {

                    for (let { start:regionStartBP, end:regionEndBP } of regions) {

                        if (regionEndBP < startBP) {
                            continue
                        }

                        if (regionStartBP > endBP) {
                            break
                        }

                        regionStartBP = Math.max(regionStartBP, startBP)
                        regionEndBP = Math.min(regionEndBP, endBP)
                        columns[ i ].appendChild(this.createFeatureDOM(browser, browser.columnContainer, top, roi))
                    }
                }

            }

        }

    }

}

export default ROIManager
