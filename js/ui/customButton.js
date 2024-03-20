/**
 * User supplied button for the navbar
 */

import * as DOMUtils from "../ui/utils/dom-utils.js"

const CustomButton = function (parent, browser, b) {

    const button = DOMUtils.div({class: 'igv-navbar-button'})
    parent.append(button)
    button.textContent = b.label
    button.addEventListener('click', () => b.callback(browser))
}

export default CustomButton
