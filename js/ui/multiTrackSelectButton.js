import NavbarButton from "./navbarButton.js"
import {setDragHandleSelectionState} from "../trackView.js"
import {multiTrackSelectExclusionTypes} from './menuUtils.js'
import {multiSelectImage, multiSelectImageHover} from "./navbarIcons/multiSelect.js"

let ENABLE_MULTI_TRACK_SELECTION = false

class MultiTrackSelectButton extends NavbarButton {
    constructor(browser, parent) {

        super(browser, parent, 'Select Tracks', multiSelectImage, multiSelectImageHover, ENABLE_MULTI_TRACK_SELECTION)

        this.button.addEventListener('mouseenter', event => {
            if (false === ENABLE_MULTI_TRACK_SELECTION) {
                this.setState(true)
            }
        })

        this.button.addEventListener('mouseleave', event => {
            if (false === ENABLE_MULTI_TRACK_SELECTION) {
                this.setState(false)
            }
        })

        const mouseClickHandler = () => {

            ENABLE_MULTI_TRACK_SELECTION = !ENABLE_MULTI_TRACK_SELECTION

            for (const trackView of this.browser.trackViews) {

                if (false === multiTrackSelectExclusionTypes.has(trackView.track.type)) {

                    setMultiTrackSelectionState(trackView, trackView.axis, ENABLE_MULTI_TRACK_SELECTION)

                } // if (false === multiTrackSelectExclusionTypes.has(trackView.track.type))

            } // for (trackViews)

        }

        this.boundMouseClickHandler = mouseClickHandler.bind(this)

        this.button.addEventListener('click', this.boundMouseClickHandler)

        this.setVisibility(true)

    }
}

function setMultiTrackSelectionState(trackView, axis, selectionStatus) {

    const container = axis.querySelector('div')

    if (true === selectionStatus) {
        // axis.style.backgroundColor = `rgba(0,0,0, ${1/16})`
        container.style.display = 'grid'
    } else {

        const trackSelectInput =  container.querySelector('[name=track-select]')
        trackSelectInput.checked = false

        // axis.style.backgroundColor = 'rgb(255,255,255)'
        container.style.display = 'none'

        if (trackView.dragHandle) {
            setDragHandleSelectionState(trackView, trackView.dragHandle, false)
        }


    }


}

export { ENABLE_MULTI_TRACK_SELECTION, setMultiTrackSelectionState }
export default MultiTrackSelectButton
