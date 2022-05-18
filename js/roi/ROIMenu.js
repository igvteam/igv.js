import { DOMUtils } from '../../node_modules/igv-utils/src/index.js'
import {parseRegionKey} from './ROIManager.js'

class ROIMenu {
    constructor(browser, parent) {

        this.browser = browser

        this.container = DOMUtils.div({ class: 'igv-roi-menu' })
        parent.appendChild(this.container)

        this.container.style.display = 'none'

    }

    async present(x, y, roiManager, columnContainer, regionElement) {

        removeAllChildNodes(this.container)

        const { index } = await this.browser.roiManager.findFeatureWithRegionKey(regionElement.dataset.region)
        const userDefinedROISet = this.browser.roiManager.getUserDefinedROISet()
        const feature = userDefinedROISet.features[ index ]

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

        // Edit Description
        row = DOMUtils.div({ class: 'igv-roi-menu-row-edit-description' })
        this.container.appendChild(row)

        row.addEventListener('click', e => {
            e.stopPropagation()
        })

        const input = document.createElement('input')
        input.setAttribute('type', 'text')
        input.setAttribute('placeholder', feature.name || 'Edit Description')
        input.value = feature.name || ''

        input.addEventListener('change', async e => {

            e.stopPropagation()

            const { index } = await this.browser.roiManager.findFeatureWithRegionKey(regionElement.dataset.region)
            const userDefinedROISet = this.browser.roiManager.getUserDefinedROISet()
            const feature = userDefinedROISet.features[ index ]
            feature.name = input.value

            await this.browser.roiManager.repaintTable()
        })

        row.appendChild(input)

        // Delete
        row = DOMUtils.div({ class: 'igv-roi-body-row' })
        row.innerText = 'Delete'
        this.container.appendChild(row)

        row.addEventListener('click', event => {
            event.stopPropagation()
            this.container.style.display = 'none'
            this.browser.roiManager.deleteRegionWithKey(regionElement.dataset.region, this.browser.columnContainer)
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
