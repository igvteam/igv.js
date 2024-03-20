import * as UIUtils from "./utils/ui-utils.js"
import * as DOMUtils from "./utils/dom-utils.js"
import makeDraggable from "./utils/draggable.js"
import {createTable} from "./components/table.js"

/**
 * Wraps a simple table (see components/table.js) in a popup component with drag bar and close control.  The table
 * is initially hidden (display == none)
 *
 */

class IGVTable {

    /**
     *
     * @param parent - parent element for the popup's html element
     * @param tableConfig - see components/table.js
     */
    constructor(parent, tableConfig) {

        this.parent = parent

        // popover
        this.popover = DOMUtils.div({class: "igv-ui-popover"})
        parent.appendChild(this.popover)

        // header
        const popoverHeader = DOMUtils.div()
        this.popover.appendChild(popoverHeader)

        const titleElement = DOMUtils.div()
        popoverHeader.appendChild(titleElement)
        if (tableConfig.title) {
            titleElement.innerHTML = tableConfig.title
        }

        UIUtils.attachDialogCloseHandlerWithParent(popoverHeader, () => this.hide())
        makeDraggable(this.popover, popoverHeader)

        const tableContainer = document.createElement("div")
        tableContainer.style.maxHeight = tableConfig.maxHeight ? tableConfig.maxHeight + "px" : "800px"
        tableContainer.style.overflow = "auto"
        this.popover.appendChild(tableContainer)

        // TODO -- this will be passed as an argument

        const table = createTable(tableConfig)
        tableContainer.appendChild(table)

        this.popover.style.display = 'none'

    }

    show() {
        this.popover.style.display = 'block'
    }

    hide() {
        this.popover.style.display = 'none'
    }

    dispose() {

        if (this.popover) {
            this.popover.parentNode.removeChild(this.popover)
        }
    }

}


export default IGVTable