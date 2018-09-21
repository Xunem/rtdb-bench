import {Dbinterface, PROV_BAQEND, QUERY_ALL}
  from '../db-interface/dbinterface.js';

/** */
export class OverviewClient {
  /**
  * @param {Controls} controls - Controls-Object for sharing settings
   */
  constructor(controls) {
    this.controls = controls;
    this.serverData = new Map();
    this.Dbinterface = new Dbinterface(PROV_BAQEND, QUERY_ALL, {});
  };
  /** */
  init() {
    this.anctx = document.getElementById('ov_ba_cvs').getContext('2d');
    this.subscription = this.Dbinterface.doQuery().subscribe(
        (x) => this.handleEvent(x),
        (e) => console.log('onError: %s', JSON.stringify(e)),
        () => console.log('onCompleted'));
    this.redraw();
  }
  /** */
  redraw() {
    this.anctx.clearRect(0, 0,
        this.anctx.canvas.width, this.anctx.canvas.height); // Clears the canvas
  }
  /**
   * Delegates the events to the appropriate Function
   * @param {Event} e - The Event which should be handled
   */
  handleEvent(e) {
    switch (e.matchType) {
      case 'add': this.add(e.data);
        break;
      case 'remove': this.remove(e.data.mid);
        break;
      default: console.log('Wrong Eventtype');
    }
  }

  /**
   * Adds the Data from a new Measurement Point
   * @param {*} data new Serverdata
   */
  add(data) {
    this.serverData.set(data.mid, data);
    this.redraw();
    this.calcHottest();
  }

  /**
   * Deletes a Measurement Point of Serverdata
   * @param {*} mid - ID of the Measurement Point which should be deleted
   */
  remove(mid) {
    this.serverData.delete(mid);
    this.redraw();
  }
  /**
   *
   */
  calcHottest() {
    let dataArray = Array.from(this.serverData, ([key, value]) => value);
    let hottest = 0;
    let hottestId = '';
    for (let i = 0; i<dataArray.length; i++) {
      if (dataArray[i].temp > hottest) {
        hottest = dataArray[i].temp;
        hottestId = dataArray[i].sid;
      }
    }
    this.controls.getHottestServer().next(hottestId);
  }
}
