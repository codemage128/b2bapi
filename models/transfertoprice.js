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

var transfertopriceSchema = new Schema({
  operator_id : String,
 country : String,
 operator_name : String,
  currency : String,
  denomination : String,
  unit_cost : String,
 active : {type : Boolean, index : true}
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
transfertopriceSchema.plugin(mongoosePaginate);
//Return model
module.exports = db.model('transfertoprice', transfertopriceSchema);
