/* 
* elprod Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : elprod.js
*/ 


var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema

var elprodSchema = new Schema({
	apid : {type : String, index : true},
    iso : {type : String, index : true},
    acloperid : {type : String, index : true},
    sku : {type : String, required : true, index : true},
    name : {type : String, index : true},
    active : Boolean,
    operator_id : String,
    country : String,
    min_denomination : String,
    max_denomination : String,
    topup_currency : String,
  step : Number,
  fx_rate : String,
  currency : String,
  price : String
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
//Return model
module.exports = db.model('elprod', elprodSchema);
