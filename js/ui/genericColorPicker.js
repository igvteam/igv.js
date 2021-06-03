import { appleCrayonPalette, DOMUtils } from '../../node_modules/igv-utils/src/index.js';
import {GenericContainer} from '../../node_modules/igv-ui/dist/igv-ui.js';

class GenericColorPicker extends GenericContainer {

    constructor( {parent, width, defaultColors, colorHandlers }) {

        super({ parent, width, border: '1px solid gray'})

        this.createSwatches(defaultColors);

        this.colorHandlers = colorHandlers

        // active color handler defaults to handler with 'color' as key
        this.setActiveColorHandler('color')

    }

    setActiveColorHandler(option) {
        this.activeColorHandler = this.colorHandlers[ option ]
    }

    createSwatches(defaultColors) {

        const hexColorStrings = Object.values(appleCrayonPalette);

        for (let hexColorString of hexColorStrings) {
            const swatch = DOMUtils.div({ class: 'igv-ui-color-swatch' });
            this.container.appendChild(swatch);
            this.decorateSwatch(swatch, hexColorString)
        }

        if (defaultColors) {
            for (let hexColorString of defaultColors) {
                const swatch = DOMUtils.div({ class: 'igv-ui-color-swatch' });
                this.container.appendChild(swatch);
                this.decorateSwatch(swatch, hexColorString)
            }
        }

    }

    decorateSwatch(swatch, hexColorString){

        swatch.style.backgroundColor = hexColorString;

        swatch.addEventListener('mouseenter', () => swatch.style.borderColor = hexColorString)

        swatch.addEventListener('mouseleave', () => swatch.style.borderColor = 'white')

        swatch.addEventListener('click', event => {
            event.stopPropagation();
            this.activeColorHandler(hexColorString);
        })

        swatch.addEventListener('touchend', event => {
            event.stopPropagation();
            this.activeColorHandler(hexColorString);
        })

    }

}

export default GenericColorPicker
