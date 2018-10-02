// import * as DB from 'baqend/realtime';
// import * as firebase from 'firebase';

export const initConnections = new Promise((resolve) => {
  let app = 'real-time-benchmark';
  let config = {
    apiKey: 'AIzaSyAutXeruAGoGxOSuTQSxBH-iVxHoN9K56k',
    authDomain: 'fir-demo-aa3d1.firebaseapp.com',
    databaseURL: 'https://fir-demo-aa3d1.firebaseio.com',
    projectId: 'fir-demo-aa3d1',
    storageBucket: 'fir-demo-aa3d1.appspot.com',
    messagingSenderId: '801259432549',
  };
  let instances = {};
  instances.fb = firebase.initializeApp(config);
  instances.ba = DB;
  instances.ba.connect(app);
  instances.ba.ready().then(() => {
    console.log(instances.fb);
    resolve(instances);
  });
});
