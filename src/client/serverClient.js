import {Dbinterface, PROV_BAQEND, PROV_FIREBASE, QUERY_SERVER}
  from '../db-interface/dbinterface.js';

/** */
export class ServerClient {
  /**
   * @param {Controls} controls - Controls-Object for sharing settings
   * @param {Number} provider - Provider of Data-Access
   * @param {*} dbinstance - Database-connector
   * @param {String} serverid - ID of the server
   */
  constructor(controls, provider, dbinstance, serverid) {
    this.controls = controls;
    this.provider = provider;
    this.dbinstance = dbinstance;
    this.initial = true;
    this.serverid = serverid;
    this.limit = 25;
    this.page = 0;
    this.offset = 0;
    this.drawOffset = 30;
    this.serverData = new Map();
    this.temp = {};
  };
  /** */
  init() {
    if (this.provider == PROV_BAQEND) {
      this.ctx = document.getElementById('srv_ba_cvs').getContext('2d');
      this.left = document.getElementById('srv_ba_left');
      this.right = document.getElementById('srv_ba_right');
      this.latency = document.getElementById('latency_srv_ba');
    } else if (this.provider == PROV_FIREBASE) {
      this.ctx = document.getElementById('srv_fb_cvs').getContext('2d');
      this.left = document.getElementById('srv_fb_left');
      this.right = document.getElementById('srv_fb_right');
      this.latency = document.getElementById('latency_srv_fb');
    }

    this.controls.getServerId().subscribe((value) => {
      if (value) {
        this.serverid = value;
        this.updateFilter();
        this.setDetails();
      }
    });
    this.controls.getServerLimit().subscribe((value) => {
      if (!isNaN(value)) {
        this.limit = value;
        this.page = 0;
        this.offset = 0;
        this.updateFilter();
        this.setDetails();
      }
    });
    this.controls.getServerOffset().subscribe((value) => {
      if (!isNaN(value)) {
        this.page = parseInt(value);
        console.log(this.page);
        this.offset = this.page*this.limit;
        this.updateFilter();
        this.setDetails();
      }
    });

    this.left.addEventListener('click', () => {
      this.page++;
      console.log(this.page);
      this.controls.getServerOffset().next(this.page);
    });
    this.right.addEventListener('click', () => {
      this.page--;
      this.controls.getServerOffset().next(this.page);
    });
    this.setDetails();
    this.redraw();
  }
  /** */
  redraw() {
    this.ctx.clearRect(0, 0,
        this.ctx.canvas.width, this.ctx.canvas.height); // Clears the canvas
    let dataArray = Array.from(this.serverData, ([key, value]) => value);
    let width = this.ctx.canvas.width;
    let height = this.ctx.canvas.height;
    let spacing = Math.floor((width-2*this.drawOffset)/(this.limit-1));
    dataArray.sort(function(a, b) {
      return b.ts - a.ts;
    });
    let quarters = Math.floor((this.ctx.canvas.height
        - (this.drawOffset *2))/4);

    this.ctx.beginPath();
    this.ctx.arc(Math.floor((1/3)*width)-10,
        height-this.drawOffset/2,
        4, 0, 2*Math.PI);
    this.ctx.strokeStyle = '#ff9d00';
    this.ctx.fillStyle = '#ff9d00';
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(Math.floor((2/3)*width)-10,
        height-this.drawOffset/2,
        4, 0, 2*Math.PI);
    this.ctx.strokeStyle = '#0007d3';
    this.ctx.fillStyle = '#0007d3';
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.fillStyle = '#0007d3';
    this.ctx.textAlign = 'left';
    this.ctx.font = 'bolder 16px Arial';
    this.ctx.fillText('CPU',
        Math.floor((2/3)*width), (height-this.drawOffset/2)+5);

    this.ctx.beginPath();
    this.ctx.fillStyle = '#ff9d00';
    this.ctx.fillText('Temperature',
        Math.floor((1/3)*width), (height-this.drawOffset/2)+5);
    this.ctx.beginPath();
    this.ctx.moveTo(this.drawOffset, this.drawOffset);
    this.ctx.lineTo(width-this.drawOffset, this.drawOffset);
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = '#bababa';
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(this.drawOffset, this.drawOffset + quarters);
    this.ctx.lineTo(width-this.drawOffset, this.drawOffset + quarters);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(this.drawOffset, this.drawOffset + quarters * 2);
    this.ctx.lineTo(width-this.drawOffset, this.drawOffset + quarters * 2);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(this.drawOffset, this.drawOffset + quarters * 3);
    this.ctx.lineTo(width-this.drawOffset, this.drawOffset + quarters * 3);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(this.drawOffset, this.drawOffset + quarters * 4);
    this.ctx.lineTo(width-this.drawOffset, this.drawOffset + quarters * 4);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(width-this.drawOffset, this.drawOffset);
    this.ctx.lineTo(width-this.drawOffset, this.drawOffset + quarters * 4);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(this.drawOffset, this.drawOffset);
    this.ctx.lineTo(this.drawOffset, this.drawOffset + quarters * 4);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.fillStyle = 'BLACK';
    this.ctx.fillText((this.page == 0) ? 't': 't-'+(this.offset+1),
        width-this.drawOffset-5,
        this.drawOffset + quarters * 4 + 15);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.fillStyle = 'BLACK';
    this.ctx.fillText('t-'+(this.limit*(this.page+1)),
        this.drawOffset,
        this.drawOffset + quarters * 4 + 15);
    this.ctx.stroke();
    if (this.serverData.size>0) {
      for (let i = 0; i<dataArray.length; i++) {
        if (i>0) {
          this.ctx.beginPath();
          this.ctx.moveTo(width-this.drawOffset-(i-1)*spacing,
              this.calcY(dataArray[i-1].temp));
          this.ctx.lineWidth = 2;
          this.ctx.strokeStyle = '#ff9d00';
          this.ctx.lineTo(width-this.drawOffset-i*spacing,
              this.calcY(dataArray[i].temp));
          this.ctx.stroke();
          this.ctx.beginPath();
          this.ctx.moveTo(width-this.drawOffset-(i-1)*spacing,
              this.calcY(dataArray[i-1].cpu));
          this.ctx.lineWidth = 2;
          this.ctx.strokeStyle = '#0007d3';
          this.ctx.lineTo(width-this.drawOffset-i*spacing,
              this.calcY(dataArray[i].cpu));
          this.ctx.stroke();
        }
        this.ctx.beginPath();
        this.ctx.arc(width-this.drawOffset-i*spacing,
            this.calcY(dataArray[i].temp),
            4, 0, 2*Math.PI);
        this.ctx.strokeStyle = '#ff9d00';
        this.ctx.fillStyle = '#ff9d00';
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(width-this.drawOffset-i*spacing,
            this.calcY(dataArray[i].cpu),
            4, 0, 2*Math.PI);
        this.ctx.strokeStyle = '#0007d3';
        this.ctx.fillStyle = '#0007d3';
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
   *
   * @param {Number} value
   * @return {Number}
   */
  calcY(value) {
    let area = this.ctx.canvas.height-this.drawOffset*2;
    let perc = area/100;
    let y = Math.floor(perc*value);
    return this.drawOffset+(area-y);
  }
  /**
   * Delegates the events to the appropriate Function
   * @param {Event} e - The Event which should be handled
   */
  handleEvent(e) {
    try {
      switch (e.matchType) {
        case 'add': this.add(e.data);
          break;
        case 'remove': this.remove(e.data.mid);
          break;
        default: console.log('Wrong Eventtype');
      }
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * Adds the Data from a new Measurement Point
   * @param {*} data new Serverdata
   */
  add(data) {
    this.serverData.set(data.mid, data);
    this.setDetails();
    this.redraw();
  }

  /**
   * Deletes a Measurement Point of Serverdata
   * @param {*} mid - ID of the Measurement Point which should be deleted
   */
  remove(mid) {
    this.serverData.delete(mid);
    this.setDetails();
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

    let currentSql = document.getElementById('server_sql');
    currentSql.innerHTML = this.getSQLString();

    if (this.left) {
      if (this.serverData.size == this.limit) {
        this.left.disabled = false;
      } else {
        this.left.disabled = true;
      }
    }
    if (this.right) {
      if (this.page > 0) {
        this.right.disabled = false;
      } else {
        this.right.disabled = true;
      }
    }
  }

  /**
   * @return {string} sql
   */
  getSQLString() {
    let sql = 'SELECT * FROM ServerData<br>'
        + 'WHERE ServerID = \''+this.serverid+'\'<br>'
        + 'ORDER BY Timestamp DESC<br>'
        + 'LIMIT '+this.limit;
    if (this.page>0) {
      sql = sql + ' OFFSET '+this.page*this.limit;
    }
    return sql;
  }

  /**
   *
   */
  updateFilter() {
    try {
      if (this.initial) {
        this.Dbinterface = new Dbinterface(this.provider,
            this.dbinstance, QUERY_SERVER, {
              serverid: this.serverid,
              limit: this.limit,
              offset: this.offset,
            });
        this.errorMsg = 'No Data';
        this.Dbinterface.getLatency().subscribe((value) => {
          console.log('server'+value);
          this.latency.innerHTML = '&Oslash; '+Math.round(value)+' ms';
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
          offset: this.offset,
        }).subscribe(
            (x) => this.handleEvent(x),
            (e) => {
              console.log('Error in Serverclient: %s',
                  JSON.stringify(e));
              this.updateFilter();
            },
            () => console.log('onCompleted'));
        this.errorMsg = 'No Data';
      }
    } catch (err) {
      this.errorMsg = err.message;
      this.subscription.unsubscribe();
      this.serverData = new Map();
      this.setDetails();
    }
    if (this.ctx) {
      this.redraw();
    }
  }
}
