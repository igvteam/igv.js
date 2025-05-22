import * as UIUtils from "../utils/ui-utils.js"
import * as DOMUtils from "../utils/dom-utils.js"
import makeDraggable from "../utils/draggable.js"
import DOMPurify from "../../../node_modules/dompurify/dist/purify.es.mjs"

class ROISEGFilterDialog {

    constructor(parent) {

        this.parent = parent

        // dialog container
        this.container = DOMUtils.div({class: 'igv-roi-seg-filter-dialog'})
        parent.appendChild(this.container)

        // dialog header
        const header = DOMUtils.div({class: 'igv-roi-seg-filter-dialog__header'})
        this.container.appendChild(header)

        // dialog label
        this.label = DOMUtils.div({class: 'igv-roi-seg-filter-dialog__one-liner'})
        this.container.appendChild(this.label)
        this.label.textContent = 'Unlabeled'

        // input container
        this.input_container = DOMUtils.div({class: 'igv-roi-seg-filter-dialog__input'})
        this.container.appendChild(this.input_container)

        // input element.
        this._input = document.createElement("input")
        this.input_container.appendChild(this._input)

        // radio group container
        this.radio_container = DOMUtils.div({class: 'igv-roi-seg-filter-dialog__radio-group'})
        this.container.appendChild(this.radio_container)

        // Less Than radio button
        const ltContainer = DOMUtils.div({class: 'op'})
        this.radio_container.appendChild(ltContainer)
        const ltRadio = document.createElement("input")
        ltRadio.type = "radio"
        ltRadio.name = "op"
        ltRadio.value = "<"
        ltRadio.checked = true
        ltContainer.appendChild(ltRadio)
        const ltLabel = document.createElement("label")
        ltLabel.textContent = "Less than"
        ltContainer.appendChild(ltLabel)

        // Greater Than radio button
        const gtContainer = DOMUtils.div({class: 'op'})
        this.radio_container.appendChild(gtContainer)
        const gtRadio = document.createElement("input")
        gtRadio.type = "radio"
        gtRadio.name = "op"
        gtRadio.value = ">"
        gtContainer.appendChild(gtRadio)
        const gtLabel = document.createElement("label")
        gtLabel.textContent = "Greater than"
        gtContainer.appendChild(gtLabel)

        // ok | cancel
        const buttons = DOMUtils.div({class: 'igv-roi-seg-filter-dialog__ok-cancel'})
        this.container.appendChild(buttons)

        // ok
        this.ok = DOMUtils.div()
        buttons.appendChild(this.ok)
        this.ok.textContent = 'OK'

        // cancel
        this.cancel = DOMUtils.div()
        buttons.appendChild(this.cancel)
        this.cancel.textContent = 'Cancel'

        this._input.addEventListener('keyup', e => {
            if ('Enter' === e.code) {
                if (typeof this.callback === 'function') {
                    const {threshold, op} = this.value
                    this.callback(threshold, op)
                    this.callback = undefined
                }
                this._input.value = undefined
                DOMUtils.hide(this.container)
            }
            e.stopImmediatePropagation()   // Prevent key event to cause track keyboard navigation ("next feature")
        })

        this.ok.addEventListener('click', () => {
            if (typeof this.callback === 'function') {
                const {threshold, op} = this.value
                this.callback(threshold, op)
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

        DOMUtils.hide(this.container)

    }

    get value() {
        return {
            threshold: DOMPurify.sanitize(this._input.value),
            op: this.#getSelectedOp()
        }
    }

    #getSelectedOp() {
        const selectedRadio = this.radio_container.querySelector('input[name="op"]:checked')
        return selectedRadio ? selectedRadio.value : "<"  // Default to < if somehow no radio is selected
    }

    present(options, e) {
        this.label.textContent = options.label
        this._input.value = options.value
        this.callback = options.callback || options.click

        this.container.style.display = ''

        // Get click coordinates
        const clickX = e.clientX
        const clickY = e.clientY

        // Get dialog dimensions
        const dialogWidth = this.container.offsetWidth
        const dialogHeight = this.container.offsetHeight

        // Calculate available space
        const windowWidth = window.innerWidth
        const windowHeight = window.innerHeight

        // Calculate position to keep dialog on screen
        let left = clickX
        let top = clickY

        // Adjust horizontal position if dialog would go off screen
        if (left + dialogWidth > windowWidth) {
            left = windowWidth - dialogWidth - 10 // 10px padding from edge
        }

        // Adjust vertical position if dialog would go off screen
        if (top + dialogHeight > windowHeight) {
            top = windowHeight - dialogHeight - 10 // 10px padding from edge
        }

        // Ensure minimum distance from edges
        left = Math.max(10, left)
        top = Math.max(10, top)

        // Apply positions
        this.container.style.left = `${left}px`
        this.container.style.top = `${top}px`
    }
}

export default ROISEGFilterDialog
