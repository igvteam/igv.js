import { DOMUtils } from '../../node_modules/igv-utils/src/index.js';

class CenterGuideButton {

    constructor(browser, parent) {

        this.browser = browser

        this.button = DOMUtils.div({ class: 'igv-navbar-button'})
        parent.appendChild(this.button)

        this.button.textContent = 'center guide'

        this.button.addEventListener('click', () => {
            browser.isCenterGuideVisible = !browser.isCenterGuideVisible
            browser.setCenterGuideVisibility(browser.isCenterGuideVisible)
            this.setButtonState(browser.isCenterGuideVisible)
        })

        this.setButtonState(this.browser.isCenterGuideVisible)
    }

    setButtonState (isCenterGuideVisible) {
        if (true === isCenterGuideVisible) {
            this.button.classList.add('igv-navbar-button-clicked')
        } else {
            this.button.classList.remove('igv-navbar-button-clicked')
        }
    }

    show () {
        this.button.style.display = 'block'
        this.setButtonState(this.browser.isCenterGuideVisible)
    }

    hide () {
        this.button.style.display = 'none'
    }
}

export default CenterGuideButton
