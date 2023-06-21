import {DOMUtils} from '../../node_modules/igv-ui/dist/igv-ui.js'
import GenomeUtils from "../genome/genome.js"

class CenterLineButton {

    constructor(browser, parent) {

        this.browser = browser

        this.button = DOMUtils.div({class: 'igv-navbar-icon-button'})
        this.button.id = 'igv-centerline-button'
        parent.appendChild(this.button)

        this.button.addEventListener('mouseenter', () => {
            if (false === browser.doShowCenterLine) {
                this.setButtonState(true)
            }
        })

        this.button.addEventListener('mouseleave', () => {
            if (false === browser.doShowCenterLine) {
                this.setButtonState(false)
            }
        })

        const mouseClickHandler = () => {

            if (false === browser.doShowCenterLine && GenomeUtils.isWholeGenomeView(browser.referenceFrameList[0].chr)) {
                return
            }

            browser.doShowCenterLine = !browser.doShowCenterLine
            browser.setCenterLineVisibility(browser.doShowCenterLine)
            this.setButtonState(browser.doShowCenterLine)
        }

        this.boundMouseClickHandler = mouseClickHandler.bind(this)

        this.button.addEventListener('click', this.boundMouseClickHandler)

        if (browser.config.showCenterGuideButton) {
            this.show()
        } else {
            this.hide()
        }

        this.setButtonState(browser.doShowCenterLine)

    }

    setButtonState(doShowCenterLine) {
        this.button.style.backgroundImage = true === doShowCenterLine ? "url('/images/centerline-hover.svg')" : "url('/images/centerline.svg')"
    }

    show() {
        this.button.style.display = 'block'
    }

    hide() {
        this.button.style.display = 'none'
    }
}

export default CenterLineButton
