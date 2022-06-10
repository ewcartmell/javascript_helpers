window.DocumentGH = class Document {
  static all = []

  static get_document(DOCUMENT_ID) {
    return Document.all.filter(row => row.DOCUMENT_ID == DOCUMENT_ID)[0]
  }

  static check_document(DOCUMENT_ID) {
    return Document.all.map(row => row.DOCUMENT_ID).includes(DOCUMENT_ID)
  }

  static get_unkeyed_cis(SUBSET) {
    var arr = SUBSET == null ? Document.all : SUBSET;
    arr = arr.filter(row => row.GRAPHQL_KEYED_AT == null);
    return arr
  }

  static get_bpo_keyable(SUBSET, bpo = false) {
    var arr = SUBSET == null ? Document.all : SUBSET;
    if(bpo) {
      arr = arr.filter(row => row.SN == 'Support Ninja');
    }
    return arr
  }

  static get_unassigned_cis(SUBSET) {
    var arr = SUBSET == null ? Document.all : SUBSET;
    arr = arr.filter(row => row.GSHEET_DOCUMENT_ID == null);
    return arr
  }

  static get_cart_cis(SUBSET, cart = []) {
    var arr = SUBSET == null ? Document.all : SUBSET;
    if(cart.length > 0) {
      arr = arr.filter(row => (cart.includes(row.DOCUMENT_ID)));
    }
    return arr;
  }

  static get_non_cart_cis(SUBSET, cart = []) {
    var arr = SUBSET == null ? Document.all : SUBSET;
    if(cart.length > 0) {
      arr = arr.filter(row => !(cart.includes(row.DOCUMENT_ID)));
    }
    return arr;
  }

  static get_client_cis(SUBSET, clients = []) {
    var arr = SUBSET == null ? Document.all : SUBSET;
    if(clients.length > 0) {
      arr = arr.filter(row => clients.includes(row.CLIENT));
    }
    return arr;
  }

  static get_filtered_cis(cart = [], team = [], clients = []) {
    var bpo = (team.includes('Support Ninja') || team.includes('Lean Staffing Group'))
    var arr = Document.all

    arr = Document.get_non_cart_cis(arr, cart);
    arr = Document.get_bpo_keyable(arr, bpo);
    arr = Document.get_client_cis(arr, clients);
    arr = Document.get_unassigned_cis(arr);
    arr = Document.get_unkeyed_cis(arr);

    return arr
  }

  static get_documents_status(date_part, cart_documents, assigned_documents) {
    var docs = Document.all;
    var results = [];

    docs.reduce(function(res, value) {
      var status = value.get_document_status(cart_documents, assigned_documents)
      var date = moment(value.ARRIVAL_DATE).startOf(date_part);
      var key = date + '-' + value.STATUS;
      if (!res[key]) {
        res[key] = {
          STATUS: status,
          ARRIVAL_DATE: date,
          CIS: 0
        };
      results.push(res[key])
    }
    res[key].CIS += 1;
    return res;

    }, {});
    return results;
  }

  constructor(document) {
    //From Snowflake
    this.DOCUMENT_ID = document.DOCUMENT_ID;
    this.SHIPMENT_ID = document.SHIPMENT_ID;
    this.SHIPMENT_LINK = document.SHIPMENT_LINK;
    this.CUSTOMS = document.CUSTOMS;
    this.INSURANCE = document.INSURANCE;
    this.MODE = document.MODE;
    this.PDR = document.PDR;
    this.RF = document.RF;
    this.SN = document.SN;
    this.TIME = document.TIME;
    this.TIER = document.TIER;
    this.SOP = document.SOP;
    this.PENDING_NOTE = document.PENDING_NOTE;
    this.PENDING_PERSON = document.PENDING_PERSON;
    this.FIRST_UPLOADED_ON = document.FIRST_UPLOADED_ON;
    this.FIRST_UPLOADED_BY = document.FIRST_UPLOADED_BY;
    this.FILE_NAME = document.FILE_NAME;
    this.CLIENT = document.COMPANY_NAME;
    this.ARRIVAL_DATE = moment(document.ARRIVAL_DATE).clone();
    this.DUE_DATE = moment(document.DUE_DATE).clone();
    this.ACTION_TYPE = document.ACTION_TYPE;
    //this.PRODUCTS_FIRST_ENTERED_AT = document.PRODUCTS_FIRST_ENTERED_AT;

    //From Google Sheet
    this.GSHEET_DOCUMENT_ID = document.GSHEET_DOCUMENT_ID
    this.GSHEET_ASSIGNED_TS = document.GSHEET_ASSIGNED_TS;
    this.GSHEET_ASSIGNED_TO_ID = document.GSHEET_ASSIGNED_TO_ID;
    this.GSHEET_ASSIGNED_TO_FULL_NAME = document.GSHEET_ASSIGNED_TO_FULL_NAME;
    this.GSHEET_ASSIGNED_TO_EMAIL = document.GSHEET_ASSIGNED_TO_EMAIL;

    //From GraphQL
    this.GRAPHQL_DOCUMENT_CREATED_AT = document.document_created_at;
    this.GRAPHQL_DOCUMENT_ID = document.document_id;
    this.GRAPHQL_DOCUMENT_ARCHIVED_AT = document.document_archived_at;
    this.GRAPHQL_KEYED_AT = document.keyed_at;

    //Create Shipment
		var existing_shipments = Document.all.map(document => document.SHIPMENT_ID)
    if(!(existing_shipments.includes(document.SHIPMENT_ID))) {
    	new Shipment(document)
    } else {
      Shipment.get_shipment(document.SHIPMENT_ID).increment_cis()
    }

    Document.all.push(this)
  }

  get_shipment() {
     return Shipment.all.filter(shipment => shipment.SHIPMENT_ID === this.SHIPMENT_ID)[0];
  }
  get_document_status(cart, assigned) {
    var status = 'Up for Grabs'
    if(!(this.GRAPHQL_KEYED_AT == null)) {
      status = 'Keyed'
    } else if (cart.includes(this.DOCUMENT_ID)) {
      status = 'In Cart'
    } else if (assigned.includes(this.DOCUMENT_ID)) {
      status = 'Assigned'
    }
    return status
  }

  assign_document(ASSIGNMENT_INFO) {
    Object.assign(this, ASSIGNMENT_INFO);
  }
}


