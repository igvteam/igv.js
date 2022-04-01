import { DOMUtils, Icon, makeDraggable } from '../../node_modules/igv-utils/src/index.js'
import {appleCrayonRGB, appleCrayonRGBA} from '../util/colorPalletes.js'

class ROIMenu {
    constructor(parent) {

        // container
        this.container = DOMUtils.div({class: 'igv-roi-menu'})
        parent.appendChild(this.container)

        // header
        const header = DOMUtils.div()
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
        const bodyContainer = DOMUtils.div()
        this.container.appendChild(bodyContainer)

        const colors =
            [
                'lavender',
                'tangerine',
                'honeydew',
                'carnation'
            ]

        colors.forEach(colorName => {
            const row = DOMUtils.div()
            bodyContainer.appendChild(row)
            row.style.backgroundColor = appleCrayonRGB(colorName)
        })

        makeDraggable(this.container, header)

    }
}

export default ROIMenu
