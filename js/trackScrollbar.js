import $ from './vendor/jquery-3.3.1.slim.js'
import {DOMUtils} from '../node_modules/igv-utils/src/index.js'
import {maxViewportContentHeight} from './trackView.js';

const namespace = '.trackscrollbar' + DOMUtils.guid()

class TrackScrollbar {

    constructor($viewportContainer, viewports, sampleNameViewport) {

        let lastY;

        // Define mouse events first, use arrow function so "this" is in scope

        const mouseMove = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const page = DOMUtils.pageCoordinates(event);
            this.moveScrollerBy(page.y - lastY);
            lastY = page.y;
        }

        const mouseUp = (event) => {
            $(document).off(this.namespace);
        }

        const mouseDown = (event) => {
            event.preventDefault();
            const page = DOMUtils.pageCoordinates(event);
            lastY = page.y;
            $(document).on('mousemove' + namespace, mouseMove);
            $(document).on('mouseup' + namespace, mouseUp);
            $(document).on('mouseleave' + namespace, mouseUp);

            // prevents start of horizontal track panning)
            event.stopPropagation();
        }


        this.namespace = namespace;

        this.$outerScroll = $('<div class="igv-scrollbar-outer-div">');
        this.$innerScroll = $('<div>');

        this.$outerScroll.append(this.$innerScroll);

        this.$viewportContainer = $viewportContainer;
        this.viewports = viewports;
        this.sampleNameViewport = sampleNameViewport

        this.$innerScroll.on("mousedown", mouseDown);

        this.$innerScroll.on("click", (event) => {
            event.stopPropagation();
        });

        this.$outerScroll.on("click", (event) => {
            this.moveScrollerBy(event.offsetY - this.$innerScroll.height() / 2);
            event.stopPropagation();

        });
    }

    disableMouseHandlers () {
        $(document).off(namespace)
        this.$innerScroll.off()
        this.$outerScroll.off()
    }

    moveScrollerBy(delta) {
        const y = this.$innerScroll.position().top + delta;
        this.moveScrollerTo(y);
    }

    moveScrollerTo(y) {

        const outerScrollHeight = this.$outerScroll.height();
        const innerScrollHeight = this.$innerScroll.height();

        const newTop = Math.min(Math.max(0, y), outerScrollHeight - innerScrollHeight);

        const contentDivHeight = maxViewportContentHeight(this.viewports);
        const contentTop = -Math.round(newTop * (contentDivHeight / this.$viewportContainer.height()));

        this.$innerScroll.css("top", newTop + "px");

        for (let viewport of [...this.viewports, this.sampleNameViewport]) {
            viewport.setTop(contentTop)
        }

    }

    dispose() {
        $(window).off(this.namespace);
        this.$innerScroll.off();
    }

    update() {

        const viewportContainerHeight = this.$viewportContainer.height();

        const viewportContentHeight = maxViewportContentHeight(this.viewports);

        const innerScrollHeight = Math.round((viewportContainerHeight / viewportContentHeight) * viewportContainerHeight);

        if (viewportContentHeight > viewportContainerHeight) {
            this.$innerScroll.show();
            this.$innerScroll.height(innerScrollHeight);
        } else {
            this.$innerScroll.hide();
        }
    }
}

export default TrackScrollbar
