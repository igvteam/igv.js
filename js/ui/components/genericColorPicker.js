import * as DOMUtils from "../utils/dom-utils.js"
import Picker from "../../../node_modules/vanilla-picker/dist/vanilla-picker.csp.mjs"
import GenericContainer from '../genericContainer.js'
import {genericColorPickerPalette} from "../../util/colorPalletes.js"

class GenericColorPicker extends GenericContainer {

    constructor({parent, width}) {
        super({parent, width, border: '1px solid gray'})

        // nth-child(2) - Color Swatches
        this.colorSwatchContainer = DOMUtils.div()
        this.container.appendChild(this.colorSwatchContainer)

        // nth-child(3) - More Colors interative color picker
        this.moreColorsContainer = DOMUtils.div()
        this.container.appendChild(this.moreColorsContainer)

        // nth-child(4) - Recent Colors - swatches
        this.recentColorsSwatches = DOMUtils.div()
        this.container.appendChild(this.recentColorsSwatches)

        this.moreColorsPresentationColor = undefined
    }

    configure(initialTrackColor, previousTrackColors, colorHandler, moreColorsPresentationColor) {

        this.moreColorsPresentationColor = moreColorsPresentationColor

        this.colorSwatchContainer.innerHTML = ''

        this.recentColorsSwatches.innerHTML = ''

        // Populate ColorSwatches
        const hexColorStrings = Object.values(genericColorPickerPalette)
        for (const hexColorString of hexColorStrings) {
            const swatch = DOMUtils.div({class: 'igv-ui-color-swatch'})
            this.colorSwatchContainer.appendChild(swatch)
            this.decorateSwatch(swatch, hexColorString, colorHandler)
        }

        // Populate Previous Colors
        if (previousTrackColors.length > 0) {
            for (const hexColorString of previousTrackColors) {
                const swatch = DOMUtils.div({class: 'igv-ui-color-swatch'})
                this.recentColorsSwatches.appendChild(swatch)
                this.decorateSwatch(swatch, hexColorString, colorHandler)
            }
        }

        // Present MoreColors picker
        this.decorateMoreColorsButton(this.moreColorsContainer, previousTrackColors, colorHandler)

    }

    decorateSwatch(swatch, hexColorString, colorHandler) {

        swatch.style.backgroundColor = hexColorString

        swatch.addEventListener('click', event => {
            event.stopPropagation()
            colorHandler(hexColorString)
            this.moreColorsPresentationColor = hexColorString
        })

        swatch.addEventListener('touchend', event => {
            event.stopPropagation()
            colorHandler(hexColorString)
            this.moreColorsPresentationColor = hexColorString
        })

    }

    decorateMoreColorsButton(moreColorsContainer, previousTrackColors, colorHandler) {

        moreColorsContainer.innerText = 'More Colors ...'

        moreColorsContainer.addEventListener('click', event => {
            event.stopPropagation()
            this.createAndPresentMoreColorsPicker(moreColorsContainer, previousTrackColors, hexColorString => colorHandler(hexColorString))
        })

    }

    updateRecentColorsSwatches(previousTrackColors, colorHandler){
        this.recentColorsSwatches.innerHTML = ''
        for (const hexColorString of previousTrackColors) {
            const swatch = DOMUtils.div({class: 'igv-ui-color-swatch'})
            this.recentColorsSwatches.appendChild(swatch)
            this.decorateSwatch(swatch, hexColorString, colorHandler)
        }
    }

    createAndPresentMoreColorsPicker(moreColorsContainer, previousTrackColors, colorHandler) {

        let picker

        moreColorsContainer.innerHTML = ''
        moreColorsContainer.innerText = 'More Colors ...'

        const colorPickerContainer = document.createElement('div');
        colorPickerContainer.style.position = 'absolute';
        moreColorsContainer.appendChild(colorPickerContainer);

        const { width, height } = moreColorsContainer.getBoundingClientRect()
        colorPickerContainer.style.right = `${0}px`;
        colorPickerContainer.style.top = `${0}px`;
        colorPickerContainer.style.width = `${width}px`;
        colorPickerContainer.style.height = `${height}px`;

        colorPickerContainer.addEventListener('click', (event) => {
            event.stopPropagation()
        })


        picker = new Picker()

        const config =
            {
                parent: colorPickerContainer,
                popup: 'top',
                editor: false,
                editorFormat: 'rgb',
                alpha: false,
                color: this.moreColorsPresentationColor,
            }

        picker.setOptions(config)

        picker.setColor(this.moreColorsPresentationColor, true)

        picker.onOpen = () => {
            console.log(`picker - onOpen`)
        }
        picker.onChange = color => moreColorsContainer.style.backgroundColor = color.rgba

        picker.onDone = color => {

            // Remove alpha from hex color string
            const hexColorString = color.hex.substring(0,7)

            previousTrackColors.push(hexColorString)
            const uniques = [...new Set(previousTrackColors)]
            previousTrackColors = uniques.slice(0)

            colorHandler(hexColorString)

            this.updateRecentColorsSwatches(previousTrackColors, colorHandler)

            this.moreColorsPresentationColor = hexColorString

            picker.destroy()
            colorPickerContainer.remove()
        }

        picker.show()
    }
}

export default GenericColorPicker
