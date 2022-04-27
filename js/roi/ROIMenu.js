import { DOMUtils, Icon, makeDraggable } from '../../node_modules/igv-utils/src/index.js'
import {appleCrayonRGB, appleCrayonRGBA} from '../util/colorPalletes.js'

class ROIMenu {
    constructor(browser, parent) {

        this.browser = browser

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

    present(x, y, roiManager, columnContainer, regionElement) {

        removeAllChildNodes(this.bodyContainer)

        const row = DOMUtils.div({ class: 'igv-roi-body-row' })
        this.bodyContainer.appendChild(row)

        row.innerText = 'Delete'

        row.addEventListener('click', () => roiManager.roiTable.removeRegionElement(regionElement))

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

    dispose() {
        this.container.innerHTML = ''
    }

}

function removeAllChildNodes(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

export default ROIMenu
