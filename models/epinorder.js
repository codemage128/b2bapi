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
var epinorderSchema = new Schema({
  owner : Schema.Types.ObjectId,
  account : Schema.Types.ObjectId,
  order_id : String,
  time : Date,
  count : Number,
  denomination : String,
  iso : String,
  operator_id : String,
  sku : {type : String, index : true},
  pins : [],
  related_transaction : Schema.Types.ObjectId
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
/*
epinorderSchema.plugin(mongooseToCsv, {
  headers : 'issued batch valid valid_from valid_to serial code value currency'
})
*/
//Return model
module.exports = db.model('epinorder', epinorderSchema);
