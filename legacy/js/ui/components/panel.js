import * as DOMUtils from "../utils/dom-utils.js"

const rowStyle = {
    zIndex: 2048,
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center'
}

const columnStyle = {
    zIndex: 2048,
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start'
}

/**
 * Generic container for UI components
 */
class Panel {

    constructor() {
        this.elem = DOMUtils.create('div', { class: 'igv-ui-panel-column' })
    }

    add(component) {

        if(component instanceof Node) {
            this.elem.appendChild(component);
        }
        else if(typeof component === 'object') {
            this.elem.appendChild(component.elem);
        }
        else {
            // Assuming a string, possibly html
            const wrapper = DOMUtils.div();
            wrapper.innerHTML = component;
            this.elem.appendChild(wrapper);
            this.html = wrapper
        }
    }


}


export default Panel
