import {PROV_BAQEND, PROV_FIREBASE} from './src/db-interface/dbinterface.js';
import {initConnections} from './src/db-interface/dbconnector.js';
import {Producer} from './src/producer/producer.js';
import {OverviewClient} from './src/client/overviewClient.js';
import {RoomClient} from './src/client/roomClient.js';
import {ServerClient} from './src/client/serverClient.js';
import {Controls} from './src/controls/controls.js';

let room = 1;
initConnections.then((client) => {
  const controls = new Controls();
  const producer = new Producer(3);
  const overviewClient = new OverviewClient(controls);
  const roomClientBa = new RoomClient(controls, PROV_BAQEND);
  const roomClientFb = new RoomClient(controls, PROV_FIREBASE);
  const serverClient = new ServerClient(controls, PROV_BAQEND, 'r2r2u0');
  overviewClient.init();
  roomClientBa.init();
  roomClientFb.init();
  serverClient.init();
  document.getElementById('init').addEventListener('click', () => {
    producer.setup();
  });
  document.getElementById('start').addEventListener('click', () => {
    producer.start();
  });
  document.getElementById('stop').addEventListener('click', () => {
    producer.stop();
  });
  document.getElementById('reset').addEventListener('click', () => {
    producer.reset();
  });
  document.getElementById('hottest').checked = true;
  let roomSelect = document.getElementById('room');
  roomSelect.addEventListener('change', () => {
    if (roomSelect.value != room) {
      room = roomSelect.value;
      controls.getRoomNumber().next(room);
    }
  });
});
