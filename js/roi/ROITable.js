import { StringUtils, DOMUtils, Icon, makeDraggable } from '../../node_modules/igv-utils/src/index.js'
import {appleCrayonRGB, appleCrayonRGBA} from '../util/colorPalletes.js'

class ROITable {

    constructor(parent) {

        this.container = DOMUtils.div({ class: 'igv-roi-table' })
        parent.appendChild(this.container)

        this.header = createHeaderDOM(this.container)

        this.upperButton = createUpperButtonDOM(this.container)

        this.columnTitle = createColumnTitleDOM(this.container)

        // const list = [ 0, 1, 2, 3, 4, 5, 6, 7, 8 ]
        // list.forEach((colorName, index) => {
        //     const row = DOMUtils.div({ class: 'igv-roi-table-row' })
        //     this.container.appendChild(row)
        // })

        this.footer = createFooterDOM(this.container)

        makeDraggable(this.container, this.header)

        this.container.style.display = 'none'

    }

    present(x, y, interativeROISet) {

        const removable = this.container.querySelectorAll('.igv-roi-table-row')

        // this.container.style.left = `${ x }px`
        // this.container.style.top  = `${ y }px`

        this.container.style.left = `${ 0 }px`
        this.container.style.top  = `${ 0 }px`

        // const list = [ 0, 1, 2, 3, 4, 5, 6, 7, 8 ]
        // interativeROISet.features.forEach(({ chr, start, end }) => {
        //     const row = DOMUtils.div({ class: 'igv-roi-table-row' });
        //     [ chr, start, end ]
        //         .map((item, index) => 0 === index ? item : StringUtils.numberFormatter(item))
        //     this.container.appendChild(row)
        // })


        this.container.style.display = 'flex'
    }
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

    dom.innerText = 'footer'

    return dom
}

function createUpperButtonDOM(container) {

    // upper button container
    const dom = DOMUtils.div()
    container.appendChild(dom)

    dom.innerText = 'Upper Button'

    return dom
}

const columnTitles =
    [
        'Chr',
        'Start',
        'End',
        'ROI Set'
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

function createTableRowDOM(container) {
    const dom = DOMUtils.div()
}

export default ROITable
