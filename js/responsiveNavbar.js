/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
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

import GenomeUtils from "./genome/genomeUtils.js"
import ChromosomeSelectWidget from "./ui/chromosomeSelectWidget.js"
import {createIcon} from "./ui/utils/icons.js"
import WindowSizePanel from "./windowSizePanel.js"
import OverlayTrackButton from "./ui/overlayTrackButton.js"
import MultiTrackSelectButton from "./ui/multiTrackSelectButton.js"
import CursorGuideButton from "./ui/cursorGuideButton.js"
import CenterLineButton from "./ui/centerLineButton.js"
import TrackLabelControl from "./ui/trackLabelControl.js"
import ROITableControl from "./roi/roiTableControl.js"
import SampleInfoControl from "./sample/sampleInfoControl.js"
import SampleNameControl from "./sample/sampleNameControl.js"
import SaveImageControl from "./ui/saveImageControl.js"
import CustomButton from "./ui/customButton.js"
import ZoomWidget from "./ui/zoomWidget.js"

class ResponsiveNavbar {
    constructor(config, browser) {

        this.browser = browser;
        this.config = config;

        this.currentClass = 'igv-navbar-text-button';

        // Create nav bar element
        const navBar = document.createElement('div');
        navBar.className = 'igv-navbar';
        this.navigation = navBar;

        // Left container
        const navbarLeftContainer = document.createElement('div');
        navbarLeftContainer.className = 'igv-navbar-left-container';
        navBar.appendChild(navbarLeftContainer);
        this.navbarLeftContainer = navbarLeftContainer;

        // IGV logo
        const logoElement = document.createElement('div');
        logoElement.className = 'igv-logo';
        navbarLeftContainer.appendChild(logoElement)

        const logoSvg = logo()
        logoSvg.style.width = "34px";
        logoSvg.style.height = "32px";
        logoElement.appendChild(logoSvg);

        this.currentGenome = document.createElement('div');
        this.currentGenome.className = 'igv-current-genome';
        navbarLeftContainer.appendChild(this.currentGenome);
        this.currentGenome.textContent = '';

        const genomicLocation = document.createElement('div');
        genomicLocation.className = 'igv-navbar-genomic-location';
        navbarLeftContainer.appendChild(genomicLocation);

        // Chromosome select widget
        this.chromosomeSelectWidget = new ChromosomeSelectWidget(browser, genomicLocation);
        if (config.showChromosomeWidget !== false) {
            this.chromosomeSelectWidget.show();
        } else {
            this.chromosomeSelectWidget.hide();
        }

        const locusSizeGroup = document.createElement('div');
        locusSizeGroup.className = 'igv-locus-size-group';
        genomicLocation.appendChild(locusSizeGroup);

        const searchContainer = document.createElement('div');
        searchContainer.className = 'igv-search-container';
        locusSizeGroup.appendChild(searchContainer);

        // Search input
        this.searchInput = document.createElement('input');
        this.searchInput.className = 'igv-search-input';
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Locus Search';
        searchContainer.appendChild(this.searchInput);

        // Stop event propagation
        this.searchInput.addEventListener('keyup', (event) => {
            event.stopImmediatePropagation();
        });

        this.searchInput.addEventListener('change', () => {
            browser.doSearch(this.searchInput.value);
        });

        const searchIconContainer = document.createElement('div');
        searchIconContainer.className = 'igv-search-icon-container';
        searchContainer.appendChild(searchIconContainer);

        const searchIcon = createIcon("search");
        searchIconContainer.appendChild(searchIcon);

        searchIconContainer.addEventListener('click', () => {
            browser.doSearch(this.searchInput.value);
        });

        this.windowSizePanel = new WindowSizePanel(locusSizeGroup, browser);

        // Right container
        const navbarRightContainer = document.createElement('div');
        navbarRightContainer.className = 'igv-navbar-right-container';
        navBar.appendChild(navbarRightContainer);
        this.navbarRightContainer = navbarRightContainer;

        const toggleButtonContainer = document.createElement('div');
        toggleButtonContainer.className = 'igv-navbar-toggle-button-container';
        navbarRightContainer.appendChild(toggleButtonContainer);
        this.toggleButtonContainer = toggleButtonContainer;

        this.overlayTrackButton = new OverlayTrackButton(toggleButtonContainer, browser);
        this.overlayTrackButton.setVisibility(false);

        const showMultiSelect = config.showMultiSelectButton !== false;
        this.multiTrackSelectButton = new MultiTrackSelectButton(toggleButtonContainer, browser, this, showMultiSelect);

        this.cursorGuideButton = new CursorGuideButton(toggleButtonContainer, browser);
        this.centerLineButton = new CenterLineButton(toggleButtonContainer, browser);
        this.trackLabelControl = new TrackLabelControl(toggleButtonContainer, browser);
        this.roiTableControl = new ROITableControl(toggleButtonContainer, browser);
        this.sampleInfoControl = new SampleInfoControl(toggleButtonContainer, browser);
        this.sampleNameControl = new SampleNameControl(toggleButtonContainer, browser);

        if (config.showSVGButton === true) {
            this.saveImageControl = new SaveImageControl(toggleButtonContainer, browser);
        }

        if (config.customButtons) {
            for (let b of config.customButtons) {
                new CustomButton(toggleButtonContainer, browser, b);
            }
        }

        this.zoomWidget = new ZoomWidget(config, browser, navbarRightContainer);

        if (config.showNavigation === false) {
            this.navigation.style.display = 'none';
        }
    }

