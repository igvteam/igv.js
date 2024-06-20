import * as DOMUtils from "../ui/utils/dom-utils.js"
import * as UIUtils from "../ui/utils/ui-utils.js"

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
                },
                {
                    label: 'Delete region',
                    click: () => {
                        this.browser.roiManager.deleteRegionWithKey(regionElement.dataset.region, this.browser.columnContainer)
                        this.browser.roiManager.repaintTable()
                    }
                }
            )
        }

        return items
    }


    async present(feature, isUserDefined, event, roiManager, columnContainer, regionElement) {

        const menuItems = this.menuItems(feature, isUserDefined, event, roiManager, columnContainer, regionElement)
        this.browser.menuPopup.presentTrackContextMenu(event, menuItems)

    }

    async __present(x, y, roiManager, columnContainer, regionElement) {

        removeAllChildNodes(this.container)

        const feature = await this.browser.roiManager.findUserDefinedRegionWithKey(regionElement.dataset.region)

        let row

        // Go To
        // row = DOMUtils.div({ class: 'igv-roi-menu-row' })
        // row.innerText = 'Go To'
        // this.container.appendChild(row)
        //
        // row.addEventListener('click', event => {
        //     event.stopPropagation()
        //     this.container.style.display = 'none'
        //
        //     const { locus } = parseRegionKey(regionElement.dataset.region)
        //     this.browser.search(locus)
        // })

        // Description:
        row = DOMUtils.div({class: 'igv-roi-menu-row-edit-description'})
        this.container.appendChild(row)

        row.addEventListener('click', e => {
            e.stopPropagation()
        })

        const str = 'description-input'

        const label = document.createElement('label')
        row.appendChild(label)

        label.setAttribute('for', str)
        label.innerText = 'Description:'

        const input = document.createElement('input')
        row.appendChild(input)

        input.setAttribute('type', 'text')
        input.setAttribute('name', str)
        // input.setAttribute('placeholder', feature.name || 'Edit Description')
        input.setAttribute('placeholder', '')
        input.value = feature.name || ''

        input.addEventListener('change', async e => {

            e.stopPropagation()

            const feature = await this.browser.roiManager.findUserDefinedRegionWithKey(regionElement.dataset.region)
            feature.name = input.value

            input.blur()
            this.container.style.display = 'none'

            await this.browser.roiManager.repaintTable()
        })


        // Delete
        row = DOMUtils.div({class: 'igv-roi-menu-row'})
        row.innerText = 'Delete region'
        this.container.appendChild(row)

        row.addEventListener('click', event => {
            event.stopPropagation()
            this.container.style.display = 'none'
            this.browser.roiManager.deleteUserDefinedRegionWithKey(regionElement.dataset.region, this.browser.columnContainer)
        })

        this.container.style.left = `${x}px`
        this.container.style.top = `${y}px`
        this.container.style.display = 'flex'

        columnContainer.addEventListener('click', event => {
            event.stopPropagation()
            this.container.style.display = 'none'
        })

    }

    dispose() {
        this.container.innerHTML = ''
    }

}

function removeAllChildNodes(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild)
    }
}

export default ROIMenu
