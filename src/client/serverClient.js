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
    this.drawOffset = 30;
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
    let offset = this.drawOffset;
    let spacing = Math.floor((width-2*offset)/(this.limit-1));
    dataArray.sort(function(a, b) {
      return b.ts - a.ts;
    });
    let quarters = Math.floor((this.anctx.canvas.height - (offset *2))/4);

    this.anctx.beginPath();
    this.anctx.arc(Math.floor((1/3)*width)-10,
        height-offset/2,
        4, 0, 2*Math.PI);
    this.anctx.strokeStyle = '#ff9d00';
    this.anctx.fillStyle = '#ff9d00';
    this.anctx.fill();
    this.anctx.stroke();

    this.anctx.beginPath();
    this.anctx.arc(Math.floor((2/3)*width)-10,
        height-offset/2,
        4, 0, 2*Math.PI);
    this.anctx.strokeStyle = '#0007d3';
    this.anctx.fillStyle = '#0007d3';
    this.anctx.fill();
    this.anctx.stroke();
    this.anctx.beginPath();
    this.anctx.fillStyle = '#0007d3';
    this.anctx.textAlign = 'left';
    this.anctx.font = 'bolder 16px Arial';
    this.anctx.fillText('CPU',
        Math.floor((2/3)*width), (height-offset/2)+5);

    this.anctx.beginPath();
    this.anctx.fillStyle = '#ff9d00';
    this.anctx.fillText('Temperature',
        Math.floor((1/3)*width), (height-offset/2)+5);
    this.anctx.beginPath();
    this.anctx.moveTo(offset, offset);
    this.anctx.lineTo(width-offset, offset);
    this.anctx.lineWidth = 1;
    this.anctx.strokeStyle = '#bababa';
    this.anctx.stroke();
    this.anctx.beginPath();
    this.anctx.moveTo(offset, offset + quarters);
    this.anctx.lineTo(width-offset, offset + quarters);
    this.anctx.stroke();
    this.anctx.beginPath();
    this.anctx.moveTo(offset, offset + quarters * 2);
    this.anctx.lineTo(width-offset, offset + quarters * 2);
    this.anctx.stroke();
    this.anctx.beginPath();
    this.anctx.moveTo(offset, offset + quarters * 3);
    this.anctx.lineTo(width-offset, offset + quarters * 3);
    this.anctx.stroke();
    this.anctx.beginPath();
    this.anctx.moveTo(offset, offset + quarters * 4);
    this.anctx.lineTo(width-offset, offset + quarters * 4);
    this.anctx.stroke();
    this.anctx.beginPath();
    this.anctx.moveTo(width-offset, offset);
    this.anctx.lineTo(width-offset, offset + quarters * 4);
    this.anctx.stroke();
    this.anctx.beginPath();
    this.anctx.moveTo(offset, offset);
    this.anctx.lineTo(offset, offset + quarters * 4);
    this.anctx.stroke();
    if (this.serverData.size>0) {
      for (let i = 0; i<dataArray.length; i++) {
        if (i>0) {
          this.anctx.beginPath();
          this.anctx.moveTo(width-offset-(i-1)*spacing,
              this.calcY(dataArray[i-1].temp));
          this.anctx.lineWidth = 2;
          this.anctx.strokeStyle = '#ff9d00';
          this.anctx.lineTo(width-offset-i*spacing,
              this.calcY(dataArray[i].temp));
          this.anctx.stroke();
          this.anctx.beginPath();
          this.anctx.moveTo(width-offset-(i-1)*spacing,
              this.calcY(dataArray[i-1].cpu));
          this.anctx.lineWidth = 2;
          this.anctx.strokeStyle = '#0007d3';
          this.anctx.lineTo(width-offset-i*spacing,
              this.calcY(dataArray[i].cpu));
          this.anctx.stroke();
        }
        this.anctx.beginPath();
        this.anctx.arc(width-offset-i*spacing,
            this.calcY(dataArray[i].temp),
            4, 0, 2*Math.PI);
        this.anctx.strokeStyle = '#ff9d00';
        this.anctx.fillStyle = '#ff9d00';
        this.anctx.fill();
        this.anctx.stroke();
        this.anctx.beginPath();
        this.anctx.arc(width-offset-i*spacing,
            this.calcY(dataArray[i].cpu),
            4, 0, 2*Math.PI);
        this.anctx.strokeStyle = '#0007d3';
        this.anctx.fillStyle = '#0007d3';
        this.anctx.fill();
        this.anctx.stroke();
      }
    } else {
      this.anctx.beginPath();
      this.anctx.fillStyle = 'rgba(198, 198, 198, 0.9)';
      this.anctx.fillRect(0, 0,
          this.anctx.canvas.width, this.anctx.canvas.height);
      this.anctx.fillStyle = 'BLACK';
      this.anctx.textAlign = 'center';
      this.anctx.font = 'bolder 30px Arial';
      this.anctx.fillText('No Data',
          Math.floor(this.anctx.canvas.width/2),
          Math.floor(this.anctx.canvas.height/2));
    }
  }
  /**
   *
   * @param {Number} value
   * @return {Number}
   */
  calcY(value) {
    let area = this.anctx.canvas.height-this.drawOffset*2;
    let perc = area/100;
    let y = Math.floor(perc*value);
    return this.drawOffset+(area-y);
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
    let current = document.getElementById('server_details');
    if (current.innerHTML !== 'Server '+ this.serverid) {
      current.innerHTML = 'Server '+ this.serverid;
      current.classList.add('serverChange');
      let newnode = current.cloneNode(true);
      current.parentNode.replaceChild(newnode, current);
    }
  }
}