    navbarDidResize() {

        const currentClass = this.currentNavbarButtonClass()
        if ('igv-navbar-text-button' === currentClass) {
            this.textButtonContainerWidth = this.navbarRightContainer.getBoundingClientRect().width
        }
        const browser = this.browser
        const isWGV =
            (browser.isMultiLocusWholeGenomeView()) ||
            (browser.referenceFrameList && GenomeUtils.isWholeGenomeView(browser.referenceFrameList[0].chr))

        isWGV ? this.windowSizePanel.hide() : this.windowSizePanel.show()

        const {
            x: leftContainerX,
            width: leftContainerWidth
        } = this.navbarLeftContainer.getBoundingClientRect()
        const leftContainerExtent = leftContainerX + leftContainerWidth
        const {x: rightContainerX} = this.navbarRightContainer.getBoundingClientRect()

        const delta = rightContainerX - leftContainerExtent

        let navbarButtonClass
        const threshold = 8
        if ('igv-navbar-text-button' === currentClass && delta < threshold) {
            navbarButtonClass = 'igv-navbar-icon-button'
        } else if (this.textButtonContainerWidth && 'igv-navbar-icon-button' === currentClass) {
            const length = this.navigation.offsetWidth - leftContainerExtent
            if (length - this.textButtonContainerWidth > threshold) {
                navbarButtonClass = 'igv-navbar-text-button'
            }
        }
        // Update all the buttons (buttons are listeners)
        if(navbarButtonClass && currentClass !== navbarButtonClass) {
            this.currentClass = navbarButtonClass
            this.browser.fireEvent('navbar-resize', [navbarButtonClass])
        }

        let zoomContainerClass
        if (isWGV) {
            zoomContainerClass = 'igv-zoom-widget-hidden'
        } else {
            zoomContainerClass = this.navigation.offsetWidth > 860 ? 'igv-zoom-widget' : 'igv-zoom-widget-900'
        }
        this.zoomWidget.zoomContainer.className = '';
        this.zoomWidget.zoomContainer.classList.add(zoomContainerClass);
    }

    updateGenome(genome) {
        let genomeLabel = (genome.id && genome.id.length < 20
            ? genome.id
            : `${genome.id.substring(0, 8)}...${genome.id.substring(genome.id.length - 8)}`);

        // Update genome label text
        this.currentGenome.textContent = genomeLabel;

        // Update genome description as a title attribute
        this.currentGenome.setAttribute('title', genome.description);

        // Chromosome select widget -- Show this if it's not explicitly hidden AND the genome has pre-loaded chromosomes
        const showChromosomeWidget =
            this.config.showChromosomeWidget !== false &&
            genome.showChromosomeWidget !== false &&
            genome.chromosomeNames &&
            genome.chromosomeNames.length > 1;

        if (showChromosomeWidget) {
            this.chromosomeSelectWidget.update(genome)
            this.chromosomeSelectWidget.show()
        } else {
            this.chromosomeSelectWidget.hide()
        }    }

