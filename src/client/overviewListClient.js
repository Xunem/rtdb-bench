import {Dbinterface, PROV_BAQEND, PROV_FIREBASE,
  QUERY_HOTTEST, RANGE_CPU}
  from '../db-interface/dbinterface.js';
import {MIN_CPU, MAX_CPU} from '../controls/controls.js';

/**
 * Client to display a List of the x hottest Servers
 * with Pagination and Rangefiltering for CPU Values
 */
export class OverviewListClient {
  /**
   * @param {Controls} controls - Controls-Object for sharing settings
   * @param {Number} provider - Provider of Data-Access
   * @param {*} dbinstance - Database-connector
   */
  constructor(controls, provider, dbinstance) {
    this.provider = provider;
    this.controls = controls;
    this.dbinstance = dbinstance;
    this.errorMsg = 'No Data';
    this.minCpu = MIN_CPU;
    this.maxCpu = MAX_CPU;
    this.page = 0;
    this.limit = 12;
    this.serverData = new Map();
    this.Dbinterface = new Dbinterface(provider, dbinstance, QUERY_HOTTEST, {
      limit: this.limit,
    });
    this.initial = true;
    this.hotMode = true;
  };
  /**
   * initialises the OverviewListClient
   */
  init() {
    // Initialising DOM-Elements
    if (this.provider == PROV_BAQEND) {
      this.list = document.getElementById('ovl_ba');
      this.left = document.getElementById('ovl_ba_left');
      this.right = document.getElementById('ovl_ba_right');
      this.overlay = document.getElementById('overlay_ba');
      this.latency = document.getElementById('latency_ovl_ba');
    } else if (this.provider == PROV_FIREBASE) {
      this.list = document.getElementById('ovl_fb');
      this.left = document.getElementById('ovl_fb_left');
      this.right = document.getElementById('ovl_fb_right');
      this.overlay = document.getElementById('overlay_fb');
      this.latency = document.getElementById('latency_ovl_fb');
    }

    // Subscription for initial Query
    this.Dbinterface.getLatency().subscribe((value) => {
      this.latency.innerHTML = '&Oslash; '+Math.round(value)+' ms';
    });
    this.setSubscription();

    this.controls.getListOffset().subscribe((value) => {
      if (!isNaN(value)) {
        this.page = parseInt(value);
        this.offset = this.page*this.limit;
        this.updateFilter(this.minCpu, this.maxCpu);
        this.setDetails();
      }
    });

    this.controls.getHottestServer().subscribe((value) => {
      this.hotMode = value;
    });

    this.left.addEventListener('click', () => {
      this.page--;
      this.controls.getListOffset().next(this.page);
    });
    this.right.addEventListener('click', () => {
      this.page++;
      this.controls.getListOffset().next(this.page);
    });

    // Painting the Canvas for the first time
    this.reloadList();
    this.setDetails();
  }
  /**
   * Subscribes to the selected Query
   */
  subscribe() {
    this.errorMsg = 'No Data';
    this.serverData = new Map();
    this.reloadList();
    this.setDetails();
    this.subscription = this.subquery.subscribe(
        (x) => this.handleEvent(x),
        (e) => {
          console.log('Error in OverviewListclient: %s',
              JSON.stringify(e));
          this.subscription.unsubscribe();
          this.subscribe();
        },
        () => console.log('onCompleted'));
  }
  /**
   * Fills the List of hottest Servers with updated Information
   */
  reloadList() {
    while (this.list.firstChild) {
      this.list.removeChild(this.list.firstChild);
    }
    if (this.serverData.size > 0) {
      this.overlay.style.display = 'none';
      if (this.serverData.size == this.limit) {
        this.right.disabled = false;
      } else {
        this.right.disabled = true;
      }
      if (this.page > 0) {
        this.left.disabled = false;
      } else {
        this.left.disabled = true;
      }
      let dataArray = Array.from(this.serverData, ([key, value]) => value);
      dataArray.sort(function(a, b) {
        return b.temp - a.temp;
      });
      for (let i = 0; i<dataArray.length; i++) {
        let li = document.createElement('li');
        if (i%2 == 0) {
          li.classList.add('even');
        }
        li.style.height = Math.round(272/this.limit) + 'px';
        li.style.lineHeight = Math.round(272/this.limit) + 'px';
        li.addEventListener('click', () => {
          this.controls.getServerId().next(dataArray[i].sid);
        });
        let index = document.createElement('span');
        index.appendChild(document.createTextNode(
            (this.page*this.limit) + (i+1)));
        index.classList.add('index');
        let name = document.createElement('span');
        name.appendChild(document.createTextNode(dataArray[i].sid));
        name.classList.add('data');
        let temp = document.createElement('span');
        temp.appendChild(document.createTextNode(
            dataArray[i].temp.toFixed(2)+'°C'));
        temp.classList.add('data');
        let cpu = document.createElement('span');
        cpu.appendChild(document.createTextNode(
            dataArray[i].cpu.toFixed(2)+'%'));
        cpu.classList.add('data');
        li.appendChild(index);
        li.appendChild(name);
        li.appendChild(temp);
        li.appendChild(cpu);
        this.list.appendChild(li);
      }
    } else {
      this.overlay.innerHTML = this.errorMsg;
      this.overlay.style.display = 'block';
    }
  }
  /**
   * Delegates the events to the appropriate Function
   * @param {Event} e - The Event which should be handled
   */
  handleEvent(e) {
    try {
      if (e) {
        switch (e.matchType) {
          case 'add': this.add(e.data);
            break;
          case 'remove': this.remove(e.data);
            break;
          case 'change': this.add(e.data);
            break;
          case 'move': this.add(e.data);
            break;
          default: console.log('Wrong Eventtype');
        }
      } else {
        console.log(e);
      }
    } catch (err) {
      this.errorMsg = err.message;
      console.log(err);
      this.subscription.unsubscribe();
      this.serverData = new Map();
      this.reloadList();
      this.setDetails();
    }
  }

