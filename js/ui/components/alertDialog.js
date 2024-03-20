import * as DOMUtils from "../utils/dom-utils.js"
import makeDraggable from "../utils/draggable.js"
import DOMPurify from "../../../node_modules/dompurify/dist/purify.es.mjs"

const httpMessages =
    {
        "401": "Access unauthorized",
        "403": "Access forbidden",
        "404": "Not found"
    };


class AlertDialog {
    /**
     * Initialize a new alert dialog
     * @param parent
     * @param alertProps - Optional - properties such as scroll to error
     */
    constructor(parent, alertProps) {
        this.alertProps = Object.assign({
            /** When an alert is presented - focus occur */
            shouldFocus: true,
            /** When focus occur - scroll into that element in the view */
            preventScroll: false
        }, alertProps);

        // container
        this.container = DOMUtils.div({class: "igv-ui-alert-dialog-container"});
        parent.appendChild(this.container);
        this.container.setAttribute('tabIndex', '-1')

        // header
        const header = DOMUtils.div();
        this.container.appendChild(header);

        this.errorHeadline = DOMUtils.div();
        header.appendChild(this.errorHeadline);
        this.errorHeadline.textContent = '';

        // body container
        let bodyContainer = DOMUtils.div({class: 'igv-ui-alert-dialog-body'});
        this.container.appendChild(bodyContainer);

        // body copy
        this.body = DOMUtils.div({class: 'igv-ui-alert-dialog-body-copy'});
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

        this.errorHeadline.textContent = alert.message ? 'ERROR' : ''
        let string = alert.message || alert

        if (httpMessages.hasOwnProperty(string)) {
            string = httpMessages[string];
        }

        const clean = DOMPurify.sanitize(string)

        this.body.innerHTML = clean
        this.callback = callback
        DOMUtils.show(this.container, "flex")
        if (this.alertProps.shouldFocus) {
            this.container.focus(
                { preventScroll: this.alertProps.preventScroll }
            )
        }
    }
}

export default AlertDialog;
