import {Dbinterface, PROV_BAQEND, PROV_FIREBASE, QUERY_SERVERROOM}
  from '../db-interface/dbinterface.js';

/** */
export class RoomClient {
  /**
   * @param {Controls} controls - Controls-Object for sharing settings
   * @param {Number} provider - The Provider which should be used for
   * Data-Access
   */
  constructor(controls, provider) {
    this.controls = controls;
    this.provider = provider;
    this.racks = 4;
    this.units = 5;
    this.hover = '';
    this.serverData = new Map();
    this.serverDisplay = new Map();
    this.initial = true;
    this.room = '';
    controls.getRoomNumber().subscribe((value) => {
      this.room = value;
      this.setDetails();
      if (this.initial) {
        this.Dbinterface = new Dbinterface(this.provider, QUERY_SERVERROOM, {
          room: parseInt(value),
        });
        this.subscription = this.Dbinterface.doQuery().subscribe(
            (x) => this.handleEvent(x),
            (e) => console.log('Room, onError: %s', JSON.stringify(e)),
            () => console.log('onCompleted'));
        this.initial = false;
      } else {
        this.subscription.unsubscribe();
        this.serverData = new Map();
        this.subscription = this.Dbinterface.updateQuery({
          room: parseInt(value),
        }).subscribe(
            (x) => this.handleEvent(x),
            (e) => console.log('Room, onError: %s', JSON.stringify(e)),
            () => console.log('onCompleted'));
      }
    });
  };
  /** */
  init() {
    let cvs;
    if (this.provider == PROV_BAQEND) {
      cvs = document.getElementById('rm_ba_cvs');
    } else if (this.provider == PROV_FIREBASE) {
      cvs = document.getElementById('rm_fb_cvs');
    }
    this.anctx = cvs.getContext('2d');
    this.toolTip = document.getElementById('ToolTip');
    this.redraw();
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
        let serverInfo = this.serverDisplay.get(this.hover);
        this.toolTip.style.top = (e.pageY-10)+'px';
        this.toolTip.style.left = (e.pageX+20)+'px';
        this.toolTip.innerHTML = this.hover +'<br>'
            +'Temp: '+ Math.floor(serverInfo.temp) +'°C<br>'
            +'CPU: '+ Math.floor(serverInfo.cpu) +'%';
        this.toolTip.style.display = 'block';
      } else {
        this.hover = '';
        this.toolTip.style.display = 'none';
        cvs.style.cursor = 'auto';
      }
      this.redraw();
    });
    cvs.addEventListener('click', (e) => {
      if (this.hover) {
        this.controls.getServerId().next(this.hover);
      }
    });
    cvs.addEventListener('mouseout', () => {
      this.hover = '';
      this.toolTip.style.display = 'none';
      cvs.style.cursor = 'auto';
      this.redraw();
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
    for (let i = 0; i<this.racks; i++) {
      for (let j = 0; j<this.units; j++) {
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
      let x = 10 + Math.floor(spacingWidth)*dataArray[i].rack
      + Math.floor(spacingWidth*0.1);
      let y = 30 + spacingHeight*dataArray[i].unit
      + Math.floor(spacingHeight*0.2);
      let rectWidth = Math.floor(spacingWidth*0.8);
      let rectHeight = spacingHeight;
      this.anctx.rect(x, y, rectWidth, rectHeight);
      this.anctx.fill();
      this.anctx.stroke();
      this.anctx.beginPath();
      this.anctx.rect(
          x + Math.floor(rectWidth*0.25),
          y + Math.floor(rectHeight*0.25),
          Math.floor(rectWidth*0.25),
          Math.floor(rectHeight*0.5)
      );
      let range = 90-25;
      let current = dataArray[i].temp - 25;
      if (current > range/2) {
        current = current - range/2;
        let perc = current/(range/2);
        let green = 255 - Math.floor(255*perc);
        let color = 'rgb(255,'+green+',0)';
        this.anctx.fillStyle = color;
      } else {
        let perc = current/(range/2);
        let red = Math.floor(255*perc);
        let color = 'rgb('+red+',255,0)';
        this.anctx.fillStyle = color;
      }
      this.anctx.fill();
      this.anctx.stroke();
      this.anctx.beginPath();
      this.anctx.rect(
          x + Math.floor(rectWidth*0.5),
          y + Math.floor(rectHeight*0.25),
          Math.floor(rectWidth*0.25),
          Math.floor(rectHeight*0.5)
      );
      range = 50;
      current = dataArray[i].cpu - 50;
      if (current > range/2) {
        current = current - range/2;
        let perc = current/(range/2);
        let green = 255 - Math.floor(255*perc);
        let color = 'rgb(255,'+green+',0)';
        this.anctx.fillStyle = color;
      } else {
        let perc = current/(range/2);
        let red = Math.floor(255*perc);
        let color = 'rgb('+red+',255,0)';
        this.anctx.fillStyle = color;
      }
      this.anctx.fill();
      this.anctx.stroke();
    }
    if (dataArray.length == 0) {
      this.anctx.fillStyle = 'rgba(198, 198, 198, 0.9)';
      this.anctx.fillRect(0, 0,
          this.anctx.canvas.width, this.anctx.canvas.height);
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
    this.serverDisplay.set(data.sid, {
      cpu: data.cpu,
      temp: data.temp,
    });
    this.serverData.set(data.sid, data);
    this.redraw();
  }

  /**
   * Deletes a Measurement Point of Serverdata
   * @param {*} mid - ID of the Measurement Point which should be deleted
   */
  remove(mid) {
    this.redraw();
  }
  /**
   *
   */
  setDetails() {
    document.getElementById('room_details').innerHTML = 'Room '+ this.room;
  }
}
