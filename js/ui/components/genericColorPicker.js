import * as DOMUtils from "../utils/dom-utils.js"
import Picker from "../../../node_modules/vanilla-picker/dist/vanilla-picker.csp.mjs"
import GenericContainer from '../genericContainer.js'
import {genericColorPickerPalette} from "../../util/colorPalletes.js"

class GenericColorPicker extends GenericContainer {

    constructor({parent, width}) {
        super({parent, width, border: '1px solid gray'})

        // nth-child(2) container for color swatch library
        this.colorSwatchContainer = DOMUtils.div()
        this.container.appendChild(this.colorSwatchContainer)

        // nth-child(3) container recent colors
        this.recentColorsContainer = DOMUtils.div()
        this.container.appendChild(this.recentColorsContainer)

        let div

        // Recent Colors - title
        div = DOMUtils.div()
        div.innerText = 'Recent Colors'
        this.recentColorsContainer.appendChild(div)

        // Recent Colors - swatches
        this.recentColorsSwatches = DOMUtils.div()
        this.recentColorsContainer.appendChild(this.recentColorsSwatches)

        // nth-child(4) More colors
        this.moreColorsContainer = DOMUtils.div()
        this.container.appendChild(this.moreColorsContainer)

    }

    configure(trackColors, previousColors, colorHandlers, colorSelection) {
        this.colorHandlers = colorHandlers
        this.setActiveColorHandler(colorSelection)
        this.createSwatches(trackColors, previousColors)
    }

    setActiveColorHandler(activeColorSelection) {
        this.activeColorSelection = activeColorSelection
        this.activeColorHandler = this.colorHandlers[activeColorSelection]
    }

    createSwatches(trackColors, previousColors) {

        this.colorSwatchContainer.innerHTML = ''
        this.recentColorsSwatches.innerHTML = ''

        // Populate ColorSwatches
        const hexColorStrings = Object.values(genericColorPickerPalette)
        for (const hexColorString of hexColorStrings) {
            const swatch = DOMUtils.div({class: 'igv-ui-color-swatch'})
            this.colorSwatchContainer.appendChild(swatch)
            this.decorateSwatch(swatch, hexColorString, previousColors)
        }

        // Populate RecentColors
        let recentColors =  Object.values(trackColors).length > 0 ? [ trackColors[ this.activeColorSelection ] ] : []
        if (previousColors.length > 0) {
            recentColors.push(...previousColors)
        }

        // Only uniques
        recentColors = [...new Set(recentColors)]

        if (recentColors.length > 0) {
            for (const hexColorString of recentColors) {
                const swatch = DOMUtils.div({class: 'igv-ui-color-swatch'})
                this.recentColorsSwatches.appendChild(swatch)
                this.decorateSwatch(swatch, hexColorString, previousColors)
            }

        }

        // Present MoreColors Colorpicker
        this.decorateMoreColorsButton(this.moreColorsContainer, previousColors)

    }

    decorateSwatch(swatch, hexColorString, previousColors) {

        swatch.style.backgroundColor = hexColorString

        swatch.addEventListener('click', event => {
            event.stopPropagation()
            previousColors.push(hexColorString)
            this.activeColorHandler(hexColorString)
        })

        swatch.addEventListener('touchend', event => {
            event.stopPropagation()
            previousColors.push(hexColorString)
            this.activeColorHandler(hexColorString)
        })

    }

    decorateMoreColorsButton(moreColorsContainer, previousColors) {

        moreColorsContainer.innerText = 'More Colors ...'

        moreColorsContainer.addEventListener('click', event => {
            event.stopPropagation()
            createAndPresentMoreColorsPicker(moreColorsContainer, hexColorString => {
                previousColors.push(hexColorString)
                this.activeColorHandler(hexColorString)
            })
        })

    }
}

function createAndPresentMoreColorsPicker(moreColorsContainer, colorHandler) {

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

    const config =
        {
            parent: colorPickerContainer,
            popup: 'top',
            editor: false,
            editorFormat: 'rgb',
            alpha: false,
            color: moreColorsContainer.style.backgroundColor,
        }

    picker = new Picker(config)

    picker.onChange = (color) => {
        // console.log(`color changes: hex ${ color.hex } rgba ${ color.rgba }`)
        moreColorsContainer.style.backgroundColor = color.rgba
    };

    picker.onDone = (color) => {

        // Remove alpha from hex color string
        colorHandler(color.hex.substring(0,7))
        picker.destroy()
        colorPickerContainer.remove()
    }

    // function onOutsideClick(event) {
    //     if (!colorPickerContainer.contains(event.target) && parent !== event.target) {
    //         picker.destroy()
    //         picker = null
    //         colorPickerContainer.remove()
    //         document.removeEventListener('click', onOutsideClick);
    //     }
    // }
    //
    // document.addEventListener('click', onOutsideClick);

    picker.show()
}

export default GenericColorPicker
