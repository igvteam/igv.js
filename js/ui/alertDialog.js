
import { DOMUtils, makeDraggable } from '../../node_modules/igv-utils/src/index.js'

const httpMessages =
    {
        "401": "Access unauthorized",
        "403": "Access forbidden",
        "404": "Not found"
    };


class AlertDialog {
    constructor(parent) {

        // container
        this.container = DOMUtils.div({class: "igv-alert-dialog-container"});
        parent.appendChild(this.container);
        this.parent = parent;

        this.container.setAttribute('tabIndex', '-1')

        // header
        const header = DOMUtils.div();
        this.container.appendChild(header);

        const error = DOMUtils.div();
        header.appendChild(error);
        error.textContent = "ERROR";

        // body container
        let bodyContainer = DOMUtils.div({id: 'igv-alert-dialog-body'});
        this.container.appendChild(bodyContainer);

        // body copy
        this.body = DOMUtils.div({id: 'igv-alert-dialog-body-copy'});
        bodyContainer.appendChild(this.body);

        // ok container
        let ok_container = DOMUtils.div();
        this.container.appendChild(ok_container);

        // ok
        this.ok = DOMUtils.div();
        ok_container.appendChild(this.ok);
        this.ok.textContent = 'OK';

        const okHandler = () => {

            if (typeof this.callback === 'function') {
                this.callback("OK");
                this.callback = undefined;
            }
            this.body.innerHTML = '';
            DOMUtils.hide(this.container);
        }

        this.ok.addEventListener('click', event => {

            event.stopPropagation()

            okHandler()
        });

        this.container.addEventListener('keypress', event => {

            event.stopPropagation()

            if ('Enter' === event.key) {
                okHandler()
            }
        });

        makeDraggable(this.container, header);

        DOMUtils.hide(this.container);
    }

    present(alert, callback) {
        let string = alert.message || alert;
        if (httpMessages.hasOwnProperty(string)) {
            string = httpMessages[string];
        }

        this.body.innerHTML = string
        this.callback = callback

        DOMUtils.show(this.container)

        // DOMUtils.show(this.container, "flex");
        const { width   } = this.parent.getBoundingClientRect()
        const { width: w, height: h } = this.container.getBoundingClientRect()

        const x = 0.5 * (width - w)
        const y = h/2

        this.container.style.left = `${x}px`
        this.container.style.top = `${y}px`

        this.container.focus()
    }
}

export default AlertDialog;
