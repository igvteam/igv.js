import * as DOMUtils from "../utils/dom-utils.js"
import Textbox from "./textbox.js"
import Picker from "../../../node_modules/vanilla-picker/dist/vanilla-picker.csp.mjs"
import Dialog from "./dialog.js"
import DOMPurify from "../../../node_modules/dompurify/dist/purify.es.mjs"
import Checkbox from "./checkbox.js"
import checkbox from "./checkbox.js"


function paintLegend(legend, newColorScale) {

    const ctx = legend.getContext("2d")
    const w = legend.width
    const step = (newColorScale.high - newColorScale.low) / w
    for (let i = 0; i < w; i++) {
        const v = newColorScale.low + i * step
        const color = newColorScale.getColor(v)
        ctx.fillStyle = color
        ctx.fillRect(i, 0, 1, legend.height)
    }
}

/**
 *   Editor for color scales.  Supported types:
 *
 *   'gradient': {low, high, lowColor, highColor}
 *
 *   'diverging': {mid, midColor, lowGradientScale, highGradientScale}
 *
 *
 */
class ColorScaleEditor {

    static open(colorScale, parent, callback) {

        const newColorScale = colorScale.clone()

        const table = document.createElement('table')

        const legend = document.createElement('canvas')
        legend.style.height = "20px"
        legend.style.width = "100%"
        legend.style.marginTop = "10px"
        legend.style.border = "1px solid black"

        const minTextbox = textbox({
            label: "Min value", value: newColorScale.low.toString(), onchange: (v) => {
                newColorScale.low = Number.parseFloat(v)
                paintLegend(legend, newColorScale)
            }
        })
        table.append(minTextbox)

        const midTextbox = textbox({
            label: "Mid value", value: newColorScale.mid.toString(), onchange: (v) => {
                newColorScale.mid = Number.parseFloat(v)
                paintLegend(legend, newColorScale)
            }
        })
        table.append(midTextbox)

        const maxTextbox = textbox({
            label: "Max value", value: newColorScale.high.toString(), onchange: (v) => {
                newColorScale.high = Number.parseFloat(v)
                paintLegend(legend, newColorScale)
            }
        })
        table.append(maxTextbox)


        const colorElem = colorPicker({
            label: "Min color", value: newColorScale.lowColor, onchange: (v) => {
                newColorScale.lowColor = v
                paintLegend(legend, newColorScale)
            }
        })
        table.append(colorElem)

        const midColorElem = colorPicker({
            label: "Mid color", value: newColorScale.midColor, onchange: (v) => {
                newColorScale.midColor = v
                paintLegend(legend, newColorScale)
            }
        })
        table.append(midColorElem)

        const highColorElem = colorPicker({
            label: "Max color", value: newColorScale.highColor, onchange: (v) => {
                newColorScale.maxColor = v
                paintLegend(legend, newColorScale)
            }
        })
        table.append(highColorElem)

        const divergingCheckbox = new Checkbox({
            selected: "diverging" === colorScale.type, label: "Diverging Scale", onchange: (diverging) => {
                if(diverging) {

                } else {

                }
            }
        })
        divergingCheckbox.elem.style.marginBottom = "20px"



        const panel = document.createElement('div')
        panel.appendChild(divergingCheckbox.elem)
        panel.appendChild(table)
        panel.appendChild(legend)

        const okHandler = () => {
            colorScale.setProperties(newColorScale)
            if (callback) {
                callback()
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


function textbox({label, value, onchange}) {

    const row = document.createElement('tr')
    const cell = document.createElement('td')
    row.appendChild(cell)

    const div = document.createElement('div')
    div.innerHTML = label
    cell.appendChild(div)

    const cell2 = document.createElement('td')
    row.appendChild(cell2)
    const textBox = document.createElement('input')
    if (value) {
        textBox.value = DOMPurify.sanitize(value)
    }
    cell2.appendChild(textBox)

    if (onchange) {
        textBox.addEventListener('change', (e) => onchange(textBox.value))
    }

    return row
}

function colorPicker({label, value, onchange}) {

    const row = document.createElement('tr')
    const cell = document.createElement('td')
    row.appendChild(cell)
    cell.append(label)

    const cell2 = document.createElement('td')
    row.appendChild(cell2)
    const colorButton = document.createElement('div')
    cell2.appendChild(colorButton)
    colorButton.style.width = "20px"
    colorButton.style.height = "20px"
    colorButton.style.border = "1px solid black"
    colorButton.style.background = value

    const picker = new Picker(colorButton)
    picker.setOptions({
        alpha: false, color: value
    })

    picker.onDone = function (color) {
        colorButton.style.background = color.rgbString
        if (onchange) {
            onchange(color.rgbString)
        }
    }


    return row

}

export default ColorScaleEditor
