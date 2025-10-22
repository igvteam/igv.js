import AlertDialog from "./components/alertDialog.js"

class Alert {
    constructor(parent) {
        this.dialog = new AlertDialog(parent)

    }

    present(alert, callback) {
        this.dialog.present(alert, callback)
    }
}

export default Alert
