import {from, merge, ReplaySubject, BehaviorSubject} from 'rxjs';
import {map, scan} from 'rxjs/operators';
export const PROV_BAQEND = 0;
export const PROV_FIREBASE = 1;
export const QUERY_ALL = 10;
export const QUERY_SERVERROOM = 50;
export const QUERY_SERVER = 70;
export const INSERT = 80;
export const RANGE_ALL = 100;
export const RANGE_TEMP = 200;
export const RANGE_CPU = 300;

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
        this.query = this.query = this.fb_inst.database()
            .ref('serverData/live/');
        if (this.details.range) {
          switch (this.details.range) {
            case RANGE_TEMP:
              this.query.orderByChild('temp')
                  .startAt(this.details.minTemp)
                  .endAt(this.details.maxTemp);
              break;
            case RANGE_CPU:
              this.query.orderByChild('cpu')
                  .startAt(this.details.minCpu)
                  .endAt(this.details.maxCpu);
              break;
            case RANGE_ALL:
              throw new Error('Query not supported');
              break;
          }
        }
        break;
      case QUERY_SERVERROOM:
        this.query = this.query = this.fb_inst.database()
            .ref('serverData/live/')
            .orderByChild('serverroom')
            .equalTo(this.details.room);
        break;
      case QUERY_SERVER:
        this.query = this.fb_inst.database()
            .ref('serverData/all/'+this.details.serverid)
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
  /**
   * @param {Object} details - Object with further information
   * like min-x, min-y or limit
   * @return {Observable} The new Subscription
   */
  updateQuery(details) {
    this.added = new ReplaySubject(40);
    this.removed = new ReplaySubject(40);
    this.query.off();
    this.initialDataLoaded = false;
    this.details = details;
    this.setQuery();
    return this.doQuery();
  }
  /**
   * @param {Object} data - Sensordata which should be saved
   */
  saveData(data) {
    let liveDataRef = this.fb_inst.database()
        .ref('serverData/live/'+data.mid);
    liveDataRef.set({
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
    let allDataRef = this.fb_inst.database()
        .ref('serverData/all/'+data.sid+'/'+data.mid);
    allDataRef.set({
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
   * @param {Object} data
   */
  updateData(data) {
    let oldDataRef = this.fb_inst.database()
        .ref('serverData/live/'+data.mid);
    oldDataRef.remove();
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
          switch (this.details.range) {
            case RANGE_TEMP:
              this.query.between('temp',
                  this.details.minTemp, this.details.maxTemp);
              break;
            case RANGE_CPU:
              this.query.between('cpu',
                  this.details.minCpu, this.details.maxCpu);
              break;
            case RANGE_ALL:
              this.query
                  .between('cpu',
                      this.details.minCpu, this.details.maxCpu)
                  .between('temp',
                      this.details.minTemp, this.details.maxTemp);
              break;
          }
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
      default: ;
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
   * @param {Object} data
   */
  updateData(data) {
    console.log(data);
    this.ba_inst.ServerData.load(data.mid).then((serverData) => {
      console.log(serverData);
      serverData.live = false;
      serverData.update();
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

