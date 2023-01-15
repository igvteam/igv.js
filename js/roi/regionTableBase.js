import {DOMUtils, Icon} from '../../node_modules/igv-utils/src/index.js'

const tableRowSelectionList = []

class RegionTableBase {
    constructor(browser) {
        this.browser = browser
    }

    headerDOM({container, title, dismissHandler}) {

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

        this.header = dom

    }

    columnTitleDOM({container, titleList}) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-column-titles' })
        container.appendChild(dom)

        for (let title of titleList) {
            const col = DOMUtils.div()
            col.innerText = title
            dom.appendChild(col)
        }

    }

    rowContainerDOM(container) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-row-container' })
        container.appendChild(dom)

        this.tableRowContainerDOM = dom
    }

    clearTable() {
        const elements = this.tableRowContainerDOM.querySelectorAll('.igv-roi-table-row')
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
