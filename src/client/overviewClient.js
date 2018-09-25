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
    this.serverDisplay = new Map();
    this.hover = '';
    this.scaleX = 6;
    this.scaleY = 6;
    this.minTemp = 25;
    this.maxTemp = 100;
    this.minCpu = 50;
    this.maxCpu = 100;
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
    this.cvs = this.anctx.canvas;
    this.toolTip = document.getElementById('ToolTip');
    this.controls.getHottestServer().subscribe((value) => {
      this.hotMode = value;
    });

    this.controls.getMinTemp().subscribe((value) => {
      this.minTemp = Math.floor(value);
      this.redraw();
    });
    this.controls.getMaxTemp().subscribe((value) => {
      this.maxTemp = Math.floor(value);
      this.redraw();
    });
    this.controls.getMinCpu().subscribe((value) => {
      this.minCpu = Math.floor(value);
      this.redraw();
    });
    this.controls.getMaxCpu().subscribe((value) => {
      this.maxCpu = Math.floor(value);
      this.redraw();
    });
    this.subscription = this.Dbinterface.doQuery().subscribe(
        (x) => this.handleEvent(x),
        (e) => console.log('onError: %s', JSON.stringify(e)),
        () => console.log('onCompleted'));
    this.redraw();

    this.cvs.addEventListener('mousemove', (e) => {
      let r = this.cvs.getBoundingClientRect();
      let x = e.clientX - r.left;
      let y = e.clientY - r.top;
      let dataArray = Array.from(this.serverDisplay, ([key, value]) => value);
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
      /*
      this.hover = 'r'+this.room+'r'+rack+'u'+unit;
      cvs.style.cursor = 'pointer';
      this.redraw(); */
    });
    this.cvs.addEventListener('click', (e) => {
      if (this.hover) {
        this.controls.getHottestServer().next(false);
        this.controls.getServerId().next(this.hover);
      }
    });
    this.cvs.addEventListener('mouseout', () => {
      this.hover = '';
      this.toolTip.style.display = 'none';
      cvs.style.cursor = 'auto';
      this.redraw();
    });
  }
  /**
   *
   * @param {*} data
   * @return {Number}
   */
  getDisplayPositionX(data) {
    return 50+(Math.floor(data)-50)*this.scaleX;
  }
  /**
   *
   * @param {*} data
   * @return {Number}
   */
  getDisplayPositionY(data) {
    let height = this.anctx.canvas.height;
    return height-((Math.floor(data)-20)*this.scaleY);
  }
  /** */
  redraw() {
    this.anctx.clearRect(0, 0,
        this.anctx.canvas.width, this.anctx.canvas.height); // Clears the canvas
    this.anctx.beginPath();
    this.anctx.moveTo(0, this.getDisplayPositionY(this.minTemp));
    this.anctx.lineTo(this.anctx.canvas.width,
        this.getDisplayPositionY(this.minTemp));
    this.anctx.stroke();
    this.anctx.beginPath();
    this.anctx.moveTo(0, this.getDisplayPositionY(this.maxTemp));
    this.anctx.lineTo(this.anctx.canvas.width,
        this.getDisplayPositionY(this.maxTemp));
    this.anctx.stroke();
    this.anctx.beginPath();
    this.anctx.moveTo(this.getDisplayPositionX(this.minCpu), 0);
    this.anctx.lineTo(
        this.getDisplayPositionX(this.minCpu),
        this.anctx.canvas.height);
    this.anctx.stroke();
    this.anctx.beginPath();
    this.anctx.moveTo(this.getDisplayPositionX(this.maxCpu), 0);
    this.anctx.lineTo(
        this.getDisplayPositionX(this.maxCpu),
        this.anctx.canvas.height);
    this.anctx.stroke();
    let dataArray = Array.from(this.serverData, ([key, value]) => value);
    for (let i = 0; i<dataArray.length; i++) {
      this.anctx.beginPath();
      let width = 10;
      this.anctx.fillStyle = '#ff9d00';
      if (dataArray[i].sid === this.hover) {
        width = 12;
        this.anctx.fillStyle = 'RED';
      }
      this.anctx.arc(
          this.getDisplayPositionX(dataArray[i].cpu),
          this.getDisplayPositionY(dataArray[i].temp),
          width, 0, 2*Math.PI);
      this.anctx.strokeStyle = 'BLACK';
      this.anctx.lineWidth = 2;
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
      this.controls.getServerId().next(hottestId);
    }
  }
}
