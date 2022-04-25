import { FileUtils, StringUtils, DOMUtils, Icon, makeDraggable } from '../../node_modules/igv-utils/src/index.js'
import { createRegionKey, parseRegionKey, deleteRegionWithKey } from './ROIManager.js'
import { appleCrayonRGB, appleCrayonRGBA } from '../util/colorPalletes.js'

const tableRowSelectionList = []

class ROITable {

    constructor(browser, parent) {

        this.browser = browser

        this.container = DOMUtils.div({ class: 'igv-roi-table' })
        parent.appendChild(this.container)

        const header = this.createHeaderDOM(this.container)

        // this.upperButtonDOM = this.createButtonDOM(this.container)

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

    renderTable(userDefinedROISet) {

        Array.from(this.tableRowContainerDOM.querySelectorAll('.igv-roi-table-row')).forEach(el => el.remove())

        if (userDefinedROISet.features && userDefinedROISet.features.length > 0) {

            const sortedFeatures = userDefinedROISet.features.sort((a,b) => (a.chr.localeCompare(b.chr) || a.start - b.start || a.end - b.end))

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

    createButtonDOM(container) {

        const dom = DOMUtils.div()
        container.appendChild(dom)

        let fragment

        // View Button
        fragment = document.createRange().createContextualFragment(`<button id="igv-roi-table-view-button">View</button>`)
        dom.appendChild(fragment.firstChild)

        const viewButton = dom.querySelector('#igv-roi-table-view-button')
        viewButton.disabled = true

        viewButton.addEventListener('click', event => {

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

            if (loci.length > 0) {
                this.browser.search(loci.join(' '))
            }

        })

        // Remove Button
        fragment = document.createRange().createContextualFragment(`<button id="igv-roi-table-remove-button">Remove</button>`)
        dom.appendChild(fragment.firstChild)

        const removeButton = dom.querySelector('#igv-roi-table-remove-button')
        removeButton.disabled = true

        removeButton.addEventListener('click', event => {
            event.stopPropagation()

            const removable = container.querySelectorAll('.igv-roi-table-row-selected')

            for (let regionElement of Array.from(removable)) {
                deleteRegionWithKey(this.browser.roiManager.userDefinedROISet, regionElement.dataset.region, this.browser.columnContainer)
            }

        })

        // Import Button
        createROITableImportButton(dom, this.browser)

        // Export Button
        createROITableExportButton(container, dom)

        return dom
    }

    createTableRowContainerDOM(container) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-row-container' })
        container.appendChild(dom)

        return dom
    }

    createTableRowDOM(chr, start, end) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-row' })
        dom.dataset.region = createRegionKey(chr, start, end)

        const strings = [ chr, StringUtils.numberFormatter(start), StringUtils.numberFormatter(end) ]
        for (let string of strings) {
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

        let fragment

        // View Button
        fragment = document.createRange().createContextualFragment(`<button id="igv-roi-table-view-button">View</button>`)
        dom.appendChild(fragment.firstChild)

        const viewButton = dom.querySelector('#igv-roi-table-view-button')
        viewButton.disabled = true

        viewButton.addEventListener('click', event => {

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

            if (loci.length > 0) {
                this.browser.search(loci.join(' '))
            }

        })

        // Remove Button
        fragment = document.createRange().createContextualFragment(`<button id="igv-roi-table-remove-button">Remove</button>`)
        dom.appendChild(fragment.firstChild)

        const removeButton = dom.querySelector('#igv-roi-table-remove-button')
        removeButton.disabled = true

        removeButton.addEventListener('click', event => {
            event.stopPropagation()

            const removable = container.querySelectorAll('.igv-roi-table-row-selected')

            for (let regionElement of Array.from(removable)) {
                deleteRegionWithKey(this.browser.roiManager.userDefinedROISet, regionElement.dataset.region, this.browser.columnContainer)
            }

        })

        // Import Button
        createROITableImportButton(dom, this.browser)

        // Export Button
        createROITableExportButton(container, dom)

        return dom
    }

    __createFooterDOM(container) {
        const dom = DOMUtils.div()
        container.appendChild(dom)
        return dom
    }

    setButtonState(isTableRowSelected) {

        isTableRowSelected ? tableRowSelectionList.push(1) : tableRowSelectionList.pop()

        const regionRemovalButton = this.footerDOM.querySelector('#igv-roi-table-remove-button')
        const    regionViewButton = this.footerDOM.querySelector('#igv-roi-table-view-button')

        regionRemovalButton.disabled = regionViewButton.disabled = !(tableRowSelectionList.length > 0)
    }

}

function createROITableImportButton(parent, browser) {

    const button = DOMUtils.div({class: 'igv-roi-table-button'})
    parent.append(button)

    button.textContent = 'Import'
    button.addEventListener('click', () => {
        console.log('Import Regions from BED file')
    })
}

function createROITableExportButton(container, parent) {

    const button = DOMUtils.div({class: 'igv-roi-table-button'})
    parent.append(button)

    button.textContent = 'Export'
    button.addEventListener('click', () => {

        const elements = container.querySelectorAll('.igv-roi-table-row')
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

    })
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

    columnTitles.forEach(title => {
        const col = DOMUtils.div()
        col.innerText = title
        dom.appendChild(col)
    })

    return dom
}

export default ROITable
