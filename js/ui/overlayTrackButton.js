import NavbarButton from "./navbarButton.js"
import { overlayTrackImage, overlayTrackImageHover } from "./navbarIcons/overlayTrack.js"
import { buttonLabel } from "./navbarIcons/buttonLabel.js"
import {trackOverlayClickHandler} from "./menuUtils.js"

let ENABLE_OVERLAY_TRACKS = false

class OverlayTrackButton extends NavbarButton {
    constructor(browser, parent) {

        super(browser, parent, 'Overlay Tracks', buttonLabel, overlayTrackImage, overlayTrackImageHover, false/*ENABLE_OVERLAY_TRACKS*/)

        this.button.addEventListener('mouseenter', event => {
            // if (false === ENABLE_OVERLAY_TRACKS) {
                this.setState(true)
            // }
        })

        this.button.addEventListener('mouseleave', event => {
            // if (false === ENABLE_OVERLAY_TRACKS) {
                this.setState(false)
            // }
        })

        const mouseClickHandler = () => {
            this.setVisibility(false)
            trackOverlayClickHandler.call(this)
        }

        this.boundMouseClickHandler = mouseClickHandler.bind(this)

        this.button.addEventListener('click', this.boundMouseClickHandler)

        this.setVisibility(true)

    }
}

export default OverlayTrackButton
