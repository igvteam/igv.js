import * as DOMUtils from "../ui/utils/dom-utils.js"

const maximumSequenceCountExceeded = "Maximum sequence count exceeded"

class ChromosomeSelectWidget {

    constructor(browser, parent) {

        this.container = DOMUtils.div({class: 'igv-chromosome-select-widget-container'})
        parent.appendChild(this.container)

        this.select = document.createElement('select')
        this.select.setAttribute('name', 'chromosome-select-widget')
        this.container.appendChild(this.select)

        this.select.addEventListener('change', async () => {
            this.select.blur()
            if (this.select.value !== '' && maximumSequenceCountExceeded !== this.select.value) {

                if (this.select.value.trim().toLowerCase() === "all" || this.select.value === "*") {
                    if (browser.genome.wholeGenomeView) {
                        const wgChr = browser.genome.getChromosome("all")
                        browser.updateLoci([{chr: "all", start: 0, end: wgChr.bpLength}])
                    }
                } else {
                    const chromosome = await browser.genome.loadChromosome(this.select.value)
                    const locusObject = {chr: chromosome.name}
                    if (locusObject.start === undefined && locusObject.end === undefined) {
                        locusObject.start = 0
                        locusObject.end = chromosome.bpLength
                    }
                    browser.updateLoci([locusObject])
                }
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
        const list = (genome.wgChromosomeNames) ?
            genome.wgChromosomeNames.map(nm => genome.getChromosomeDisplayName(nm)) :
            []

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

