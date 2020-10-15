/* 
* txn Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : txn.js
*/ 


var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema

var pinbatchSchema = new Schema({
  name : String,
  issued : {type : Date, default : Date.now, required : true, index : true},
  issuer : Schema.Types.ObjectId,
  allocated_to : {type : Schema.Types.ObjectId, index : true},
  type : {type : String, enum : ['fixed', 'flexi']},
  valid : Boolean,
  valid_from : Date,
  valid_to : Date,
  count : Number,
  value : String,
  currency : String,
  description : String
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
//Return model
module.exports = db.model('pinbatch', pinbatchSchema);
