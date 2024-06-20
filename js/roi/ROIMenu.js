import * as DOMUtils from "../ui/utils/dom-utils.js"
import * as UIUtils from "../ui/utils/ui-utils.js"
import {isSecureContext} from "../util/igvUtils.js"
import {createBlatTrack} from "../blat/blatTrack.js"

const maxSequenceSize = 100000
const maxBlatSize = 25000


class ROIMenu {
    constructor(browser, parent) {

        this.browser = browser

        // container
        this.container = DOMUtils.div({class: 'igv-roi-menu'})
        parent.appendChild(this.container)

        // header
        const header = DOMUtils.div()
        this.container.appendChild(header)

        UIUtils.attachDialogCloseHandlerWithParent(header, () => this.container.style.display = 'none')

        // body
        this.body = DOMUtils.div()
        this.container.appendChild(this.body)

        this.container.style.display = 'none'

    }

    async present(feature, isUserDefined, event, roiManager, columnContainer, regionElement) {
        const menuItems = this.menuItems(feature, isUserDefined, event, roiManager, columnContainer, regionElement)
        this.browser.menuPopup.presentTrackContextMenu(event, menuItems)
    }

    menuItems(feature, isUserDefined, event, roiManager, columnContainer, regionElement) {

        const items = [`<b>${feature.name || ''}</b>`,]

        if (isUserDefined) {
            items.push(
                '<hr/>',
                {
                    label: 'Set description ...',
                    click: () => {
                        const callback = () => {
                            const value = this.browser.inputDialog.value || ''
                            feature.name = value.trim()
                            this.browser.roiManager.repaintTable()
                        }
                        const config =
                            {
                                label: 'Description',
                                value: (feature.name || ''),
                                callback
                            }

                        this.browser.inputDialog.present(config, event)

                    }
                }
            )
        }

        // sequence

        // copy
        if (isSecureContext() && feature.end - feature.start < maxBlatSize) {
            items.push('<hr/>')
            items.push({
                label: 'Copy reference sequence',
                click: async () => {
                    this.container.style.display = 'none'
                    let sequence = await this.browser.genome.getSequence(feature.chr, feature.start, feature.end)
                    if (!sequence) {
                        sequence = "Unknown sequence"
                    }
                    try {
                        await navigator.clipboard.writeText(sequence)
                    } catch (e) {
                        console.error(e)
                        this.browser.alert.present(`error copying sequence to clipboard ${e}`)
                    }
                }
            })
        }

        if (feature.end - feature.start <= maxSequenceSize) {
            // blat
            items.push('<hr/>')
            items.push({
                label: 'BLAT reference sequence',
                click: async () => {
                    this.container.style.display = 'none'
                    const {chr, start, end} = feature
                    let sequence = await this.browser.genome.getSequence(chr, start, end)
                    if (sequence) {
                        const name = `blat: ${chr}:${start + 1}-${end}`
                        const title = `blat: ${chr}:${start + 1}-${end}`
                        createBlatTrack({sequence, browser: this.browser, name, title})
                    }
                }
            })
        }


        if (isUserDefined) {
            items.push(
                '<hr/>',
                {
                    label: 'Delete',
                    click: () => {
                        this.browser.roiManager.deleteRegionWithKey(regionElement.dataset.region, this.browser.columnContainer)
                        this.browser.roiManager.repaintTable()
                    }
                }
            )
        }

        return items
    }

    dispose() {
        this.container.innerHTML = ''
    }

}

function

removeAllChildNodes(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild)
    }
}

export default ROIMenu
