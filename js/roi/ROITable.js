import * as DOMUtils from "../ui/utils/dom-utils.js"
import { StringUtils } from '../../node_modules/igv-utils/src/index.js'

import { createRegionKey, parseRegionKey } from './ROIManager.js'
import RegionTableBase from '../ui/regionTableBase.js'
import {parseLocusString} from "../search.js"
import {appleCrayonRGB} from "../util/colorPalletes.js"

class ROITable extends RegionTableBase {
    constructor(browser) {

        const config =
            {
                browser: browser,
                parent: browser.columnContainer,
                headerTitle: 'Regions of Interest',
                dismissHandler: () => browser.roiTableControl.buttonHandler(false),
                gotoButtonHandler: ROITable.gotoButtonHandler
            }
        config.columnFormat = ROITable.getColumnFormatConfiguration(true)

        super(Object.assign({ 'width':'640px' }, config))
    }

    tableRowDOM(record) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-row' })

        const { setName, feature } = record
        dom.dataset.region = createRegionKey(feature.chr, feature.start, feature.end)

        let strings =
            [
                feature.chr,
                StringUtils.numberFormatter(feature.start),
                StringUtils.numberFormatter(feature.end),
                feature.name || '',
                setName
            ];

        if (4 === this.columnFormat.length) {
            strings = strings.slice(0, 4)
        }

        for (let i = 0; i < strings.length; i++) {
            const el = DOMUtils.div()
            dom.appendChild(el)
            el.style.width = this.columnFormat[ i ].width
            el.innerText = strings[ i ]
        }

        this.tableRowDOMHelper(dom)

        return dom
    }

    renderTable(records) {

        Array.from(this.tableRowContainer.querySelectorAll('.igv-roi-table-row')).forEach(el => el.remove())

        if (records.length > 0) {

            const sortedRecords = records.sort((a, b) => (a.feature.chr.localeCompare(b.feature.chr) || a.feature.start - b.feature.start || a.feature.end - b.feature.end))

            for (let record of sortedRecords) {
                const row = this.tableRowDOM(record)
                this.tableRowContainer.appendChild(row)
            }

        }
    }

    set footerDOM(gotoButtonHandler) {

        super.footerDOM = gotoButtonHandler

        this.gotoButton.textContent = 'Go to selected region(s)'


        // Copy Sequence Button
        const copySequenceButton = DOMUtils.div({ class: 'igv-roi-table-button' })
        this._footerDOM.appendChild(copySequenceButton)

        copySequenceButton.id = 'igv-roi-hide-show-button'
        copySequenceButton.textContent = 'Copy Sequence'
        copySequenceButton.title = 'One region only of max size 1 mb'
        this.copySequenceButton = copySequenceButton

        enableButton(this.copySequenceButton, false)

        async function copySequenceButtonHandler(event) {
            event.preventDefault()
            event.stopPropagation()

            // capture loci
            const selected = this.tableDOM.querySelectorAll('.igv-roi-table-row-selected')

            if (selected.length > 0) {

                const loci = []
                for (let el of selected) {
                    const { locus } = parseRegionKey(el.dataset.region)
                    loci.push(locus)
                }

                // unselect
                for (let el of this.tableDOM.querySelectorAll('.igv-roi-table-row')) {
                    el.classList.remove('igv-roi-table-row-selected')
                }

                this.setTableRowSelectionState(false)

                if (loci.length > 0) {
                    const { chr, start, end } = parseLocusString(loci[0], this.browser.isSoftclipped())
                    const seq = await this.browser.genome.getSequence(chr, start, end)
                    await navigator.clipboard.writeText(seq)

                }
            }


        }

        this.boundCopySequenceButtonHandler = copySequenceButtonHandler.bind(this)
        this.copySequenceButton.addEventListener('click', this.boundCopySequenceButtonHandler)

        // Hide/Show Button
        const toggleROIButton = DOMUtils.div({ class: 'igv-roi-table-button' })
        this._footerDOM.appendChild(toggleROIButton)

        toggleROIButton.id = 'igv-roi-hide-show-button'
        toggleROIButton.textContent = 'Hide Overlays'
        this.toggleROIButton = toggleROIButton

        function toggleROIButtonHandler(event) {
            event.preventDefault()
            event.stopPropagation()
            this.roiManager.toggleROIs()
        }

        this.boundToggleDisplayButtonHandler = toggleROIButtonHandler.bind(this)
        this.toggleROIButton.addEventListener('click', this.boundToggleDisplayButtonHandler)
    }

    // This is a rather roundabot way to get the manager
    get roiManager() {
        return this.browser.roiManager
    }


    setTableRowSelectionState(isTableRowSelected) {
        super.setTableRowSelectionState(isTableRowSelected)
        const selected = this.tableDOM.querySelectorAll('.igv-roi-table-row-selected')

        if (selected.length > 0 && selected.length < 2) {
            const { locus } = parseRegionKey(selected[ 0 ].dataset.region)
            const { chr, start, end } = parseLocusString(locus, this.browser.isSoftclipped())
            enableButton(this.copySequenceButton, (end - start) < 1e6)
        } else {
            enableButton(this.copySequenceButton, false)
        }


    }

    dispose() {

        document.removeEventListener('click', this.boundGotoButtonHandler)
        document.removeEventListener('click', this.boundCopySequenceButtonHandler)
        document.removeEventListener('click', this.boundToggleDisplayButtonHandler)

        this.browser.roiTableControl.buttonHandler(false)
        super.dispose()
    }

    static getColumnFormatConfiguration(doIncludeROISetNames) {

        if (true === doIncludeROISetNames) {

            return [
                    { label: 'Chr', width: '20%' },
                    { label: 'Start', width: '15%' },
                    { label: 'End', width: '15%' },
                    { label: 'Description', width: '30%' },
                    { label: 'ROI Set', width: '20%' }
                ]
        } else {
            return [
                    { label: 'Chr', width: '25%' },
                    { label: 'Start', width: '20%' },
                    { label: 'End', width: '20%' },
                    { label: 'Description', width: '35%' }
                ]
        }

    }

    static gotoButtonHandler (event) {

        event.stopPropagation()

        const selected = this.tableDOM.querySelectorAll('.igv-roi-table-row-selected')
        const loci = []
        for (let el of selected) {
            const { locus } = parseRegionKey(el.dataset.region)
            loci.push(locus)
        }

        for (let el of this.tableDOM.querySelectorAll('.igv-roi-table-row')) {
            el.classList.remove('igv-roi-table-row-selected')
        }

        this.setTableRowSelectionState(false)

        if (loci.length > 0) {
            this.browser.search(loci.join(' '))
        }

    }

}

function enableButton(button, doEnable) {
    button.style.pointerEvents = doEnable ? 'auto' : 'none'
    button.style.color = doEnable ? appleCrayonRGB('licorice') : appleCrayonRGB('silver')
    button.style.borderColor = doEnable ? appleCrayonRGB('licorice') : appleCrayonRGB('silver')

}


export default ROITable
