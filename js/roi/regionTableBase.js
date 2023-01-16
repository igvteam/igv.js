import { makeDraggable, DOMUtils, Icon } from '../../node_modules/igv-utils/src/index.js'

const tableRowSelectionList = []

class RegionTableBase {
    constructor(browser, parent) {
        this.browser = browser
        this.container = DOMUtils.div({ class: 'igv-roi-table' })
        parent.appendChild(this.container)
    }

    set headerDOM({ browser, parent, container, title, dismissHandler }) {

        // header
        const dom = DOMUtils.div()
        container.appendChild(dom)

        // title
        const div = DOMUtils.div()
        dom.appendChild(div)
        div.innerText = title

        // dismiss button
        const dismiss = DOMUtils.div()
        dom.appendChild(dismiss)
        dismiss.appendChild(Icon.createIcon('times'))

        dismiss.addEventListener('click', event => {
            event.stopPropagation()
            dismissHandler()
        })

        const { y:y_root } = browser.root.getBoundingClientRect()
        const { y:y_parent } = parent.getBoundingClientRect()
        const constraint = -(y_parent - y_root)
        makeDraggable(container, dom, { minX:0, minY:constraint })

        container.style.display = 'none'

        this._headerDOM = dom

    }

    get headerDOM() {
        return this._headerDOM
    }

    set columnTitleDOM({ container, titleList }) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-column-titles' })
        container.appendChild(dom)

        for (const { label, width } of titleList) {
            const col = DOMUtils.div()
            dom.appendChild(col)
            col.style.width = width
            col.innerText = label
        }

    }

    set rowContainerDOM(container) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-row-container' })
        container.appendChild(dom)

        this._rowContainerDOM = dom
    }

    get rowContainerDOM() {
        return this._rowContainerDOM
    }

    clearTable() {
        const elements = this.rowContainerDOM.querySelectorAll('.igv-roi-table-row')
        for (let el of elements) {
            el.remove()
        }
    }

    setButtonState(isTableRowSelected) {
        isTableRowSelected ? tableRowSelectionList.push(1) : tableRowSelectionList.pop()
        const gotoButton = this.footerDOM.querySelector('#igv-roi-table-view-button')
        gotoButton.style.pointerEvents = tableRowSelectionList.length > 0 ? 'auto' : 'none'
    }

    present() {
        this.container.style.left = `${ 0 }px`
        this.container.style.top  = `${ 0 }px`
        this.container.style.display = 'flex'
    }

    dismiss() {
        this.container.style.display = 'none'
    }

}

export default RegionTableBase
