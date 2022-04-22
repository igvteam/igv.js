import { FileUtils, StringUtils, DOMUtils, Icon, makeDraggable } from '../../node_modules/igv-utils/src/index.js'
import { createRegionKey, parseRegionKey, deleteRegionWithKey } from './ROIManager.js'
import { appleCrayonRGB, appleCrayonRGBA } from '../util/colorPalletes.js'

const tableRowSelectionList = []

class ROITable {

    constructor(parent) {

        this.container = DOMUtils.div({ class: 'igv-roi-table' })
        parent.appendChild(this.container)

        const header = createHeaderDOM(this.container)

        this.upperButtonDOM = this.createButtonDOM(this.container)

        this.columnTitleDOM = createColumnTitleDOM(this.container)

        this.footerDOM = this.createFooterDOM(this.container)

        makeDraggable(this.container, header)

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

            for (let { chr, start, end } of userDefinedROISet.features.reverse()) {
                const row = this.createTableRowDOM(chr, start, end)
                this.columnTitleDOM.after(row)
            }

        }

        this.container.style.display = 'flex'
    }

    createButtonDOM(container) {

        const dom = DOMUtils.div()
        container.appendChild(dom)

        let fragment

        // View Button
        fragment = document.createRange().createContextualFragment(`<button id="igv-roi-table-view-button">View</button>`)
        dom.appendChild(fragment.firstChild)

        const regionViewButton = dom.querySelector('#igv-roi-table-view-button')
        regionViewButton.disabled = true

        regionViewButton.addEventListener('click', event => {

            event.stopPropagation()

            const selected = container.querySelectorAll('.igv-roi-table-row-selected')
            const loci = []
            for (let el of selected) {
                // console.log(`${el.dataset.region}`)
                const { locus } = parseRegionKey(el.dataset.region)
                loci.push(locus)
            }

            if (loci.length > 0) {
                this.browser.search(loci.join(' '))
            }

        })

        createROITableImportButton(dom, this.browser)

        createROITableExportButton(container, dom)

        // Remove Button
        const html = `<button id="igv-roi-table-remove-button">Remove</button>`
        fragment = document.createRange().createContextualFragment(html)

        dom.appendChild(fragment.firstChild)

        const tableRowRemoveButton = dom.querySelector('#igv-roi-table-remove-button')
        tableRowRemoveButton.disabled = true

        tableRowRemoveButton.addEventListener('click', event => {
            event.stopPropagation()

            const removable = container.querySelectorAll('.igv-roi-table-row-selected')

            for (let regionElement of Array.from(removable)) {
                deleteRegionWithKey(this.browser.roiManager.userDefinedROISet, regionElement.dataset.region, this.browser.columnContainer)
            }

        })

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
        return dom
    }

    __createFooterDOM(container) {

        const dom = DOMUtils.div()
        container.appendChild(dom)

        let fragment

        // View Button
        fragment = document.createRange().createContextualFragment(`<button id="igv-roi-table-view-button">View</button>`)
        dom.appendChild(fragment.firstChild)

        const regionViewButton = dom.querySelector('#igv-roi-table-view-button')
        regionViewButton.disabled = true

        regionViewButton.addEventListener('click', event => {

            event.stopPropagation()

            const selected = container.querySelectorAll('.igv-roi-table-row-selected')
            const loci = []
            for (let el of selected) {
                // console.log(`${el.dataset.region}`)
                const { locus } = parseRegionKey(el.dataset.region)
                loci.push(locus)
            }

            if (loci.length > 0) {
                this.browser.search(loci.join(' '))
            }

        })

        createROITableImportButton(dom, this.browser)

        createROITableExportButton(container, dom)

        return dom
    }

    setButtonState(isTableRowSelected) {

        isTableRowSelected ? tableRowSelectionList.push(1) : tableRowSelectionList.pop()

        const regionRemovalButton = this.upperButtonDOM.querySelector('#igv-roi-table-remove-button')
        const    regionViewButton = this.upperButtonDOM.querySelector('#igv-roi-table-view-button')
        
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

export default ROITable
