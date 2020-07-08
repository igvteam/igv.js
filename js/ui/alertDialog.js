import { DOMUtils } from '../../node_modules/igv-ui/src/index.js';

const httpMessages =
    {
        "401": "Access unauthorized",
        "403": "Access forbidden",
        "404": "Not found"
    };


class AlertDialog {
    constructor(parent) {

        // container
        this.container = DOMUtils.div({class: "igv-ui-alert-dialog-container"});
        parent.appendChild(this.container);

        // header
        let header = DOMUtils.div();
        this.container.appendChild(header);

        // body container
        let bodyContainer = DOMUtils.div({id: 'igv-ui-alert-dialog-body'});
        this.container.appendChild(bodyContainer);

        // body copy
        this.body = DOMUtils.div({id: 'igv-ui-alert-dialog-body-copy'});
        bodyContainer.appendChild(this.body);

        // ok container
        let ok_container = DOMUtils.div();
        this.container.appendChild(ok_container);

        // ok
        this.ok = DOMUtils.div();
        ok_container.appendChild(this.ok);
        this.ok.textContent = 'OK';
        const self = this;
        this.ok.addEventListener('click', function (ev) {
            if (typeof self.callback === 'function') {
                self.callback("OK");
                self.callback = undefined;
            }
            self.body.innerHTML = '';
            DOMUtils.hide(self.container);
        });

        DOMUtils.hide(this.container);
    }

    present(alert, callback) {
        let string = alert.message || alert;
        if (httpMessages.hasOwnProperty(string)) {
            string = httpMessages[string];
        }
        this.body.innerHTML = string;
        this.callback = callback;
        DOMUtils.show(this.container, "flex");
    }
}

export default AlertDialog;
