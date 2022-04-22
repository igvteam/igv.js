import { DOMUtils, Icon, makeDraggable } from '../../node_modules/igv-utils/src/index.js'
import {appleCrayonRGB, appleCrayonRGBA} from '../util/colorPalletes.js'

class ROIMenu {
    constructor(parent) {

        // container
        this.container = DOMUtils.div({ class: 'igv-roi-menu' })
        parent.appendChild(this.container)

        // header
        const header = DOMUtils.div({ class: 'igv-roi-header' })
        this.container.appendChild(header)

        // dismiss button
        // const dismiss = DOMUtils.div()
        // header.appendChild(dismiss)
        // dismiss.appendChild(Icon.createIcon('times'))
        //
        // dismiss.addEventListener('click', event => {
        //     event.stopPropagation()
        //     event.preventDefault()
        //     this.container.style.display = 'none'
        // })

        // body container
        this.bodyContainer = DOMUtils.div({ class: 'igv-roi-body' })
        this.container.appendChild(this.bodyContainer)

        makeDraggable(this.container, header)

        this.container.style.display = 'none'

    }

    present(x, y, roiSet, columnContainer, regionKey, roiManager) {

        removeAllChildNodes(this.bodyContainer)

        const presentLUT =
            {
                'Present Table': () => {},
            };

        const deleteLUT =
            {
                'Delete': () => {},
            };

        const LUT = false === roiSet.isImmutable ? Object.assign(presentLUT, deleteLUT) : Object.assign({}, presentLUT)

        Object.keys(LUT).forEach(word => {

            const row = DOMUtils.div({ class: 'igv-roi-body-row' })
            this.bodyContainer.appendChild(row)
            row.innerText = word
            row.addEventListener('click', () => LUT[ word ]())
        })

        this.container.style.left = `${ x }px`
        this.container.style.top  = `${ y }px`
        this.container.style.display = 'flex'

        columnContainer.addEventListener('click', event => {

            event.preventDefault()
            event.stopPropagation()

            if (this.container.querySelector('.igv-roi-header') === event.target) {
                console.log(`${ Date.now() } clicked header`)
            } else {
                this.container.style.display = 'none'
            }


        })

    }

}

function removeAllChildNodes(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

export default ROIMenu
