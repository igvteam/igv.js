import NavbarButton from "./navbarButton.js"
import {multiTrackSelectExclusionTypes} from './menuUtils.js'
import {multiSelectImage, multiSelectImageHover} from "./navbarIcons/multiSelect.js"
import { buttonLabel } from "./navbarIcons/buttonLabel.js"

let ENABLE_MULTI_TRACK_SELECTION = false

class MultiTrackSelectButton extends NavbarButton {
    constructor(browser, parent) {

        super(browser, parent, 'Select Tracks', buttonLabel, multiSelectImage, multiSelectImageHover, ENABLE_MULTI_TRACK_SELECTION)

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
                }
            }
            this.setState(ENABLE_MULTI_TRACK_SELECTION)

            // If ENABLE_MULTI_TRACK_SELECTION is false hide Overlay button
            if (false === ENABLE_MULTI_TRACK_SELECTION) {
                this.browser.overlayTrackButton.setVisibility(false)
            }
        }

        this.boundMouseClickHandler = mouseClickHandler.bind(this)

        this.button.addEventListener('click', this.boundMouseClickHandler)

        this.setVisibility(true)

    }
}

function setMultiTrackSelectionState(trackView, axis, doEnableMultiSelection) {

    const container = axis.querySelector('div')

    if (true === doEnableMultiSelection) {
        container.style.display = 'grid'
    } else {

        trackView.track.isMultiSelection = false

        // if (trackView.track.autoscaleGroup) {
        //     trackView.track.autoscaleGroup = undefined
        // }

        const trackSelectInput =  container.querySelector('[name=track-select]')
        trackSelectInput.checked = false

        if (trackView.dragHandle) {
            setDragHandleSelectionState(trackView, trackView.dragHandle, false)
        }

        container.style.display = 'none'
    }


}

function setDragHandleSelectionState(trackView, dragHandle, isSelected) {

    if (isSelected) {
        dragHandle.classList.remove('igv-track-drag-handle-color')
        dragHandle.classList.remove('igv-track-drag-handle-hover-color')
        dragHandle.classList.add('igv-track-drag-handle-selected-color')
    } else {
        dragHandle.classList.remove('igv-track-drag-handle-hover-color')
        dragHandle.classList.remove('igv-track-drag-handle-selected-color')
        dragHandle.classList.add('igv-track-drag-handle-color')
    }

}

export { ENABLE_MULTI_TRACK_SELECTION, setMultiTrackSelectionState, setDragHandleSelectionState }
export default MultiTrackSelectButton
