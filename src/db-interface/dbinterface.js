import {from, merge, ReplaySubject, BehaviorSubject} from 'rxjs';
import {map, scan} from 'rxjs/operators';
import {SERVERCOUNT} from '../controls/controls';
export const PROV_BAQEND = 0;
export const PROV_FIREBASE = 1;
export const QUERY_HOTTEST = 10;
export const QUERY_ALL = 20;
export const QUERY_SERVERROOM = 30;
export const QUERY_SERVER = 40;
export const INSERT = 50;
export const RANGE_ALL = 100;
export const RANGE_TEMP = 200;
export const RANGE_CPU = 300;

/**
 * Interface class, delegates Calls to Interfaceclass
 * of the actual Database Provider
 */
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
   * @param {Object} data - The Point which should be saved
   */
  saveData(data) {
    this.dbprov.saveData(data);
  }
  /**
   * executes the given query
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
   * Returns Observable with Latency Measurements
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
  /**
   * Saves all Measurement Data
   */
  saveMeasurements() {
    this.dbprov.saveMeasurements();
  }
}
/**
 * Implementation of the DbInterface for Firebase
 */
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
    this.log = [];
    this.queryType = queryType;
    this.details = details;
    this.indexList = [];
    this.added = new ReplaySubject(SERVERCOUNT);
    this.removed = new ReplaySubject(SERVERCOUNT);
    this.changed = new ReplaySubject(SERVERCOUNT);
    this.moved = new ReplaySubject(SERVERCOUNT);
    this.setQuery();
  }
  /**
   * sets the Query according to the selected Querytype and options
   */
  setQuery() {
    switch (this.queryType) {
      case QUERY_HOTTEST:
        this.query = this.query = this.fb_inst.database()
            .ref('serverState/')
            .orderByChild('temp')
            .limitToLast(this.details.limit);
        if (this.details.range || this.details.offset) {
          throw new Error('Query not supported');
        }
        break;
      case QUERY_ALL:
        this.query = this.fb_inst.database()
            .ref('serverState/');
        if (this.details.range) {
          switch (this.details.range) {
            case RANGE_TEMP:
              this.query = this.fb_inst.database()
                  .ref('serverState/')
                  .orderByChild('temp')
                  .startAt(this.details.minTemp)
                  .endAt(this.details.maxTemp);
              break;
            case RANGE_CPU:
              this.query = this.fb_inst.database()
                  .ref('serverState/')
                  .orderByChild('cpu')
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
            .ref('serverState/')
            .orderByChild('serverroom')
            .equalTo(this.details.room);
        break;
      case QUERY_SERVER:
        this.query = this.fb_inst.database()
            .ref('serverData/'+this.details.serverid)
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
   * Returns the Observable for the selected Query
   * @return {Observable} Subscription
   */
  doQuery() {
    this.addQuery = this.query.on('child_added', (data, key) => {
      let index = '';
      if (key !== '') {
        if (this.queryType === QUERY_HOTTEST) {
          index = this.getIndex(key, data.val().sid);
        } else if (this.queryType === QUERY_SERVER) {
          index = this.getIndex(key, data.val().mid);
        }
      }
      if (this.initialDataLoaded) {
        this.latency.next(Date.now() - data.val().ts);
      }
      this.log.push({
        query: this.queryType,
        options: this.details,
        matchType: 'add',
        index: index,
        prevKey: key,
        initial: this.initialDataLoaded,
        data: data.val(),
        ts: Date.now(),
      });
      this.added.next({matchType: 'add',
        data: data.val(),
      });
    }, (error) => {
      console.error(error);
    });

    this.removeQuery = this.query.on('child_removed', (data) => {
      if (this.queryType === QUERY_HOTTEST) {
        this.deleteKey(data.val().mid);
      } else if (this.queryType === QUERY_SERVER) {
        this.deleteKey(data.val().mid);
      }
      this.log.push({
        query: this.queryType,
        options: this.details,
        matchType: 'remove',
        initial: this.initialDataLoaded,
        data: data.val(),
        ts: Date.now(),
      });
      this.removed.next({matchType: 'remove',
        data: data.val(),
      });
    }, (error) => {
      console.error(error);
    });

    this.changeQuery = this.query.on('child_changed', (data, key) => {
      let index = '';
      if (key !== '') {
        if (this.queryType === QUERY_HOTTEST) {
          index = this.getIndex(key, data.val().sid);
        } else if (this.queryType === QUERY_SERVER) {
          index = this.getIndex(key, data.val().id);
        }
      }
      if (this.initialDataLoaded) {
        this.latency.next(Date.now() - data.val().ts);
      }
      this.log.push({
        query: this.queryType,
        options: this.details,
        matchType: 'change',
        index: index,
        prevKey: key,
        initial: this.initialDataLoaded,
        data: data.val(),
        ts: Date.now(),
      });
      this.changed.next({matchType: 'change',
        data: data.val(),
      });
    }, (error) => {
      console.error(error);
    });

    this.moveQuery = this.query.on('child_moved', (data, key) => {
      let index = '';
      if (key !== '') {
        if (this.queryType === QUERY_HOTTEST) {
          index = this.getIndex(key, data.val().sid);
        } else if (this.queryType === QUERY_SERVER) {
          index = this.getIndex(key, data.val().mid);
        }
      }
      if (this.initialDataLoaded) {
        this.latency.next(Date.now() - data.val().ts);
      }
      this.log.push({
        query: this.queryType,
        options: this.details,
        matchType: 'move',
        index: index,
        prevKey: key,
        initial: this.initialDataLoaded,
        data: data.val(),
        ts: Date.now(),
      });
      this.moved.next({matchType: 'move',
        data: data.val(),
      }, (error) => {
        console.error(error);
      });
    });

    this.query.once('value', (snapshot) => {
      this.initialDataLoaded = true;
    }, (error) => {
      console.error(error);
    });
    this.subscription = merge(this.added, this.removed,
        this.changed, this.moved);
    return this.subscription;
  }
  /**
   * @param {Object} details - Object with further information
   * like min-x, min-y or limit
   * @return {Observable} The new Subscription
   */
  updateQuery(details) {
    this.added = new ReplaySubject(SERVERCOUNT);
    this.removed = new ReplaySubject(SERVERCOUNT);
    this.changed = new ReplaySubject(SERVERCOUNT);
    this.moved = new ReplaySubject(SERVERCOUNT);
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
        .ref('serverState/'+data.sid);
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
        .ref('serverData/'+data.sid+'/'+data.mid);
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
   * Deletes all Serverdata to reset the Application
   */
  deleteAll() {
    this.fb_inst.database().ref('/serverState/').remove();
    this.fb_inst.database().ref('/serverData/').remove();
  }
  /**
   * @return {BehaviorSubject} latency
   */
  getLatency() {
    return this.latency;
  }
  /**
   * Saves the measurement data
   */
  saveMeasurements() {
    this.exportToJsonFile(this.log);
  }
  /**
   * Exports Logdata in downloadable JSON
   * @param {*} jsonData
   */
  exportToJsonFile(jsonData) {
    let queryName = '';
    switch (this.queryType) {
      case QUERY_HOTTEST: queryName = 'HottestList';
        break;
      case QUERY_ALL: queryName = 'Overview';
        break;
      case QUERY_SERVERROOM: queryName = 'Room';
        break;
      case QUERY_SERVER: queryName = 'Server';
        break;
    }
    let dataStr = JSON.stringify(jsonData);
    let dataUri = 'data:application/json;charset=utf-8,'
        + encodeURIComponent(dataStr);
    let exportFileDefaultName = 'Data'+queryName+'Firebase.json';
    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }
  /**
   * Provides the absolute Index for a ordered Element
   * @param {*} key key of the previous Element
   * @param {*} newKey key of the new Element
   * @return {Number} index of the Element
   */
  getIndex(key, newKey) {
    if (key === null) {
      let ind = '';
      for (let i = 0; i<this.indexList.length; i++) {
        if (this.indexList[i] === newKey) {
          ind = i;
        }
      }
      if (ind !== '') {
        this.indexList.splice(ind, 1);
      }
      this.indexList.splice(this.indexList.length, 0, newKey);
      return this.indexList.length-1;
    } else {
      let oldValue = '';
      for (let i = 0; i<this.indexList.length; i++) {
        if (this.indexList[i] === newKey) {
          oldValue = i;
        }
      }
      if (oldValue !== '') {
        this.indexList.splice(oldValue, 1);
      }
      let prevIndex = '';
      for (let i = 0; i<this.indexList.length; i++) {
        if (this.indexList[i] === key) {
          prevIndex = i;
        }
      }
      if (prevIndex !== '') {
        this.indexList.splice(prevIndex, 0, newKey);
      }
      return prevIndex;
    }
  }
  /**
   * removes the Key from the internal Presentation of ordered Elements
   * @param {*} key
   */
  deleteKey(key) {
    let ind = '';
    for (let i = 0; i<this.indexList.length; i++) {
      if (this.indexList[i] === key) {
        ind = i;
      }
    }
    if (ind !== '') {
      this.indexList.splice(ind, 1);
    }
  }
}
/**
 * Database Interface class for Baqend
 */
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
    this.log = [];
    this.setQuery();
  }
  /**
   * builds the query according to query type
   */
  setQuery() {
    switch (this.queryType) {
      case QUERY_HOTTEST:
        this.query = this.ba_inst.ServerState.find();
        if (this.details.range) {
          this.query = this.query
              .gt('cpu', Math.floor(this.details.minCpu))
              .lt('cpu', Math.floor(this.details.maxCpu));
        }
        this.query = this.query.descending('temp');
        if (this.details.offset > 0) {
          this.query = this.query.offset(this.details.offset);
        }
        this.query = this.query.limit(this.details.limit);
        break;
      case QUERY_ALL:
        if (this.details.range) {
          switch (this.details.range) {
            case RANGE_TEMP:
              this.query = this.ba_inst.ServerState
                  .find()
                  .between('temp',
                      this.details.minTemp, this.details.maxTemp);
              break;
            case RANGE_CPU:
              this.query = this.ba_inst.ServerState
                  .find()
                  .between('cpu',
                      this.details.minCpu, this.details.maxCpu);
              break;
            case RANGE_ALL:
              this.query = this.ba_inst.ServerState
                  .find()
                  .between('cpu',
                      this.details.minCpu, this.details.maxCpu)
                  .between('temp',
                      this.details.minTemp, this.details.maxTemp);
              break;
          }
        } else {
          this.query = this.ba_inst.ServerState
              .find();
        }
        break;
      case QUERY_SERVERROOM:
        this.query = this.ba_inst.ServerState.find()
            .equal('serverroom', this.details.room);
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
   * returns the Observable for the selected Query
   * @return {Observable} Subscription
   */
  doQuery() {
    this.subscription = from(this.query.eventStream())
        .pipe(map((event) => {
          if (event.matchType === 'add') {
            if (!event.initial) {
              this.latency.next(Date.now()-event.data.ts);
            }
            this.log.push({
              query: this.queryType,
              options: this.details,
              matchType: 'add',
              initial: event.initial,
              index: event.index,
              data: event.data,
              ts: Date.now(),
            });
            let newEvent = {
              matchType: 'add',
              data: event.data,
            };
            return newEvent;
          } else if (event.matchType === 'remove') {
            this.log.push({
              query: this.queryType,
              options: this.details,
              matchType: 'remove',
              initial: event.initial,
              index: event.index,
              data: event.data,
              ts: Date.now(),
            });
            let newEvent = {
              matchType: 'remove',
              data: event.data,
            };
            return newEvent;
          } else if (event.matchType === 'change') {
            if (!event.initial) {
              this.latency.next(Date.now()-event.data.ts);
            }
            this.log.push({
              query: this.queryType,
              options: this.details,
              matchType: 'change',
              initial: event.initial,
              index: event.index,
              data: event.data,
              ts: Date.now(),
            });
            let newEvent = {
              matchType: 'change',
              data: event.data,
            };
            return newEvent;
          } else if (event.matchType === 'changeIndex') {
            if (!event.initial) {
              this.latency.next(Date.now()-event.data.ts);
            }
            this.log.push({
              query: this.queryType,
              options: this.details,
              matchType: 'move',
              initial: event.initial,
              index: event.index,
              data: event.data,
              ts: Date.now(),
            });
            let newEvent = {
              matchType: 'move',
              data: event.data,
            };
            return newEvent;
          }
        }));
    return this.subscription;
  }
  /**
   * updates the query options
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
   * saves the delivered data
   * @param {Object} data - Sensordata which should be saved
   */
  saveData(data) {
    let saveData = {
      id: data.mid,
      mid: data.mid,
      sid: data.sid,
      serverroom: data.room,
      rack: data.rack,
      unit: data.unit,
      os: data.os,
      temp: data.temp,
      cpu: data.cpu,
      ts: data.ts,
    };
    let serverData = new this.ba_inst.ServerData(saveData);
    serverData.save();
  }
  /**
   * Deletes all Serverdata to reset the Application
   */
  deleteAll() {
    try {
      this.ba_inst.ServerState.find().resultList((result) => {
        result.forEach((data) => {
          data.delete();
        });
      });
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
    } catch (err) {
      console.log(err);
      this.deleteAll();
    }
  }
  /**
   * Returns an Observable, which updates the measured Latency
   * @return {BehaviorSubject} latency
   */
  getLatency() {
    return this.latency;
  }
  /**
   * Saves the measurement data
   */
  saveMeasurements() {
    this.exportToJsonFile(this.log);
  }

  /**
   * Exports Logdata in downloadable JSON
   * @param {*} jsonData
   */
  exportToJsonFile(jsonData) {
    let queryName = '';
    switch (this.queryType) {
      case QUERY_HOTTEST: queryName = 'HottestList';
        break;
      case QUERY_ALL: queryName = 'Overview';
        break;
      case QUERY_SERVERROOM: queryName = 'Room';
        break;
      case QUERY_SERVER: queryName = 'Server';
        break;
    }
    let dataStr = JSON.stringify(jsonData);
    let dataUri = 'data:application/json;charset=utf-8,'
        + encodeURIComponent(dataStr);
    let exportFileDefaultName = 'Data'+queryName+'Baqend.json';
    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }
}

