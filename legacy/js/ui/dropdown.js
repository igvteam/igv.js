import {createMenuElements} from "./popover.js"
import * as DOMUtils from "./utils/dom-utils.js"

class Dropdown {
    constructor(parent, shim) {

        this.parent = parent;

        // popover
        this.popover = DOMUtils.div({ class: "igv-ui-dropdown" })
        parent.appendChild(this.popover)

        // content
        this.popoverContent = DOMUtils.div();
        this.popover.appendChild(this.popoverContent);

        this.popover.style.display = 'none'

        this.shim = shim
    }

    configure(dropdownItems) {

        if (0 === dropdownItems.length) {
            return
        }

        const menuElements = createMenuElements(dropdownItems, this.popover)

        for (const { element } of menuElements) {
            this.popoverContent.appendChild(element)
        }

    }

    present(event) {
        this.popover.style.display = 'block'

        let { x, y } = DOMUtils.translateMouseCoordinates(event, this.parent)

        // this.popover.style.left  = `${ x }px`
        // this.popover.style.top  = `${ y }px`

        this.popover.style.left  = `${ x + this.shim.left }px`
        this.popover.style.top  = `${ y + this.shim.top }px`
    }

    _present(event) {

        this.popover.style.display = 'block'

        let { x, y, width } = DOMUtils.translateMouseCoordinates(event, this.parent)

        x += this.shim.left
        y += this.shim.top

        this.popover.style.top  = `${ y }px`

        const { width: w } = this.popover.getBoundingClientRect()

        const xmax = x + w
        const delta = xmax - width

        this.popover.style.left = `${ xmax > width ? (x - delta) : x }px`

        // this.popoverContent.style.maxWidth = `${ Math.min(w, width) }px`
    }

    dismiss() {
        this.popover.style.display = 'none'
    }
}

export default Dropdown
