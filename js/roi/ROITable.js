import { DOMUtils, Icon, makeDraggable } from '../../node_modules/igv-ui/dist/igv-ui.js'
import { StringUtils} from '../../node_modules/igv-utils/src/index.js'
import { createRegionKey, parseRegionKey } from './ROIManager.js'
import RegionTableBase from './regionTableBase.js'

class ROITable extends RegionTableBase {

    constructor(browser, parent, hasROISetNames) {

        super(browser)

        this.container = DOMUtils.div({ class: hasROISetNames ? 'igv-roi-table' : 'igv-roi-table-four-column' })
        parent.appendChild(this.container)

        this.hasROISetNames = hasROISetNames

        const headerConfig =
            {
                container: this.container,
                title: 'Regions of Interest',
                dismissHandler: () => browser.roiTableControl.buttonHandler(false)
            }
        this.headerDOM(headerConfig)

        const columnTitleConfig =
            {
                container: this.container,
                titleList:
                [
                    'Chr',
                    'Start',
                    'End',
                    'Description',
                ]
            };

        if (true === hasROISetNames) {
            columnTitleConfig.titleList.push('ROI Set')
        }

        this.columnTitleDOM(columnTitleConfig)

        this.rowContainerDOM(this.container)

        this.footerDOM(this.container)

        const { y:y_root } = browser.root.getBoundingClientRect()
        const { y:y_parent } = parent.getBoundingClientRect()

        const constraint = -(y_parent - y_root)

        makeDraggable(this.container, this.header, { minX:0, minY:constraint })

        this.container.style.display = 'none'

    }

    renderTable(records) {

        Array.from(this.tableRowContainerDOM.querySelectorAll('.igv-roi-table-row')).forEach(el => el.remove())

        if (records.length > 0) {

            const sortedRecords = records.sort((a, b) => (a.feature.chr.localeCompare(b.feature.chr) || a.feature.start - b.feature.start || a.feature.end - b.feature.end))

            for (let record of sortedRecords) {
                const row = this.tableRowDOM(record)
                this.tableRowContainerDOM.appendChild(row)
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

        for (let string of strings) {
            const el = DOMUtils.div()
            el.innerText = string
            dom.appendChild(el)
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

    footerDOM(container) {

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

        this.footerDOM = dom
    }

    dispose() {

        this.browser.roiTableControl.buttonHandler(false)

        this.container.innerHTML = ''

        for (let key of Object.keys(this)) {
            this[key] = undefined
        }
    }

}

export default ROITable
