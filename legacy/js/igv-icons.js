import * as DOMUtils from "./ui/utils/dom-utils.js"
import {createIcon} from "./ui/utils/icons.js"

function createCheckbox(name, initialState) {

    const container = DOMUtils.div({class: 'igv-menu-popup-check-container'})

    const div = DOMUtils.div()
    container.appendChild(div)

    const svg = createIcon('check', (true === initialState ? '#444' : 'transparent'))
    div.appendChild(svg)

    const label = DOMUtils.div()
    label.innerText = name
    container.appendChild(label)

    return container
}

export {createCheckbox}


