import {IGVTable} from '../../node_modules/igv-ui/dist/igv-ui.js'
import FeatureTrack from "../feature/featureTrack.js"


class BlatTrack extends FeatureTrack {


    constructor(config, browser) {
        super(config, browser)
    }

    openTableView() {
        if(!this.table) {
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
    }

    /**
     * Track has been permanently removed.  Release resources and other cleanup
     */
    dispose() {
        super.dispose()
        // Release DOM element for table -- todo move this to IGVTable class "dispose" method
        if(this.table) {
            this.table.popover.parentElement.removeChild(this.table.popover)

        }



    }
}


export default BlatTrack