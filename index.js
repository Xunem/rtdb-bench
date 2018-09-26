import {PROV_BAQEND, PROV_FIREBASE} from './src/db-interface/dbinterface.js';
import {initConnections} from './src/db-interface/dbconnector.js';
import {Producer} from './src/producer/producer.js';
import {OverviewClient} from './src/client/overviewClient.js';
import {RoomClient} from './src/client/roomClient.js';
import {ServerClient} from './src/client/serverClient.js';
import {Controls} from './src/controls/controls.js';
import 'nouislider';

let room = 1;
initConnections.then((client) => {
  const controls = new Controls();
  const producer = new Producer(3);
  const overviewClientBa = new OverviewClient(controls, PROV_BAQEND);
  const overviewClientFb = new OverviewClient(controls, PROV_FIREBASE);
  const roomClientBa = new RoomClient(controls, PROV_BAQEND);
  const roomClientFb = new RoomClient(controls, PROV_FIREBASE);
  const serverClientBa = new ServerClient(controls, PROV_BAQEND, 'r2r2u0');
  const serverClientFb = new ServerClient(controls, PROV_FIREBASE, 'r2r2u0');
  overviewClientBa.init();
  overviewClientFb.init();
  roomClientBa.init();
  roomClientFb.init();
  serverClientBa.init();
  serverClientFb.init();
  let sliderTemp = document.getElementById('sliderTemp');
  let sliderCpu = document.getElementById('sliderCpu');
  let minTemp = document.getElementById('minTemp');
  let maxTemp = document.getElementById('maxTemp');
  let minCpu = document.getElementById('minCpu');
  let maxCpu = document.getElementById('maxCpu');
  noUiSlider.create(sliderTemp, {
    start: [25, 100],
    connect: true,
    range: {
      'min': 25,
      'max': 100,
    },
  });
  sliderTemp.noUiSlider.on('update', (values, handle) => {
    let value = values[handle];
    if (handle) {
      controls.getMaxTemp().next(value);
      console.log('v'+value);
      maxTemp.value = value;
    } else {
      controls.getMinTemp().next(value);
      console.log('v'+value);
      minTemp.value = value;
    }
  });
  minTemp.addEventListener('change', () => {
    controls.getMinTemp().next(minTemp.value);
  });
  maxTemp.addEventListener('change', () => {
    controls.getMaxTemp().next(maxCpu.value);
  });
  noUiSlider.create(sliderCpu, {
    start: [50, 100],
    connect: true,
    range: {
      'min': 50,
      'max': 100,
    },
  });
  sliderCpu.noUiSlider.on('update', (values, handle) => {
    let value = values[handle];
    if (handle) {
      controls.getMaxCpu().next(value);
      maxCpu.value = value;
    } else {
      controls.getMinCpu().next(value);
      minCpu.value = value;
    }
  });
  minCpu.addEventListener('change', () => {
    controls.getMinCpu().next(minCpu.value);
    sliderCpu.noUiSlider.set([minCpu.value, null]);
  });
  maxCpu.addEventListener('change', () => {
    controls.getMaxCpu().next(maxCpu.value);
    sliderCpu.noUiSlider.set([null, maxCpu.value]);
  });

  document.getElementById('applyRange').addEventListener('click', () => {
    overviewClientBa.updateFilter();
    overviewClientFb.updateFilter();
  });

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
  document.getElementById('hottest').addEventListener('change', () => {
    let hotmode = document.getElementById('hottest').checked;
    controls.getHottestServer().next(hotmode);
  });
  controls.getHottestServer().subscribe((value) => {
    document.getElementById('hottest').checked = value;
  });
  let roomSelect = document.getElementById('room');
  roomSelect.addEventListener('change', () => {
    if (roomSelect.value != room) {
      room = roomSelect.value;
      controls.getRoomNumber().next(room);
    }
  });
});
