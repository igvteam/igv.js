import Picker from '../node_modules/vanilla-picker/dist/vanilla-picker.mjs'
import {DOMUtils, StringUtils, Icon} from '../node_modules/igv-utils/src/index.js'
import {appleCrayonRGBA} from './util/colorPalletes.js'
import ROI, { screenCoordinates } from './roi.js'


class ROIManager {
    constructor(browser, top, column, roi) {

        this.browser = browser
        this.top = top
        this.column = column

        this.roi = roi || []
        this.monitorBrowserEvents()
    }

    monitorBrowserEvents() {
        this.browser.on('locuschange',       () => paint(this.browser, this.top, this.column, this.roi))
        this.browser.on('trackremoved',      () => paint(this.browser, this.top, this.column, this.roi))
        this.browser.on('trackorderchanged', () => paint(this.browser, this.top, this.column, this.roi))
    }

    addROI(region) {

        const config =
            {
                name: 'unnamed',
                roiSource: { getFeatures :(chr, start, end) => [ region ] },
                color: appleCrayonRGBA('sea_foam', 0.75)
            }

        // this.interactiveROI.push(region)
        this.roi.push(new ROI(config, this.browser.genome))

        paint(this.browser, this.top, this.column, this.roi)
    }

}

async function paint(browser, top, column, roiList) {

    clear(column)

    const { chr, start:startBP, end:endBP, bpPerPixel:bpp } = browser.referenceFrameList[ 0 ]

    for (let roi of roiList) {

        const regions = await roi.getFeatures(chr, startBP, endBP)

        if (regions && regions.length > 0) {

            for (let { start:regionStartBP, end:regionEndBP } of regions) {

                if (regionEndBP < startBP) {
                    continue
                }

                if (regionStartBP > endBP) {
                    break
                }

                column.appendChild(createGlobalROIElement(top, roi, regionStartBP, regionEndBP, startBP, bpp))
            }
        }

    }

}

function clear(column) {

    const regionElements = column.querySelectorAll('.igv-roi')
    for (let i = 0; i < regionElements.length; i++) {
        regionElements[ i ].remove()
    }
}

function createGlobalROIElement(top, roi, regionStartBP, regionEndBP, startBP, bpp) {

    const { x:regionX, width:regionWidth } = screenCoordinates(regionStartBP, regionEndBP, startBP, bpp)

    // ROI surface
    const element = DOMUtils.div({class: 'igv-roi'})
    element.style.top = `${top}px`
    element.style.left = `${regionX}px`
    element.style.width = `${regionWidth}px`
    element.style.backgroundColor = roi.color

    // settings presentation button
    const button = DOMUtils.div()
    button.style.transform = `translateX(${ Math.floor(regionWidth/2)}px)`
    button.appendChild(Icon.createIcon('cog'))

    // Color/Alpha Picker
    const pickerConfig =
        {
            parent: button,
            popup: 'right',
            editorFormat: 'rgb',
            color: element.style.backgroundColor,
            onChange: ({rgbaString}) => {
                roi.color = element.style.backgroundColor = rgbaString
            }
        }

    new Picker(pickerConfig)

    element.appendChild(button)

    return element
}

export default ROIManager
