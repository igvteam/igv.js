import * as UIUtils from "../utils/ui-utils.js"
import * as DOMUtils from "../utils/dom-utils.js"
import makeDraggable from "../utils/draggable.js"

class Dialog {

    constructor({parent, label, content, okHandler, cancelHandler}) {

        this.parent = parent

        const cancel = () => {
            DOMUtils.hide(this.elem);
            if (typeof cancelHandler === 'function') {
                cancelHandler(this);
            }
        }

        // dialog container
        this.elem = DOMUtils.div()
        this.elem.classList.add('igv-ui-generic-dialog-container', 'igv-ui-center-fixed')

        // dialog header
        const header = DOMUtils.div({class: 'igv-ui-generic-dialog-header'});
        this.elem.appendChild(header);

        UIUtils.attachDialogCloseHandlerWithParent(header, cancel);

        // dialog label
        if(label) {
            const labelDiv = DOMUtils.div({class: 'igv-ui-dialog-one-liner'});
            this.elem.appendChild(labelDiv);
            labelDiv.innerHTML = label;
        }

        // input container
        content.elem.style.margin = '16px';
        this.elem.appendChild(content.elem);

        this.content = content;

        // ok | cancel
        const buttons = DOMUtils.div({class: 'igv-ui-generic-dialog-ok-cancel'});
        this.elem.appendChild(buttons);

        // ok
        this.ok = DOMUtils.div();
        buttons.appendChild(this.ok);
        this.ok.textContent = 'OK';

        // cancel
        this.cancel = DOMUtils.div();
        buttons.appendChild(this.cancel);
        this.cancel.textContent = 'Cancel';

        this.callback = undefined

        this.ok.addEventListener('click',  e => {
            DOMUtils.hide(this.elem);
            if (typeof okHandler === 'function') {
                okHandler(this);
            } else if (this.callback && typeof this.callback === 'function') {
                this.callback(this)
            }
        });

        this.cancel.addEventListener('click', cancel);

        makeDraggable(this.elem, header);

        // Consume all clicks in component
        this.elem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
        })

    }

    present(options, e) {

        if (options.label && this.label) {
            this.label.textContent = options.label;
        }

        if (options.html) {
            const div = this.content.html
            div.innerHTML = options.html
        }

        if (options.text) {
            const div = this.content.html
            div.innerText = options.text
        }

        if (options.value && this.input) {
            this.input.value = options.value;
        }

        if (options.callback) {
            this.callback = options.callback;
        }

        // const page = DOMUtils.pageCoordinates(e);
        // this.clampLocation(page.x, page.y);

        DOMUtils.show(this.elem);
    }

    clampLocation(pageX, pageY) {

        let popoverRect = this.elem.getBoundingClientRect();
        let parentRect = this.parent.getBoundingClientRect();
        const y = Math.min(Math.max(pageY, parentRect.y), parentRect.y + parentRect.height - popoverRect.height);
        const x = Math.min(Math.max(pageX, parentRect.x), parentRect.x + parentRect.width - popoverRect.width);
        this.elem.style.left = x + "px";
        this.elem.style.top = y + "px";
    }
}

export default Dialog
