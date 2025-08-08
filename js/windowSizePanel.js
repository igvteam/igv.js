import * as DOMUtils from "./ui/utils/dom-utils.js"
import {prettyBasePairNumber} from './util/igvUtils.js'

class WindowSizePanel {
    constructor(parent, browser) {

        this.container = DOMUtils.div({class: 'igv-windowsize-panel-container'})
        parent.appendChild(this.container)

        browser.on('locuschange', (referenceFrameList) => {
            this.updatePanel(referenceFrameList)
        })

        this.browser = browser

    }

    show() {
        this.container.style.display = 'block'
    }

    hide() {
        this.container.style.display = 'none'
    }

    updatePanel(referenceFrameList) {
        const width = this.browser.calculateViewportWidth(this.browser.referenceFrameList.length)
        this.container.innerText = 1 === referenceFrameList.length ? prettyBasePairNumber(Math.round(width * referenceFrameList[0].bpPerPixel)) : ''
    }
}

export default WindowSizePanel
