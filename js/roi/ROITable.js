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

    present(x, y, userDefinedROISet) {

        const removable = this.container.querySelectorAll('.igv-roi-table-row')
        Array.from(removable).forEach(el => el.remove())

        // this.container.style.left = `${ x }px`
        // this.container.style.top  = `${ y }px`

        this.container.style.left = `${ 0 }px`
        this.container.style.top  = `${ 0 }px`

        if (userDefinedROISet.features && userDefinedROISet.features.length > 0) {

            userDefinedROISet.features.reverse().forEach(({ chr, start, end }) => {
                const row = createTableRowDOM(chr, start, end)
                this.columnTitle.after(row)
            })

        }



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

function createTableRowDOM(chr, start, end) {

    const dom = DOMUtils.div({ class: 'igv-roi-table-row' })

    const strings = [ chr, StringUtils.numberFormatter(start), StringUtils.numberFormatter(end) ]
    strings.forEach(string => {
        const el = DOMUtils.div()
        el.innerText = string
        dom.appendChild(el)
    })

    return dom
}

export default ROITable
