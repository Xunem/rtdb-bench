import {BehaviorSubject} from 'rxjs';
export const ROOMS = 2;
export const RACKS = 4;
export const UNITS = 5;
export const DEFAULT_ROOM = 1;
export const MIN_TEMP = 25;
export const MAX_TEMP = 90;
export const MIN_CPU = 0;
export const MAX_CPU = 100;
/**
 *
 */
export class Controls {
  /**
   *
   */
  constructor() {
    this.minTemp = new BehaviorSubject();
    this.maxTemp = new BehaviorSubject();
    this.minCpu = new BehaviorSubject();
    this.maxCpu = new BehaviorSubject();
    this.hottestServer = new BehaviorSubject();
    this.hottestServer.next(true);
    this.hottestServerId = new BehaviorSubject();
    this.roomNumber = new BehaviorSubject();
    this.roomNumber.next(1);
    this.serverId = new BehaviorSubject();
    this.serverId.subscribe((serverId) => {
      this.current = serverId;
    });
    this.serverLimit = new BehaviorSubject();
    this.serverLimit.next(15);
    this.serverOffset = new BehaviorSubject();
  }
  /**
   * @return {BehaviorSubject} Number of last Measurements to be shown
   */
  getServerLimit() {
    return this.serverLimit;
  }
  /**
   * @return {BehaviorSubject} Number of last Measurements to be skipped
   */
  getServerOffset() {
    return this.serverOffset;
  }
  /**
   * @return {BehaviorSubject} ID of Server which to be
   * displayed in Server Detail
   */
  getServerId() {
    return this.serverId;
  }
  /**
   * @return {BehaviorSubject} Boolean indicating if hottest
   * Server should be displayed
   */
  getHottestServer() {
    return this.hottestServer;
  }
  /**
   * @return {BehaviorSubject} Number of Room which to be
   * displayed in Room Overview
   */
  getRoomNumber() {
    return this.roomNumber;
  }
  /**
   * @return {BehaviorSubject} ID of Server which to be
   * displayed in Server Detail
   */
  getHottestServerId() {
    return this.hottestServerId;
  }
  /**
   * @return {BehaviorSubject} Minimum Temperature Value for Overview Window
   */
  getMinTemp() {
    return this.minTemp;
  }
  /**
   * @return {BehaviorSubject} Maximum Temperature Value for Overview Window
   */
  getMaxTemp() {
    return this.maxTemp;
  }
  /**
   * @return {BehaviorSubject} Minimum Cpu Value for Overview Window
   */
  getMinCpu() {
    return this.minCpu;
  }
  /**
   * @return {BehaviorSubject} Maximum Cpu Value for Overview Window
   */
  getMaxCpu() {
    return this.maxCpu;
  }
  /**
   *
   * @param {string} id
   */
  setIfNotCurrent(id) {
    if (id !== this.current) {
      this.serverId.next(id);
    }
  }
}
