/* 
* baseprod Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : baseprod.js
*/ 


var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema

var baseprodSchema = new Schema({
	apid : {type : String, index : true},
    iso : {type : String, index : true},
    acloperId : {type : String, index : true},
    sku : {type : String, required : true, index : true},
    skuid : String,
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
module.exports = db.model('baseprod', baseprodSchema);
