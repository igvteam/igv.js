import * as UIUtils from "../utils/ui-utils.js"
import * as DOMUtils from "../utils/dom-utils.js"
import makeDraggable from "../utils/draggable.js"
import DOMPurify from "../../../node_modules/dompurify/dist/purify.es.mjs"

class InputDialog {

    constructor(parent) {

        this.parent = parent

        // dialog container
        this.container = DOMUtils.div({class: 'igv-ui-generic-dialog-container'})
        parent.appendChild(this.container)

        // dialog header
        const header = DOMUtils.div({class: 'igv-ui-generic-dialog-header'})
        this.container.appendChild(header)

        // dialog label
        this.label = DOMUtils.div({class: 'igv-ui-generic-dialog-one-liner'})
        this.container.appendChild(this.label)
        this.label.textContent = 'Unlabeled'

        // input container
        this.input_container = DOMUtils.div({class: 'igv-ui-generic-dialog-input'})
        this.container.appendChild(this.input_container)

        // input element.  DO NOT ACCESS THIS OUTSIDE OF THIS CLASS
        this._input = document.createElement("input")

        if (InputDialog.FORM_EMBED_MODE) {
            InputDialog.captureKeyInput(this._input)
        }

        this.input_container.appendChild(this._input)


        // ok | cancel
        const buttons = DOMUtils.div({class: 'igv-ui-generic-dialog-ok-cancel'})
        this.container.appendChild(buttons)

        // ok

        this.ok = DOMUtils.div()
        buttons.appendChild(this.ok)
        this.ok.textContent = 'OK'

        // cancel
        this.cancel = DOMUtils.div()
        buttons.appendChild(this.cancel)
        this.cancel.textContent = 'Cancel'

        DOMUtils.hide(this.container)

        this._input.addEventListener('keyup', e => {
            if ('Enter' === e.code) {
                if (typeof this.callback === 'function') {
                    this.callback(this._input.value)
                    this.callback = undefined
                }
                this._input.value = undefined
                DOMUtils.hide(this.container)
            }
            e.stopImmediatePropagation()   // Prevent key event to cause track keyboard navigation ("next feature")
        })

        this.ok.addEventListener('click', () => {
            if (typeof this.callback === 'function') {
                this.callback(this._input.value)
                this.callback = undefined
            }
            this._input.value = undefined
            DOMUtils.hide(this.container)
        })

        const cancel = () => {
            this._input.value = ''
            DOMUtils.hide(this.container)
        }

        this.cancel.addEventListener('click', cancel)

        UIUtils.attachDialogCloseHandlerWithParent(header, cancel)
        makeDraggable(this.container, header)

    }

    get value() {
        return DOMPurify.sanitize(this._input.value)
    }


    present(options, e) {
        this.label.textContent = options.label
        this._input.value = options.value
        this.callback = options.callback || options.click

        this.container.style.display = ''

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

    /**
     * Capture key input in embedded form mode to prevent parent form handling.  This is a workaround for pages
     * that embed igv.js in a form element which has key listeners.  Without this the parent form will handle key events,
     * even if stopPropagation() is called.
     *
     * @param input
     */
    static captureKeyInput(input) {

        input.addEventListener('mousedown', (e) => {
            input.focus() // Explicitly set focus on the input element
        })

        // Prevent key event propagation to parent form
        input.addEventListener('keydown', e => {

            // Prevent parent listeners from handling this event.
            e.preventDefault()
            e.stopPropagation()

            const start = input.selectionStart
            const end = input.selectionEnd

            if (e.key.length === 1) {
                // Handle printable characters
                const value = input.value
                input.value = value.slice(0, start) + e.key + value.slice(end)
                input.selectionStart = input.selectionEnd = start + 1
            } else if (e.key === 'Backspace') {
                if (start === end && start > 0) {
                    // No selection, delete character before cursor
                    input.value = input.value.slice(0, start - 1) + input.value.slice(start)
                    input.selectionStart = input.selectionEnd = start - 1
                } else if (start < end) {
                    // Delete selection
                    input.value = input.value.slice(0, start) + input.value.slice(end)
                    input.selectionStart = input.selectionEnd = start
                }
            } else if (e.key === 'Delete') {
                if (start === end && start < input.value.length) {
                    // No selection, delete character after cursor
                    input.value = input.value.slice(0, start) + input.value.slice(start + 1)
                    input.selectionStart = input.selectionEnd = start
                } else if (start < end) {
                    // Delete selection
                    input.value = input.value.slice(0, start) + input.value.slice(end)
                    input.selectionStart = input.selectionEnd = start
                }
            } else if (e.key === 'ArrowLeft') {
                input.selectionStart = input.selectionEnd = Math.max(0, start - 1)
            } else if (e.key === 'ArrowRight') {
                input.selectionStart = input.selectionEnd = Math.min(input.value.length, start + 1)
            }

        }, true) // Use the capturing phase.
    }
}


export default InputDialog
