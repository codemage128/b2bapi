/* 
* txn Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : txn.js
*/ 


var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema

var trtlpriceSchema = new Schema({
  operator_id : String,
  skuid : String,
 country : String,
 operator_name : String,
  currency : String,
  min_denomination : String,
  max_denomination : String,
  step : String,
  unit_cost : String,
  rate : String,
  active : {type : Boolean, index : true}
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
trtlpriceSchema.plugin(mongoosePaginate);
//Return model
module.exports = db.model('trtlprice', trtlpriceSchema);
