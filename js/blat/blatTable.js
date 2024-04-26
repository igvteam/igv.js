import * as DOMUtils from "../ui/utils/dom-utils.js"
import { StringUtils } from '../../node_modules/igv-utils/src/index.js'

import RegionTableBase from '../ui/regionTableBase.js'

class BlatTable extends RegionTableBase {

    constructor(config) {

        const cooked = Object.assign({ 'width':'1024px' }, config)
        super(cooked)

        this.descriptionDOM = config

    }

    set descriptionDOM(config) {

        if (config.description) {

            let dom

            // BLAT result for query sequence
            dom = DOMUtils.div({ class: 'igv-roi-table-description' })
            this.tableDOM.insertBefore(dom, this.tableColumnTitles)
            dom.style.height = 'auto'
            dom.innerHTML = `BLAT result for query sequence:`

            // CTAATCAtctacactggtttctactg ...
            dom = DOMUtils.div({ class: 'igv-roi-table-description' })
            this.tableDOM.insertBefore(dom, this.tableColumnTitles)
            dom.style.height = 'auto'
            dom.style.maxHeight = '128px'
            dom.innerHTML = config.description

            // Select one or more rows ...
            dom = DOMUtils.div({ class: 'igv-roi-table-goto-explainer' })
            this.tableDOM.insertBefore(dom, this.tableColumnTitles)
            dom.innerHTML = `Select one or more rows and click Go To to view the regions`

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

        Array.from(this.tableRowContainer.querySelectorAll('.igv-roi-table-row')).forEach(el => el.remove())

        if (records.length > 0) {

            for (let record of records) {
                const row = this.tableRowDOM(record)
                this.tableRowContainer.appendChild(row)
            }

        }

    }

    static getColumnFormatConfiguration() {

        /*
        return [
            { label:         'chr', width: '60px' },
            { label:       'start', width: '100px' },
            { label:         'end', width: '100px' },
            { label:      'strand', width: '50px' },
            { label:       'score', width: '50px' },
            { label:       'match', width: '50px' },
            { label:   "mis-match", width: '70px' },
            { label:  "rep. match", width: '70px' },
            { label:         "N's", width: '32px' },
            { label: 'Q gap count', width: '90px' },
            { label: 'Q gap bases', width: '90px' },
            { label: 'T gap count', width: '90px' },
            { label: 'T gap bases', width: '90px' },
        ]
        */

        return [
            { label:         'chr', width: '7%' },
            { label:       'start', width: '12%' },
            { label:         'end', width: '12%' },
            { label:      'strand', width: '5%' },
            { label:       'score', width: '5%' },
            { label:       'match', width: '5%' },
            { label:   "mis-match", width: '7%' },
            { label:  "rep. match", width: '7%' },
            { label:         "N's", width: '3%' },
            { label: 'Q gap count', width: '9%' },
            { label: 'Q gap bases', width: '9%' },
            { label: 'T gap count', width: '9%' },
            { label: 'T gap bases', width: '9%' },
        ]
    }

    static gotoButtonHandler (event) {

        event.stopPropagation()

        const selectedRows = this.tableDOM.querySelectorAll('.igv-roi-table-row-selected')

        const loci = []
        for (const row of selectedRows) {

            const record = []
            row.querySelectorAll('div').forEach(el => record.push(el.innerText))

            const [ chr, start, end ] = record
            loci.push(`${ chr }:${ start }-${ end }`)
        }

        for (const el of this.tableDOM.querySelectorAll('.igv-roi-table-row')) {
            el.classList.remove('igv-roi-table-row-selected')
        }

        this.setTableRowSelectionState(false)

        this.browser.search(loci.join(' '))

        // console.log(`browser search( ${loci.join(' ')} )`)

    }

}

export default BlatTable
