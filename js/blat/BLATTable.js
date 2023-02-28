import { DOMUtils } from '../../node_modules/igv-ui/dist/igv-ui.js'
import { StringUtils } from '../../node_modules/igv-utils/src/index.js'

import RegionTableBase from '../ui/regionTableBase.js'

class BLATTable extends RegionTableBase {

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

        for (const string of pretty) {
            const el = DOMUtils.div()
            dom.appendChild(el)

            const format = this.columnFormat[ pretty.indexOf(string) ]
            el.style.width = format.width || 'fit-content'
            el.innerText = string
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
            { label: 'chr', width: '80px' },
            { label: 'start', width: '170px' },
            { label: 'end', width: '170px' },
            { label: 'strand' },
            { label: 'score' },
            { label: 'match' },
            { label: "mis-match" },
            { label: "rep. match" },
            { label: "N's" },
            { label: 'Q gap count' },
            { label: 'Q gap bases' },
            { label: 'T gap count' },
            { label: 'T gap bases' },
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

export default BLATTable
