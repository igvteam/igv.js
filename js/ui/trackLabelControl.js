import NavbarButton from "./navbarButton.js"
import {trackLabelsImage, trackLabelsImageHover} from "./navbarIcons/trackLabels.js"
import { buttonLabel } from "./navbarIcons/buttonLabel.js"

class TrackLabelControl extends NavbarButton {

    constructor(parent, browser) {

        super(parent, browser, 'Track Labels', buttonLabel, trackLabelsImage, trackLabelsImageHover, browser.config.showTrackLabels)

        this.button.addEventListener('mouseenter', () => {
            if (false === browser.doShowTrackLabels) {
                this.setState(true)
            }
        })

        this.button.addEventListener('mouseleave', () => {
            if (false === browser.doShowTrackLabels) {
                this.setState(false)
            }
        })

        const mouseClickHandler = () => {
            browser.doShowTrackLabels = !browser.doShowTrackLabels
            browser.setTrackLabelVisibility(browser.doShowTrackLabels)
            this.setState(browser.doShowTrackLabels)
        }

        this.boundMouseClickHandler = mouseClickHandler.bind(this)

        this.button.addEventListener('click', this.boundMouseClickHandler)

        this.setVisibility(browser.config.showTrackLabelButton)

    }

}

export default TrackLabelControl
