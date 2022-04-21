import { StringUtils, DOMUtils, Icon, makeDraggable } from '../../node_modules/igv-utils/src/index.js'
import {deleteRegionWithKeyFromUserDefinedROiSet} from './ROIManager.js'
import {appleCrayonRGB, appleCrayonRGBA} from '../util/colorPalletes.js'

const regionRemovalButtonStatusStack = []

class ROITable {

    constructor(parent) {

        this.container = DOMUtils.div({ class: 'igv-roi-table' })
        parent.appendChild(this.container)

        this.header = createHeaderDOM(this.container)

        this.upperButton = this.createUpperButtonDOM(this.container)

        this.columnTitle = createColumnTitleDOM(this.container)

        this.footer = createFooterDOM(this.container)

        makeDraggable(this.container, this.header)

        this.container.style.display = 'none'

    }

    present(x, y, userDefinedROISet) {

        const removable = this.container.querySelectorAll('.igv-roi-table-row')
        Array.from(removable).forEach(el => el.remove())

        // this.container.style.left = `${ x }px`
        // this.container.style.top  = `${ y }px`

        this.container.style.left = `${ 0 }px`
        this.container.style.top  = `${ 0 }px`

        if (userDefinedROISet.features && userDefinedROISet.features.length > 0) {

            for (let { chr, start, end } of userDefinedROISet.features.reverse()) {
                const row = this.createTableRowDOM(chr, start, end)
                this.columnTitle.after(row)
            }

        }

        this.container.style.display = 'flex'
    }

    createUpperButtonDOM(container) {

        const dom = DOMUtils.div()
        container.appendChild(dom)

        // Remove Button
        const html = `<button id="igv-roi-table-remove-button">Remove</button>`
        const fragment = document.createRange().createContextualFragment(html)

        dom.appendChild(fragment.firstChild)

        const button = dom.querySelector('#igv-roi-table-remove-button')
        button.disabled = true

        button.addEventListener('click', event => {
            event.stopPropagation()

            const removable = container.querySelectorAll('.igv-roi-table-row-selected')

            for (let regionElement of Array.from(removable)) {
                deleteRegionWithKeyFromUserDefinedROiSet(this.browser.roiManager.userDefinedROISet, regionElement.dataset.region, this.browser.columnContainer)
            }

        })

        return dom
    }

    createTableRowDOM(chr, start, end) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-row' })
        dom.dataset.region = `region-key-${ start }-${ end }`

        const strings = [ chr, StringUtils.numberFormatter(start), StringUtils.numberFormatter(end) ]
        for (let string of strings) {
            const el = DOMUtils.div()
            el.innerText = string
            dom.appendChild(el)
        }

        const button = this.upperButton.querySelector('#igv-roi-table-remove-button')
        dom.addEventListener('click', event => {

            event.stopPropagation()

            dom.classList.toggle('igv-roi-table-row-selected')

            dom.classList.contains('igv-roi-table-row-selected') ? regionRemovalButtonStatusStack.push(1) : regionRemovalButtonStatusStack.pop()
            button.disabled =  !(regionRemovalButtonStatusStack.length > 0)

        })

        return dom
    }

}

const columnTitles =
    [
        'Chr',
        'Start',
        'End'
    ]

function createColumnTitleDOM(container) {

    const dom = DOMUtils.div({ class: 'igv-roi-table-column-titles' })
    container.appendChild(dom)


    columnTitles.forEach(title => {
        const col = DOMUtils.div()
        col.innerText = title
        dom.appendChild(col)
    })

    return dom
}

function createHeaderDOM(container) {

    // header
    const header = DOMUtils.div()
    container.appendChild(header)

    // title
    const title = DOMUtils.div()
    header.appendChild(title)
    title.innerText = 'Regions of Interest'

    // dismiss button
    const dismiss = DOMUtils.div()
    header.appendChild(dismiss)
    dismiss.appendChild(Icon.createIcon('times'))

    dismiss.addEventListener('click', event => {
        event.stopPropagation()
        event.preventDefault()
        container.style.display = 'none'
    })

    return header

}

function createFooterDOM(container) {

    const dom = DOMUtils.div()
    container.appendChild(dom)

    let fragment

    // View Button
    fragment = document.createRange().createContextualFragment(`<button id="igv-roi-table-view-button">View</button>`)
    dom.appendChild(fragment.firstChild)

    // Import Button
    fragment = document.createRange().createContextualFragment(`<button id="igv-roi-table-import-button">Import</button>`)
    dom.appendChild(fragment.firstChild)

    // View Button
    fragment = document.createRange().createContextualFragment(`<button id="igv-roi-table-export-button">Export</button>`)
    dom.appendChild(fragment.firstChild)

    return dom
}

export default ROITable
