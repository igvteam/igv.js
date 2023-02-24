import {StringUtils} from '../../node_modules/igv-utils/src/index.js'
import {DOMUtils} from '../../node_modules/igv-ui/src/index.js'

import RegionTableBase from './regionTableBase.js'


class BLATTable extends RegionTableBase {
    constructor(config) {
        super(config)
    }

    set columnTitleDOM(columnFormat) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-column-titles' })
        this.container.appendChild(dom)

        for (const string of columnFormat) {
            const col = DOMUtils.div()
            dom.appendChild(col)
            col.style.width = 'fit-content'
            col.innerText = string
        }

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

    tableRowDOM(record) {

        const dom = DOMUtils.div({ class: 'igv-roi-table-row' })

        const pretty = record.map(item => isFinite(item) ? StringUtils.numberFormatter(item) : item)

        for (const string of pretty) {
            const el = DOMUtils.div()
            dom.appendChild(el)
            el.innerText = string
            el.style.width = 'fit-content'
        }

        dom.addEventListener('mousedown', event => {
            event.stopPropagation()

            dom.classList.toggle('igv-roi-table-row-selected')
            dom.classList.contains('igv-roi-table-row-selected') ? dom.classList.remove('igv-roi-table-row-hover') : dom.classList.add('igv-roi-table-row-hover')

            // this.setButtonState(dom.classList.contains('igv-roi-table-row-selected'))
        })

        dom.addEventListener('mouseover', e => {
            dom.classList.contains('igv-roi-table-row-selected') ? dom.classList.remove('igv-roi-table-row-hover') : dom.classList.add('igv-roi-table-row-hover')
        })

        dom.addEventListener('mouseout', e => {
            dom.classList.remove('igv-roi-table-row-hover')
        })

        return dom
    }

}

export default BLATTable
