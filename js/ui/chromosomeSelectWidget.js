/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 * Author: Jim Robinson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import {DOMUtils} from '../../node_modules/igv-ui/dist/igv-ui.js'

const ChromosomeSelectWidget = function (browser, parent) {

    this.container = DOMUtils.div({class: 'igv-chromosome-select-widget-container'})
    parent.appendChild(this.container)

    this.select = document.createElement('select')
    this.select.setAttribute('name', 'chromosome-select-widget')
    this.container.appendChild(this.select)

    this.select.addEventListener('change', () => {
        this.select.blur()
        if (this.select.value !== '') {
            browser.search(this.select.value)
        }
    })

    this.showAllChromosomes = browser.config.showAllChromosomes !== false   // i.e. default to true

}

ChromosomeSelectWidget.prototype.show = function () {
    this.container.style.display = 'flex'
}

ChromosomeSelectWidget.prototype.hide = function () {
    this.container.style.display = 'none'
}

ChromosomeSelectWidget.prototype.update = function (genome) {

    console.log(genome.chromosomeNames.length)

    const list = (this.showAllChromosomes && genome.chromosomeNames.length < 10000) ?
        genome.chromosomeNames : genome.wgChromosomeNames

    this.select.innerHTML = ''

    if(genome.showWholeGenomeView()) {
        const name = 'all'
        const option = document.createElement('option')
        option.setAttribute('value', name)
        option.innerText = genome.getChromosomeDisplayName(name)
        this.select.appendChild(option)
    }

    if (list.length < 10000) {
        for (let name of list) {
            const option = document.createElement('option')
            option.setAttribute('value', name)
            option.innerText = genome.getChromosomeDisplayName(name)
            this.select.appendChild(option)
            // if(this.selectDisplayCSS) {
            //     this.select.style.display = this.selectDisplayCSS
            //     this.container.style.display = this.containerDisplayCSS
            //     document.getElementsByClassName("igv-search-container")[0].style.width = his.searchContainerWidthCSS
            //}
        }
    } else {
        // > 2,000 entries, pulldown is useless
        // Record styles so we can restore them if another genome is loaded
        // this.selectDisplayCSS = getComputedStyle(this.select).getPropertyValue("display")
        // this.containerDisplayCSS = getComputedStyle(this.container).getPropertyValue("display")
        // this.searchContainerWidthCSS = getComputedStyle(document.getElementsByClassName("igv-search-container")[0]).getPropertyValue("width")
        //
        // this.select.style.display = "none"
        // this.container.style.display = "none"
        // document.getElementsByClassName("igv-search-container")[0].style.width = "300px"
    }

}

export default ChromosomeSelectWidget

