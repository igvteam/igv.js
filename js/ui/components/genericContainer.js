import * as UIUtils from "../utils/ui-utils.js"
import * as DOMUtils from "../utils/dom-utils.js"
import makeDraggable from "../utils/draggable.js"


class GenericContainer {

    constructor({parent,  top, left, width, height, border, closeHandler}) {

        const container = DOMUtils.div({class: 'igv-ui-generic-container'});
        parent.appendChild(container);

        this.container = container;

        if (width !== undefined) {
            this.container.style.width = `${ width }px`
        }
        if (height !== undefined) {
            this.container.style.height = `${ height }px`
        }
        if(border) {
            this.container.style.border = border;
        }

        // header
        const header = DOMUtils.div();
        this.container.appendChild(header);

        // close button
        UIUtils.attachDialogCloseHandlerWithParent(header, (e) => {
            if(typeof closeHandler === "function") {
                closeHandler(e);
            }
            this.hide()
        });

        makeDraggable(this.container, header);

        this.hide()
    }

    show() {
        this.container.style.display = 'flex'
    }

    hide() {
        this.container.style.display = 'none'
    }

    dispose() {
        if(this.container.parent)  {
            this.container.parent.removeChild(this.container);
        }
    }
}

export default GenericContainer;
