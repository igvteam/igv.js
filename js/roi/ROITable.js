import { FileUtils, StringUtils, DOMUtils, Icon, makeDraggable } from '../../node_modules/igv-utils/src/index.js'
import { createRegionKey, parseRegionKey, deleteRegionWithKey } from './ROIManager.js'
import { appleCrayonRGB, appleCrayonRGBA } from '../util/colorPalletes.js'
import FeatureFileReader from "../feature/featureFileReader.js"

const tableRowSelectionList = []

class ROITable {

    constructor(browser, parent) {

        this.browser = browser

        this.container = DOMUtils.div({ class: 'igv-roi-table' })
        parent.appendChild(this.container)

        const header = this.createHeaderDOM(this.container)

        this.columnTitleDOM = createColumnTitleDOM(this.container)

        this.tableRowContainerDOM = this.createTableRowContainerDOM(this.container)

        this.footerDOM = this.createFooterDOM(this.container)

        makeDraggable(this.container, header, { minX:0, minY:0 })

        this.container.style.display = 'none'

    }

    present() {
        this.container.style.left = `${ 0 }px`
        this.container.style.top  = `${ 0 }px`
        this.container.style.display = 'flex'
    }

    dismiss() {
        this.container.style.display = 'none'
    }

    renderTable(features) {

        Array.from(this.tableRowContainerDOM.querySelectorAll('.igv-roi-table-row')).forEach(el => el.remove())

        if (features.length > 0) {

            const sortedFeatures = features.sort((a, b) => (a.chr.localeCompare(b.chr) || a.start - b.start || a.end - b.end))

            for (let { chr, start, end } of sortedFeatures) {
                const row = this.createTableRowDOM(chr, start, end)
                this.tableRowContainerDOM.appendChild(row)
            }

        }
    }

    createHeaderDOM(container) {

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
            this.browser.roiTableControl.buttonHandler(false)
        })

        return header

    }

    createTableRowContainerDOM(container) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-row-container' })
        container.appendChild(dom)

        return dom
    }

    createTableRowDOM(chr, start, end) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-row' })
        dom.dataset.region = createRegionKey(chr, start, end)

        for (let string of [ chr, StringUtils.numberFormatter(start), StringUtils.numberFormatter(end) ]) {
            const el = DOMUtils.div()
            el.innerText = string
            dom.appendChild(el)
        }

        dom.addEventListener('click', event => {
            event.stopPropagation()
            dom.classList.toggle('igv-roi-table-row-selected')
            this.setButtonState(dom.classList.contains('igv-roi-table-row-selected'))
        })

        return dom
    }

    createFooterDOM(container) {

        const dom = DOMUtils.div()
        container.appendChild(dom)

        // Zoom Button
        const zoomButton = DOMUtils.div({class: 'igv-roi-table-button'})
        dom.appendChild(zoomButton)

        zoomButton.id = 'igv-roi-table-view-button'
        zoomButton.textContent = 'Zoom'
        zoomButton.style.pointerEvents = 'none'

        zoomButton.addEventListener('click', event => {

            event.stopPropagation()

            const selected = container.querySelectorAll('.igv-roi-table-row-selected')
            const loci = []
            for (let el of selected) {
                // console.log(`${el.dataset.region}`)
                const { locus } = parseRegionKey(el.dataset.region)
                loci.push(locus)
            }

            for (let el of container.querySelectorAll('.igv-roi-table-row')) {
                el.classList.remove('igv-roi-table-row-selected')
            }

            this.setButtonState(false)

            if (loci.length > 0) {
                this.browser.search(loci.join(' '))
            }

        })

        return dom
    }

    async import(file) {

        const reader = new FeatureFileReader({ url: file }, undefined)
        const features = await reader.loadFeaturesNoIndex()

        for (let { chr, start, end } of features) {
            await this.browser.roiManager.updateUserDefinedROISet({ chr, start, end })
        }

    }

    export() {

        const elements = this.tableRowContainerDOM.querySelectorAll('.igv-roi-table-row')
        const lines = []
        for (let el of elements) {
            const { bedRecord } = parseRegionKey(el.dataset.region)
            lines.push(bedRecord)
        }

        if (lines.length > 0) {

            const blobParts = [ lines.join('\n') ]

            const blobOptions =
                {
                    type : "text/plain;charset=utf-8"
                }

            const blob = new Blob(blobParts, blobOptions)
            const path = 'igvjs-roi.bed'
            const downloadUrl = URL.createObjectURL(blob)
            FileUtils.download(path, downloadUrl)
        }

    }

    removeRegionElement(regionElement) {
        deleteRegionWithKey(this.browser.roiManager.userDefinedROISet, regionElement.dataset.region, this.browser.columnContainer)
        this.setButtonState(false)
    }

    setButtonState(isTableRowSelected) {
        isTableRowSelected ? tableRowSelectionList.push(1) : tableRowSelectionList.pop()
        const zoomButton = this.footerDOM.querySelector('#igv-roi-table-view-button')
        zoomButton.style.pointerEvents = tableRowSelectionList.length > 0 ? 'auto' : 'none'
    }

    dispose() {

        this.browser.roiTableControl.buttonHandler(false)

        this.container.innerHTML = ''

        for (let key of Object.keys(this)) {
            this[key] = undefined
        }
    }

}

function createColumnTitleDOM(container) {

    const dom = DOMUtils.div({ class: 'igv-roi-table-column-titles' })
    container.appendChild(dom)

    const columnTitles =
        [
            'Chr',
            'Start',
            'End'
        ]

    for (let title of columnTitles) {
        const col = DOMUtils.div()
        col.innerText = title
        dom.appendChild(col)
    }

    // columnTitles.forEach(title => {
    //     const col = DOMUtils.div()
    //     col.innerText = title
    //     dom.appendChild(col)
    // })

    return dom
}

export default ROITable
