/* 
* txn Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : txn.js
*/ 


var mongoose = require('mongoose');
var mongooseToCsv = require('mongoose-to-csv');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema
var epindbSchema = new Schema({
  issued : {type : Date, default : Date.now, required : true, index : true},
  owner : Schema.Types.ObjectId,
  allocated_to : Schema.Types.ObjectId,
  sku : {type : String, index : true},
  valid : Boolean,
  valid_to : Date,
  serial : {type : String, index : true},
  code : {type : String, index : true},
  value : {type : String, index : true},
  currency : String,
  country : String,
  iso : String,
  operator_id : String,
  operator_name : String,
  related_transaction : Schema.Types.ObjectId
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
/*
epindbSchema.plugin(mongooseToCsv, {
  headers : 'issued batch valid valid_from valid_to serial code value currency'
})
*/
//Return model
module.exports = db.model('epindb', epindbSchema);
