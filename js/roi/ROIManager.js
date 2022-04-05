import Picker from '../../node_modules/vanilla-picker/dist/vanilla-picker.mjs'
import {DOMUtils} from "../../node_modules/igv-utils/src/index.js"
import ROISet, {ROI_DEFAULT_COLOR, ROI_HEADER_DEFAULT_COLOR, screenCoordinates} from './ROISet.js'
import ROIMenu from "./ROIMenu.js"

class ROIManager {
    constructor(browser, roiMenu, roiTable, top, roiElements) {

        this.browser = browser
        this.roiMenu = roiMenu
        this.roiTable = roiTable
        this.top = top
        this.roiElements = roiElements || []

        // browser.on('locuschange',       () => this.paint(browser, top, this.roiElements))
        // browser.on('trackremoved',      () => this.paint(browser, top, this.roiElements))
        // browser.on('trackorderchanged', () => this.paint(browser, top, this.roiElements))
    }

    async initialize() {

        const promises = this.roiElements.map(roiElement => {

            const config =
                {
                    browser: this.browser,
                    pixelTop: this.top,
                    roiElement
                };

            return this.drawROIElement(config)

        })

        if (promises.length > 0) {
            await Promise.all(promises)
        }

    }

    async trivialRejectFeatures() {

        const reject = []
        const accept = []
        for (let roiElement of this.roiElements) {
            for (let { chr, start:startBP, end:endBP, bpPerPixel:bpp } of this.browser.referenceFrameList) {
                const features = await roiElement.getFeatures(chr, startBP, endBP)
                if (features && features.length > 0) {
                    for (let { start:featureStartBP, end:featureEndBP } of features) {
                        if (featureStartBP < startBP || featureEndBP > endBP) {
                            continue
                        }
                    }
                }
            }
        }
    }

    addROIElement(region) {

        const roiElementConfig =
            {
                name: `roi-element-${ DOMUtils.guid() }`,
                featureSource:
                    {
                        getFeatures :(chr, start, end) => [ region ]
                    },
                color: ROI_HEADER_DEFAULT_COLOR
            };

        const roiElement = new ROISet(roiElementConfig, this.browser.genome)
        this.roiElements.push(roiElement)

        const config =
            {
                browser: this.browser,
                pixelTop: this.top,
                roiElement
            };

        this.drawROIElement(config)

    }

    async drawROIElement({ browser, pixelTop, roiElement}) {

        const columns = browser.columnContainer.querySelectorAll('.igv-column')

        for (let i = 0; i < columns.length; i++) {

            const { chr, start:startBP, end:endBP, bpPerPixel:bpp } = browser.referenceFrameList[ i ]

            const regions = await roiElement.getFeatures(chr, startBP, endBP)

            if (regions && regions.length > 0) {

                for (let { start:featureStartBP, end:featureEndBP } of regions) {

                    if (featureEndBP < startBP || featureStartBP > endBP) {
                        continue
                    }

                    featureStartBP = Math.max(featureStartBP, startBP)
                    featureEndBP = Math.min(featureEndBP, endBP)

                    const { x:pixelX, width:pixelWidth } = screenCoordinates(featureStartBP, featureEndBP, startBP, bpp)

                    const featureDOM = this.createFeatureDOM(browser, browser.columnContainer, pixelTop, pixelX, pixelWidth, roiElement.color)
                    columns[ i ].appendChild(featureDOM)
                }
            }

        }

    }

    createFeatureDOM(browser, columnContainer, pixelTop, pixelX, pixelWidth, color) {

        // ROISet container
        const container = DOMUtils.div({class: 'igv-roi'})

        container.style.top = `${pixelTop}px`
        container.style.left = `${pixelX}px`

        container.style.width = `${pixelWidth}px`

        container.style.backgroundColor = ROI_DEFAULT_COLOR

        // container.dataset.roiElement = roiElement.name

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

    async paint(browser, top, roiElements) {

        const columns = browser.columnContainer.querySelectorAll('.igv-column')

        for (let i = 0; i < columns.length; i++) {

            this.clearGlobalROIDOMElement(columns[i])

            const { chr, start:startBP, end:endBP, bpPerPixel:bpp } = browser.referenceFrameList[ i ]

            for (let roi of roiElements) {

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
