import Picker from '../../node_modules/vanilla-picker/dist/vanilla-picker.mjs'
import {GenericContainer} from '../../node_modules/igv-ui/dist/igv-ui.js'

class GenericColorPicker extends GenericContainer {

    constructor({parent, width}) {

        super({ parent, width, border: '1px solid gray'})

        this.activeColor = undefined
        this.activeColorHandler = undefined

        const config =
            {
                parent: this.container,
                popup: false,
                editor:'false',
                editorFormat: 'rgb',
                alpha: false,
            }

        this.picker = new Picker(config)

    }

    configure(initialColors, colorHandlers) {

        this.initialColors = initialColors
        this.colorHandlers = colorHandlers

        this.setActiveColorHandler('color')
    }

    setActiveColorHandler(key) {

        this.activeColor = this.initialColors[ key ]
        this.activeColorHandler = this.colorHandlers[ key ]

        this.picker.onChange = ({ rgbString }) => this.activeColorHandler(rgbString)

        const parts = this.activeColor.split(')')
        const rgbaString = `${ parts[ 0 ]},1.0)`
        this.picker.setColor(rgbaString, true)
    }

}

export default GenericColorPicker
