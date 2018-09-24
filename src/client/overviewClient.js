import {Dbinterface, PROV_BAQEND, QUERY_ALL, PROV_FIREBASE}
  from '../db-interface/dbinterface.js';

/** */
export class OverviewClient {
  /**
   * @param {Controls} controls - Controls-Object for sharing settings
   * @param {Number} provider - Provider of Data-Access
   */
  constructor(controls, provider) {
    this.sql = 'SELECT * FROM ServerData ORDER_BY Timestamp DESC LIMIT 40';
    this.provider = provider;
    this.controls = controls;
    this.serverData = new Map();
    this.Dbinterface = new Dbinterface(provider, QUERY_ALL, {});
    this.hotMode = true;
  };
  /** */
  init() {
    if (this.provider == PROV_BAQEND) {
      this.anctx = document.getElementById('ov_ba_cvs').getContext('2d');
    } else if (this.provider == PROV_FIREBASE) {
      this.anctx = document.getElementById('ov_fb_cvs').getContext('2d');
    }
    this.controls.getHottestServer().subscribe((value) => {
      this.hotMode = value;
    });
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
    // let width = this.anctx.canvas.width;
    let height = this.anctx.canvas.height;
    let dataArray = Array.from(this.serverData, ([key, value]) => value);
    for (let i = 0; i<dataArray.length; i++) {
      this.anctx.beginPath();
      this.anctx.arc(50+(Math.floor(dataArray[i].cpu)-50)*6,
          height-((Math.floor(dataArray[i].temp)-20)*6),
          10, 0, 2*Math.PI);
      this.anctx.strokeStyle = 'BLACK';
      this.anctx.lineWidth = 2;
      this.anctx.fillStyle = '#ff9d00';
      this.anctx.fill();
      this.anctx.stroke();
    }
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
    if (this.hotMode) {
      this.controls.getServerId().next(hottestId);
    }
  }
}
