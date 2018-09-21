import {BehaviorSubject} from 'rxjs';
export const ROOMS = 2;
export const RACKS = 4;
export const UNITS = 5;
/**
 *
 */
export class Controls {
  /**
   *
   */
  constructor() {
    this.hottestServer = new BehaviorSubject();
    this.hottestServer.next(true);
    this.serverId = new BehaviorSubject();
    this.serverLimit = new BehaviorSubject();
    this.serverLimit.next(15);
  }
  /**
   * @return {BehaviorSubject} Number of Measurements to be shown
   */
  getLimit() {
    return this.serverLimit;
  }
  /**
   * @return {BehaviorSubject} ID of Server which to be
   * displayed in Server Detail
   */
  getServerId() {
    return this.serverId;
  }
  /**
   * @return {BehaviorSubject} ID of Server which to be
   * displayed in Server Detail
   */
  getHottestServer() {
    return this.hottestServer;
  }
}
