import NavbarButton from "./navbarButton.js"
import {multiTrackSelectExclusionTypes, setDragHandleSelectionState} from "../trackView.js"

let ENABLE_MULTI_TRACK_SELECTION = false

class MultiTrackSelectButton extends NavbarButton {
    constructor(browser, parent) {

        super(browser, parent, 'Enable Multi Track Selection', 'multi-select', ENABLE_MULTI_TRACK_SELECTION)

        this.button.addEventListener('mouseenter', () => {
            if (false === ENABLE_MULTI_TRACK_SELECTION) {
                this.setState(true)
            }
        })

        this.button.addEventListener('mouseleave', () => {
            if (false === ENABLE_MULTI_TRACK_SELECTION) {
                this.setState(false)
            }
        })

        const mouseClickHandler = () => {

            ENABLE_MULTI_TRACK_SELECTION = !ENABLE_MULTI_TRACK_SELECTION

            for (const trackView of this.browser.trackViews) {

                if (false === multiTrackSelectExclusionTypes.has(trackView.track.type)) {

                    const container = trackView.axis.querySelector('div')

                    if (true === ENABLE_MULTI_TRACK_SELECTION) {
                        container.style.display = 'block'
                    } else {
                        const trackSelectInput =  container.querySelector('[name=track-select]')
                        trackSelectInput.checked = false
                        setDragHandleSelectionState(trackView, trackView.dragHandle, false)
                        container.style.display = 'none'
                    }

                } // if (false === multiTrackSelectExclusionTypes.has(trackView.track.type))

            } // for (trackViews)
        }

        this.boundMouseClickHandler = mouseClickHandler.bind(this)

        this.button.addEventListener('click', this.boundMouseClickHandler)

        this.setVisibility(true)

    }
}

export default MultiTrackSelectButton
