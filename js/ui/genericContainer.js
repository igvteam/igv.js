import * as UIUtils from "./utils/ui-utils.js"
import * as DOMUtils from "./utils/dom-utils.js"
import makeDraggable from "./utils/draggable.js"


class GenericContainer {

    constructor({parent,  top, left, width, height, border, closeHandler}) {

        let container = DOMUtils.div({class: 'igv-ui-generic-container'});
        parent.appendChild(container);
        DOMUtils.hide(container);
        this.container = container;

        if(top !== undefined) {
            this.container.style.top = `${ top }px`
        }
        if(left !== undefined) {
            this.container.style.left = `${ left }px`
        }
        if (width !== undefined) {
            this.container.style.width = `${ width }px`
        }
        if (height !== undefined) {
            this.container.style.height = `${ height }px`
        }
        if(border) {
            this.container.style.border = border;
        }
        //
        // let bbox = parent.getBoundingClientRect();
        // this.origin = {x: bbox.x, y: bbox.y};
        // this.container.offset({left: this.origin.x, top: this.origin.y});

        // header
        const header = DOMUtils.div();
        this.container.appendChild(header);

        // close button
        UIUtils.attachDialogCloseHandlerWithParent(header, (e) => {
            DOMUtils.hide(this.container);
            if(typeof closeHandler === "function") {
                closeHandler(e);
            }
        });

        makeDraggable(this.container, header);
    }

    show() {
        DOMUtils.show(this.container);
    }

    hide() {
        DOMUtils.hide(this.container)
    }

    dispose() {
        if(this.container.parent)  {
            this.container.parent.removeChild(this.container);
        }
    }
}

export default GenericContainer;
