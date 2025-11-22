import firebaseAdmin from 'firebase-admin';
import serviceAccount from '../../firebase.json' with { type: 'json' };

const firebase = firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
});

export default firebase;
