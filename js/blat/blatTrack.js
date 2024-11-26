import FeatureTrack from "../feature/featureTrack.js"
import BlatTable from "./blatTable.js"
import {blat} from "./blatClient.js"
import StaticFeatureSource from "../feature/staticFeatureSource.js"

const maxSequenceSize = 25000
//const blatServer = "https://genome.ucsc.edu/cgi-bin/hgBlat"
const defaultBlatServer = "https://igv.org/services/blatUCSC.php"
//const blatServer = "http://localhost:8000/blatUCSC.php"

class BlatTrack extends FeatureTrack {

    constructor(config, browser) {
        super(config, browser)
        if (!this.name) {
            this.name = 'Blat Results'
        }
        this.sequence = config.sequence
        this.table = undefined

        // On initial creation features are fetched before track construction
        if(config.features) {
            this._features = config.features
            this.featureSource = new StaticFeatureSource({features: config.features}, this.browser.genome)
            delete config.features
        }
    }

    async postInit() {
        if(!this.featureSource) {
            // This will be the case when restoring from a session
            const db = this.browser.genome.id   // TODO -- blat specific property
            const url = this.browser.config["blatServerURL"]
            const features = await blat({url, userSeq: this.sequence, db})
            this._features = features;
            this.featureSource = new StaticFeatureSource({features}, this.browser.genome)
        }

        this._initialColor = this.color || this.constructor.defaultColor
        this._initialAltColor = this.altColor || this.constructor.defaultColor

    }

    openTableView() {

        if (undefined === this.table) {

            const rows = this._features.map(f => [
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
                    parent: this.browser.columnContainer,
                    headerTitle: this.config.title,
                    description: this.sequence,
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

        function click() {
            this.openTableView()
        }
        menuItems.push({ label: 'Open table view', click })

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


async function createBlatTrack({sequence, browser, name, title}) {

    if (sequence.length > maxSequenceSize) {
        browser.alert.present(`Sequence size exceeds maximum allowed length (${sequence.length} > ${maxSequenceSize})`)
        return
    }

    try {

        const db = browser.genome.id   // TODO -- blat specific property
        const url = browser.config["blatServerURL"] || defaultBlatServer
        const features = await blat({url, userSeq: sequence, db})

        const trackConfig = {
            type: 'blat',
            name: name || 'blat results',
            title: title || 'blat results',
            sequence: sequence,
            altColor: 'rgb(176, 176, 236)',
            color: 'rgb(236, 176, 176)',
            searchable: false,
            features
        }

        const track = await browser.loadTrack(trackConfig)
        track.openTableView()

    } catch (e) {
        browser.alert.present(`Error performing blat search:  ${e}`)
    }

}

export default BlatTrack
export {createBlatTrack, maxSequenceSize}
