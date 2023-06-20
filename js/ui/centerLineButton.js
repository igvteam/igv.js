import {DOMUtils} from '../../node_modules/igv-ui/dist/igv-ui.js'

class CenterLineButton {

    constructor(browser, parent) {

        this.browser = browser

        this.button = DOMUtils.div({class: 'igv-navbar-icon-container'})
        parent.appendChild(this.button)

        const img = document.createElement('img')
        img.setAttribute('src', '../../images/centerline.svg')
        img.setAttribute('width', '24')
        img.setAttribute('height', '24')
        img.setAttribute('class', 'igv-navbar-icon-svg')
        img.setAttribute('title', 'center line')

        this.button.appendChild(img)

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

    setButtonState(isCenterLineVisible) {

        return

        if (true === isCenterLineVisible) {
            this.button.classList.add('igv-navbar-button-clicked')
        } else {
            this.button.classList.remove('igv-navbar-button-clicked')
        }
    }

    show() {
        this.isVisible = true
        this.button.style.display = 'block'
        this.setButtonState(this.browser.isCenterLineVisible)
    }

    hide() {
        this.isVisible = false
        this.button.style.display = 'none'
    }
}

export default CenterLineButton
