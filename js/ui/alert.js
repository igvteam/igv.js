import AlertDialog from './alertDialog.js';

// The global Alert dialog

let alertDialog

const Alert = {
    init(root) {
        if (!alertDialog) {
            alertDialog = new AlertDialog(root);
        }
    },

    presentAlert: function (alert, callback) {
        alertDialog.present(alert, callback);
    },
}

export default Alert;
