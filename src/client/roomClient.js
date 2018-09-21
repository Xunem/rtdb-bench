import {Dbinterface, PROV_BAQEND, QUERY_SERVERROOM}
  from '../db-interface/dbinterface.js';

/** */
export class RoomClient {
  /**
   * @param {Controls} controls - Controls-Object for sharing settings
   * @param {String} room - Room which should be displayed
   */
  constructor(controls, room) {
    this.controls = controls;
    this.room = room;
    this.racks = 4;
    this.units = 5;
    this.hover = '';
    this.serverData = new Map();
    this.Dbinterface = new Dbinterface(PROV_BAQEND, QUERY_SERVERROOM, {
      room: this.room,
    });
  };
  /** */
  init() {
    console.log('init');
    this.anctx = document.getElementById('rm_ba_cvs').getContext('2d');
    this.subscription = this.Dbinterface.doQuery().subscribe(
        (x) => this.handleEvent(x),
        (e) => console.log('onError: %s', JSON.stringify(e)),
        () => console.log('onCompleted'));
    this.redraw();
    let cvs = document.getElementById('rm_ba_cvs');
    cvs.addEventListener('mousemove', (e) => {
      let r = cvs.getBoundingClientRect();
      let width = this.anctx.canvas.width;
      let height = this.anctx.canvas.height;
      let spacingHeight = Math.floor((height-60)/this.units);
      let spacingWidth = Math.floor((width-20)/this.racks);
      let x = e.clientX - r.left;
      let y = e.clientY - r.top;
      let upperEndY = 30 + Math.floor(spacingHeight*0.2);
      let lowerEndY = 30 + Math.floor(spacingHeight*0.2) + 5 * spacingHeight;
      if ((y > upperEndY && y < lowerEndY)
        && ((x > 10 + Math.floor(spacingWidth)*0
                  + Math.floor(spacingWidth*0.1)
            && x < 10 + Math.floor(spacingWidth)*0
                  + Math.floor(spacingWidth*0.1)
                  + Math.floor(spacingWidth*0.8))
            || (x > 10 + Math.floor(spacingWidth)*1
                  + Math.floor(spacingWidth*0.1)
            && x < 10 + Math.floor(spacingWidth)*1
                  + Math.floor(spacingWidth*0.1)
                  + Math.floor(spacingWidth*0.8))
            || (x > 10 + Math.floor(spacingWidth)*2
                  + Math.floor(spacingWidth*0.1)
            && x < 10 + Math.floor(spacingWidth)*2
                  + Math.floor(spacingWidth*0.1)
                  + Math.floor(spacingWidth*0.8))
            || (x > 10 + Math.floor(spacingWidth)*3
                  + Math.floor(spacingWidth*0.1)
            && x < 10 + Math.floor(spacingWidth)*3
                  + Math.floor(spacingWidth*0.1)
                  + Math.floor(spacingWidth*0.8))
            || (x > 10 + Math.floor(spacingWidth)*4
                  + Math.floor(spacingWidth*0.1)
            && x < 10 + Math.floor(spacingWidth)*4
                  + Math.floor(spacingWidth*0.1)
                  + Math.floor(spacingWidth*0.8)))) {
        let rack = Math.floor((x-10)/spacingWidth);
        let unit = Math.floor((y-upperEndY)/spacingHeight);
        this.hover = 'r'+this.room+'r'+rack+'u'+unit;
        cvs.style.cursor = 'pointer';
      } else {
        this.hover = '';
        cvs.style.cursor = 'auto';
      }
      this.redraw();
    });
    cvs.addEventListener('click', (e) => {
      if (this.hover) {
        this.controls.getServerId().next(this.hover);
      }
    });
  }
  /** */
  redraw() {
    this.anctx.clearRect(0, 0,
        this.anctx.canvas.width, this.anctx.canvas.height); // Clears the canvas
    let width = this.anctx.canvas.width;
    let height = this.anctx.canvas.height;
    let spacingHeight = Math.floor((height-60)/this.units);
    let spacingWidth = Math.floor((width-20)/this.racks);
    for (let i = 0; i<4; i++) {
      for (let j = 0; j<5; j++) {
        this.anctx.beginPath();
        this.anctx.moveTo(
            10 + Math.floor(spacingWidth)*i,
            30 + spacingHeight*j
        );
        this.anctx.lineTo(
            10 + Math.floor(spacingWidth)*i,
            30 + spacingHeight*(j+1)
        );
        this.anctx.lineTo(
            10 + Math.floor(spacingWidth*0.1) + Math.floor(spacingWidth)*i,
            30 + spacingHeight*(j+1) + Math.floor(spacingHeight*0.2)
        );
        this.anctx.lineTo(
            10 + spacingWidth*i + Math.floor(spacingWidth*0.9),
            30 + spacingHeight*(j+1) + Math.floor(spacingHeight*0.2)
        );
        this.anctx.stroke();
      }
      this.anctx.lineTo(
          10 + spacingWidth*i + Math.floor(spacingWidth*0.9),
          30 + Math.floor(spacingHeight*0.2)
      );
      this.anctx.lineTo(
          10 + spacingWidth*i + Math.floor(spacingWidth*0.9)
          - Math.floor(spacingWidth*0.1),
          30
      );
      this.anctx.lineTo(
          10 + Math.floor(spacingWidth)*i,
          30
      );
      this.anctx.fillStyle = 'rgba(198, 198, 198, 0.7)';
      this.anctx.fill();
      this.anctx.stroke();
      this.anctx.lineTo(
          10 + Math.floor(spacingWidth*0.1) + Math.floor(spacingWidth)*i,
          30 + Math.floor(spacingHeight*0.2)
      );
      this.anctx.stroke();
    }
    let dataArray = Array.from(this.serverData, ([key, value]) => value);
    for (let i = 0; i<dataArray.length; i++) {
      if (this.hover === dataArray[i].sid) {
        this.anctx.fillStyle = 'RED';
      } else {
        this.anctx.fillStyle = '#E1E1E1';
      };
      this.anctx.beginPath();
      this.anctx.strokeStyle = 'BLACK';
      this.anctx.rect(
          10 + Math.floor(spacingWidth)*dataArray[i].rack
            + Math.floor(spacingWidth*0.1),
          30 + spacingHeight*dataArray[i].unit
            + Math.floor(spacingHeight*0.2),
          Math.floor(spacingWidth*0.8),
          spacingHeight);
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
    console.log(this.serverData);
    this.redraw();
  }
}
