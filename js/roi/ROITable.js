<<<<<<< HEAD
import { DOMUtils, Icon, makeDraggable } from '../../node_modules/igv-ui/dist/igv-ui.js'
=======

import { DOMUtils, Icon, makeDraggable } from '../../node_modules/igv-ui/src/index.js'
>>>>>>> 242a705c (Refactors to support table generalization)
import { StringUtils} from '../../node_modules/igv-utils/src/index.js'

import { createRegionKey, parseRegionKey } from './ROIManager.js'
import RegionTableBase from './regionTableBase.js'

class ROITable extends RegionTableBase {

    constructor(browser, parent, hasROISetNames) {

        super(browser, parent)

        this.hasROISetNames = hasROISetNames

        this.headerDOM =
            {
                browser,
                parent,
                container: this.container,
                title: 'Regions of Interest',
                dismissHandler: () => browser.roiTableControl.buttonHandler(false)
            }

        const columnTitleConfig =
            {
                container: this.container,
                titleList: getColumnTitleList(hasROISetNames)
            }

        this.columnTitleDOM = columnTitleConfig

        this.columnLayout = columnTitleConfig.titleList.slice().map(({ width }) => width)

        this.rowContainerDOM = this.container

        this.footerDOM = this.container

    }

    renderTable(records) {

        Array.from(this.rowContainerDOM.querySelectorAll('.igv-roi-table-row')).forEach(el => el.remove())

        if (records.length > 0) {

            const sortedRecords = records.sort((a, b) => (a.feature.chr.localeCompare(b.feature.chr) || a.feature.start - b.feature.start || a.feature.end - b.feature.end))

            for (let record of sortedRecords) {
                const row = this.tableRowDOM(record)
                this.rowContainerDOM.appendChild(row)
            }

        }
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

        if (false === this.hasROISetNames) {
            strings = strings.slice(0, 4)
        }

        for (let i = 0; i < strings.length; i++) {
            const el = DOMUtils.div()
            dom.appendChild(el)
            el.innerText = strings[ i ]
            el.style.width = this.columnLayout[ i ]
        }

        dom.addEventListener('mousedown', event => {
            event.stopPropagation()

            dom.classList.toggle('igv-roi-table-row-selected')
            dom.classList.contains('igv-roi-table-row-selected') ? dom.classList.remove('igv-roi-table-row-hover') : dom.classList.add('igv-roi-table-row-hover')

            this.setButtonState(dom.classList.contains('igv-roi-table-row-selected'))
        })

        dom.addEventListener('mouseover', e => {
            dom.classList.contains('igv-roi-table-row-selected') ? dom.classList.remove('igv-roi-table-row-hover') : dom.classList.add('igv-roi-table-row-hover')
        })

        dom.addEventListener('mouseout', e => {
            dom.classList.remove('igv-roi-table-row-hover')
        })

        return dom
    }

    set footerDOM(container) {

        const dom = DOMUtils.div()
        container.appendChild(dom)

        // Go To Button
        const gotoButton = DOMUtils.div({class: 'igv-roi-table-button'})
        dom.appendChild(gotoButton)

        gotoButton.id = 'igv-roi-table-view-button'
        gotoButton.textContent = 'Go To'
        gotoButton.style.pointerEvents = 'none'

        gotoButton.addEventListener('click', event => {

            event.stopPropagation()

            const selected = container.querySelectorAll('.igv-roi-table-row-selected')
            const loci = []
            for (let el of selected) {
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

        this._footerDOM = dom
    }

    get footerDOM() {
        return this._footerDOM
    }

    dispose() {

        this.browser.roiTableControl.buttonHandler(false)

        this.container.innerHTML = ''

        for (let key of Object.keys(this)) {
            this[key] = undefined
        }
    }

}

function getColumnTitleList(hasROISetNames) {

    if (true === hasROISetNames) {
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

export default ROITable
