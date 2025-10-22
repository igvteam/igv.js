import * as UIUtils from "../utils/ui-utils.js"
import * as DOMUtils from "../utils/dom-utils.js"
import makeDraggable from "../utils/draggable.js"

class Dialog {

    constructor({parent, label, content, okHandler, cancelHandler}) {

        this.parent = parent

        const cancel = () => {
            this.elem.style.display = 'none'
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
            this.elem.style.display = 'none'
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

        const { top} = e.currentTarget.parentElement.getBoundingClientRect()
        this.elem.style.top = `${ top }px`;

        this.elem.style.display = 'flex'
    }
}

export default Dialog
