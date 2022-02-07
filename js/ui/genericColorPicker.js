import Picker from '../../node_modules/vanilla-picker/dist/vanilla-picker.mjs'
import {GenericContainer} from '../../node_modules/igv-ui/dist/igv-ui.js'
import {getColorNameRGBString, isValidColorName} from '../util/colorPalletes.js'

class GenericColorPicker extends GenericContainer {

    constructor(parent) {

        super({ parent, width: 250, border: '1px solid gray'})

        this.activeColor = undefined
        this.activeColorHandler = undefined

        const config =
            {
                parent: this.container,
                popup: false,
                editor:'false',
                editorFormat: 'rgb',
                alpha: false,
                onDone: () => this.hide(this.container)
            }

        this.picker = new Picker(config)

    }

    configure(initialColors, colorHandlers) {
        this.initialColors = initialColors
        this.colorHandlers = colorHandlers
        this.setActiveColorHandler('color')
    }

    setActiveColorHandler(key) {

        if (isValidColorName(this.initialColors[ key ])) {
            this.activeColor = getColorNameRGBString(this.initialColors[ key ])
        } else {
            this.activeColor = this.initialColors[ key ]
        }

        this.activeColorHandler = this.colorHandlers[ key ]

        this.picker.onChange = ({ rgbString }) => this.activeColorHandler(rgbString)

        const parts = this.activeColor.split(')')
        const rgbaString = `${ parts[ 0 ]},1.0)`
        this.picker.setColor(rgbaString, true)
    }

}

export default GenericColorPicker
