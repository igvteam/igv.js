import * as DOMUtils from "../ui/utils/dom-utils.js"

const CircularViewControl = function (parent, browser) {

    this.button = DOMUtils.div({class: 'igv-navbar-button'})
    parent.appendChild(this.button)
    this.button.textContent = 'circular view'

    this.button.addEventListener('click', () => {
        browser.circularViewVisible = !browser.circularViewVisible
        //this.setState(browser.circularViewVisible)
    })

    this.browser = browser

    this.setVisibility(browser.config.showCircularViewButton)

    this.setState(browser.circularViewVisible)

}

CircularViewControl.prototype.setVisibility = function (showCircularViewButton) {
    if (true === showCircularViewButton) {
        this.show()
    } else {
        this.hide()
    }
}

CircularViewControl.prototype.setState = function (circularViewVisible) {
    if (true === circularViewVisible) {
        this.button.classList.add('igv-navbar-button-clicked')
    } else {
        this.button.classList.remove('igv-navbar-button-clicked')
    }
}

CircularViewControl.prototype.show = function () {
    this.button.style.display = 'block'
    this.setState(this.browser.circularViewVisible)
}

CircularViewControl.prototype.hide = function () {
    this.button.style.display = 'none'
}

export default CircularViewControl
