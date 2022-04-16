import { DOMUtils, Icon, makeDraggable } from '../../node_modules/igv-utils/src/index.js'
import {appleCrayonRGB, appleCrayonRGBA} from '../util/colorPalletes.js'

class ROITable {

    constructor(parent) {

        // container
        this.container = DOMUtils.div({ class: 'igv-roi-table' })
        parent.appendChild(this.container)

        // header
        const header = DOMUtils.div({ class: 'igv-roi-header' })
        this.container.appendChild(header)

        // dismiss button
        const dismiss = DOMUtils.div()
        header.appendChild(dismiss)
        dismiss.appendChild(Icon.createIcon('times'))

        dismiss.addEventListener('click', event => {
            event.stopPropagation()
            event.preventDefault()
            this.container.style.display = 'none'
        })

        // body container
        const bodyContainer = DOMUtils.div({ class: 'igv-roi-body' })
        this.container.appendChild(bodyContainer)

        const colors =
            [
                'lavender',
                'tangerine',
                'honeydew',
                'carnation'
            ];

        [ 0, 1, 2, 3, 4 ].forEach((colorName, index) => {
            const row = DOMUtils.div({ class: 'igv-roi-table-body-row' })
            bodyContainer.appendChild(row)
            // row.style.backgroundColor = appleCrayonRGB(0 === index % 2 ? 'snow' : 'mercury')
            // row.innerText = /*colorName*/''
        })

        makeDraggable(this.container, header)

        this.container.style.display = 'none'

    }

    present(x, y) {

        // this.container.style.left = `${ x }px`
        // this.container.style.top  = `${ y }px`

        this.container.style.left = `${ 0 }px`
        this.container.style.top  = `${ 0 }px`

        this.container.style.display = 'flex'
    }
}

export default ROITable
