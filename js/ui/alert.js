import AlertDialog from './alertDialog.js';

class Alert {
    constructor(root) {
        this.alertDialog = new AlertDialog(root);
    }

    present(alert, callback) {
        this.alertDialog.present(alert, callback);
    }

}

export default Alert;
