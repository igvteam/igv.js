import { DOMUtils, Icon, makeDraggable } from '../../node_modules/igv-utils/src/index.js'
import {appleCrayonRGB, appleCrayonRGBA} from '../util/colorPalletes.js'

class ROIMenu {
    constructor(parent) {

        // container
        this.container = DOMUtils.div({ class: 'igv-roi-menu' })
        parent.appendChild(this.container)

        // header
        const header = DOMUtils.div({ class: 'igv-roi-header' })
        this.container.appendChild(header)

        // dismiss button
        const dismiss = DOMUtils.div()
        header.appendChild(dismiss)
        dismiss.appendChild(Icon.createIcon('times'))

        dismiss.addEventListener('click', event => {
            event.stopPropagation()
            event.preventDefault()
            this.container.style.display = 'none'
        })

        // body container
        this.bodyContainer = DOMUtils.div({ class: 'igv-roi-body' })
        this.container.appendChild(this.bodyContainer)

        // const colors =
        //     [
        //         'lavender',
        //         'tangerine',
        //         'honeydew',
        //         'carnation'
        //     ]
        //
        // const words =
        //     [
        //         'delete',
        //         'set color',
        //         'roi table',
        //     ]
        //
        // words.forEach(word => {
        //     const row = DOMUtils.div({ class: 'igv-roi-body-row' })
        //     bodyContainer.appendChild(row)
        //     // row.style.backgroundColor = appleCrayonRGB(colorName)
        //     row.innerText = word
        // })

        makeDraggable(this.container, header)

        this.container.style.display = 'none'

    }

    present(x, y, roiSet, columnContainer, regionKey) {

        // console.log(`ROI Set "${ roiSet.name }" feature ${ regionKey }`)

        removeAllChildNodes(this.bodyContainer)

        const lut =
            {
                'delete': () => {

                    this.container.style.display = 'none'

                    const selector = `[data-region="${ regionKey }"]`
                    columnContainer.querySelectorAll(selector).forEach(node => node.remove())

                    let [ _ignore_, __ignore__, ss, ee ] = regionKey.split('-')
                    ss = parseInt(ss)
                    ee = parseInt(ee)

                    const indices = roiSet.features.map((feature, i) => i).join(' ')

                    let indexToRemove
                    for (let r = 0; r < roiSet.features.length; r++) {
                        const { start, end } = roiSet.features[ r ]
                        if (ss === start && ee === end) {
                            indexToRemove = r
                        }
                    }

                    console.log(`${ Date.now() } "${ roiSet.name }" indices ${ indices } index-to-remove ${indexToRemove  }`)
                    roiSet.features.splice(indexToRemove, 1)

                },
            }

        Object.keys(lut).forEach(word => {

            const row = DOMUtils.div({ class: 'igv-roi-body-row' })
            this.bodyContainer.appendChild(row)
            row.innerText = word
            row.addEventListener('click', () => lut[ word ]())
        })

        this.container.style.left = `${ x }px`
        this.container.style.top  = `${ y }px`
        this.container.style.display = 'block'
    }

}

function removeAllChildNodes(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

export default ROIMenu
