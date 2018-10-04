import {Dbinterface, PROV_BAQEND, PROV_FIREBASE, INSERT}
  from '../db-interface/dbinterface.js';
import {v4 as uuidv4} from 'uuid';
/**
 *
 */
export class Producer {
  /**
   * @param {*} instances
   * @param {number} insertRate - How many Events should be transmitted
   * to the server per Second
   */
  constructor(instances, insertRate) {
    this.firebaseClient = new Dbinterface(
        PROV_FIREBASE, instances.fb, INSERT, {});
    this.baqendClient = new Dbinterface(
        PROV_BAQEND, instances.ba, INSERT, {});
    this.insertRate = insertRate;
    this.servers = [];
    this.serverCount;
    this.counter = 0;
    this.initial = true;
  }
  /** */
  setup() {
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
      server.cpu = rand*50+25;
      server.prob = rand;
      server.ts = Date.now();
      server.live = true;
      this.servers.push(server);
    }
  }
  /** */
  step() {
    if (this.initial) {
      this.setup();
    }
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
          newData.cpu = Math.min(oldData.cpu + (prob/100), 100);
        } else {
          newData.cpu = Math.max(oldData.cpu - (prob/100), 0);
        }
      } else {
        if (dir == 0) {
          newData.cpu = Math.min(oldData.cpu + (prob%10), 100);
        } else {
          newData.cpu = Math.max(oldData.cpu - (prob%10), 0);
        }
      }
      let oldProb = oldData.prob;
      let oldDir = Math.floor(oldProb)%2;
      if (oldProb<80) {
        if (oldDir == 0) {
          newData.temp = Math.min(oldData.temp + (oldProb/100), 90);
        } else {
          newData.temp = Math.max(oldData.temp - (oldProb/100), 25);
        }
      } else {
        if (oldDir == 0) {
          newData.temp = Math.min(oldData.temp + (oldProb%10), 90);
        } else {
          newData.temp = Math.max(oldData.temp - (oldProb%10), 25);
        }
      }
      newData.prob = prob;
      newData.ts = Date.now();
      newData.live = true;
      this.servers[this.counter] = newData;
      if (!this.initial) {
        this.firebaseClient.updateData(oldData);
        this.baqendClient.updateData(oldData);
      }
      this.firebaseClient.saveData(newData);
      this.baqendClient.saveData(newData);
      if (this.counter == this.serverCount-1) {
        this.initial = false;
      }
      this.counter = (this.counter+1)%this.serverCount;
    }
  }
  /** */
  start() {
    this.refreshIntervalId = setInterval(() =>{
      this.step();
    }, 1000);
  }
  /** */
  stop() {
    clearInterval(this.refreshIntervalId);
  }
  /**
   * Deletes all Data and resets the Application
   */
  reset() {
    this.baqendClient.deleteAll();
    this.firebaseClient.deleteAll();
    this.servers = [];
    this.counter = 0;
    this.initial = true;
  }
}
