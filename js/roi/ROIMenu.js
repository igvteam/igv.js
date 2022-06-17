import { DOMUtils } from '../../node_modules/igv-utils/src/index.js'

class ROIMenu {
    constructor(browser, parent) {

        this.browser = browser

        // container
        this.container = DOMUtils.div({ class: 'igv-roi-menu-next-gen' })
        parent.appendChild(this.container)

        // header
        const header = DOMUtils.div()
        this.container.appendChild(header)

        // body
        this.body = DOMUtils.div()
        this.container.appendChild(this.body)

        // // description
        // const description = DOMUtils.div()
        // body.appendChild(description)
        // description.innerText = 'Description'
        //
        // // delete
        // const _delete_ = DOMUtils.div()
        // body.appendChild(_delete_)
        // _delete_.innerText = 'Delete'

        this.container.style.display = 'none'

    }

    async present(x, y, roiManager, columnContainer, regionElement) {

        removeAllChildNodes(this.body)

        // description
        const description = DOMUtils.div()
        this.body.appendChild(description)
        description.innerText = 'Description'

        const feature = await this.browser.roiManager.findUserDefinedRegionWithKey(regionElement.dataset.region)

        description.addEventListener('click', event => {

            event.stopPropagation()

            const callback = () => {

                const value = this.browser.inputDialog.input.value
                feature.name = ('' === value || undefined === value) ? 'untitled' : value.trim()

                this.container.style.display = 'none'

                this.browser.roiManager.repaintTable()
            }

            const config =
                {
                    label: 'Set Description',
                    value: (feature.name || 'unnamed'),
                    callback
                }

            this.browser.inputDialog.present(config, event)

        })



        // delete
        const _delete_ = DOMUtils.div()
        this.body.appendChild(_delete_)
        _delete_.innerText = 'Delete'

        _delete_.addEventListener('click', event => {
            event.stopPropagation()
            this.container.style.display = 'none'
            this.browser.roiManager.deleteUserDefinedRegionWithKey(regionElement.dataset.region, this.browser.columnContainer)
        })







        // columnContainer.addEventListener('click', event => {
        //     event.stopPropagation()
        //     this.container.style.display = 'none'
        // })

        this.container.style.left = `${ x }px`
        this.container.style.top  = `${ y }px`
        this.container.style.display = 'flex'

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
        row = DOMUtils.div({ class: 'igv-roi-menu-row-edit-description' })
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
        row = DOMUtils.div({ class: 'igv-roi-menu-row' })
        row.innerText = 'Delete region'
        this.container.appendChild(row)

        row.addEventListener('click', event => {
            event.stopPropagation()
            this.container.style.display = 'none'
            this.browser.roiManager.deleteUserDefinedRegionWithKey(regionElement.dataset.region, this.browser.columnContainer)
        })

        this.container.style.left = `${ x }px`
        this.container.style.top  = `${ y }px`
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
        parent.removeChild(parent.firstChild);
    }
}

export default ROIMenu
