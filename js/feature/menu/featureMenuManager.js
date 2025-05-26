import { reverseComplementSequence } from "../../util/sequenceUtils.js"
class FeatureMenuManager {
    constructor(config) {
        this.displayMode = config.displayMode || "EXPANDED"
        this.colorBy = config.colorBy
    }

    getMenuItemList() {
        const items = []

        // Add display mode options
        items.push({
            label: "Display Mode",
            submenu: [
                {
                    label: "Collapsed",
                    click: () => this.setDisplayMode("COLLAPSED")
                },
                {
                    label: "Expanded",
                    click: () => this.setDisplayMode("EXPANDED")
                },
                {
                    label: "Squished",
                    click: () => this.setDisplayMode("SQUISHED")
                }
            ]
        })

        // Add color by options if applicable
        if (this.colorBy) {
            items.push({
                label: "Color By",
                submenu: [
                    {
                        label: "Function",
                        click: () => this.setColorBy("function")
                    },
                    {
                        label: "Class",
                        click: () => this.setColorBy("class")
                    }
                ]
            })
        }

        return items
    }

    setDisplayMode(mode) {
        this.displayMode = mode
        // Notify track to redraw
        if (this.track) {
            this.track.trackView.repaint()
        }
    }

    setColorBy(mode) {
        this.colorBy = mode
        // Notify track to redraw
        if (this.track) {
            this.track.trackView.repaint()
        }
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

export default FeatureMenuManager
