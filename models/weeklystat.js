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

var weeklystatSchema = new Schema({
  account : {type : Schema.Types.ObjectId, index : true},
  time : Date,
  stats : []
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
/*
weeklystatSchema.plugin(mongooseToCsv, {
  headers : 'issued batch valid valid_from valid_to serial code value currency'
})
*/
//Return model
module.exports = db.model('weeklystat', weeklystatSchema);
