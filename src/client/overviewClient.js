import {Dbinterface, PROV_BAQEND, PROV_FIREBASE, QUERY_ALL}
  from '../db-interface/dbinterface.js';
import {MIN_TEMP, MAX_TEMP, MIN_CPU, MAX_CPU} from '../controls/controls.js';

/** */
export class OverviewClient {
  /**
   * @param {Controls} controls - Controls-Object for sharing settings
   * @param {Number} provider - Provider of Data-Access
   * @param {*} dbinstance - Database-connector
   */
  constructor(controls, provider, dbinstance) {
    this.provider = provider;
    this.controls = controls;
    this.dbinstance = dbinstance;
    this.serverDisplay = new Map();
    this.errorMsg = 'No Data';
    this.hover = '';
    this.offset = 40;
    this.scaleX = 6;
    this.scaleY = 6;
    this.minTemp = 25;
    this.minTempLine = '';
    this.maxTemp = 100;
    this.maxTempLine = '';
    this.minCpu = 50;
    this.minCpuLine = '';
    this.maxCpu = 100;
    this.maxCpuLine = '';
    this.serverData = new Map();
    this.Dbinterface = new Dbinterface(provider, dbinstance, QUERY_ALL, {});
    this.initial = true;
    this.hotMode = true;
  };
  /** */
  init() {
    // Initialising DOM-Elements
    if (this.provider == PROV_BAQEND) {
      this.ctx = document.getElementById('ov_ba_cvs').getContext('2d');
      this.latency = document.getElementById('latency_ov_ba');
    } else if (this.provider == PROV_FIREBASE) {
      this.ctx = document.getElementById('ov_fb_cvs').getContext('2d');
      this.latency = document.getElementById('latency_ov_fb');
    }
    this.cvs = this.ctx.canvas;
    this.toolTip = document.getElementById('ToolTip');

    // Subscription for initial Query
    this.Dbinterface.getLatency().subscribe((value) => {
      this.latency.innerHTML = '&Oslash; '+Math.round(value)+' ms';
    });
    this.setSubscription();

    // Subscriptions for Min and Max Range from Controlsection
    this.controls.getMinTemp().subscribe((value) => {
      let newValue = Math.floor(value);
      if (newValue != this.minTemp) {
        this.minTempLine = newValue;
      } else {
        this.minTempLine = '';
      }
      this.redraw();
    });
    this.controls.getMaxTemp().subscribe((value) => {
      let newValue = Math.floor(value);
      if (newValue != this.maxTemp) {
        this.maxTempLine = newValue;
      } else {
        this.maxTempLine = '';
      }
      this.redraw();
    });
    this.controls.getMinCpu().subscribe((value) => {
      let newValue = Math.floor(value);
      if (newValue != this.minCpu) {
        this.minCpuLine = newValue;
      } else {
        this.minCpuLine = '';
      }
      this.redraw();
    });
    this.controls.getMaxCpu().subscribe((value) => {
      let newValue = Math.floor(value);
      if (newValue != this.maxCpu) {
        this.maxCpuLine = newValue;
      } else {
        this.maxCpuLine = '';
      }
      this.redraw();
    });
    this.controls.getHottestServer().subscribe((value) => {
      this.hotMode = value;
    });

    // Adding Eventlisteners for Mouseover and Click Logic
    this.cvs.addEventListener('mousemove', (e) => {
      if (this.serverData.size > 0) {
        let r = this.cvs.getBoundingClientRect();
        let x = e.clientX - r.left;
        let y = e.clientY - r.top;
        let dataArray = Array.from(this.serverDisplay, ([key, value]) => value);
        dataArray.sort(function(a, b) {
          return a.cpu - b.cpu;
        });
        let tempHover = '';
        for (let i = 0; i<dataArray.length; i++) {
          let dataX = this.getDisplayPositionX(dataArray[i].cpu);
          let dataY = this.getDisplayPositionY(dataArray[i].temp);
          let area = 10;
          if (this.hover === dataArray[i].sid) {
            area = 12;
          }
          if (((x > dataX - area)
              && (x < dataX + area))
              && ((y > dataY - area)
              && (y < dataY + area))) {
            tempHover = dataArray[i].sid;
          }
        }
        this.hover = tempHover;
        if (this.hover) {
          this.cvs.style.cursor = 'pointer';
          let serverInfo = this.serverDisplay.get(this.hover);
          this.toolTip.style.top = (e.pageY-10)+'px';
          this.toolTip.style.left = (e.pageX+20)+'px';
          this.toolTip.innerHTML = this.hover +'<br>'
              +'Temp: '+ Math.floor(serverInfo.temp) +'°C<br>'
              +'CPU: '+ Math.floor(serverInfo.cpu) +'%';
          this.toolTip.style.display = 'block';
        } else {
          this.cvs.style.cursor = 'default';
          this.toolTip.style.display = 'none';
        }
        this.redraw();
      }
    });
    this.cvs.addEventListener('click', (e) => {
      if (this.hover) {
        this.controls.getHottestServer().next(false);
        this.controls.setIfNotCurrent(this.hover);
      }
    });
    this.cvs.addEventListener('mouseout', () => {
      this.hover = '';
      this.toolTip.style.display = 'none';
      this.cvs.style.cursor = 'auto';
      this.redraw();
    });

    // Painting the Canvas for the first time
    this.redraw();
    this.setDetails();
  }
  /**
   * Subscribes to the selected Query
   */
  subscribe() {
    this.errorMsg = 'No Data';
    this.serverDisplay = new Map();
    this.serverData = new Map();
    this.minTempLine = '';
    this.maxTempLine = '';
    this.minCpuLine = '';
    this.maxCpuLine = '';
    this.redraw();
    this.setDetails();
    this.subscription = this.subquery.subscribe(
        (x) => this.handleEvent(x),
        (e) => {
          console.log('Error in Overviewclient: %s',
              JSON.stringify(e));
          this.subscription.unsubscribe();
          this.serverData = new Map();
          this.serverDisplay = new Map();
          this.redraw();
          this.setSubscription();
        },
        () => console.log('onCompleted'));
  }
  /**
   * Calculates X-Position according to selected Range and Canvas-Size
   * @param {*} data
   * @return {Number}
   */
  getDisplayPositionX(data) {
    let range = this.maxCpu - this.minCpu;
    let value = data - this.minCpu;
    let relValue = value / range;
    let pxRange = this.ctx.canvas.width - this.offset * 2;
    return this.offset + Math.floor(relValue*pxRange);
  }
  /**
   * Calculates Y-Position according to selected Range and Canvas-Size
   * @param {*} data
   * @return {Number}
   */
  getDisplayPositionY(data) {
    let range = this.maxTemp - this.minTemp;
    let value = data - this.minTemp;
    let relValue = value / range;
    let pxRange = this.ctx.canvas.height - this.offset * 2;
    return this.ctx.canvas.height -
        (this.offset + Math.floor(relValue*pxRange));
  }
  /** */
  redraw() {
    // Clear the canvas
    this.ctx.clearRect(0, 0,
        this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.beginPath();
    let offset = this.offset;
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = 'BLACK';
    this.ctx.font = 'bolder 16px Arial';
    this.ctx.save();
    this.ctx.rotate(-Math.PI/2);
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Temperature',
        Math.floor(this.ctx.canvas.height/2)*-1, offset - 15);
    this.ctx.restore();
    this.ctx.fillText('CPU',
        Math.floor(this.ctx.canvas.width/2),
        this.ctx.canvas.height - offset + 30);
    this.ctx.moveTo(offset, this.ctx.canvas.height - offset + 10);
    this.ctx.fillText(this.minCpu+'%',
        offset,
        this.ctx.canvas.height - offset + 30);
    this.ctx.fillText(this.maxCpu+'%',
        this.ctx.canvas.width - offset,
        this.ctx.canvas.height - offset + 30);
    this.ctx.fillText(this.minTemp+'°',
        offset/2,
        this.ctx.canvas.height - offset + 3);
    this.ctx.fillText(this.maxTemp+'°',
        offset/2,
        offset+3);
    this.ctx.lineWidth = 3;
    this.ctx.lineTo(offset, offset);
    this.ctx.lineTo(offset-10, offset);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(offset - 10, this.ctx.canvas.height - offset);
    this.ctx.lineWidth = 3;
    this.ctx.lineTo(this.ctx.canvas.width - offset,
        this.ctx.canvas.height - offset);
    this.ctx.lineTo(this.ctx.canvas.width - offset,
        this.ctx.canvas.height - offset + 10);
    this.ctx.stroke();
    if (this.serverData.size > 0) {
      // Draw Lines for Min-Max Ranges from Controlsection
      if (this.minTempLine) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.getDisplayPositionY(this.minTempLine));
        this.ctx.lineTo(this.ctx.canvas.width,
            this.getDisplayPositionY(this.minTempLine));
        this.ctx.stroke();
      }
      if (this.maxTempLine) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.getDisplayPositionY(this.maxTempLine));
        this.ctx.lineTo(this.ctx.canvas.width,
            this.getDisplayPositionY(this.maxTempLine));
        this.ctx.stroke();
      }
      if (this.minCpuLine) {
        this.ctx.beginPath();
        this.ctx.moveTo(this.getDisplayPositionX(this.minCpuLine), 0);
        this.ctx.lineTo(
            this.getDisplayPositionX(this.minCpuLine),
            this.ctx.canvas.height);
        this.ctx.stroke();
      }
      if (this.maxCpuLine) {
        this.ctx.beginPath();
        this.ctx.moveTo(this.getDisplayPositionX(this.maxCpuLine), 0);
        this.ctx.lineTo(
            this.getDisplayPositionX(this.maxCpuLine),
            this.ctx.canvas.height);
        this.ctx.stroke();
      }

      // Drawing Points for currrent Servermeasurements
      let dataArray = Array.from(this.serverData, ([key, value]) => value);
      dataArray.sort(function(a, b) {
        return a.cpu - b.cpu;
      });
      for (let i = 0; i<dataArray.length; i++) {
        this.ctx.beginPath();
        let width = 10;
        this.ctx.fillStyle = '#ff9d00';
        if (dataArray[i].sid === this.hover) {
          width = 12;
          this.ctx.fillStyle = 'RED';
        }
        this.ctx.arc(
            this.getDisplayPositionX(dataArray[i].cpu),
            this.getDisplayPositionY(dataArray[i].temp),
            width, 0, 2*Math.PI);
        this.ctx.strokeStyle = 'BLACK';
        this.ctx.lineWidth = 2;
        this.ctx.fill();
        this.ctx.stroke();
      }
    } else {
      this.ctx.beginPath();
      this.ctx.fillStyle = 'rgba(198, 198, 198, 0.9)';
      this.ctx.fillRect(0, 0,
          this.ctx.canvas.width, this.ctx.canvas.height);
      this.ctx.fillStyle = 'BLACK';
      this.ctx.textAlign = 'center';
      this.ctx.font = 'bolder 30px Arial';
      this.ctx.fillText(this.errorMsg,
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
    this.serverDisplay.set(data.sid, data);
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
      this.controls.setIfNotCurrent(hottestId);
    }
  }
  /**
   * Updates the Filterrange
   */
  updateFilter() {
    this.tempChanged = (this.minTempLine || this.maxTempLine);
    this.cpuChanged = (this.minCpuLine || this.maxCpuLine);
    this.minTemp = (this.minTempLine) ? this.minTempLine : this.minTemp;
    this.maxTemp = (this.maxTempLine) ? this.maxTempLine : this.maxTemp;
    this.minCpu = (this.minCpuLine) ? this.minCpuLine : this.minCpu;
    this.maxCpu = (this.maxCpuLine) ? this.maxCpuLine : this.maxCpu;

    this.setSubscription();
  }
  /**
   * Updates Query according to Filterrange
   */
  setSubscription() {
    try {
      if (this.minTemp == MIN_TEMP && this.maxTemp == MAX_TEMP
        && this.minCpu == MIN_CPU && this.maxCpu == MAX_CPU) {
        // no Range applied
        if (this.initial) {
          this.subquery = this.Dbinterface.doQuery();
          this.initial = false;
        } else {
          this.subscription.unsubscribe();
          this.subquery = this.Dbinterface.updateQuery({});
        }
        this.subscribe();
      } else {
        if (this.tempChanged || this.cpuChanged) {
          this.subscription.unsubscribe();
          this.subquery = this.Dbinterface.updateQuery({
            range: true,
            minTemp: this.minTemp,
            maxTemp: this.maxTemp,
            minCpu: this.minCpu,
            maxCpu: this.maxCpu,
          });
          this.subscribe();
        } else {
          console.log('Range not changed.');
        }
      }
    } catch (err) {
      this.errorMsg = err.message;
      console.log(err);
      this.subscription.unsubscribe();
      this.serverData = new Map();
      this.serverDisplay = new Map();
      this.redraw();
      this.setDetails();
    }
  }
  /**
   *
   */
  setDetails() {
    document.getElementById('overview_sql').innerHTML = this.getSQLString();
  }
  /**
   * @return {string} sql
   */
  getSQLString() {
    let sql = 'SELECT * FROM ServerData<br>'
        + 'WHERE Live = true<br>';

    if (this.minTemp != MIN_TEMP) {
      sql = sql + '\xa0\xa0AND Temperature > '+this.minTemp+'<br>';
    }
    if (this.maxTemp != MAX_TEMP) {
      sql = sql + '\xa0\xa0AND Temperature < '+this.maxTemp+'<br>';
    }
    if (this.minCpu != MIN_CPU) {
      sql = sql + '\xa0\xa0AND CPU > '+this.minCpu+'<br>';
    }
    if (this.maxCpu != MAX_CPU) {
      sql = sql + '\xa0\xa0AND CPU < '+this.maxCpu+'<br>';
    }
    return sql;
  }
}
