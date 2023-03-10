import FeatureTrack from "../feature/featureTrack.js"
import BlatTable from "./blatTable.js"


class BlatTrack extends FeatureTrack {


    constructor(config, browser) {
        super(config, browser)
        if (!this.name) {
            this.name = 'Blat Results'
        }
        this.sequence = config.sequence
        this.table = undefined
    }

    openTableView(seq) {

        if (undefined === this.table) {

            // const dev_null = this.config.features.map(feature => {
            //     const kv = Object.entries(feature)
            //     return kv
            // })


            const rows = this.config.features.map(f => [
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
            ])

            const config =
                {
                    browser: this.browser,
                    parent: this.browser.parent,
                    headerTitle: this.name,
                    description: `BLAT results for query sequence:<br>${ this.sequence }`,
                    dismissHandler: () => {
                        this.table.dismiss()
                        this.table.dispose()
                        this.table = undefined
                    },
                    columnFormat: BlatTable.getColumnFormatConfiguration(),
                    gotoButtonHandler: BlatTable.gotoButtonHandler
                }

            this.table = new BlatTable(config)
            this.table.renderTable(rows)
        }

        this.table.present()

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
