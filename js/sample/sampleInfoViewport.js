import {DOMUtils} from '../../node_modules/igv-ui/dist/igv-ui.js'
import {appleCrayonRGB} from '../util/colorPalletes.js'
import {defaultSampleInfoViewportWidth} from '../browser.js'
import {copyNumberDictionary, sampleInfo} from './sampleInfo.js'

let sortDirection = 1

class SampleInfoViewport {

    constructor(trackView, column, width) {

        this.guid = DOMUtils.guid()
        this.trackView = trackView

        this.browser = trackView.browser

        this.viewport = DOMUtils.div({class: 'igv-viewport'})

        column.appendChild(this.viewport)

        this.viewport.style.height = `${trackView.track.height}px`

        this.canvas = document.createElement('canvas')
        this.viewport.appendChild(this.canvas)
        this.ctx = this.canvas.getContext("2d")

        this.contentTop = 0
        this.hitList = undefined

        this.setWidth(width)

        this.addMouseHandlers()
    }

    checkCanvas() {

        const dpi = window.devicePixelRatio
        const requiredHeight = this.viewport.clientHeight
        const requiredWidth = this.browser.sampleInfoViewportWidth

        if (this.canvas.width !== requiredWidth * dpi || this.canvas.height !== requiredHeight * dpi) {
            const canvas = this.canvas
            canvas.width = requiredWidth * dpi
            canvas.height = requiredHeight * dpi
            canvas.style.width = `${requiredWidth}px`
            canvas.style.height = `${requiredHeight}px`
            this.ctx = this.canvas.getContext("2d")
            this.ctx.scale(dpi, dpi)
        }

    }

    setTop(contentTop) {

        if (typeof this.trackView.track.getSamples === 'function') {
            this.contentTop = contentTop
            const samples = this.trackView.track.getSamples()
            this.repaint(samples)
        }

    }

    setWidth(width) {
        this.viewport.innerWidth = width
        this.checkCanvas()
    }

    static async update(browser) {

        for (const { sampleInfoViewport } of browser.trackViews) {
            if (typeof sampleInfoViewport.trackView.track.getSamples === 'function') {
                const samples = sampleInfoViewport.trackView.track.getSamples()
                sampleInfoViewport.repaint(samples)
            }
        }

    }

    async repaint(samples) {

        this.checkCanvas()
        this.draw({context: this.ctx, samples})
    }

    draw({context, samples}) {

        context.clearRect(0, 0, context.canvas.width, context.canvas.height)

        context.fillStyle = appleCrayonRGB('snow')
        context.fillRect(0, 0, context.canvas.width, context.canvas.height)

        if (samples && samples.names.length > 0) {

            const viewportHeight = this.viewport.getBoundingClientRect().height

            let shim = 1

            const tileHeight = samples.height
            if (tileHeight < 2*shim) {
                shim = 0
            }

            let y = this.contentTop
            this.hitList = {}
            for (const name of samples.names) {

                if (y > viewportHeight) {
                    break
                }

                if (y + tileHeight > 0) {

                    if (copyNumberDictionary && copyNumberDictionary[ name ]) {

                        const attributes = copyNumberDictionary[ name ]
                        const attributeEntries = Object.entries(attributes)

                        const w = Math.floor(defaultSampleInfoViewportWidth/attributeEntries.length)
                        let x = 0;
                        for (const attributeEntry of attributeEntries) {

                            const [ attribute, value ] = attributeEntry

                            context.fillStyle = sampleInfo.getAttributeColor(attribute, value)

                            const yy = y+shim
                            const hh = tileHeight-(2*shim)
                            context.fillRect(x, yy, w, hh)

                            const key = `${Math.floor(x)}#${Math.floor(yy)}#${Math.ceil(w)}#${Math.ceil(hh)}`
                            this.hitList[ key ] = `${attribute}#${value}`
                            x += w
                        }
                    }

                }

                y += tileHeight
            }

        }


    }

    addMouseHandlers() {

        this.boundMouseClickHandler = mouseClick.bind(this)
        this.viewport.addEventListener('click', this.boundMouseClickHandler)

        function mouseClick(event) {

            event.stopPropagation()

            const { x } = DOMUtils.translateMouseCoordinates(event, this.viewport)

            if (this.hitList) {

                let hit = undefined
                for (const entry of Object.entries(this.hitList)) {

                    const [ bbox, value ] = entry

                    const [xx, _ignore, width, __ignore ] = bbox.split('#').map(str => parseInt(str, 10))
                    if (x < xx || x > xx+width) {
                        // do nuthin
                    } else {
                        [ hit ] = value.split('#')
                        break
                    }

                } // for (Object.values(this.hitList))

                if (hit) {

                    const menuItems =
                        [
                            {
                                label: `Sort by ${ hit }`,
                                click: () => {
                                    this.trackView.track.sampleKeys = sampleInfo.sortSampleKeysByAttribute(this.trackView.track.sampleKeys, hit, sortDirection)
                                    this.trackView.repaintViews()
                                    sortDirection = -1 * sortDirection
                                }
                            }
                        ]

                    this.browser.menuPopup.presentTrackContextMenu(event, menuItems)

                } // if (hit)


            } // if (this.hitList)

        }

        this.boundMouseMoveHandler = mouseMove.bind(this)
        this.viewport.addEventListener('mousemove', this.boundMouseMoveHandler)

        function mouseMove(event) {
            event.stopPropagation()
            let { x, y } = DOMUtils.translateMouseCoordinates(event, this.viewport)

            if (this.hitList) {

                for (const [ bbox, value ] of Object.entries(this.hitList)) {
                    const [xx, yy, width, height ] = bbox.split('#').map(str => parseInt(str, 10))
                    if (x < xx || x > xx+width || y < yy || y > yy+height) {
                        continue
                    }

                    // console.log(`${ Date.now() } ${ value }`)
                    this.viewport.setAttribute('title', value)
                }

            }
        }

    }
    removeMouseHandlers() {
        this.viewport.removeEventListener('mousemove', this.boundMouseClickHandler)
        this.viewport.removeEventListener('mousemove', this.boundMouseMoveHandler)
    }
    show() {
        this.viewport.style.display = 'block'
    }

    hide() {
        this.viewport.style.display = 'none'
    }

    dispose() {
        this.removeMouseHandlers()
        this.viewport.remove()
    }
}

export default SampleInfoViewport
