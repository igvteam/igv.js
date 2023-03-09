import { DOMUtils } from '../../node_modules/igv-ui/dist/igv-ui.js'
import { StringUtils } from '../../node_modules/igv-utils/src/index.js'

import RegionTableBase from '../ui/regionTableBase.js'

class BlatTable extends RegionTableBase {

    set columnTitleDOM(columnFormat) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-column-titles' })
        this.container.appendChild(dom)

        for (const format of columnFormat) {
            const col = DOMUtils.div()
            dom.appendChild(col)
            col.style.width = format.width || 'fit-content'
            col.innerText = format.label
        }

    }

    tableRowDOM(record) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-row' })

        const pretty = record.map(item => isFinite(item) ? StringUtils.numberFormatter(item) : item)

        for (let i = 0; i < pretty.length; i++) {

            const el = DOMUtils.div()
            dom.appendChild(el)

            const format = this.columnFormat[ i ]
            el.style.width = format.width || 'fit-content'
            el.innerText = pretty[ i ]
        }

        this.tableRowDOMHelper(dom)

        return dom
    }

    renderTable(records) {

        Array.from(this.rowContainerDOM.querySelectorAll('.igv-roi-table-row')).forEach(el => el.remove())

        if (records.length > 0) {

            for (let record of records) {
                const row = this.tableRowDOM(record)
                this.rowContainerDOM.appendChild(row)
            }

        }

    }

    static getColumnFormatConfiguration() {

        return [
            { label:         'chr', width: '80px' },
            { label:       'start', width: '170px' },
            { label:         'end', width: '170px' },
            { label:      'strand', width: '64px' },
            { label:       'score', width: '64px' },
            { label:       'match', width: '64px' },
            { label:   "mis-match", width: '70px' },
            { label:  "rep. match", width: '75px' },
            { label:         "N's", width: '32px' },
            { label: 'Q gap count', width: '90px' },
            { label: 'Q gap bases', width: '90px' },
            { label: 'T gap count', width: '80px' },
            { label: 'T gap bases', width: '90px' },
        ]
    }

    static gotoButtonHandler (event) {

        event.stopPropagation()

        const selectedRows = this.container.querySelectorAll('.igv-roi-table-row-selected')

        const loci = []
        for (const row of selectedRows) {

            const record = []
            row.querySelectorAll('div').forEach(el => record.push(el.innerText))

            const [ chr, start, end ] = record
            loci.push(`${ chr }:${ start }-${ end }`)
        }

        for (const el of this.container.querySelectorAll('.igv-roi-table-row')) {
            el.classList.remove('igv-roi-table-row-selected')
        }

        this.setTableRowSelectionState(false)

        console.log(`browser search( ${loci.join(' ')} )`)

    }

}

export default BlatTable
