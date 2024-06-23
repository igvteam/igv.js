import NavbarButton from "./navbarButton.js"
import {multiTrackSelectExclusionTypes} from './menuUtils.js'
import {multiSelectImage, multiSelectImageHover} from "./navbarIcons/multiSelect.js"
import {buttonLabel} from "./navbarIcons/buttonLabel.js"


class MultiTrackSelectButton extends NavbarButton {

    constructor(browser, parent, enableMultiTrackSelection) {

        super(browser, parent, 'Select Tracks', buttonLabel, multiSelectImage, multiSelectImageHover, enableMultiTrackSelection = false)
        this.enableMultiTrackSelection = enableMultiTrackSelection
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
            this.enableMultiTrackSelection = !this.enableMultiTrackSelection
            for (const trackView of this.browser.trackViews) {
                if (false === multiTrackSelectExclusionTypes.has(trackView.track.type)) {
                    trackView.setMultiTrackSelectionState(trackView.axis, this.enableMultiTrackSelection)
                }
            }
            this.setState(this.enableMultiTrackSelection)

            // If enableMultiTrackSelection is false hide Overlay button
            if (false === this.enableMultiTrackSelection) {
                this.browser.overlayTrackButton.setVisibility(false)
            }
        }

        this.boundMouseClickHandler = mouseClickHandler.bind(this)

        this.button.addEventListener('click', this.boundMouseClickHandler)

        this.setVisibility(true)

    }
}

export default MultiTrackSelectButton
