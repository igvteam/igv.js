import makeDraggable from "../utils/draggable.js"
import {attachDialogCloseHandlerWithParent} from "../utils/ui-utils.js"
import InputDialog from "./inputDialog.js"

class DataRangeDialog {

    constructor(browser, parent) {
        this.browser = browser

        // Create dialog container
        this.container = document.createElement('div')
        this.container.className = 'igv-generic-dialog-container'
        parent.appendChild(this.container)

        // Create dialog header
        const header = document.createElement('div')
        header.className = 'igv-generic-dialog-header'
        this.container.appendChild(header)

        attachDialogCloseHandlerWithParent(header, () => {
            this.minimumInput.value = ''
            this.maximumInput.value = ''
            this.hide()
        })

        // Create minimum input
        this.minimum = document.createElement('div')
        this.minimum.className = 'igv-generic-dialog-label-input'
        this.container.appendChild(this.minimum)

        const minDiv = document.createElement('div')
        minDiv.textContent = 'Minimum'
        this.minimum.appendChild(minDiv)

        this.minimumInput = document.createElement('input')
        if (InputDialog.FORM_EMBED_MODE) {
            InputDialog.captureKeyInput(this.minimumInput)
        }
        this.minimum.appendChild(this.minimumInput)

        // Create maximum input
        this.maximum = document.createElement('div')
        this.maximum.className = 'igv-generic-dialog-label-input'
        this.container.appendChild(this.maximum)

        const maxDiv = document.createElement('div')
        maxDiv.textContent = 'Maximum'
        this.maximum.appendChild(maxDiv)

        this.maximumInput = document.createElement('input')
        if (InputDialog.FORM_EMBED_MODE) {
            InputDialog.captureKeyInput(this.maximumInput)
        }
        this.maximum.appendChild(this.maximumInput)

        // Create buttons container
        const buttons = document.createElement('div')
        buttons.className = 'igv-generic-dialog-ok-cancel'
        this.container.appendChild(buttons)

        // Create OK button
        this.okButton = document.createElement('div')
        this.okButton.textContent = 'OK'
        buttons.appendChild(this.okButton)

        // Create Cancel button
        this.cancelButton = document.createElement('div')
        this.cancelButton.textContent = 'Cancel'
        buttons.appendChild(this.cancelButton)

        // Attach cancel button handler
        this.cancelButton.addEventListener('click', () => {
            this.minimumInput.value = ''
            this.maximumInput.value = ''
            this.hide()
        })

        // Make the container draggable
        makeDraggable(this.container, header)

        // Initially hide the dialog
        this.container.style.display = 'none'
    }

    configure(trackViewOrTrackViewList) {
        let dataRange

        // Determine the data range
        if (Array.isArray(trackViewOrTrackViewList)) {
            dataRange = {min: Number.MAX_SAFE_INTEGER, max: -Number.MAX_SAFE_INTEGER}
            for (const trackView of trackViewOrTrackViewList) {
                if (trackView.track.dataRange) {
                    dataRange.min = Math.min(trackView.track.dataRange.min, dataRange.min)
                    dataRange.max = Math.max(trackView.track.dataRange.max, dataRange.max)
                }
            }
        } else {
            dataRange = trackViewOrTrackViewList.track.dataRange
        }

        // Populate input fields with data range
        if (dataRange) {
            this.minimumInput.value = dataRange.min
            this.maximumInput.value = dataRange.max
        }

        this.minimumInput.onkeyup = null
        this.minimumInput.onkeyup = e => {
            if (e.keyCode === 13) { // Enter key
                this.processResults(trackViewOrTrackViewList)
            }
            e.stopImmediatePropagation()
        }

        this.maximumInput.onkeyup = null
        this.maximumInput.onkeyup = e => {
            if (e.keyCode === 13) { // Enter key
                e.stopImmediatePropagation()
                this.processResults(trackViewOrTrackViewList)
            }
        }

        this.okButton.onclick = null
        this.okButton.onclick = () => {
            this.processResults(trackViewOrTrackViewList)
        }
    }

    processResults(trackViewOrTrackViewList) {
        const minValue = this.minimumInput.value.trim()
        const maxValue = this.maximumInput.value.trim()

        if (minValue !== '' && maxValue !== '') {
            const min = Number(minValue)
            const max = Number(maxValue)

            if (isNaN(min) || isNaN(max)) {
                this.browser.alert.present(new Error('Must input numeric values'), undefined)
            } else {
                const list = Array.isArray(trackViewOrTrackViewList)
                    ? trackViewOrTrackViewList
                    : [trackViewOrTrackViewList]

                for (const trackView of list) {
                    trackView.track.setDataRange({min, max})
                }
            }

            // Clear the input fields
            this.minimumInput.value = ''
            this.maximumInput.value = ''
        }

        this.hide()
    }

    hide() {
        this.container.style.top = '20%'
        this.container.style.left = '75%'
        this.container.style.display = 'none'
    }

    present(e) {

        // Make the dialog visible to measure its dimensions
        this.container.style.display = 'flex'

        const {clientX, clientY} = e
        const {offsetWidth: dialogWidth, offsetHeight: dialogHeight} = this.container
        const {innerHeight: windowHeight} = window
        const windowWidth = document.documentElement.clientWidth

        const padding = 10

        // Calculate initial centered position
        let left = clientX - (dialogWidth / 2)
        let top = clientY - (dialogHeight / 2)

        // Clamp horizontal position to viewport
        const minLeft = padding
        const maxLeft = windowWidth - dialogWidth - padding
        left = Math.max(minLeft, Math.min(left, maxLeft))

        // Clamp vertical position to viewport
        const minTop = padding
        const maxTop = windowHeight - dialogHeight - padding
        top = Math.max(minTop, Math.min(top, maxTop))

        this.container.style.left = `${left}px`
        this.container.style.top = `${top}px`
    }
}

export default DataRangeDialog
