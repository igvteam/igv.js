import { DOMUtils } from '../../node_modules/igv-utils/src/index.js'
import {deleteRegionWithKey, parseRegionKey} from './ROIManager.js'

class ROIMenu {
    constructor(browser, parent) {

        this.browser = browser

        this.container = DOMUtils.div({ class: 'igv-roi-menu' })
        parent.appendChild(this.container)

        this.container.style.display = 'none'

    }

    present(x, y, roiManager, columnContainer, regionElement) {

        removeAllChildNodes(this.container)

        let row

        // Go To
        row = DOMUtils.div({ class: 'igv-roi-body-row' })
        row.innerText = 'Go To'
        this.container.appendChild(row)

        row.addEventListener('click', event => {
            event.stopPropagation()
            this.container.style.display = 'none'
            const { locus } = parseRegionKey(regionElement.dataset.region)
            this.browser.search(locus)
        })

        // Delete
        row = DOMUtils.div({ class: 'igv-roi-body-row' })
        row.innerText = 'Delete'
        this.container.appendChild(row)

        row.addEventListener('click', event => {
            event.stopPropagation()
            this.container.style.display = 'none'
            deleteRegionWithKey(this.browser.roiManager.roiSets, regionElement.dataset.region, this.browser.columnContainer)
        })

        this.container.style.left = `${ x }px`
        this.container.style.top  = `${ y }px`
        this.container.style.display = 'flex'

        columnContainer.addEventListener('click', event => {
            event.stopPropagation()
            this.container.style.display = 'none'
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
