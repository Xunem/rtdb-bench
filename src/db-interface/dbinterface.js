import {from, merge, ReplaySubject, BehaviorSubject} from 'rxjs';
import {map, scan} from 'rxjs/operators';
export const PROV_BAQEND = 0;
export const PROV_FIREBASE = 1;
export const QUERY_ALL = 10;
export const QUERY_SINGLERANGE = 20;
export const QUERY_DUALRANGE = 30;
export const QUERY_SERVERROOM = 50;
export const QUERY_AVG = 60;
export const QUERY_SERVER = 70;
export const INSERT = 80;

/** */
export class Dbinterface {
  /**
   * @param {number} provider - The Real-Time Database Provider
   * @param {*} dbinstance - Database-connector
   * @param {number} querytype - The Type of Query
   * @param {Object} details - Object with further information
   * like min-x, min-y or limit
   */
  constructor(provider, dbinstance, querytype, details) {
    console.log('db'+dbinstance);
    switch (provider) {
      case PROV_FIREBASE: this.dbprov =
          new FirebaseClient(dbinstance, querytype, details);
        break;
      case PROV_BAQEND: this.dbprov =
          new BaqendClient(dbinstance, querytype, details);
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
   * @param {String} id
   */
  updateData(id) {
    this.dbprov.updateData(id);
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
  /**
   * @return {BehaviorSubject} latency
   */
  getLatency() {
    return this.dbprov.getLatency().pipe(
        map((value) => {
          return {
            sum: (value)?value:0,
            counter: 0,
          };
        }),
        scan( (acc, curr) => {
          let temp = {
            sum: acc.sum + curr.sum,
            counter: acc.counter + 1,
          };
          return temp;
        }),
        map((acc) => {
          if (acc.counter) {
            return acc.sum/acc.counter;
          } else {
            return 0;
          }
        }));
  }
}
/** */
class FirebaseClient {
  /**
   * @param {*} dbinstance - Database-connector
   *  @param {number} queryType - The Type of Query
   *  @param {Object} details - Object with further information
   * like min-x, min-y or limit
   */
  constructor(dbinstance, queryType, details) {
    console.log(dbinstance);
    this.fb_inst = dbinstance;
    this.latency = new BehaviorSubject();
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
        if (this.details.range) {
          throw new Error('Query not supported');
        }
        break;
      case QUERY_SERVERROOM:
        break;
      case QUERY_SERVER:
        let room = this.details.serverid.split('r')[1];
        this.query = this.fb_inst.database()
            .ref('serverData/'+room+'/'+this.details.serverid)
            .orderByChild('ts')
            .limitToLast(this.details.limit);
        if (this.details.offset > 0) {
          throw new Error('Query not supported');
        }
        break;
      default: ;
    }
  }
  /**
   * @return {Observable} Subscription
   */
  doQuery() {
    if (this.queryType == QUERY_ALL) {
      this.initialDataLoaded = [];
      let allRooms = this.fb_inst.database().ref('serverData/');
      allRooms.once('value', (roomlist) => {
        roomlist.forEach((roomdata) => {
          console.log(JSON.stringify(roomdata));
          let allServers = this.fb_inst.database().ref('serverData/'
          +roomdata.key+'/');
          this.query = [];
          allServers.once('value', (serverlist) => {
            serverlist.forEach((serverdata) => {
              let q = this.fb_inst.database().ref('serverData/'
              +roomdata.key+'/'+ serverdata.key +'/')
                  .orderByChild('ts')
                  .limitToLast(1);
              q.on('child_added', (data) => {
                if (this.initialDataLoaded[serverdata.key]) {
                  this.latency.next(Date.now()-data.val().ts);
                }
                this.added.next({matchType: 'add',
                  data: data.val(),
                });
              });
              q.on('child_removed', (data) => {
                this.removed.next({matchType: 'remove',
                  data: data.val(),
                });
              });
              q.once('value', (snapshot) => {
                this.initialDataLoaded[snapshot.key] = true;
              });
              this.query.push(q);
            });
          });
        });
      });
      this.subscription = merge(this.added, this.removed);
      return this.subscription;
    } else if (this.queryType == QUERY_SERVERROOM) {
      this.initialDataLoaded = [];
      let allServers = this.fb_inst.database().ref('serverData/'
          +this.details.room+'/');
      this.query = [];
      allServers.once('value', (serverlist) => {
        serverlist.forEach((serverdata) => {
          let q = this.fb_inst.database().ref('serverData/'
          +this.details.room+'/'+ serverdata.key +'/')
              .orderByChild('ts')
              .limitToLast(1);
          q.on('child_added', (data) => {
            if (this.initialDataLoaded[serverdata.key]) {
              this.latency.next(Date.now()-data.val().ts);
            }
            this.added.next({matchType: 'add',
              data: data.val(),
            });
          });
          q.on('child_removed', (data) => {
            this.removed.next({matchType: 'remove',
              data: data.val(),
            });
          });
          q.once('value', (snapshot) => {
            console.log(snapshot);
            this.initialDataLoaded[snapshot.key] = true;
          });
          this.query.push(q);
        });
      });
      this.subscription = merge(this.added, this.removed);
      return this.subscription;
    } else {
      this.addQuery = this.query.on('child_added', (data) => {
        if (this.initialDataLoaded) {
          this.latency.next(Date.now() - data.val().ts);
        }
        this.added.next({matchType: 'add',
          data: data.val(),
        });
      });
      this.removeQuery = this.query.on('child_removed', (data) => {
        this.removed.next({matchType: 'remove',
          data: data.val(),
        });
      });
      this.query.once('value', (snapshot) => {
        this.initialDataLoaded = true;
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
      this.initialDataLoaded = [];
    } else {
      this.query.off();
      this.initialDataLoaded = false;
    }
    this.details = details;
    this.setQuery();
    return this.doQuery();
  }
  /**
   * @param {Object} data - Sensordata which should be saved
   */
  saveData(data) {
    let newDataRef = this.fb_inst.database()
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
      live: data.live,
    });
  }
  /**
   * @param {String} id
   */
  updateData(id) {
  }
  /**
   * Deletes all Serverdata to reset the Application
   */
  deleteAll() {
    this.fb_inst.database().ref('/serverData/').remove();
  }
  /**
   * @return {BehaviorSubject} latency
   */
  getLatency() {
    return this.latency;
  }
}
/** */
class BaqendClient {
  /**
   * @param {*} dbinstance - Database-connector
   *  @param {number} queryType - The Type of Query
   *  @param {Object} details - Object with further information
   * like min-x, min-y or limit
   */
  constructor(dbinstance, queryType, details) {
    this.ba_inst = dbinstance;
    this.latency = new BehaviorSubject();
    this.queryType = queryType;
    this.details = details;
    this.setQuery();
  }
  /** */
  setQuery() {
    switch (this.queryType) {
      case QUERY_ALL: this.query = this.ba_inst.ServerData.find()
          .equal('live', true);
        if (this.details.range) {
          this.query
              .between('cpu',
                  this.details.minCpu, this.details.maxCpu)
              .between('temp',
                  this.details.minTemp, this.details.maxTemp);
        }
        break;
      case QUERY_SERVERROOM: this.query = this.ba_inst.ServerData.find()
          .equal('serverroom', this.details.room)
          .equal('live', true);
        break;
      case QUERY_SERVER: this.query = this.ba_inst.ServerData.find()
          .equal('sid', this.details.serverid)
          .descending('ts');
        if (this.details.offset > 0) {
          this.query = this.query.offset(this.details.offset);
        }
        this.query =this.query.limit(this.details.limit);
        break;
      case QUERY_AVG: this.query = this.ba_inst.SensorData.find();
        break;
      default: this.query = this.ba_inst.SensorData.find();
    }
  }
  /**
   * @return {Observable} Subscription
   */
  doQuery() {
    this.subscription = from(this.query.eventStream())
        .pipe(map((event) => {
          if (event.matchType === 'add') {
            if (!event.initial) {
              this.latency.next(Date.now()-event.data.ts);
            }
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
          } else if (event.matchType === 'change') {
            let newEvent = {
              matchType: 'change',
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
    let serverData = new this.ba_inst.ServerData({
      id: data.mid,
      sid: data.sid,
      serverroom: data.room,
      rack: data.rack,
      unit: data.unit,
      os: data.os,
      temp: data.temp,
      cpu: data.cpu,
      ts: data.ts,
      live: data.live,
    });
    serverData.save();
  }
  /**
   * @param {String} id
   */
  updateData(id) {
    this.ba_inst.ServerData.load(id).then((data) => {
      data.live = false;
      data.update();
    });
  }
  /**
   * Deletes all Serverdata to reset the Application
   */
  deleteAll() {
    this.ba_inst.ServerData.find().count((count) => {
      if (count > 0) {
        this.ba_inst.ServerData.find().resultList((result) => {
          result.forEach((data) => {
            data.delete();
          });
          this.deleteAll();
        });
      }
    });
  }
  /**
   * @return {BehaviorSubject} latency
   */
  getLatency() {
    return this.latency;
  }
}

