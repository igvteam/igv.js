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

import * as DOMUtils from "../ui/utils/dom-utils.js"

const maximumSequenceCountExceeded = "Maximum sequence count exceeded"

class ChromosomeSelectWidget {

    constructor(browser, parent) {

        this.container = DOMUtils.div({class: 'igv-chromosome-select-widget-container'})
        parent.appendChild(this.container)

        this.select = document.createElement('select')
        this.select.setAttribute('name', 'chromosome-select-widget')
        this.container.appendChild(this.select)

        this.select.addEventListener('change', () => {
            this.select.blur()
            if (this.select.value !== '' && maximumSequenceCountExceeded !== this.select.value) {
                browser.search(this.select.value)
            }
        })

        this.showAllChromosomes = browser.config.showAllChromosomes !== false   // i.e. default to true
        this.genome = browser.genome
    }

    show() {
        this.container.style.display = 'flex'
    }

    hide() {
        this.container.style.display = 'none'
    }

    setValue(chrName) {
        this.select.value = this.genome.getChromosomeDisplayName(chrName)
    }

    update(genome) {

        this.genome = genome

        // Start with explicit chromosome name list
        const list = genome.wgChromosomeNames.map(nm => genome.getChromosomeDisplayName(nm)) || []

        if (this.showAllChromosomes && genome.chromosomeNames.length > 1) {
            const exclude = new Set(list)
            let count = 0
            for (let nm of genome.chromosomeNames) {
                if (++count === 1000) {
                    list.push(maximumSequenceCountExceeded)
                    break
                }
                if (!exclude.has(nm)) {
                    nm = genome.getChromosomeDisplayName(nm)
                    list.push(nm)
                }
            }
        }

        this.select.innerHTML = ''

        // Add the "all" selector if whole genome view is supported
        if (genome.showWholeGenomeView()) {
            list.unshift("all")
        }

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

    }
}

export default ChromosomeSelectWidget

