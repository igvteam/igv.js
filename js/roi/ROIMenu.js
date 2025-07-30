import * as DOMUtils from "../ui/utils/dom-utils.js"
import * as UIUtils from "../ui/utils/ui-utils.js"
import {isSecureContext} from "../util/igvUtils.js"
import {createBlatTrack} from "../blat/blatTrack.js"

const maxSequenceSize = 1000000
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

    async present(feature, roiSet, event, roiManager, columnContainer, regionElement) {
        const menuItems = this.menuItems(feature, roiSet, event, roiManager, columnContainer, regionElement)
        this.browser.menuPopup.presentTrackContextMenu(event, menuItems)
    }

    menuItems(feature, roiSet, event, roiManager, columnContainer, regionElement) {
        const items = feature.name ? [`<b>${feature.name}</b><br/>`]  : []
        if ('name' in roiSet) items.push(`<b>ROI Set: ${roiSet.name}</b>`)
        if (items.length > 0) items.push(`<hr/>`)

        if (roiSet.isUserDefined) {
            this.#addDescriptionMenuItem(items, feature, event)
        }

        // sequence

        // copy
        if (isSecureContext() && feature.end - feature.start < maxSequenceSize) {
            this.#addCopySequenceMenuItem(items, feature)
        }

        if (feature.end - feature.start <= maxBlatSize) {
            this.#addBlatMenuItem(items, feature)
        }

        // Add sort menu items
        this.#addSortMenuItems(items, feature)

        // REMOVED: Add filter menu items - now handled by individual tracks
        // this.#addFilterMenuItems(items, feature, event)

        // ROI driven filter

        if (roiSet.isUserDefined) {

            this.#addDeleteMenuItem(items, feature, roiSet, roiManager, columnContainer, regionElement)
        }

        return items
    }

    #addDeleteMenuItem(items, feature, roiSet, roiManager, columnContainer, regionElement) {

        items.push('<hr/>')
        items.push(
            {
                label: 'Delete',
                click: async () => {
                    roiSet.removeFeature(feature)
                    const userDefinedFeatures = await roiSet.getAllFeatures()

                    // Delete user defined ROI Set if it is empty
                    if (Object.keys(userDefinedFeatures).length === 0) {
                        roiManager.deleteUserDefinedROISet()
                    }
                    roiManager.deleteRegionWithKey(regionElement.dataset.region, columnContainer)
                    roiManager.repaintTable()
                }
            }
        )
    }

    #addCopySequenceMenuItem(items, feature) {
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
                    this.browser.alert.present(undefined, `Failed to copy the sequence to the clipboard. (${e.message})`)
                }
            }
        })
    }

    #addDescriptionMenuItem(items, feature, event) {
        items.push(
            {
                label: 'Set description ...',
                click: () => {
                    const callback = () => {
                        const value = this.browser.inputDialog.value || ''
                        feature.name = value.trim()
                        this.browser.roiManager.repaintTable()
                    }
                    const config = {
                        label: 'Description',
                        value: (feature.name || ''),
                        callback
                    }

                    this.browser.inputDialog.present(config, event)
                }
            }
        )
    }

    #addSortMenuItems(items, feature) {

        const found = this.browser.findTracks(track => typeof track.sortByValue === 'function')
        if (found.length > 0) {

            items.push(`<hr/>`)

            const { chr, start, end } = feature
            items.push({
                    label: 'Sort by value (ascending)',
                    click: () => Promise.all(found.map(track => track.sortByValue({ option: 'VALUE', direction: 'ASC', chr, start, end })))
                })

            items.push('<hr style="border: none; height: 1px; background-color: white; margin-top: 1px; margin-bottom: 1px;" />')

            items.push({
                    label: 'Sort by value (descending)',
                    click: () => Promise.all(found.map(track => track.sortByValue({ option: 'VALUE', direction: 'DESC', chr, start, end })))
                })
        }
    }

    #addFilterMenuItems(items, feature, event) {
        // REMOVED: Filter menu items are now available in SegTrack context menu
        // Filtering is now done on individual tracks rather than globally
    }

    #addBlatMenuItem(items, feature) {
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

    dispose() {
        this.container.innerHTML = ''
    }

}

export default ROIMenu
