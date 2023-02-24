import { makeDraggable, DOMUtils, Icon } from '../../node_modules/igv-utils/src/index.js'

const tableRowSelectionList = []

class RegionTableBase {
    constructor(config) {

        this.browser = config.browser

        this.container = DOMUtils.div({ class: 'igv-roi-table' })

        config.parent.appendChild(this.container)

        this.headerDOM = config

        this.descriptionDOM = config

        this.columnTitleDOM = config.columnFormat

        this.rowContainerDOM = this.container

        this.footerDOM = this.container

        this.columnFormat = config.columnFormat

    }

    set headerDOM({ browser, parent, headerTitle, dismissHandler }) {

        // header
        const dom = DOMUtils.div()
        this.container.appendChild(dom)

        // header title
        const div = DOMUtils.div()
        dom.appendChild(div)
        div.innerText = headerTitle

        // table dismiss button
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
        makeDraggable(this.container, dom, { minX:0, minY:constraint })

        this.container.style.display = 'none'

        this._headerDOM = dom

    }

    set descriptionDOM(config) {

        // description
        const dom = DOMUtils.div({ class: 'igv-roi-table-description' })
        this.container.appendChild(dom)
        dom.innerText = 'this is a description'

        if (config.description) {

        } else {

        }
    }

    set columnTitleDOM(titleList) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-column-titles' })
        this.container.appendChild(dom)

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

    set footerDOM(container) {

        const dom = DOMUtils.div()
        container.appendChild(dom)

        // Go To Button
        const gotoButton = DOMUtils.div({class: 'igv-roi-table-button'})
        dom.appendChild(gotoButton)

        gotoButton.id = 'igv-roi-table-view-button'
        gotoButton.textContent = 'Go To'
        gotoButton.style.pointerEvents = 'none'

        this._footerDOM = dom

        this.gotoButton = gotoButton

    }

    clearTable() {
        const elements = this.rowContainerDOM.querySelectorAll('.igv-roi-table-row')
        for (let el of elements) {
            el.remove()
        }
    }

    setButtonState(isTableRowSelected) {
        isTableRowSelected ? tableRowSelectionList.push(1) : tableRowSelectionList.pop()
        this.gotoButton.style.pointerEvents = tableRowSelectionList.length > 0 ? 'auto' : 'none'
    }

    present() {
        this.container.style.left = `${ 0 }px`
        this.container.style.top  = `${ 0 }px`
        this.container.style.display = 'flex'
    }

    dismiss() {
        this.container.style.display = 'none'
    }

    dispose() {

        this.container.innerHTML = ''

        for (let key of Object.keys(this)) {
            this[key] = undefined
        }
    }

}

export default RegionTableBase
