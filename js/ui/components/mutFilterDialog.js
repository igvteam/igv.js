import * as UIUtils from "../utils/ui-utils.js"
import * as DOMUtils from "../utils/dom-utils.js"
import makeDraggable from "../utils/draggable.js"

class MUTFilterDialog {

    constructor(parent, mutationTypes) {

        this.parent = parent


        // dialog container
        this.container = DOMUtils.div({class: 'igv-roi-mut-filter-dialog'})
        parent.appendChild(this.container)

        // dialog header
        const header = DOMUtils.div({class: 'igv-roi-mut-filter-dialog__header'})
        this.container.appendChild(header)

        // radio group container
        this.radio_container = DOMUtils.div({class: 'igv-roi-mut-filter-dialog__radio-group'})
        this.container.appendChild(this.radio_container)

        // Has radio button
        const hasContainer = DOMUtils.div({class: 'op'})
        this.radio_container.appendChild(hasContainer)

        const hasRadio = document.createElement("input")
        hasContainer.appendChild(hasRadio)

        hasRadio.type = "radio"
        hasRadio.name = "op"
        hasRadio.value = "HAS"
        hasRadio.id = "has-radio"

        const hasLabel = document.createElement("label")
        hasContainer.appendChild(hasLabel)

        hasLabel.textContent = "Has"
        hasLabel.htmlFor = "has-radio"

        // Does Not Have radio button
        const notHasContainer = DOMUtils.div({class: 'op'})
        this.radio_container.appendChild(notHasContainer)

        const notHasRadio = document.createElement("input")
        notHasContainer.appendChild(notHasRadio)

        notHasRadio.type = "radio"
        notHasRadio.name = "op"
        notHasRadio.value = "NOT_HAS"
        notHasRadio.id = "not-has-radio"

        const notHasLabel = document.createElement("label")
        notHasContainer.appendChild(notHasLabel)

        notHasLabel.textContent = "Does not have"
        notHasLabel.htmlFor = "not-has-radio"

        // select container
        this.select_container = DOMUtils.div({class: 'igv-roi-mut-filter-dialog__select'})
        this.container.appendChild(this.select_container)

        // select element
        this._select = document.createElement("select")
        this.select_container.appendChild(this._select)
        this._select.multiple = true
        this._select.size = 8

        // Add options based on mutation types
        for (const type of mutationTypes) {
            const option = document.createElement("option")
            option.value = type
            option.textContent = type
            this._select.appendChild(option)
        }

        // ok | cancel
        const buttons = DOMUtils.div({class: 'igv-roi-mut-filter-dialog__ok-cancel'})
        this.container.appendChild(buttons)

        // ok
        this.ok = DOMUtils.div()
        buttons.appendChild(this.ok)
        this.ok.textContent = 'OK'

        // cancel
        this.cancel = DOMUtils.div()
        buttons.appendChild(this.cancel)
        this.cancel.textContent = 'Cancel'

        // this._select.addEventListener('change', e => {
        //     if (typeof this.callback === 'function') {
        //         const {mutationType, op} = this.value
        //         this.callback(mutationType, op)
        //         this.callback = undefined
        //     }
        //     this._select.value = undefined
        //     DOMUtils.hide(this.container)
        //     e.stopImmediatePropagation()
        // })

        this.ok.addEventListener('click', () => {
            if (typeof this.callback === 'function') {
                const { selected, op} = this.value
                this.callback(selected, op)
                this.callback = undefined
            }
            this._select.value = undefined
            DOMUtils.hide(this.container)
        })

        const cancel = () => {
            this._select.value = ''
            DOMUtils.hide(this.container)
        }

        this.cancel.addEventListener('click', cancel)

        UIUtils.attachDialogCloseHandlerWithParent(header, cancel)
        makeDraggable(this.container, header)

        DOMUtils.hide(this.container)

    }

    get value() {
        const selected = Array.from(this._select.selectedOptions).map(opt => opt.value)
        return {
            selected,
            op: this.#getSelectedOp()
        }
    }

    #getSelectedOp() {
        const selectedRadio = this.radio_container.querySelector('input[name="op"]:checked')
        return selectedRadio ? selectedRadio.value : "HAS"  // Default to HAS if somehow no radio is selected
    }

    present(options, e) {

        // Set the value and ensure it's selected
        // if (options.value) {
        //     this._select.value = options.value
        //     // Force the select to update its display
        //     this._select.selectedIndex = Array.from(this._select.options).findIndex(option => option.value === options.value)
        // } else {
        //     this._select.selectedIndex = 0  // Select first option if no value provided
        // }

        this.callback = options.callback || options.click


        // Explicitly set the radio button state
        const hasRadio = this.radio_container.querySelector('#has-radio')
        const notHasRadio = this.radio_container.querySelector('#not-has-radio')
        hasRadio.checked = true
        notHasRadio.checked = false


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

export default MUTFilterDialog
