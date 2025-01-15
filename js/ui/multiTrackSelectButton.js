import NavbarButton from "./navbarButton.js"
import {multiSelectImage, multiSelectImageHover} from "./navbarIcons/multiSelect.js"
import {buttonLabel} from "./navbarIcons/buttonLabel.js"

class MultiTrackSelectButton extends NavbarButton {

    constructor(parent, browser, navbar, enableMultiTrackSelection) {

        super(parent, browser, 'Select Tracks', buttonLabel, multiSelectImage, multiSelectImageHover, false)

        this.navbar = navbar
        this.enableMultiTrackSelection = false  // Initial state
        this.button.addEventListener('mouseenter', event => {
            if (false === enableMultiTrackSelection) {
                this.setState(true)
            }
        })

        this.button.addEventListener('mouseleave', event => {
            if (false === enableMultiTrackSelection) {
                this.setState(false)
            }
        })

        const mouseClickHandler = () => {
            // Toggle the selection state
            this.setMultiTrackSelection(!this.enableMultiTrackSelection)
        }

        this.boundMouseClickHandler = mouseClickHandler.bind(this)

        this.button.addEventListener('click', this.boundMouseClickHandler)

    }

    setMultiTrackSelection(enableMultiTrackSelection) {

        this.enableMultiTrackSelection = enableMultiTrackSelection
        this.setState(this.enableMultiTrackSelection)

        // If enableMultiTrackSelection is false hide the Overly button
        if (false === this.enableMultiTrackSelection) {
            this.navbar.overlayTrackButton.setVisibility(false)
        }

        for (const trackView of this.browser.trackViews) {
            trackView.enableTrackSelection(enableMultiTrackSelection)
        }

    }

}

export default MultiTrackSelectButton