    updateLocus(loc, chrName) {
        if (this.searchInput) {
            this.searchInput.value = loc;
        }
        if (this.chromosomeSelectWidget) {
            this.chromosomeSelectWidget.select.value = chrName
        }
    }

    currentNavbarButtonClass() {
        return this.currentClass
    }

    setEnableTrackSelection(b) {
        this.multiTrackSelectButton.setMultiTrackSelection(b)
    }

    getEnableTrackSelection() {
        return this.multiTrackSelectButton.enableMultiTrackSelection
    }

    hide() {
        this.navigation.style.display = 'none';
    }

    show() {
        this.navigation.style.display = 'flex';
    }

}

function logo() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "690px");
    svg.setAttribute("height", "324px");
    svg.setAttribute("viewBox", "0 0 690 324");
    svg.setAttribute("version", "1.1");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = "IGV";
    svg.appendChild(title);

    const gPage = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gPage.setAttribute("id", "Page-1");
    gPage.setAttribute("stroke", "none");
    gPage.setAttribute("stroke-width", "1");
    gPage.setAttribute("fill", "none");
    gPage.setAttribute("fill-rule", "evenodd");
    svg.appendChild(gPage);

    const gIGV = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gIGV.setAttribute("id", "IGV");
    gIGV.setAttribute("fill", "#666666");
    gPage.appendChild(gIGV);

    const polygon1 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon1.setAttribute("id", "Path");
    polygon1.setAttribute(
        "points",
        "379.54574 8.00169252 455.581247 8.00169252 515.564813 188.87244 532.884012 253.529506 537.108207 253.529506 554.849825 188.87244 614.833392 8.00169252 689.60164 8.00169252 582.729511 320.722144 486.840288 320.722144"
    );
    gIGV.appendChild(polygon1);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
        "d",
        "M261.482414,323.793286 C207.975678,323.793286 168.339046,310.552102 142.571329,284.069337 C116.803612,257.586572 103.919946,217.158702 103.919946,162.784513 C103.919946,108.410325 117.437235,67.8415913 144.472217,41.0770945 C171.507199,14.3125977 212.903894,0.930550071 268.663545,0.930550071 C283.025879,0.930550071 298.232828,1.84616386 314.284849,3.6774189 C330.33687,5.50867394 344.839793,7.97378798 357.794056,11.072835 L357.794056,68.968378 C339.48912,65.869331 323.578145,63.5450806 310.060654,61.9955571 C296.543163,60.4460336 284.574731,59.6712835 274.154998,59.6712835 C255.850062,59.6712835 240.502308,61.4320792 228.111274,64.9537236 C215.720241,68.4753679 205.793482,74.2507779 198.330701,82.2801269 C190.867919,90.309476 185.587729,100.87425 182.48997,113.974767 C179.392212,127.075284 177.843356,143.345037 177.843356,162.784513 C177.843356,181.942258 179.251407,198.000716 182.067551,210.960367 C184.883695,223.920018 189.671068,234.41436 196.429813,242.443709 C203.188559,250.473058 212.059279,256.178037 223.042241,259.558815 C234.025202,262.939594 247.683295,264.629958 264.01693,264.629958 C268.241146,264.629958 273.098922,264.489094 278.590403,264.207362 C284.081883,263.925631 289.643684,263.50304 295.275972,262.939577 L295.275972,159.826347 L361.595831,159.826347 L361.595831,308.579859 C344.698967,313.087564 327.239137,316.750019 309.215815,319.567334 C291.192494,322.38465 275.281519,323.793286 261.482414,323.793286 L261.482414,323.793286 L261.482414,323.793286 Z"
    );
    path.setAttribute("id", "Path");
    gIGV.appendChild(path);

    const polygon2 = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon2.setAttribute("id", "Path");
    polygon2.setAttribute(
        "points",
        "0.81355666 5.00169252 73.0472883 5.00169252 73.0472883 317.722144 0.81355666 317.722144"
    );
    gIGV.appendChild(polygon2);

    return svg;
}


export default ResponsiveNavbar