  /**
   * Adds the Data from a new Measurement Point
   * @param {*} data new Serverdata
   */
  add(data) {
    this.serverData.set(data.sid, data);
    this.reloadList();
  }

  /**
   * Deletes Serverdata
   * @param {*} data - Dataset which shall be removed
   */
  remove(data) {
    this.serverData.delete(data.sid);
    this.reloadList();
  }
  /**
   * Updates the Filterrange
   * @param {number} minCpu
   * @param {number} maxCpu
   */
  updateFilter(minCpu, maxCpu) {
    this.minCpu = minCpu;
    this.maxCpu = maxCpu;
    this.setSubscription();
  }
  /**
   * Updates Query according to Filterrange
   */
  setSubscription() {
    try {
      let cpuInitial = (this.minCpu == MIN_CPU && this.maxCpu == MAX_CPU);
      if (cpuInitial) {
        if (this.initial) {
          this.subquery = this.Dbinterface.doQuery();
          this.initial = false;
        } else {
          this.subscription.unsubscribe();
          this.subquery = this.Dbinterface.updateQuery({
            limit: this.limit,
            offset: this.offset,
          });
        }
        this.subscribe();
      } else {
        this.subscription.unsubscribe();
        this.subquery = this.Dbinterface.updateQuery({
          range: RANGE_CPU,
          minCpu: this.minCpu,
          maxCpu: this.maxCpu,
          limit: this.limit,
          offset: this.offset,
        });
        this.subscribe();
      }
    } catch (err) {
      this.errorMsg = err.message;
      console.log(err);
      this.subscription.unsubscribe();
      this.serverData = new Map();
      this.reloadList();
      this.setDetails();
    }
  }
  /**
   * Updates the Information display in Detailssection
   */
  setDetails() {
    document.getElementById('overviewList_sql').innerHTML = this.getSQLString();
  }
  /**
   * Delivers a SQL Representation of the current Query
   * @return {string} sql
   */
  getSQLString() {
    let sql = 'SELECT * FROM ServerState<br>';
    if (this.minCpu != MIN_CPU && this.maxCpu != MAX_CPU) {
      sql = sql + 'WHERE CPU > '+this.minCpu+'<br>'
        + '\xa0\xa0AND CPU < '+this.maxCpu+'<br>';
    } else if (this.minCpu == MIN_CPU && this.maxCpu != MAX_CPU) {
      sql = sql + 'WHERE CPU < '+this.maxCpu+'<br>';
    } else if (this.minCpu != MIN_CPU && this.maxCpu == MAX_CPU) {
      sql = sql + 'WHERE CPU > '+this.minCpu+'<br>';
    }
    sql = sql + 'ORDER BY TEMP DESC<br>'
        + 'LIMIT '+this.limit;
    if (this.page) {
      sql = sql + ' OFFSET '+this.page*this.limit;
    }
    return sql;
  }
  /**
   * saves the Data Measurements
   */
  save() {
    this.Dbinterface.saveMeasurements();
  }
}
