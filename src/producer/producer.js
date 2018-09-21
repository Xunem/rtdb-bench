import {Dbinterface, PROV_BAQEND, PROV_FIREBASE, INSERT}
  from '../db-interface/dbinterface.js';
import {v4 as uuidv4} from 'uuid';
/**
 *
 */
export class Producer {
  /**
   * @param {number} insertRate - How many Events should be transmitted
   * to the server per Second
   */
  constructor(insertRate) {
    this.firebaseClient = new Dbinterface(PROV_FIREBASE, INSERT, {});
    this.baqendClient = new Dbinterface(PROV_BAQEND, INSERT, {});
    this.insertRate = insertRate;
    this.servers = [];
    this.serverCount;
    this.counter = 0;
  }
  /** */
  setup() {
    console.log('init');
    let os = {
      0: 'freebsd',
      1: 'ubuntu',
      2: 'windows Server 2012',
      3: 'windows Server 2016',
    };
    let osCounter = 0;
    let rackCounter = 0;
    let serverrooms = 2;
    let racks = 4;
    let units = 5;
    this.serverCount = serverrooms * racks * units;
    for (let i = 0; i<this.serverCount; i++) {
      let server = {};
      server.mid = uuidv4();
      server.os = os[osCounter];
      server.rack = rackCounter;
      server.unit = i%5;
      (i < this.serverCount/serverrooms)
        ? server.room = 1
          : server.room = 2;
      server.sid = 'r'+server.room+'r'+server.rack+'u'+server.unit;
      ((i+1)%4 == 0) ? osCounter = (osCounter+1)%4 : '';
      ((i+1)%5 == 0) ? rackCounter = (rackCounter+1)%4 : '';
      let rand = Math.random();
      server.temp = rand*40+25;
      server.cpu = rand*50+50;
      server.ts = Date.now();
      this.servers.push(server);
      this.firebaseClient.saveData(server);
      this.baqendClient.saveData(server);
    }
  }

  /** */
  start() {
    this.refreshIntervalId = setInterval(() =>{
      for (let i = 0; i < this.insertRate; i++) {
        let oldData = this.servers[this.counter];
        let newData = {
          mid: uuidv4(),
          sid: oldData.sid,
          room: oldData.room,
          rack: oldData.rack,
          unit: oldData.unit,
          os: oldData.os,
        };
        let prob = Math.random()*100;
        let dir = Math.floor(prob)%2;
        if (prob<80) {
          if (dir == 0) {
            oldData.temp = Math.min(oldData.temp + (prob/100), 90);
          } else {
            oldData.temp = Math.max(oldData.temp - (prob/100), 25);
          }
        } else {
          if (dir == 0) {
            oldData.temp = Math.min(oldData.temp + (prob%10), 90);
          } else {
            oldData.temp = Math.max(oldData.temp - (prob%10), 25);
          }
        }
        newData.temp = oldData.temp;
        newData.cpu = oldData.cpu;
        newData.ts = Date.now();
        console.log(JSON.stringify(newData));
        this.counter = (this.counter+1)%this.serverCount;
        this.firebaseClient.saveData(newData);
        this.baqendClient.saveData(newData);
      }
    }, 1000);
  }
  /** */
  stop() {
    clearInterval(this.refreshIntervalId);
  }
}
