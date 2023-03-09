import {IGVTable} from '../../node_modules/igv-ui/dist/igv-ui.js'
import FeatureTrack from "../feature/featureTrack.js"
import {renderSnp} from "../feature/render/renderSnp.js"
import $ from "../vendor/jquery-3.3.1.slim.js"
import {createCheckbox} from "../igv-icons.js"


class BlatTrack extends FeatureTrack {


    constructor(config, browser) {
        super(config, browser)
        if (this.name) {
            this.name = 'Blat Results'
        }
    }

    openTableView() {
        if (!this.table) {
            const tableData = {
                title: "<b>BLAT Results</b>:  click on row to go to alignment",
                headers: ["chr", "start", "end", "strand", "score", "match", "mis-match", "rep. match", "N's", "Q gap count", "Q gap bases", "T gap count", "T gap bases"],
                rows: this.config.features.map(f => [
                    f.chr,
                    (f.start + 1),
                    f.end,
                    f.strand,
                    f.score,
                    f.matches,
                    f.misMatches,
                    f.repMatches,
                    f.nCount,
                    f.qNumInsert,
                    f.qBaseInsert,
                    f.tNumInsert,
                    f.tBaseInsert
                ]),
                rowClickHandler: (rowData) => {
                    console.log(`${rowData[0]}:${parseInt(rowData[1]) - 1}-${rowData[2]}`)
                }
            }
            this.table = new IGVTable(this.browser.root, tableData)
        }
        this.table.show()

        const config =
            {
                browser,
                parent: document.getElementById('igv-container'),
                headerTitle: 'BLAT Results',
                dismissHandler: () => blatTable.dismiss(),
                columnFormat: BlatTable.getColumnFormatConfiguration(),
                gotoButtonHandler: BlatTable.gotoButtonHandler
            }

        const blatTable = new BlatTable(config)
    }

    menuItemList() {

        const menuItems = super.menuItemList()

        menuItems.push('<hr/>')
        menuItems.push({
            label: 'Open table view',
            click: () => this.openTableView()
        })
        return menuItems
    }


    /**
     * Track has been permanently removed.  Release resources and other cleanup
     */
    dispose() {
        super.dispose()
        // Release DOM element for table
        if (this.table) {
            this.table.popover.parentElement.removeChild(this.table.popover)

        }


    }
}


export default BlatTrack