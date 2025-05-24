import {createCheckbox} from "../../igv-icons.js"
import {renderSnp} from "../render/renderSnp.js"

export default class FeatureMenuManager {
    constructor(config) {
        this.displayMode = config.displayMode || "EXPANDED"
        this.colorBy = config.colorBy
        this.render = config.render
    }

    getMenuItemList() {
        const menuItems = []

        if (this.render === renderSnp) {
            menuItems.push('<hr/>')

            for (const colorScheme of ["function", "class"]) {
                function colorSchemeHandler() {
                    this.colorBy = colorScheme
                    this.trackView.repaintViews()
                }

                menuItems.push({
                    element: createCheckbox(`Color by ${colorScheme}`, colorScheme === this.colorBy),
                    click: colorSchemeHandler
                })
            }
        }

        menuItems.push('<hr/>')

        const displayModeLabels = {
            "COLLAPSED": "Collapse",
            "SQUISHED": "Squish",
            "EXPANDED": "Expand"
        }

        for (const displayMode of ["COLLAPSED", "SQUISHED", "EXPANDED"]) {
            function displayModeHandler() {
                this.displayMode = displayMode
                this.config.displayMode = displayMode
                this.trackView.checkContentHeight()
                this.trackView.repaintViews()
            }

            menuItems.push({
                element: createCheckbox(displayModeLabels[displayMode], displayMode === this.displayMode),
                click: displayModeHandler
            })
        }

        return menuItems
    }

    getContextMenuItemList(clickState) {
        const features = this.clickedFeatures(clickState)

        if (undefined === features || 0 === features.length) {
            return undefined
        }

        if (features.length > 1) {
            features.sort((a, b) => (b.end - b.start) - (a.end - a.start))
        }
        const f = features[0]   // The shortest clicked feature

        if ((f.end - f.start) <= 1000000) {
            const list = [{
                label: 'View feature sequence',
                click: async () => {
                    let seq = await this.browser.genome.getSequence(f.chr, f.start, f.end)
                    if (!seq) {
                        seq = "Unknown sequence"
                    } else if (f.strand === '-') {
                        seq = reverseComplementSequence(seq)
                    }
                    this.browser.alert.present(seq)
                }
            }]

            if (isSecureContext() && navigator.clipboard !== undefined) {
                list.push({
                    label: 'Copy feature sequence',
                    click: async () => {
                        let seq = await this.browser.genome.getSequence(f.chr, f.start, f.end)
                        if (!seq) {
                            seq = "Unknown sequence"
                        } else if (f.strand === '-') {
                            seq = reverseComplementSequence(seq)
                        }
                        try {
                            await navigator.clipboard.writeText(seq)
                        } catch (e) {
                            console.error(e)
                            this.browser.alert.present(`error copying sequence to clipboard ${e}`)
                        }
                    }
                })
            }
            list.push('<hr/>')
            return list
        } else {
            return undefined
        }
    }
} 