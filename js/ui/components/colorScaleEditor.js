import * as DOMUtils from "../utils/dom-utils.js"
import Picker from "../../../node_modules/vanilla-picker/dist/vanilla-picker.csp.mjs"
import Dialog from "./dialog.js"
import DOMPurify from "../../../node_modules/dompurify/dist/purify.es.mjs"
import Checkbox from "./checkbox.js"
import {DivergingGradientScale, GradientColorScale} from "../../util/colorScale.js"


function paintLegend(legend, newColorScale) {

    const ctx = legend.getContext("2d")
    const w = legend.width
    const step = (newColorScale.max - newColorScale.min) / w
    for (let i = 0; i < w; i++) {
        const v = newColorScale.min + i * step
        const color = newColorScale.getColor(v)
        ctx.fillStyle = color
        ctx.fillRect(i, 0, 1, legend.height)
    }
}

/**
 *   Editor for color scales.  Supported types:
 *
 *   'gradient': {min, max, minColor, maxColor}
 *
 *   'diverging': {mid, midColor, lowGradientScale, highGradientScale}
 *
 *
 */
class ColorScaleEditor {

    static open(colorScale, parent, callback) {

        let newColorScale = colorScale.clone()

        const table = document.createElement('table')

        const legend = document.createElement('canvas')
        legend.style.height = "20px"
        legend.style.width = "100%"
        legend.style.marginTop = "10px"
        legend.style.border = "1px solid black"

        const minTextbox = new TextBoxRow({
            label: "Min value",
            value: newColorScale.min.toString(),
            onchange: (v) => {
                newColorScale.min = Number.parseFloat(v)
                paintLegend(legend, newColorScale)
            }
        })
        table.append(minTextbox.row)

        const midTextbox = new TextBoxRow({
            label: "Mid value",
            value: (newColorScale.mid || newColorScale.min).toString(),
            onchange: (v) => {
                newColorScale.mid = Number.parseFloat(v)
                paintLegend(legend, newColorScale)
            }
        })
        table.append(midTextbox.row)

        const maxTextbox = new TextBoxRow({
            label: "Max value",
            value: newColorScale.max.toString(),
            onchange: (v) => {
                newColorScale.max = Number.parseFloat(v)
                paintLegend(legend, newColorScale)
            }
        })
        table.append(maxTextbox.row)


        const colorElem = new ColorPickerRow({
            label: "Min color",
            value: newColorScale.minColor,
            onchange: (v) => {
                newColorScale.minColor = v
                paintLegend(legend, newColorScale)
            }
        })
        table.append(colorElem.row)

        const midColorElem = new ColorPickerRow({
            label: "Mid color",
            value: newColorScale.midColor || newColorScale.minColor,
            onchange: (v) => {
                newColorScale.midColor = v
                paintLegend(legend, newColorScale)
            }
        })
        table.append(midColorElem.row)

        const highColorElem = new ColorPickerRow({
            label: "Max color",
            value: newColorScale.maxColor,
            onchange: (v) => {
                newColorScale.maxColor = v
                paintLegend(legend, newColorScale)
            }
        })
        table.append(highColorElem.row)

        const divergingCheckbox = new Checkbox({
            selected: "diverging" === colorScale.type,
            label: "Diverging Scale",
            onchange: (diverging) => {
                if (diverging) {
                    // Converting from gradient to diverting
                    newColorScale.mid = newColorScale.min < 0 && newColorScale.max > 0 ? 0 : (newColorScale.min + newColorScale.max) / 2
                    newColorScale.midColor = "rgb(255,255,255)"
                    newColorScale = new DivergingGradientScale(newColorScale)

                    midTextbox.value = newColorScale.mid
                    midTextbox.show()

                    midColorElem.value = newColorScale.midColor
                    midColorElem.show()

                    paintLegend(legend, newColorScale)
                } else {

                    // Converting from diverging to gradient
                    newColorScale = new GradientColorScale(newColorScale)
                    midTextbox.hide()
                    midColorElem.hide()
                    paintLegend(legend, newColorScale)
                }
            }
        })
        divergingCheckbox.elem.style.marginBottom = "20px"

        if('diverging' !== colorScale.type) {
            midTextbox.hide()
            midColorElem.hide()
        }

        const panel = document.createElement('div')
        panel.appendChild(divergingCheckbox.elem)
        panel.appendChild(table)
        panel.appendChild(legend)

        const okHandler = () => {
            if (callback) {
                callback(newColorScale)
            }

        }

        const config = {
            parent, // label: 'Multi-select',
            content: {elem: panel}, okHandler
        }
        const dialog = new Dialog(config)
        parent.append(dialog.elem)
        DOMUtils.show(dialog.elem)

        paintLegend(legend, newColorScale)

    }

}

class LabeledButtonRow {
    constructor({label, value, onchange}) {

        this.row = document.createElement('tr')
        const cell = document.createElement('td')
        this.row.appendChild(cell)

        const div = document.createElement('div')
        div.innerHTML = label
        cell.appendChild(div)
    }

    hide() {
        this.row.style.display = 'none'
    }

    show() {
        this.row.style.display = 'table-row'
    }
}

class TextBoxRow extends LabeledButtonRow {

    constructor({label, value, onchange}) {
        super({label, value, onchange})

        const cell2 = document.createElement('td')
        this.row.appendChild(cell2)
        this.input = document.createElement('input')

        value = value || "0"
        this.input.value = DOMPurify.sanitize(value)

        cell2.appendChild(this.input)

        if (onchange) {
            this.input.addEventListener('change', (e) => onchange(this.input.value))
        }
    }

    get value() {
        return this.input.value
    }

    set value(v) {
        this.input.value = v
    }
}

class ColorPickerRow extends LabeledButtonRow {

    constructor({label, value, onchange}) {
        super({label, value, onchange})

        const cell2 = document.createElement('td')
        this.row.appendChild(cell2)
        const colorButton = document.createElement('div')
        cell2.appendChild(colorButton)
        colorButton.style.width = "20px"
        colorButton.style.height = "20px"
        colorButton.style.border = "1px solid black"
        this.colorButton = colorButton

        value = value || "white"
        colorButton.style.background = value

        const picker = new Picker(colorButton)
        picker.setOptions({
            alpha: false, color: value
        })

        picker.onDone =  (color) => {
            colorButton.style.background = color.rgbString
            if (onchange) {
                onchange(color.rgbString)
            }
        }
    }

    set value(c) {
        this.colorButton.style.background = c
    }
}

export default ColorScaleEditor
