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

        // const { x, y, width, height } = this.container.getBoundingClientRect();
        // console.log(`InputDialog - x ${ x } y ${ y } width ${ width } height ${ height }`)

        // dialog header
        const header = DOMUtils.div({class: 'igv-ui-generic-dialog-header'})
        this.container.appendChild(header)

        // dialog label
        this.label = DOMUtils.div({class: 'igv-ui-generic-dialog-one-liner'})
        this.container.appendChild(this.label)
        this.label.text = 'Unlabeled'

        // input container
        this.input_container = DOMUtils.div({class: 'igv-ui-generic-dialog-input'})
        this.container.appendChild(this.input_container)

        // input element.  DO NOT ACCESS THIS OUTSIDE OF THIS CLASS
        this._input = document.createElement("input")
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
            if (13 === e.keyCode) {
                if (typeof this.callback === 'function') {
                    this.callback(this._input.value)
                    this.callback = undefined
                }
                this._input.value = undefined
                DOMUtils.hide(this.container)
            }
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

        DOMUtils.show(this.container)
        this.clampLocation(e.clientX, e.clientY)

    }

    clampLocation(clientX, clientY) {

        const {width: w, height: h} = this.container.getBoundingClientRect()
        const wh = window.innerHeight
        const ww = window.innerWidth

        const y = Math.min(wh - h, clientY)
        const x = Math.min(ww - w, clientX)
        this.container.style.left = `${x}px`
        this.container.style.top = `${y}px`

    }
}

export default InputDialog
