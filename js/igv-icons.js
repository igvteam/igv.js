import {DOMUtils, Icon} from "../node_modules/igv-utils/src/index.js"

function createCheckbox(name, initialState) {

    const container = DOMUtils.div({ class: 'igv-menu-popup-check-container' })

    const div = DOMUtils.div()
    container.appendChild(div)

    const svg = Icon.createIcon('check', (true === initialState ? '#444' : 'transparent'))
    div.appendChild(svg)

    const label = DOMUtils.div()
    label.innerText = name
    container.appendChild(label)

    return container
}

export {createCheckbox};


