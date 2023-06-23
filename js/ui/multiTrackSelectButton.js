import {DOMUtils} from '../../node_modules/igv-ui/dist/igv-ui.js'
import {multiTrackSelectExclusionTypes, setDragHandleSelectionState} from "../trackView.js"

let ENABLE_MULTI_TRACK_SELECTION = false

class MultiTrackSelectButton {
    constructor(browser, parent) {

        this.browser = browser

        this.button = DOMUtils.div({class: 'igv-navbar-icon-button'})
        this.button.setAttribute('title', 'Enable Multi Track Selection')
        parent.appendChild(this.button)

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

        this.setState(ENABLE_MULTI_TRACK_SELECTION)

    }

    setState(doEnableMultiTrackSelect) {
        this.button.style.backgroundImage = true === doEnableMultiTrackSelect ? "url('/images/multi-select-hover.svg')" : "url('/images/multi-select.svg')"
    }

    setVisibility(doShowMultiTrackSelectButton) {
        if (true === doShowMultiTrackSelectButton) {
            this.show()
        } else {
            this.hide()
        }
    }

    show() {
        this.button.style.display = 'block'
    }

    hide() {
        this.button.style.display = 'none'
    }

}

export default MultiTrackSelectButton
