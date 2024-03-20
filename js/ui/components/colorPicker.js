import {appleCrayonPalette} from '../utils/colorPalettes.js'
import * as DOMUtils from "../utils/dom-utils.js"
import GenericContainer from "../genericContainer.js"


class ColorPicker extends GenericContainer {

    constructor({parent, top, left, width, height, defaultColors, colorHandler}) {

        super({ parent, top, left, width, height, border: '1px solid gray'})

        createColorSwatchSelector(this.container, colorHandler, defaultColors);
    }

}

const createColorSwatchSelector = (container, colorHandler, defaultColors) => {

    const hexColorStrings = Object.values(appleCrayonPalette);

    for (let hexColorString of hexColorStrings) {
        const swatch = DOMUtils.div({ class: 'igv-ui-color-swatch' });
        container.appendChild(swatch);
        decorateSwatch(swatch, hexColorString, colorHandler)
    }

    if (defaultColors) {
        for (let hexColorString of defaultColors) {
            const swatch = DOMUtils.div({ class: 'igv-ui-color-swatch' });
            container.appendChild(swatch);
            decorateSwatch(swatch, hexColorString, colorHandler)
        }
    }

}

const decorateSwatch = (swatch, hexColorString, colorHandler) => {

    swatch.style.backgroundColor = hexColorString;

    swatch.addEventListener('mouseenter', e => swatch.style.borderColor = hexColorString)

    swatch.addEventListener('mouseleave', e => swatch.style.borderColor = 'white')

    swatch.addEventListener('click', event => {
        event.stopPropagation();
        colorHandler(hexColorString);
    })

    swatch.addEventListener('touchend', event => {
        event.stopPropagation();
        colorHandler(hexColorString);
    })

}

export { createColorSwatchSelector }
export default ColorPicker
