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

import $ from "./vendor/jquery-3.3.1.slim.js";
import {guid} from "./util/domUtils.js";

class ViewportBase {

    constructor(trackView, $viewportContainer, genomicState, width) {

        this.guid = guid();
        this.trackView = trackView;
        this.genomicState = genomicState;

        this.browser = trackView.browser;

        this.$viewport = $('<div class="igv-viewport">');
        $viewportContainer.append(this.$viewport);

        // store the viewport GUID for later use
        this.$viewport.data('viewportGUID', this.guid);

        this.$content = $("<div>", {class: 'igv-viewport-content'});
        this.$viewport.append(this.$content);

        this.$content.height(this.$viewport.height());
        this.contentDiv = this.$content.get(0);

        this.$canvas = $('<canvas class ="igv-canvas">');
        this.$content.append(this.$canvas);

        this.canvas = this.$canvas.get(0);
        this.ctx = this.canvas.getContext("2d");

        this.setWidth(width);

        this.initializationHelper()

    }

    initializationHelper() {

    }

    setTrackLabel(label) {}

    startSpinner() {}
    stopSpinner(){}

    checkZoomIn() {
        return true
    }

    showMessage(message) {
        if (!this.messageDiv) {
            this.messageDiv = document.createElement('div');
            this.messageDiv.className = 'igv-viewport-message';
            this.contentDiv.append(this.messageDiv)
        }
        this.messageDiv.textContent = message;
        this.messageDiv.style.display = 'inline-block'
    }

    hideMessage(message) {
        if (this.messageDiv)
            this.messageDiv.style.display = 'none'
    }

    async renderSVGContext(context, offset) {

        // Nothing to do if zoomInNotice is active
        if (this.$zoomInNotice && this.$zoomInNotice.is(":visible")) {
            return;
        }

        let str = this.trackView.track.name || this.trackView.track.id;
        str = str.replace(/\W/g, '');

        const genomicStateIndex = this.browser.genomicStateList.indexOf(this.genomicState);
        const id = str.toLowerCase() + '_genomic_state_index_' + genomicStateIndex;

        // If present, paint axis canvas. Only in first multi-locus panel.
        if (0 === genomicStateIndex && typeof this.trackView.track.paintAxis === 'function') {

            const bbox = this.trackView.controlCanvas.getBoundingClientRect();
            context.addTrackGroupWithTranslationAndClipRect((id + '_axis'), offset.deltaX - bbox.width, offset.deltaY, bbox.width, bbox.height, 0);

            context.save();
            this.trackView.track.paintAxis(context, bbox.width, bbox.height);
            context.restore();
        }

        const yScrollDelta = $(this.contentDiv).position().top;
        const dx = offset.deltaX + (genomicStateIndex * context.multiLocusGap);
        const dy = offset.deltaY + yScrollDelta;
        const {width, height} = this.$viewport.get(0).getBoundingClientRect();

        context.addTrackGroupWithTranslationAndClipRect(id, dx, dy, width, height, -yScrollDelta);

        // console.log(`ViewportBase render SVG. context.addGroup( id ${ id } dx ${ dx } dy ${ dy } width ${ width } height ${ height } -yScrollDelta ${ -yScrollDelta })`)

        this.drawSVGWithContect(context, width, height)

    }

    drawSVGWithContect(context) {

    }

    saveSVG() {

    }

    isVisible() {
        return this.$viewport.width()
    }

    setWidth(width) {
        this.$viewport.width(width);
        this.canvas.style.width = (`${ width }px`);
        this.canvas.setAttribute('width', width);
    }

    shift() {}

    setTop(contentTop) {}

    async loadFeatures () {
        return undefined
    }

    setContentHeight(contentHeight) {}

    isLoading() {
        return false
    }

    getContentHeight() {
        return this.$content.height();
    }

    getContentTop() {
        return this.contentDiv.offsetTop;
    }

    /**
     * Called when the associated track is removed.  Do any needed cleanup here.
     */
    dispose() {

        if (this.popover) {
            this.popover.dispose()
        }

        this.$canvas.off();
        this.$canvas.empty();

        this.$content.off();
        this.$content.empty();

        this.$viewport.off();
        this.$viewport.empty();

        // Null out all properties -- this should not be neccessary, but just in case there is a
        // reference to self somewhere we want to free memory.
        for (let key of Object.keys(this)) {
            this[ key ] = undefined
        }
    }

}

export default ViewportBase
