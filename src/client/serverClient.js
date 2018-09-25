import {Dbinterface, PROV_BAQEND, PROV_FIREBASE, QUERY_SERVER}
  from '../db-interface/dbinterface.js';

/** */
export class ServerClient {
  /**
   * @param {Controls} controls - Controls-Object for sharing settings
   * @param {Number} provider - Provider of Data-Access
   * @param {String} serverid - ID of the server
   */
  constructor(controls, provider, serverid) {
    this.controls = controls;
    this.provider = provider;
    this.initial = true;
    this.serverid = serverid;
    this.limit = 25;
    this.serverData = new Map();
    this.temp = {};
    controls.getServerId().subscribe((value) => {
      if (value) {
        this.serverid = value;
        this.setDetails();
        if (this.initial) {
          this.Dbinterface = new Dbinterface(this.provider, QUERY_SERVER, {
            serverid: this.serverid,
            limit: this.limit,
          });
          this.subscription = this.Dbinterface.doQuery().subscribe(
              (x) => this.handleEvent(x),
              (e) => console.log(this.provider + 'onError: %s',
                  JSON.stringify(e)),
              () => console.log('onCompleted'));
          this.initial = false;
        } else {
          this.subscription.unsubscribe();
          this.serverData = new Map();
          this.subscription = this.Dbinterface.updateQuery({
            serverid: this.serverid,
            limit: this.limit,
          }).subscribe(
              (x) => this.handleEvent(x),
              (e) => console.log(this.provider + 'onError: %s',
                  JSON.stringify(e)),
              () => console.log('onCompleted'));
        }
      }
    });
  };
  /** */
  init() {
    if (this.provider == PROV_BAQEND) {
      this.anctx = document.getElementById('srv_ba_cvs').getContext('2d');
    } else if (this.provider == PROV_FIREBASE) {
      this.anctx = document.getElementById('srv_fb_cvs').getContext('2d');
    }
    this.redraw();
    this.ts = Date.now();
  }
  /** */
  redraw() {
    this.anctx.clearRect(0, 0,
        this.anctx.canvas.width, this.anctx.canvas.height); // Clears the canvas
    let dataArray = Array.from(this.serverData, ([key, value]) => value);
    let width = this.anctx.canvas.width;
    let height = this.anctx.canvas.height;
    let spacing = Math.floor((width-20)/(this.limit-1));
    dataArray.sort(function(a, b) {
      return b.ts - a.ts;
    });
    this.anctx.beginPath();
    this.anctx.moveTo(0, 75);
    this.anctx.lineTo(width, 75);
    this.anctx.lineWidth = 1;
    this.anctx.strokeStyle = '#bababa';
    this.anctx.stroke();
    this.anctx.beginPath();
    this.anctx.moveTo(0, 150);
    this.anctx.lineTo(width, 150);
    this.anctx.stroke();
    this.anctx.beginPath();
    this.anctx.moveTo(0, 225);
    this.anctx.lineTo(width, 225);
    this.anctx.stroke();
    for (let i = 0; i<dataArray.length; i++) {
      if (i>0) {
        this.anctx.beginPath();
        this.anctx.moveTo(width-10-(i-1)*spacing,
            height-(Math.floor(dataArray[i-1].temp)*3));
        this.anctx.lineWidth = 2;
        this.anctx.strokeStyle = '#ff9d00';
        this.anctx.lineTo(width-10-i*spacing,
            height-(Math.floor(dataArray[i].temp)*3));
        this.anctx.stroke();
        this.anctx.beginPath();
        this.anctx.moveTo(width-10-(i-1)*spacing,
            height-(Math.floor(dataArray[i-1].cpu)*3));
        this.anctx.lineWidth = 2;
        this.anctx.strokeStyle = '#0007d3';
        this.anctx.lineTo(width-10-i*spacing,
            height-(Math.floor(dataArray[i].cpu)*3));
        this.anctx.stroke();
      }
      this.anctx.beginPath();
      this.anctx.arc(width-10-i*spacing,
          height-(Math.floor(dataArray[i].temp)*3),
          4, 0, 2*Math.PI);
      this.anctx.strokeStyle = '#ff9d00';
      this.anctx.fillStyle = '#ff9d00';
      this.anctx.fill();
      this.anctx.stroke();
      this.anctx.beginPath();
      this.anctx.arc(width-10-i*spacing,
          height-(Math.floor(dataArray[i].cpu)*3),
          4, 0, 2*Math.PI);
      this.anctx.strokeStyle = '#0007d3';
      this.anctx.fillStyle = '#0007d3';
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
  setDetails() {
    document.getElementById('server_details').innerHTML =
      'Server '+ this.serverid;
  }
}
