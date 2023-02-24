import { AlertDialog } from '../../node_modules/igv-ui/src/index.js'

class Alert {
    constructor(parent) {
        this.dialog = new AlertDialog(parent)

    }

    present(alert, callback) {
        this.dialog.present(alert, callback)
    }
}

export default Alert
