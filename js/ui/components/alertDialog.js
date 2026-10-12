import DOMPurify from "../../../node_modules/dompurify/dist/purify.es.mjs"
import makeDraggable from "../utils/draggable.js"
import {httpMessages} from "../../util/loadFailure.js"

// Alerts are shown one at a time across every dialog on the page: one presented while another is open waits, in
// order, until it is dismissed, so no alert replaces another.  JavaScript is single threaded, so a queue is all the
// "synchronization" needed.
let openDialog
const pending = []   // [dialog, alert, callback]

function isOpen(dialog) {
    // A dialog removed from the page (e.g. with its track) can no longer be dismissed; don't let it block the queue
    return dialog !== undefined && !dialog.isRemoved() && 'none' !== dialog.container.style.display
}

function showNext() {
    openDialog = undefined
    while (pending.length > 0) {
        const [dialog, alert, callback] = pending.shift()
        if (!dialog.isRemoved()) {
            dialog.show(alert, callback)
            return
        }
    }
}

class AlertDialog {

    #disposed = false
    #wasConnected = false   // Whether the dialog has been on the page, so a dialog that is not now has been removed
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

            if (openDialog === this) {
                showNext()
            }
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
        this.#noteConnected()
    }

    #noteConnected() {
        this.#wasConnected ||= this.container.isConnected
    }

    /**
     * Whether the dialog has been disposed of, or removed from the page (e.g. with its track): such a dialog can't
     * show an alert, or be dismissed.  A dialog that has never been on the page (e.g. a browser created in a div
     * that is attached to the page later) can: its alert is seen once the dialog is attached.
     */
    isRemoved() {
        this.#noteConnected()
        return this.#disposed || (this.#wasConnected && !this.container.isConnected)
    }

    /**
     * Remove the dialog from the page.  An alert it is showing is dismissed, without its callback, and any alert
     * presented to it is dropped.
     */
    dispose() {
        this.#disposed = true
        this.container.remove()
        if (openDialog === this) {
            showNext()
        }
    }

    /**
     * Present an alert.  If an alert is already open, in this or any other dialog, this one waits until that is
     * dismissed.
     *
     * @param alert  An Error, or a string (may contain HTML, which is sanitized).  Line breaks are kept
     * @param callback  Optional, called with "OK" when the alert is dismissed
     */
    present(alert, callback) {
        pending.push([this, alert, callback])
        if (!isOpen(openDialog)) {
            showNext()
        }
    }

    show(alert, callback) {

        openDialog = this
        this.#noteConnected()

        this.errorHeadline.textContent = alert.message ? 'ERROR' : ''
        let string = alert.message || alert

        if (httpMessages.hasOwnProperty(string)) {
            string = httpMessages[string];
        }

        this.body.innerHTML = DOMPurify.sanitize(string).replaceAll('\n', '<br>')

        this.callback = callback
        this.container.style.display = 'flex'
        if (this.alertProps.shouldFocus) {
            this.container.focus({ preventScroll: this.alertProps.preventScroll })
        }
    }
}

export default AlertDialog;
