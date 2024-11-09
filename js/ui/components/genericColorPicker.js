import * as DOMUtils from "../utils/dom-utils.js"
import Picker from "../../../node_modules/vanilla-picker/dist/vanilla-picker.csp.mjs"
import GenericContainer from '../genericContainer.js'
import {genericColorPickerPalette} from "../../util/colorPalletes.js"

class GenericColorPicker extends GenericContainer {

    constructor({parent, width}) {
        super({parent, width, border: '1px solid gray'})
    }

    configure(defaultColors, colorHandlers) {

        this.colorHandlers = colorHandlers

        // active color handler defaults to handler with 'color' as key
        this.setActiveColorHandler('color')

        this.createSwatches(defaultColors)

    }

    setActiveColorHandler(option) {
        this.activeColorHandler = this.colorHandlers[option]
    }

    createSwatches(defaultColors) {

        this.container.querySelectorAll('.igv-ui-color-swatch, .igv-ui-color-more-colors').forEach(swatch => swatch.remove())

        const hexColorStrings = Object.values(genericColorPickerPalette)

        for (const hexColorString of hexColorStrings) {
            const swatch = DOMUtils.div({class: 'igv-ui-color-swatch'})
            this.container.appendChild(swatch)
            this.decorateSwatch(swatch, hexColorString)
        }

        if (defaultColors) {
            for (const hexColorString of defaultColors) {
                const swatch = DOMUtils.div({class: 'igv-ui-color-swatch'})
                this.container.appendChild(swatch)
                this.decorateSwatch(swatch, hexColorString)
            }
        }

        // present vanilla color picker
        const moreColorsButton = DOMUtils.div({ class: 'igv-ui-color-more-colors' })
        this.container.appendChild(moreColorsButton)
        this.decorateMoreColorsButton(moreColorsButton)


    }

    decorateSwatch(swatch, hexColorString) {

        swatch.style.backgroundColor = hexColorString

        swatch.addEventListener('mouseenter', () => swatch.style.borderColor = hexColorString)

        swatch.addEventListener('mouseleave', () => swatch.style.borderColor = 'white')

        swatch.addEventListener('click', event => {
            event.stopPropagation()
            this.activeColorHandler(hexColorString)
        })

        swatch.addEventListener('touchend', event => {
            event.stopPropagation()
            this.activeColorHandler(hexColorString)
        })

    }

    decorateMoreColorsButton(swatch) {

        swatch.innerText = 'More Colors'

        swatch.addEventListener('mouseenter', () => swatch.style.borderColor = 'black')

        swatch.addEventListener('mouseleave', () => swatch.style.borderColor = 'white')

        swatch.addEventListener('click', event => {
            event.stopPropagation()
            createAndPresentMoreColorsPicker(event.target, this.activeColorHandler)
        })

    }
}

function createAndPresentMoreColorsPicker(parent, colorHandler) {

    let picker

    parent.innerHTML = ''
    parent.innerText = 'More Colors'

    const colorPickerContainer = document.createElement('div');
    colorPickerContainer.style.position = 'absolute';
    parent.appendChild(colorPickerContainer);

    const { width, height } = parent.getBoundingClientRect()
    colorPickerContainer.style.left = `${0}px`;
    colorPickerContainer.style.top = `${0}px`;
    colorPickerContainer.style.width = `${width}px`;
    colorPickerContainer.style.height = `${height}px`;

    colorPickerContainer.addEventListener('click', (event) => {
        event.stopPropagation()
    })

    const config =
        {
            parent: colorPickerContainer,
            popup: 'bottom',
            editor: false,
            editorFormat: 'rgb',
            alpha: false,
            color: parent.style.backgroundColor,
        }

    picker = new Picker(config)

    picker.onChange = (color) => {
        // console.log(`color changes: hex ${ color.hex } rgba ${ color.rgba }`)
        parent.style.backgroundColor = color.rgba
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
