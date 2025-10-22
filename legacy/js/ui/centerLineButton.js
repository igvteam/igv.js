import NavbarButton from "./navbarButton.js"
import {centerlineImage, centerlineImageHover} from "./navbarIcons/centerline.js"
import { buttonLabel } from "./navbarIcons/buttonLabel.js"

class CenterLineButton extends NavbarButton {

    constructor(parent, browser) {

        super(parent, browser, 'Center Line', buttonLabel, centerlineImage, centerlineImageHover, browser.config.showCenterGuide)

        this.button.addEventListener('mouseenter', () => {
            if (false === browser.doShowCenterLine) {
                this.setState(true)
            }
        })

        this.button.addEventListener('mouseleave', () => {
            if (false === browser.doShowCenterLine) {
                this.setState(false)
            }
        })

        const mouseClickHandler = () => {

            browser.doShowCenterLine = !browser.doShowCenterLine
            browser.setCenterLineVisibility(browser.doShowCenterLine)
            this.setState(browser.doShowCenterLine)
        }

        this.boundMouseClickHandler = mouseClickHandler.bind(this)

        this.button.addEventListener('click', this.boundMouseClickHandler)

        this.setVisibility(browser.config.showCenterGuideButton)

    }

}

export default CenterLineButton
