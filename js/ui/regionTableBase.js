import { DOMUtils, makeDraggable, Icon } from '../../node_modules/igv-ui/dist/igv-ui.js'

class RegionTableBase {
    constructor(config) {

        this.config = config

        this.browser = config.browser

        this.container = DOMUtils.div({ class: 'igv-roi-table' })

        config.parent.appendChild(this.container)

        this.headerDOM = config

        this.columnTitleDOM = config.columnFormat

        this.rowContainerDOM = this.container

        this.footerDOM = config.gotoButtonHandler

        this.columnFormat = config.columnFormat

        this.tableRowSelectionList = []

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

        this.boundDismissHandler = mouseClickHandler.bind(this)

        dismiss.addEventListener('click', this.boundDismissHandler)

        function mouseClickHandler (event) {
            event.stopPropagation()
            dismissHandler()
        }

        const { y:y_root } = browser.root.getBoundingClientRect()
        const { y:y_parent } = parent.getBoundingClientRect()
        const constraint = -(y_parent - y_root)
        makeDraggable(this.container, dom, { minX:0, minY:constraint })

        this.container.style.display = 'none'

        this._headerDOM = dom

    }

    set columnTitleDOM(columnFormat) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-column-titles' })
        this.container.appendChild(dom)

        for (const { label, width } of columnFormat) {
            const col = DOMUtils.div()
            dom.appendChild(col)
            col.style.width = width
            col.innerText = label
        }

    }

    set rowContainerDOM(container) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-row-container' })
        container.appendChild(dom)

        dom.style.minWidth = this.config.width

        this._rowContainerDOM = dom
    }

    get rowContainerDOM() {
        return this._rowContainerDOM
    }

    set footerDOM(gotoButtonHandler) {

        const dom = DOMUtils.div()
        this.container.appendChild(dom)

        // Go To Button
        const gotoButton = DOMUtils.div({class: 'igv-roi-table-button'})
        dom.appendChild(gotoButton)

        gotoButton.id = 'igv-roi-table-view-button'
        gotoButton.textContent = 'Go To'
        gotoButton.style.pointerEvents = 'none'

        this._footerDOM = dom

        this.gotoButton = gotoButton

        this.boundGotoButtonHandler = gotoButtonHandler.bind(this)

        this.gotoButton.addEventListener('click', this.boundGotoButtonHandler)

    }

    tableRowDOMHelper(dom) {

        dom.addEventListener('mousedown', event => {
            event.stopPropagation()

            dom.classList.toggle('igv-roi-table-row-selected')
            dom.classList.contains('igv-roi-table-row-selected') ? dom.classList.remove('igv-roi-table-row-hover') : dom.classList.add('igv-roi-table-row-hover')

            this.setTableRowSelectionState(dom.classList.contains('igv-roi-table-row-selected'))
        })

        dom.addEventListener('mouseover', e => {
            dom.classList.contains('igv-roi-table-row-selected') ? dom.classList.remove('igv-roi-table-row-hover') : dom.classList.add('igv-roi-table-row-hover')
        })

        dom.addEventListener('mouseout', e => {
            dom.classList.remove('igv-roi-table-row-hover')
        })

    }

    clearTable() {
        const elements = this.rowContainerDOM.querySelectorAll('.igv-roi-table-row')
        for (let el of elements) {
            el.remove()
        }
    }

    setTableRowSelectionState(isTableRowSelected) {
        isTableRowSelected ? this.tableRowSelectionList.push(1) : this.tableRowSelectionList.pop()
        this.gotoButton.style.pointerEvents = this.tableRowSelectionList.length > 0 ? 'auto' : 'none'
    }

    present() {
        this.container.style.left = `${ 0 }px`

        const { y:y_root } = this.browser.root.getBoundingClientRect()
        const { y:y_parent } = this.config.parent.getBoundingClientRect()

        this.container.style.top  = `${ y_root - y_parent }px`
        this.container.style.display = 'flex'
    }

    dismiss() {
        this.container.style.display = 'none'
    }

    dispose() {

        this.container.innerHTML = ''
        this.container.remove()

        for (const key of Object.keys(this)) {
            this[key] = undefined
        }

        document.removeEventListener('click', this.boundDismissHandler)

    }

}

export default RegionTableBase
