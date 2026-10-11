import AlertDialog from "./components/alertDialog.js"

class Alert {
    constructor(parent) {
        this.dialog = new AlertDialog(parent)

    }

    present(alert, callback) {
        this.dialog.present(alert, callback)
    }

    dispose() {
        this.dialog.dispose()
    }
}

export default Alert
