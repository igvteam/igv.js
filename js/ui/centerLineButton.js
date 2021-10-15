import { DOMUtils } from '../../node_modules/igv-utils/src/index.js';

class CenterLineButton {

    constructor(browser, parent) {

        this.browser = browser

        this.button = DOMUtils.div({ class: 'igv-navbar-button'})
        parent.appendChild(this.button)

        this.button.textContent = 'center line'

        this.button.addEventListener('click', () => {
            browser.isCenterLineVisible = !browser.isCenterLineVisible
            browser.setCenterLineVisibility(browser.isCenterLineVisible)
            this.setButtonState(browser.isCenterLineVisible)
        })

        this.setButtonState(browser.isCenterLineVisible)

        if (browser.config.showCenterGuideButton) {
            this.show()
        } else {
            this.hide()
        }
    }

    setButtonState (isCenterLineVisible) {
        if (true === isCenterLineVisible) {
            this.button.classList.add('igv-navbar-button-clicked')
        } else {
            this.button.classList.remove('igv-navbar-button-clicked')
        }
    }

    show () {
        this.isVisible = true
        this.button.style.display = 'block'
        this.setButtonState(this.browser.isCenterLineVisible)
    }

    hide () {
        this.isVisible = false
        this.button.style.display = 'none'
    }
}

export default CenterLineButton
