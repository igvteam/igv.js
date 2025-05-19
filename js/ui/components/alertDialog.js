import DOMPurify from "../../../node_modules/dompurify/dist/purify.es.mjs"
import makeDraggable from "../utils/draggable.js"

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
        this.container = document.createElement('div');
        this.container.className = "igv-ui-alert-dialog-container";
        parent.appendChild(this.container);
        this.container.setAttribute('tabIndex', '-1');

        // header
        const header = document.createElement('div');
        this.container.appendChild(header);

        this.errorHeadline = document.createElement('div');
        header.appendChild(this.errorHeadline);
        this.errorHeadline.textContent = '';

        // body container
        let bodyContainer = document.createElement('div');
        bodyContainer.className = 'igv-ui-alert-dialog-body';
        this.container.appendChild(bodyContainer);

        // body copy
        this.body = document.createElement('div');
        this.body.className = 'igv-ui-alert-dialog-body-copy';
        bodyContainer.appendChild(this.body);

        // ok container
        let ok_container = document.createElement('div');
        this.container.appendChild(ok_container);

        // ok
        this.ok = document.createElement('div');
        ok_container.appendChild(this.ok);
        this.ok.textContent = 'OK';

        const okHandler = () => {

            if (typeof this.callback === 'function') {
                this.callback("OK");
                this.callback = undefined;
            }
            this.body.innerHTML = '';
            this.container.style.display = 'none'
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

        this.container.style.display = 'none'
    }

    present(alert, callback) {

        this.errorHeadline.textContent = alert.message ? 'ERROR' : ''
        let string = alert.message || alert

        if (httpMessages.hasOwnProperty(string)) {
            string = httpMessages[string];
        }

        this.body.innerHTML = DOMPurify.sanitize(string)

        this.callback = callback
        this.container.style.display = 'flex'
        if (this.alertProps.shouldFocus) {
            this.container.focus({ preventScroll: this.alertProps.preventScroll })
        }
    }
}

export default AlertDialog;