window.ShipmentGH = class Shipment {
  static all = []
  static shipment_ids = Shipment.all.map(shipment => shipment.SHIPMENT_ID)
  static get_shipment(SHIPMENT_ID) {
    return Shipment.all.filter(row => row.SHIPMENT_ID == SHIPMENT_ID)[0]
  }
  static check_shipment(SHIPMENT_ID) {
    return Shipment.all.map(row => row.SHIPMENT_ID).includes(SHIPMENT_ID)
  }
    static sort_shipments(filtered_cis = []) {
    output = [];
    if(filtered_cis.length > 0) {
      var filtered_shipment_ids = filtered_cis.map(row => row.SHIPMENT_ID)
      output = Shipment.all.filter(row => filtered_shipment_ids.includes(row.SHIPMENT_ID));
    } else {
      output = Shipment.all
    }
    output.sort(function(a,b){
      // Turn your strings into dates, and then subtract them
      // to get a value that is either negative, positive, or zero.
    	return new Date(a.ARRIVAL_DATE) - new Date(b.ARRIVAL_DATE);
    });
    return output
	}

  constructor(shipment) {
    this.SHIPMENT_ID = shipment.SHIPMENT_ID;
    this.SHIPMENT_LINK = shipment.SHIPMENT_LINK;
    this.CLIENT = shipment.COMPANY_NAME;
    this.ARRIVAL_DATE = shipment.ARRIVAL_DATE;
    this.DUE_DATE = shipment.DUE_DATE;
    this.BPO = shipment.SN;
    this.TOTAL_CIS = 1;
    Shipment.all.push(this)
  }

  get_documents() {
     return Document.all.filter(document => document.SHIPMENT_ID === this.SHIPMENT_ID);
  }

  increment_cis() {
    this.TOTAL_CIS += 1;
  }
}


window.CoordinatorGH = class Coordinator {
  static all = []

  static get_selected_site_coordinators(sites = []){
    return Coordinator.all.filter(coordinator => sites.includes(coordinator.SITE))
  }


  static get_coordinators_assigned_documents(COMPANY) {

    var coordinators = Coordinator.all.filter(c =>
      c.TEAM == 'Product Data'
      && COMPANY.includes(c.COMPANY)
      && c.ROLE === 'Execution'
    )

    var results = coordinators.map(c => ({
        COORDINATOR: c.NAME,
        TEAM: c.TEAM,
        COMPANY: c.COMPANY,
        DAYS_OLD: 0,
        CIS: 0
      })
    )

    coordinators.forEach(function (item, index) {
      var assigned_cis = item.get_assigned_documents()
      assigned_cis.reduce(function(res, value) {
      var days_old = moment(value.GSHEET_ASSIGNED_TS).diff(moment(), 'days')*-1
        if (!res[days_old]) {
          res[days_old] = {
            COORDINATOR: item.NAME,
            TEAM: item.TEAM,
            COMPANY: item.COMPANY,
            DAYS_OLD: days_old,
            CIS: 0
          };
          results.push(res[days_old])
        }
        res[days_old].CIS += 1;
        return res;
      }, {});
    })

  	return results
  }

  constructor(coordinator) {
    this.NAME = coordinator.Worker;
    this.EMAIL = coordinator.Email;
    this.CORE_USER_ID = coordinator.USER_ID;
    this.SITE = coordinator.Location;
    this.TIER = coordinator.TIER;
    this.POSITION = coordinator.Position;
    this.SUPERVISORY_ORG = coordinator['Supervisory Organization'];
    this.BPO_MANAGER = coordinator.SN_MANAGER;
    this.LOB = coordinator.LOB;
    this.TEAM = coordinator.TEAM;
    this.WORKFLOS = coordinator.WORKFLOW;
    this.SPECIALIZATION = coordinator.SPECIALIZATION;
    this.PM = coordinator['DS Owner (PM or TM)'];
    this.USER_ID = coordinator.USER_ID;
    this.TEAM = coordinator['Confirmed Team'];
    this.WORKFLOW = coordinator['Confirmed Workflow'];
    this.ROLE = coordinator['Confirmed Role'];
    this.MANAGER = coordinator['Confirmed Manager'];
    this.COMPANY = coordinator['Confirmed Company'];
    Coordinator.all.push(this);
  }

  get_assigned_documents() {
    var documents = Document.all;
    return documents.filter(document => document.GSHEET_ASSIGNED_TO_EMAIL === this.EMAIL);
  }



}