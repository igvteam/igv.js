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
            this.setMultiTrackSelection(!this.enableMultiTrackSelection)
        }

        this.boundMouseClickHandler = mouseClickHandler.bind(this)

        this.button.addEventListener('click', this.boundMouseClickHandler)

        this.setVisibility(true)

    }

    setMultiTrackSelection(enableMultiTrackSelection) {
        this.enableMultiTrackSelection = enableMultiTrackSelection
        for (const trackView of this.browser.trackViews) {
            if (false === multiTrackSelectExclusionTypes.has(trackView.track.type)) {
                trackView.setTrackSelectionState(trackView.axis, this.enableMultiTrackSelection)

                // If closing the selection boxes set track selected property to false
                if (!this.enableMultiTrackSelection) {
                    trackView.track.selected = false
                }
            }
        }
        this.setState(this.enableMultiTrackSelection)

        // If enableMultiTrackSelection is false hide Overlay button
        if (false === this.enableMultiTrackSelection) {
            this.browser.overlayTrackButton.setVisibility(false)
        }
    }
}

export default MultiTrackSelectButton
