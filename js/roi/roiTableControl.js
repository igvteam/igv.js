import NavbarButton from "../ui/navbarButton.js"
import {roiImage, roiImageHover} from "../ui/navbarIcons/roi.js"
import { buttonLabel } from "../ui/navbarIcons/buttonLabel.js"

class ROITableControl extends NavbarButton {

    constructor(parent, browser)  {

        super(parent, browser, ['ROI', 'Regions of Interest Table'], buttonLabel, roiImage, roiImageHover, false)

        this.button.addEventListener('mouseenter', () => {
            if (false === browser.doShowROITable) {
                this.setState(true)
            }
        })

        this.button.addEventListener('mouseleave', () => {
            if (false === browser.doShowROITable) {
                this.setState(false)
            }
        })

        this.button.addEventListener('click', () => this.buttonHandler(!browser.doShowROITable))

        this.setVisibility(false)  // Hide initially, it will be un-hidden if ROIs are loaded

    }

    buttonHandler(status) {
        this.setState(status)
        this.browser.setROITableVisibility(status)
    }
}


export default ROITableControl
