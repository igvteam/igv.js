import { DOMUtils } from '../../node_modules/igv-ui/dist/igv-ui.js'
import { StringUtils } from '../../node_modules/igv-utils/src/index.js'

import { createRegionKey, parseRegionKey } from './ROIManager.js'
import RegionTableBase from '../ui/regionTableBase.js'

class ROITable extends RegionTableBase {
    constructor(config) {

        const cooked = Object.assign({ 'width':'512px' }, config)
        super(cooked)
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

    dispose() {

        document.removeEventListener('click', this.boundGotoButtonHandler)

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
export default ROITable
