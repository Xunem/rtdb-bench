import {Dbinterface, PROV_BAQEND, PROV_FIREBASE, QUERY_SERVERROOM}
  from '../db-interface/dbinterface.js';
import {MAX_TEMP, MIN_TEMP,
  MAX_CPU, MIN_CPU} from '../controls/controls.js';

/** */
export class RoomClient {
  /**
   * @param {Controls} controls - Controls-Object for sharing settings
   * @param {Number} provider - The Provider which should be used for
   * Data-Access
   * @param {*} dbinstance - Database-connector
   */
  constructor(controls, provider, dbinstance) {
    this.controls = controls;
    this.provider = provider;
    this.dbinstance = dbinstance;
    this.racks = 4;
    this.units = 5;
    this.hover = '';
    this.serverData = new Map();
    this.serverDisplay = new Map();
    this.initial = true;
    this.room = '';
  };
  /**
   * Initialising the canvas and adding capabilities
   * for mouseover effects, tooltips and click-events on the canvas
   */
  init() {
    let cvs;
    if (this.provider == PROV_BAQEND) {
      cvs = document.getElementById('rm_ba_cvs');
      this.latency = document.getElementById('latency_rm_ba');
    } else if (this.provider == PROV_FIREBASE) {
      cvs = document.getElementById('rm_fb_cvs');
      this.latency = document.getElementById('latency_rm_fb');
    }

    this.controls.getRoomNumber().subscribe((value) => {
      this.room = parseInt(value);
      this.setDetails();
      if (this.initial) {
        this.Dbinterface = new Dbinterface(this.provider,
            this.dbinstance, QUERY_SERVERROOM, {
              room: this.room,
            });
        this.Dbinterface.getLatency().subscribe((value) => {
          this.latency.innerHTML = '&Oslash; '+Math.round(value)+' ms';
        });
        this.subscribe(this.initial);
        this.initial = false;
      } else {
        this.subscription.unsubscribe();
        this.serverData = new Map();
        this.subscribe(false);
      }
    });

    this.ctx = cvs.getContext('2d');
    this.toolTip = document.getElementById('ToolTip');
    this.redraw();
    // Adding Eventlisteners for mouseover effects and tooltip on the canvas
    cvs.addEventListener('mousemove', (e) => {
      if (this.serverData.size > 0) {
        let r = cvs.getBoundingClientRect();
        let width = this.ctx.canvas.width;
        let height = this.ctx.canvas.height;
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
          let hover = 'r'+this.room+'r'+rack+'u'+unit;
          let serverInfo = this.getServerData(hover);
          if (serverInfo) {
            this.hover = hover;
            cvs.style.cursor = 'pointer';
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
        } else {
          this.hover = '';
          this.toolTip.style.display = 'none';
          cvs.style.cursor = 'auto';
        }
        this.redraw();
      }
    });
    cvs.addEventListener('click', (e) => {
      if (this.hover) {
        this.controls.getHottestServer().next(false);
        this.controls.setIfNotCurrent(this.hover);
      }
    });
    cvs.addEventListener('mouseout', () => {
      this.hover = '';
      this.toolTip.style.display = 'none';
      cvs.style.cursor = 'auto';
      this.redraw();
    });
  }
  /**
   * Redraws the server room with updated temperature and
   * cpu visualisation
   */
  redraw() {
    this.ctx.clearRect(0, 0,
        this.ctx.canvas.width, this.ctx.canvas.height); // Clears the canvas
    let width = this.ctx.canvas.width;
    let height = this.ctx.canvas.height;
    let spacingHeight = Math.floor((height-60)/this.units);
    let spacingWidth = Math.floor((width-20)/this.racks);
    for (let i = 0; i<this.racks; i++) {
      for (let j = 0; j<this.units; j++) {
        this.ctx.beginPath();
        this.ctx.moveTo(
            10 + Math.floor(spacingWidth)*i,
            30 + spacingHeight*j
        );
        this.ctx.lineTo(
            10 + Math.floor(spacingWidth)*i,
            30 + spacingHeight*(j+1)
        );
        this.ctx.lineTo(
            10 + Math.floor(spacingWidth*0.1) + Math.floor(spacingWidth)*i,
            30 + spacingHeight*(j+1) + Math.floor(spacingHeight*0.2)
        );
        this.ctx.lineTo(
            10 + spacingWidth*i + Math.floor(spacingWidth*0.9),
            30 + spacingHeight*(j+1) + Math.floor(spacingHeight*0.2)
        );
        this.ctx.stroke();
      }
      this.ctx.lineTo(
          10 + spacingWidth*i + Math.floor(spacingWidth*0.9),
          30 + Math.floor(spacingHeight*0.2)
      );
      this.ctx.lineTo(
          10 + spacingWidth*i + Math.floor(spacingWidth*0.9)
          - Math.floor(spacingWidth*0.1),
          30
      );
      this.ctx.lineTo(
          10 + Math.floor(spacingWidth)*i,
          30
      );
      this.ctx.fillStyle = 'rgba(198, 198, 198, 0.7)';
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.lineTo(
          10 + Math.floor(spacingWidth*0.1) + Math.floor(spacingWidth)*i,
          30 + Math.floor(spacingHeight*0.2)
      );
      this.ctx.stroke();
    }
    let dataArray = Array.from(this.serverData, ([key, value]) => value);
    for (let i = 0; i<dataArray.length; i++) {
      if (this.hover === dataArray[i].sid) {
        this.ctx.fillStyle = 'RED';
      } else {
        this.ctx.fillStyle = '#E1E1E1';
      };
      this.ctx.beginPath();
      this.ctx.strokeStyle = 'BLACK';
      let x = 10 + Math.floor(spacingWidth)*dataArray[i].rack
      + Math.floor(spacingWidth*0.1);
      let y = 30 + spacingHeight*dataArray[i].unit
      + Math.floor(spacingHeight*0.2);
      let rectWidth = Math.floor(spacingWidth*0.8);
      let rectHeight = spacingHeight;
      this.ctx.rect(x, y, rectWidth, rectHeight);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.rect(
          x + Math.floor(rectWidth*0.25),
          y + Math.floor(rectHeight*0.25),
          Math.floor(rectWidth*0.25),
          Math.floor(rectHeight*0.5)
      );
      let range = MAX_TEMP-MIN_TEMP;
      let current = dataArray[i].temp - MIN_TEMP;
      if (current > range/2) {
        current = current - range/2;
        let perc = current/(range/2);
        let green = 255 - Math.floor(255*perc);
        let color = 'rgb(255,'+green+',0)';
        this.ctx.fillStyle = color;
      } else {
        let perc = current/(range/2);
        let red = Math.floor(255*perc);
        let color = 'rgb('+red+',255,0)';
        this.ctx.fillStyle = color;
      }
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.rect(
          x + Math.floor(rectWidth*0.5),
          y + Math.floor(rectHeight*0.25),
          Math.floor(rectWidth*0.25),
          Math.floor(rectHeight*0.5)
      );
      range = MAX_CPU-MIN_CPU;
      current = dataArray[i].cpu - MIN_CPU;
      if (current > range/2) {
        current = current - range/2;
        let perc = current/(range/2);
        let green = 255 - Math.floor(255*perc);
        let color = 'rgb(255,'+green+',0)';
        this.ctx.fillStyle = color;
      } else {
        let perc = current/(range/2);
        let red = Math.floor(255*perc);
        let color = 'rgb('+red+',255,0)';
        this.ctx.fillStyle = color;
      }
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.textAlign = 'center';
      this.ctx.font = 'bolder 12px Arial';
      this.ctx.fillStyle = 'BLACK';
      this.ctx.fillText('%',
          x + Math.floor(rectWidth*0.6125),
          (y + Math.floor(rectHeight*0.5))+5);
      this.ctx.fillText('°C',
          x + Math.floor(rectWidth*0.3875),
          (y + Math.floor(rectHeight*0.5))+5);
    }
    if (dataArray.length == 0) {
      this.ctx.fillStyle = 'rgba(198, 198, 198, 0.9)';
      this.ctx.fillRect(0, 0,
          this.ctx.canvas.width, this.ctx.canvas.height);
      this.ctx.fillStyle = 'BLACK';
      this.ctx.textAlign = 'center';
      this.ctx.font = 'bolder 30px Arial';
      this.ctx.fillText('No Data',
          Math.floor(this.ctx.canvas.width/2),
          Math.floor(this.ctx.canvas.height/2));
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
      case 'remove': this.remove(e.data.sid);
        break;
      case 'change': this.add(e.data);
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
   * Deletes Serverdata
   * @param {*} sid - ID of the ServerData which should be deleted
   */
  remove(sid) {
    this.serverData.delete(sid);
    this.redraw();
  }
  /**
   * Updates the Headline for the current Room
   */
  setDetails() {
    document.getElementById('room_details').innerHTML = 'Room '+ this.room;
    document.getElementById('room_sql').innerHTML = this.getSQLString();
  }
  /**
   * @return {string} sql
   */
  getSQLString() {
    let sql = 'SELECT * FROM ServerState<br>'
        + 'WHERE Room = \''+this.room+'\' ';
    return sql;
  }
  /**
   * @param {*} serverid
   * @return {Object} serverdata
   */
  getServerData(serverid) {
    let data = Array.from(this.serverData, ([key, value]) => value);
    for (let i = 0; i<data.length; i++) {
      if (data[i].sid === serverid) {
        return data[i];
      }
    }
    return '';
  }
  /**
   * @param {boolean} initial - indicates if first subscription or update
   */
  subscribe(initial) {
    if (initial) {
      this.subQuery = this.Dbinterface.doQuery();
    } else {
      this.subQuery = this.Dbinterface.updateQuery({
        room: this.room,
      });
    }
    this.subscription = this.subQuery.subscribe(
        (x) => this.handleEvent(x),
        (e) => {
          console.log('Error in Roomclient'
              +((this.provider === PROV_BAQEND)
              ? ' Baqend ' : ' Firebase ') + '%s',
          JSON.stringify(e));
          this.subscription.unsubscribe();
          this.serverData = new Map();
          this.redraw();
          this.subscribe(false);
        },
        () => console.log('onCompleted'));
  }
}
