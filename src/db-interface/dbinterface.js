import {from} from 'rxjs';
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
      case PROV_FIREBASE: this.dbprov = new FirebaseClient();
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
}
/** */
class FirebaseClient {
  /** */
  constructor() {
  }
  /** */
  saveData() {
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
            return newEvent;
          } else if (event.matchType === 'remove') {
            let newEvent = {
              matchType: 'remove',
              data: event.data,
            };
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
    serverData.save();
  }
}

