import {from, merge, ReplaySubject} from 'rxjs';
import {map} from 'rxjs/operators';
export const PROV_BAQEND = 0;
export const PROV_FIREBASE = 1;
export const QUERY_ALL = 10;
export const QUERY_MINX = 20;
export const QUERY_MINXY = 30;
export const QUERY_SERVERROOM = 40;
export const QUERY_OS = 50;
export const QUERY_AVG = 60;
export const QUERY_SERVER = 70;
export const INSERT = 80;

/** */
export class Dbinterface {
  /**
   * @param {number} provider - The Real-Time Database Provider
   * @param {number} querytype - The Type of Query
   * @param {Object} details - Object with further information
   * like min-x, min-y or limit
   */
  constructor(provider, querytype, details) {
    switch (provider) {
      case PROV_FIREBASE: this.dbprov = new FirebaseClient(querytype, details);
        break;
      case PROV_BAQEND: this.dbprov = new BaqendClient(querytype, details);
        break;
    }
  }
  /**
   * Delegates saving procedure to chosen Database Provider
   * @param {point} data - The Point which should be saved
   */
  saveData(data) {
    this.dbprov.saveData(data);
  }
  /**
   * @return {s}
   */
  doQuery() {
    return this.dbprov.doQuery();
  }
  /**
   * @param {Object} details - Object with further information
   * like min-x, min-y or limit
   * @return {Observable} The new Subscription
   */
  updateQuery(details) {
    return this.dbprov.updateQuery(details);
  }
  /**
   * Deletes all Serverdata to reset the Application
   */
  deleteAll() {
    this.dbprov.deleteAll();
  }
}
/** */
class FirebaseClient {
  /**
   *  @param {number} queryType - The Type of Query
   *  @param {Object} details - Object with further information
   * like min-x, min-y or limit
   */
  constructor(queryType, details) {
    this.queryType = queryType;
    this.details = details;
    this.added = new ReplaySubject(40);
    this.removed = new ReplaySubject(40);
    this.setQuery();
  }
  /** */
  setQuery() {
    switch (this.queryType) {
      case QUERY_ALL:
        break;
      case QUERY_MINX: this.query = DB.SensorData.find();
        break;
      case QUERY_MINXY: this.query = DB.SensorData.find();
        break;
      case QUERY_SERVERROOM:
        break;
      case QUERY_SERVER:
        let room = this.details.serverid.split('r')[1];
        this.query = firebase.database()
            .ref('serverData/'+room+'/'+this.details.serverid)
            .orderByChild('ts')
            .limitToLast(this.details.limit);
        break;
      case QUERY_OS: this.query = DB.SensorData.find();
        break;
      case QUERY_AVG: this.query = DB.SensorData.find();
        break;
      default: this.query = DB.SensorData.find();
    }
  }
  /**
   * @return {Observable} Subscription
   */
  doQuery() {
    if (this.queryType == QUERY_ALL) {
      let allRooms = firebase.database().ref('serverData/');
      allRooms.on('child_added', (roomdata) => {
        let allServers = firebase.database().ref('serverData/'
            +roomdata.key+'/');
        this.query = [];
        allServers.on('child_added', (data) => {
          let q = firebase.database().ref('serverData/'
              +roomdata.key+'/'+ data.key +'/')
              .orderByChild('ts')
              .limitToLast(1);
          q.on('child_added', (data) => {
            this.added.next({matchType: 'add',
              data: data.val(),
            });
          });
          q.on('child_removed', (data) => {
            this.removed.next({matchType: 'remove',
              data: data.val(),
            });
          });
          this.query.push(q);
        });
      });
      this.subscription = merge(this.added, this.removed);
      return this.subscription;
    } else if (this.queryType == QUERY_SERVERROOM) {
      let allServers = firebase.database().ref('serverData/'
            +this.details.room+'/');
      this.query = [];
      allServers.on('child_added', (data) => {
        let q = firebase.database().ref('serverData/'
            +this.details.room+'/'+ data.key +'/')
            .orderByChild('ts')
            .limitToLast(1);
        q.on('child_added', (data) => {
          this.added.next({matchType: 'add',
            data: data.val(),
          });
        });
        q.on('child_removed', (data) => {
          this.removed.next({matchType: 'remove',
            data: data.val(),
          });
        });
        this.query.push(q);
      });
      this.subscription = merge(this.added, this.removed);
      return this.subscription;
    } else {
      this.addQuery = this.query.on('child_added', (data) => {
        this.added.next({matchType: 'add',
          data: data.val(),
        });
      });
      this.removeQuery = this.query.on('child_removed', (data) => {
        this.removed.next({matchType: 'remove',
          data: data.val(),
        });
      });
      this.subscription = merge(this.added, this.removed);
      return this.subscription;
    }
  }
  /**
   * @param {Object} details - Object with further information
   * like min-x, min-y or limit
   * @return {Observable} The new Subscription
   */
  updateQuery(details) {
    this.added = new ReplaySubject(40);
    this.removed = new ReplaySubject(40);
    if (this.queryType == QUERY_SERVERROOM || this.queryType == QUERY_ALL) {
      for (let i = 0; i<this.query.length; i++) {
        this.query[i].off();
      }
      this.query = [];
    } else {
      this.query.off();
    }
    this.details = details;
    this.setQuery();
    return this.doQuery();
  }
  /**
   * @param {Object} data - Sensordata which should be saved
   */
  saveData(data) {
    let newDataRef = firebase.database()
        .ref('serverData/'+data.room+'/'+data.sid).push();
    newDataRef.set({
      mid: data.mid,
      sid: data.sid,
      serverroom: data.room,
      rack: data.rack,
      unit: data.unit,
      os: data.os,
      temp: data.temp,
      cpu: data.cpu,
      ts: data.ts,
    });
  }
  /**
   * Deletes all Serverdata to reset the Application
   */
  deleteAll() {
    firebase.database().ref('/serverData/').remove();
  }
}
/** */
class BaqendClient {
  /**
   *  @param {number} queryType - The Type of Query
   *  @param {Object} details - Object with further information
   * like min-x, min-y or limit
   */
  constructor(queryType, details) {
    this.queryType = queryType;
    this.details = details;
    this.setQuery();
  }
  /** */
  setQuery() {
    switch (this.queryType) {
      case QUERY_ALL: this.query = DB.ServerData.find()
          .descending('ts')
          .limit(40);
        break;
      case QUERY_MINX: this.query = DB.SensorData.find();
        break;
      case QUERY_MINXY: this.query = DB.SensorData.find();
        break;
      case QUERY_SERVERROOM: this.query = DB.ServerData.find()
          .equal('serverroom', this.details.room)
          .descending('ts')
          .limit(20);
        break;
      case QUERY_SERVER: this.query = DB.ServerData.find()
          .equal('sid', this.details.serverid)
          .descending('ts')
          .limit(this.details.limit);
        break;
      case QUERY_OS: this.query = DB.SensorData.find();
        break;
      case QUERY_AVG: this.query = DB.SensorData.find();
        break;
      default: this.query = DB.SensorData.find();
    }
  }
  /**
   * @return {Observable} Subscription
   */
  doQuery() {
    this.subscription = from(this.query.eventStream())
        .pipe(map((event) =>{
          if (event.matchType === 'add') {
            let newEvent = {
              matchType: 'add',
              data: event.data,
            };
            newEvent.data.mid = newEvent.data.id;
            return newEvent;
          } else if (event.matchType === 'remove') {
            let newEvent = {
              matchType: 'remove',
              data: event.data,
            };
            newEvent.data.mid = newEvent.data.id;
            return newEvent;
          }
        }));
    return this.subscription;
  }
  /**
   * @param {Object} details - Object with further information
   * like min-x, min-y or limit
   * @return {Observable} The new Subscription
   */
  updateQuery(details) {
    this.details = details;
    this.setQuery();
    return this.doQuery();
  }
  /**
   * @param {Object} data - Sensordata which should be saved
   */
  saveData(data) {
    let serverData = new DB.ServerData({
      id: data.mid,
      sid: data.sid,
      serverroom: data.room,
      rack: data.rack,
      unit: data.unit,
      os: data.os,
      temp: data.temp,
      cpu: data.cpu,
      ts: data.ts,
    });
    serverData.save();
  }
  /**
   * Deletes all Serverdata to reset the Application
   */
  deleteAll() {
    let query = DB.ServerData.find();
    query.resultList((result) => {
      result.forEach((data) => {
        // data.delete();
      });
    });
  }
}

